import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { pathService } from './pathService.js';
import { linkageService } from './linkageService.js';
import { fileScanner } from './fileScanner.js';

/**
 * BackupService - 配置备份服务
 * 读取 ~/.claude/backups/ 目录下的配置备份
 */
export class BackupService {
  private static instance: BackupService;

  private constructor() {}

  static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  /**
   * 获取所有备份列表
   */
  getBackups(): BackupItem[] {
    const backupsDir = join(pathService.getClaudePath(), 'backups');
    if (!existsSync(backupsDir)) return [];

    const items: BackupItem[] = [];
    try {
      const files = readdirSync(backupsDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const filePath = join(backupsDir, file);
        try {
          const fileStat = statSync(filePath);
          items.push({
            id: file.replace('.json', ''),
            filename: file,
            path: filePath,
            size: fileStat.size,
            createdAt: fileStat.birthtime.toISOString(),
            modifiedAt: fileStat.mtime.toISOString(),
          });
        } catch {
          // skip invalid
        }
      }
    } catch {
      // ignore
    }

    // 按修改时间倒序
    return items.sort((a, b) =>
      new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
    );
  }

  /**
   * 获取备份详情
   */
  getBackup(id: string): BackupDetail | null {
    const filePath = join(pathService.getClaudePath(), 'backups', `${id}.json`);
    if (!existsSync(filePath)) return null;

    try {
      const content = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      const fileStat = statSync(filePath);

      return {
        id,
        filename: `${id}.json`,
        path: filePath,
        content,
        data,
        size: fileStat.size,
        createdAt: fileStat.birthtime.toISOString(),
        modifiedAt: fileStat.mtime.toISOString(),
      };
    } catch {
      return null;
    }
  }

  /**
   * 比较两个备份
   */
  compareBackups(id1: string, id2: string): BackupDiff | null {
    const backup1 = this.getBackup(id1);
    const backup2 = this.getBackup(id2);

    if (!backup1 || !backup2) return null;

    return {
      backup1: {
        id: backup1.id,
        modifiedAt: backup1.modifiedAt,
      },
      backup2: {
        id: backup2.id,
        modifiedAt: backup2.modifiedAt,
      },
      diff: this.computeDiff(backup1.content, backup2.content),
    };
  }

  /**
   * 比较备份与当前配置
   */
  compareWithCurrent(backupId: string): BackupDiff | null {
    const backup = this.getBackup(backupId);
    if (!backup) return null;

    const currentPath = join(pathService.getClaudePath(), 'settings.json');
    let currentContent = '{}';
    if (existsSync(currentPath)) {
      try {
        currentContent = readFileSync(currentPath, 'utf-8');
      } catch {
        // ignore
      }
    }

    return {
      backup1: {
        id: backup.id,
        modifiedAt: backup.modifiedAt,
      },
      backup2: {
        id: 'current',
        modifiedAt: new Date().toISOString(),
      },
      diff: this.computeDiff(backup.content, currentContent),
    };
  }

  /**
   * 计算差异
   */
  private computeDiff(content1: string, content2: string): DiffLine[] {
    const lines1 = content1.split('\n');
    const lines2 = content2.split('\n');
    const result: DiffLine[] = [];

    // 简单的行对行比较
    const maxLen = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLen; i++) {
      const line1 = lines1[i];
      const line2 = lines2[i];

      if (line1 === undefined) {
        // 新增行
        result.push({
          type: 'add',
          lineNumber: i + 1,
          content: line2,
          side: 'right',
        });
      } else if (line2 === undefined) {
        // 删除行
        result.push({
          type: 'remove',
          lineNumber: i + 1,
          content: line1,
          side: 'left',
        });
      } else if (line1 !== line2) {
        // 修改行
        result.push({
          type: 'remove',
          lineNumber: i + 1,
          content: line1,
          side: 'left',
        });
        result.push({
          type: 'add',
          lineNumber: i + 1,
          content: line2,
          side: 'right',
        });
      } else {
        // 未变化行
        result.push({
          type: 'unchanged',
          lineNumber: i + 1,
          content: line1,
          side: 'both',
        });
      }
    }

