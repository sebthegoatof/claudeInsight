import { api } from './index';

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

// 保留旧类型兼容
export interface FileHistoryItem {
  id: string;
  originalPath: string;
  path: string;
  versionCount: number;
  versions: FileVersion[];
  lastModified: string;
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

// Backup API
export const backupApi = {
  // 获取备份列表
  getBackups: () =>
    api.get<BackupItem[]>('/api/assets/backups'),

  // 获取备份详情
  getBackup: (id: string) =>
    api.get<BackupDetail>(`/api/assets/backups/${id}`),

  // 比较两个备份
  compareBackups: (id1: string, id2: string) =>
    api.get<BackupDiff>(`/api/assets/backups/compare/${id1}/${id2}`),

  // 比较备份与当前配置
  compareWithCurrent: (id: string) =>
    api.get<BackupDiff>(`/api/assets/backups/compare/${id}/current`),
};

// Plans API
export const planApi = {
  // 获取计划列表
  getPlans: () =>
    api.get<PlanItem[]>('/api/assets/plans'),

  // 获取计划详情
  getPlan: (id: string) =>
    api.get<PlanDetail>(`/api/assets/plans/${id}`),
};

// Debug Logs API
export const debugApi = {
  // 获取调试日志列表
  getLogs: () =>
    api.get<DebugLogItem[]>('/api/assets/debug'),

  // 获取调试日志详情
  getLog: (id: string) =>
    api.get<DebugLogDetail>(`/api/assets/debug/${id}`),
};

// File History API
export const fileHistoryApi = {
  // 获取文件历史列表（按 session 分组）
  getHistory: () =>
    api.get<FileHistorySession[]>('/api/assets/file-history'),

  // 获取会话的文件历史详情（带正确路径）
  getSessionFileHistory: (sessionId: string, projectPath?: string) => {
    const params = projectPath ? `?projectPath=${encodeURIComponent(projectPath)}` : '';
    return api.get<SessionFileHistory>(`/api/assets/file-history/${sessionId}${params}`);
  },

  // 获取文件版本内容
  getVersion: (sessionId: string, versionId: string) =>
    api.get<FileVersionDetail>(`/api/assets/file-history/${sessionId}/${versionId}`),
};
