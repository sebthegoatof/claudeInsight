import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';
import { pathService } from './pathService.js';

/**
 * LinkageService - 会话联动分析服务
 * 从会话消息中提取 Skill/Agent/MCP/Model 锚点
 */
export class LinkageService {
  private static instance: LinkageService;

  private constructor() {}

  static getInstance(): LinkageService {
    if (!LinkageService.instance) {
      LinkageService.instance = new LinkageService();
    }
    return LinkageService.instance;
  }

  /**
   * 分析会话的联动信息
   */
  async analyzeSessionLinks(projectPath: string, sessionId: string): Promise<SessionLinks> {
    const links: SessionLinks = {
      skills: [],
      agents: [],
      mcpServers: [],
      models: [],
      commands: [],
      fileChanges: [],
    };

    // 找到会话文件
    const sessionFile = await this.findSessionFile(projectPath, sessionId);
    if (!sessionFile) return links;

    // 解析 JSONL 文件
    const skillsSet = new Set<string>();
    const agentsSet = new Set<string>();
    const mcpSet = new Set<string>();
    const modelsSet = new Set<string>();
    const commandsSet = new Set<string>();
    const fileChangesMap = new Map<string, FileChangeInfo>();

    try {
      const stream = createReadStream(sessionFile, { encoding: 'utf-8' });
      const rl = createInterface({ input: stream, crlfDelay: Infinity });

      for await (const line of rl) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line);

          // 提取 file-history-snapshot 数据
          if (entry.type === 'file-history-snapshot' && entry.snapshot?.trackedFileBackups) {
            for (const [filePath, backup] of Object.entries(entry.snapshot.trackedFileBackups as Record<string, any>)) {
              if (backup && typeof backup === 'object') {
                fileChangesMap.set(filePath, {
                  filePath,
                  backupFileName: backup.backupFileName || '',
                  versions: backup.version || 1,
                  latestVersion: backup.version || 1,
                  backupTime: backup.backupTime || '',
                });
              }
            }
            continue;
          }

          const msg = entry.message;
          if (!msg || typeof msg !== 'object') continue;

          // 提取模型
          if (msg.model) {
            modelsSet.add(msg.model);
          }

          // 分析工具调用
          const content = msg.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'tool_use') {
                const toolName = block.name || '';

                // 检测 Skill 调用
                if (toolName === 'Skill' || toolName === 'skill') {
                  const skillName = block.input?.skill || block.input?.name;
                  if (skillName) skillsSet.add(skillName);
                }

                // 检测 Agent 调用
                if (toolName === 'Agent' || toolName === 'agent') {
                  const agentType = block.input?.subagent_type || block.input?.agent_type || block.input?.type;
                  if (agentType) agentsSet.add(agentType);
                }

                // 检测 MCP 工具调用 (格式: mcp__server__tool)
                if (toolName.startsWith('mcp__')) {
                  const parts = toolName.split('__');
                  if (parts.length >= 2) {
                    mcpSet.add(parts[1]);
                  }
                }

                // 检测命令调用 (通过工具输入中的 skill 字段)
                if (block.input?.skill && typeof block.input.skill === 'string') {
                  // 如果 skill 以 / 开头，可能是命令
                  if (block.input.skill.startsWith('/')) {
                    commandsSet.add(block.input.skill);
                  }
                }
              }
            }
          }

          // 检测子代理消息
          if (entry.agentId || entry.agent_type) {
            const agentType = entry.agent_type || entry.agentId;
            if (agentType) agentsSet.add(agentType);
          }

        } catch {
          // skip malformed line
        }
      }
    } catch {
      // ignore file read errors
    }

    // 转换为数组并获取详情
    links.skills = Array.from(skillsSet).map(name => ({ name, type: 'skill' }));
    links.agents = Array.from(agentsSet).map(type => ({ type, name: type }));
    links.mcpServers = Array.from(mcpSet).map(name => ({ name }));
    links.models = Array.from(modelsSet);
    links.commands = Array.from(commandsSet);
    links.fileChanges = Array.from(fileChangesMap.values());

    return links;
  }

  /**
   * 提取会话的文件快照映射 (hash -> filePath)
   */
  async extractFileSnapshots(projectPath: string, sessionId: string): Promise<Map<string, FileChangeInfo>> {
    const fileChangesMap = new Map<string, FileChangeInfo>();
    const sessionFile = await this.findSessionFile(projectPath, sessionId);
    if (!sessionFile) return fileChangesMap;

    try {
      const stream = createReadStream(sessionFile, { encoding: 'utf-8' });
      const rl = createInterface({ input: stream, crlfDelay: Infinity });

      for await (const line of rl) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line);
          if (entry.type === 'file-history-snapshot' && entry.snapshot?.trackedFileBackups) {
            for (const [filePath, backup] of Object.entries(entry.snapshot.trackedFileBackups as Record<string, any>)) {
              if (backup && typeof backup === 'object') {
                fileChangesMap.set(filePath, {
                  filePath,
                  backupFileName: backup.backupFileName || '',
                  versions: backup.version || 1,
                  latestVersion: backup.version || 1,
                  backupTime: backup.backupTime || '',
                });
              }
            }
          }
        } catch {
          // skip malformed line
        }
      }
    } catch {
      // ignore
    }

    return fileChangesMap;
  }

  /**
   * 查找会话文件
   * 支持多种查找策略以处理中文路径编码问题
   */
  async findSessionFile(projectPath: string, sessionId: string): Promise<string | null> {
    const projectsDir = pathService.getHistoryPath();

    // 策略1: 使用 fileScanner 的编码方式
    const encodedPath1 = this.encodePath(projectPath);
    const projectDir1 = join(projectsDir, encodedPath1);
    if (existsSync(projectDir1)) {
      const mainFile = join(projectDir1, `${sessionId}.jsonl`);
      if (existsSync(mainFile)) return mainFile;
    }

    // 策略2: 使用与 fileScanner.encodeProjectPath 相同的方式
    const encodedPath2 = projectPath.replace(/[^a-zA-Z0-9]/g, '-');
    const projectDir2 = join(projectsDir, encodedPath2);
    if (existsSync(projectDir2)) {
      const mainFile = join(projectDir2, `${sessionId}.jsonl`);
      if (existsSync(mainFile)) return mainFile;
    }

    // 策略3: 遍历所有项目目录，通过 sessions-index.json 匹配
    if (existsSync(projectsDir)) {
      const entries = readdirSync(projectsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

        // 检查 sessions-index.json
        const indexPath = join(projectsDir, entry.name, 'sessions-index.json');
        try {
          if (existsSync(indexPath)) {
            const indexContent = readFileSync(indexPath, 'utf-8');
            const indexData = JSON.parse(indexContent);
            if (indexData.originalPath === projectPath) {
              const mainFile = join(projectsDir, entry.name, `${sessionId}.jsonl`);
              if (existsSync(mainFile)) return mainFile;
            }
          }
        } catch {
          // 忽略
        }

        // 直接检查是否包含该会话文件
        const mainFile = join(projectsDir, entry.name, `${sessionId}.jsonl`);
        if (existsSync(mainFile)) return mainFile;
      }
    }

    return null;
  }

  /**
   * 编码路径（与 fileScanner 保持一致）
   */
  private encodePath(path: string): string {
    return path.replace(/[^a-zA-Z0-9]/g, '-');
  }

  /**
   * 获取会话的任务列表
   */
  getSessionTasks(sessionId: string): TaskInfo[] {
    const tasksFile = join(pathService.getClaudePath(), 'tasks', `${sessionId}.json`);
    if (!existsSync(tasksFile)) return [];

    try {
      const content = readFileSync(tasksFile, 'utf-8');
      const data = JSON.parse(content);
      return data.tasks || [];
    } catch {
      return [];
    }
  }

  /**
   * 获取会话的 TODO 列表
   */
  getSessionTodos(sessionId: string): TodoInfo[] {
    const todosFile = join(pathService.getClaudePath(), 'todos', `${sessionId}.json`);
    if (!existsSync(todosFile)) return [];

    try {
      const content = readFileSync(todosFile, 'utf-8');
      const data = JSON.parse(content);
      // 可能是 { todos: [...] } 或直接是数组
      return Array.isArray(data) ? data : (data.todos || []);
    } catch {
      return [];
    }
  }

  /**
   * 获取会话的计划文件（通过时间戳关联）
   */
  getSessionPlans(_sessionId: string, _sessionTimestamp?: string): PlanInfo[] {
    const plansDir = join(pathService.getClaudePath(), 'plans');
    if (!existsSync(plansDir)) return [];

    const plans: PlanInfo[] = [];
    try {
      const files = readdirSync(plansDir);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const filePath = join(plansDir, file);
        try {
          const fileStat = statSync(filePath);
          plans.push({
            filename: file,
            path: filePath,
            lastModified: fileStat.mtime.toISOString(),
          });
        } catch {
          // skip
        }
      }
    } catch {
      // ignore
    }

    return plans;
  }

  /**
   * 分析项目的联动统计（汇总所有会话）
   */
  async analyzeProjectLinks(projectPath: string): Promise<ProjectLinkStats> {
    const stats: StatsCollector = {
      mcpConnections: new Set(),
      agentCalls: new Set(),
      skillCalls: new Set(),
      commandCalls: new Set(),
      modelsUsed: new Set(),
      totalSessions: 0,
      totalAgentInvocations: 0,
      totalSkillInvocations: 0,
      totalMcpInvocations: 0,
    };

    // 找到项目目录
    const projectsDir = pathService.getHistoryPath();
    const encodedPath = this.encodePath(projectPath);
    const projectDir = join(projectsDir, encodedPath);

    if (!existsSync(projectDir)) {
      return {
        mcpConnections: [],
        agentCalls: [],
        skillCalls: [],
        commandCalls: [],
        modelsUsed: [],
        totalSessions: 0,
        totalAgentInvocations: 0,
        totalSkillInvocations: 0,
        totalMcpInvocations: 0,
      };
    }

    // 遍历所有会话文件
    try {
      const entries = readdirSync(projectDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.jsonl')) {
          await this.analyzeSessionForStats(join(projectDir, entry.name), stats);
          stats.totalSessions++;
        }
      }
    } catch {
      // ignore
    }

    // 转换 Set 为数组
    return {
      mcpConnections: Array.from(stats.mcpConnections),
      agentCalls: Array.from(stats.agentCalls),
      skillCalls: Array.from(stats.skillCalls),
      commandCalls: Array.from(stats.commandCalls),
      modelsUsed: Array.from(stats.modelsUsed),
      totalSessions: stats.totalSessions,
      totalAgentInvocations: stats.totalAgentInvocations,
      totalSkillInvocations: stats.totalSkillInvocations,
      totalMcpInvocations: stats.totalMcpInvocations,
    };
  }

  /**
   * 分析单个会话文件并更新统计
   */
  private async analyzeSessionForStats(
    sessionFile: string,
    stats: StatsCollector
  ): Promise<void> {
    try {
      const stream = createReadStream(sessionFile, { encoding: 'utf-8' });
      const rl = createInterface({ input: stream, crlfDelay: Infinity });

      for await (const line of rl) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line);
          const msg = entry.message;

          if (!msg || typeof msg !== 'object') continue;

          // 提取模型
          if (msg.model) {
            stats.modelsUsed.add(msg.model);
          }

          // 分析工具调用
          const content = msg.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'tool_use') {
                const toolName = block.name || '';

                // 检测 Skill 调用
                if (toolName === 'Skill' || toolName === 'skill') {
                  const skillName = block.input?.skill || block.input?.name;
                  if (skillName) {
                    stats.skillCalls.add(skillName);
                    stats.totalSkillInvocations++;
                  }
                }

                // 检测 Agent 调用
                if (toolName === 'Agent' || toolName === 'agent') {
                  const agentType = block.input?.agent_type || block.input?.type;
                  if (agentType) {
                    stats.agentCalls.add(agentType);
                    stats.totalAgentInvocations++;
                  }
                }

                // 检测 MCP 工具调用
                if (toolName.startsWith('mcp__')) {
                  const parts = toolName.split('__');
                  if (parts.length >= 2) {
                    stats.mcpConnections.add(parts[1]);
                    stats.totalMcpInvocations++;
                  }
                }

                // 检测命令调用
                if (block.input?.skill && typeof block.input.skill === 'string') {
                  if (block.input.skill.startsWith('/')) {
                    stats.commandCalls.add(block.input.skill);
                  }
                }
              }
            }
          }

          // 检测子代理消息
          if (entry.agentId || entry.agent_type) {
            const agentType = entry.agent_type || entry.agentId;
            if (agentType) {
              stats.agentCalls.add(agentType);
            }
          }

        } catch {
          // skip malformed line
        }
      }
    } catch {
      // ignore file read errors
    }
  }
}