    return result;
  }

  /**
   * 获取计划文件列表
   */
  getPlans(): PlanItem[] {
    const plansDir = join(pathService.getClaudePath(), 'plans');
    if (!existsSync(plansDir)) return [];

    const items: PlanItem[] = [];
    try {
      const files = readdirSync(plansDir);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const filePath = join(plansDir, file);
        try {
          const content = readFileSync(filePath, 'utf-8');
          const fileStat = statSync(filePath);

          // 从内容提取标题
          const titleMatch = content.match(/^#\s+(.+)$/m);
          const title = titleMatch ? titleMatch[1] : file;

          items.push({
            id: file.replace('.md', ''),
            filename: file,
            path: filePath,
            title,
            size: fileStat.size,
            createdAt: fileStat.birthtime.toISOString(),
            modifiedAt: fileStat.mtime.toISOString(),
          });
        } catch {
          // skip invalid
        }
      }
    } catch {
      // ignore
    }

    return items.sort((a, b) =>
      new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
    );
  }

  /**
   * 获取计划详情
   */
  getPlan(id: string): PlanDetail | null {
    const filePath = join(pathService.getClaudePath(), 'plans', `${id}.md`);
    if (!existsSync(filePath)) return null;

    try {
      const content = readFileSync(filePath, 'utf-8');
      const fileStat = statSync(filePath);

      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : id;

      return {
        id,
        filename: `${id}.md`,
        path: filePath,
        title,
        content,
        size: fileStat.size,
        createdAt: fileStat.birthtime.toISOString(),
        modifiedAt: fileStat.mtime.toISOString(),
      };
    } catch {
      return null;
    }
  }

  /**
   * 获取调试日志列表
   */
  getDebugLogs(): DebugLogItem[] {
    const debugDir = join(pathService.getClaudePath(), 'debug');
    if (!existsSync(debugDir)) return [];

    const items: DebugLogItem[] = [];
    try {
      const files = readdirSync(debugDir);
      for (const file of files) {
        if (!file.endsWith('.log') && !file.endsWith('.json')) continue;
        const filePath = join(debugDir, file);
        try {
          const fileStat = statSync(filePath);

          // 尝试从文件名提取 sessionId
          const sessionMatch = file.match(/^([a-f0-9-]+)/);
          const sessionId = sessionMatch ? sessionMatch[1] : null;

          items.push({
            id: file.replace(/\.(log|json)$/, ''),
            filename: file,
            path: filePath,
            sessionId,
            size: fileStat.size,
            createdAt: fileStat.birthtime.toISOString(),
            modifiedAt: fileStat.mtime.toISOString(),
          });
        } catch {
          // skip invalid
        }
      }
    } catch {
      // ignore
    }

    return items.sort((a, b) =>
      new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
    );
  }

  /**
   * 获取调试日志详情
   */
  getDebugLog(id: string): DebugLogDetail | null {
    const debugDir = join(pathService.getClaudePath(), 'debug');

    // 尝试 .log 和 .json 两种后缀
    let filePath = join(debugDir, `${id}.log`);
    let isJson = false;

    if (!existsSync(filePath)) {
      filePath = join(debugDir, `${id}.json`);
      isJson = true;
    }

    if (!existsSync(filePath)) return null;

    try {
      const content = readFileSync(filePath, 'utf-8');
      const fileStat = statSync(filePath);

      const sessionMatch = id.match(/^([a-f0-9-]+)/);
      const sessionId = sessionMatch ? sessionMatch[1] : null;

      return {
        id,
        filename: isJson ? `${id}.json` : `${id}.log`,
        path: filePath,
        sessionId,
        content,
        isJson,
        size: fileStat.size,
        createdAt: fileStat.birthtime.toISOString(),
        modifiedAt: fileStat.mtime.toISOString(),
      };
    } catch {
      return null;
    }
  }

  /**
   * 获取文件变更历史列表（按 session 分组）
   */
  getFileHistory(): FileHistorySession[] {
    const historyDir = join(pathService.getClaudePath(), 'file-history');
    if (!existsSync(historyDir)) return [];

    const items: FileHistorySession[] = [];
    try {
      const entries = readdirSync(historyDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const dirPath = join(historyDir, entry.name);
        try {
          const files = readdirSync(dirPath);
          if (files.length === 0) continue;

          // 获取最后修改时间
          let lastModified = new Date(0);
          for (const file of files) {
            try {
              const fileStat = statSync(join(dirPath, file));
              if (fileStat.mtime > lastModified) lastModified = fileStat.mtime;
            } catch { /* skip */ }
          }

          // 尝试反向查找项目
          const project = fileScanner.findProjectBySessionId(entry.name);

          items.push({
            sessionId: entry.name,
            fileCount: new Set(files.map(f => f.split('@')[0])).size,
            totalVersions: files.length,
            lastModified: lastModified.toISOString(),
            projectPath: project?.projectPath,
            encodedPath: project?.encodedPath,
          });
        } catch {
          // skip invalid
        }
      }
    } catch {
      // ignore
    }

    return items.sort((a, b) =>
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );
  }

  /**
   * 获取指定会话的文件历史详情（带正确路径）
   */
  async getSessionFileHistory(sessionId: string, projectPath: string): Promise<SessionFileHistory> {
    const result: SessionFileHistory = {
      sessionId,
      projectPath,
      files: [],
      totalVersions: 0,
    };

    const historyDir = join(pathService.getClaudePath(), 'file-history', sessionId);
    if (!existsSync(historyDir)) return result;

    // 1. 读取物理文件列表
    let physicalFiles: string[];
    try {
      physicalFiles = readdirSync(historyDir);
    } catch {
      return result;
    }

    // 2. 按 hash 前缀分组
    const hashGroups = new Map<string, Array<{ filename: string; version: number; size: number; mtime: string }>>();
    for (const file of physicalFiles) {
      const match = file.match(/^([a-f0-9]+)@v(\d+)$/);
      if (!match) continue;
      const [, hash, versionStr] = match;
      if (!hashGroups.has(hash)) hashGroups.set(hash, []);
      try {
        const fileStat = statSync(join(historyDir, file));
        hashGroups.get(hash)!.push({
          filename: file,
          version: parseInt(versionStr),
          size: fileStat.size,
          mtime: fileStat.mtime.toISOString(),
        });
      } catch { /* skip */ }
    }

    // 3. 从 JSONL 获取 hash -> filePath 映射
    const snapshots = await linkageService.extractFileSnapshots(projectPath, sessionId);
    const hashToPath = new Map<string, string>();
    for (const info of snapshots.values()) {
      const hash = info.backupFileName.split('@')[0];
      if (hash) hashToPath.set(hash, info.filePath);
    }

    // 4. 合并: 将 hash 组映射到文件路径
    for (const [hash, versions] of hashGroups) {
      const filePath = hashToPath.get(hash) || `unknown/${hash}`;
      versions.sort((a, b) => a.version - b.version);
      result.files.push({
        filePath,
        versions: versions.map(v => ({
          backupFileName: v.filename,
          version: v.version,
          size: v.size,
          backupTime: v.mtime,
        })),
      });
      result.totalVersions += versions.length;
    }

    // 按文件路径排序
    result.files.sort((a, b) => a.filePath.localeCompare(b.filePath));

    return result;
  }

  /**
   * 获取文件版本内容
   */
  getFileVersion(historyId: string, versionId: string): FileVersionDetail | null {
    const historyDir = join(pathService.getClaudePath(), 'file-history', historyId);
    const filePath = join(historyDir, versionId);

    if (!existsSync(filePath)) return null;

    try {
      const content = readFileSync(filePath, 'utf-8');
      const fileStat = statSync(filePath);

      return {
        id: versionId,
        filename: versionId,
        path: filePath,
        content,
        size: fileStat.size,
        createdAt: fileStat.birthtime.toISOString(),
        modifiedAt: fileStat.mtime.toISOString(),
      };
    } catch {
      return null;
    }
  }
}