// Types
export interface SessionLinks {
  skills: Array<{ name: string; type: string }>;
  agents: Array<{ type: string; name: string }>;
  mcpServers: Array<{ name: string }>;
  models: string[];
  commands: string[];
  fileChanges: FileChangeInfo[];
}

export interface FileChangeInfo {
  filePath: string;
  backupFileName: string;
  versions: number;
  latestVersion: number;
  backupTime: string;
}

export interface TaskInfo {
  id: string;
  subject: string;
  description?: string;
  status: string;
}

export interface TodoInfo {
  id: string;
  content: string;
  completed: boolean;
}

export interface PlanInfo {
  filename: string;
  path: string;
  lastModified: string;
}

export interface ProjectLinkStats {
  mcpConnections: string[];
  agentCalls: string[];
  skillCalls: string[];
  commandCalls: string[];
  modelsUsed: string[];
  totalSessions: number;
  totalAgentInvocations: number;
  totalSkillInvocations: number;
  totalMcpInvocations: number;
}

// 内部使用的统计收集器（使用 Set 去重）
interface StatsCollector {
  mcpConnections: Set<string>;
  agentCalls: Set<string>;
  skillCalls: Set<string>;
  commandCalls: Set<string>;
  modelsUsed: Set<string>;
  totalSessions: number;
  totalAgentInvocations: number;
  totalSkillInvocations: number;
  totalMcpInvocations: number;
}

export const linkageService = LinkageService.getInstance();