// Types
export interface BackupItem {
  id: string;
  filename: string;
  path: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
}

export interface BackupDetail extends BackupItem {
  content: string;
  data: Record<string, unknown>;
}

export interface BackupDiff {
  backup1: { id: string; modifiedAt: string };
  backup2: { id: string; modifiedAt: string };
  diff: DiffLine[];
}

export interface DiffLine {
  type: 'add' | 'remove' | 'unchanged';
  lineNumber: number;
  content: string;
  side: 'left' | 'right' | 'both';
}

export interface PlanItem {
  id: string;
  filename: string;
  path: string;
  title: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
}

export interface PlanDetail extends PlanItem {
  content: string;
}

export interface DebugLogItem {
  id: string;
  filename: string;
  path: string;
  sessionId: string | null;
  size: number;
  createdAt: string;
  modifiedAt: string;
}

export interface DebugLogDetail extends DebugLogItem {
  content: string;
  isJson: boolean;
}

export interface FileHistorySession {
  sessionId: string;
  fileCount: number;
  totalVersions: number;
  lastModified: string;
  projectPath?: string;
  encodedPath?: string;
}

export interface SessionFileHistory {
  sessionId: string;
  projectPath: string;
  files: Array<{
    filePath: string;
    versions: Array<{
      backupFileName: string;
      version: number;
      size: number;
      backupTime: string;
    }>;
  }>;
  totalVersions: number;
}

export interface FileVersion {
  id: string;
  filename: string;
  path: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
}

export interface FileVersionDetail extends FileVersion {
  content: string;
}

export const backupService = BackupService.getInstance();
