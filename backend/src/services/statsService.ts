import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { pathService } from './pathService.js';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { fileScanner } from './fileScanner.js';

/**
 * StatsService - 统计数据服务
 * 聚合 stats-cache.json + history.jsonl 数据
 */
export class StatsService {
  private static instance: StatsService;

  private constructor() {}

  static getInstance(): StatsService {
    if (!StatsService.instance) {
      StatsService.instance = new StatsService();
    }
    return StatsService.instance;
  }

  /**
   * 读取 stats-cache.json
   */
  private readStatsCache(): Record<string, unknown> | null {
    try {
      const filePath = join(pathService.getClaudePath(), 'stats-cache.json');
      if (!existsSync(filePath)) return null;
      const content = readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * 读取 history.jsonl 并聚合
   */
  private async readHistoryLog(): Promise<HistoryEntry[]> {
    const filePath = join(pathService.getClaudePath(), 'history.jsonl');
    if (!existsSync(filePath)) return [];

    const entries: HistoryEntry[] = [];
    const stream = createReadStream(filePath, { encoding: 'utf-8' });
    const rl = createInterface({ input: stream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        // timestamp 可能是 epoch 毫秒数或 ISO 字符串
        let ts = entry.timestamp || '';
        if (typeof ts === 'number') {
          ts = new Date(ts).toISOString();
        }
        entries.push({
          display: entry.display || '',
          timestamp: ts,
          project: entry.project || '',
          sessionId: entry.sessionId || '',
          type: entry.type || 'user',
        });
      } catch {
        // skip malformed lines
      }
    }

    return entries;
  }

  /**
   * 获取 Dashboard 概览数据
   */
  async getOverview(): Promise<DashboardOverview> {
    const [statsCache, historyEntries, modelStats] = await Promise.all([
      this.readStatsCache(),
      this.readHistoryLog(),
      this.scanRealTokenUsage(),
    ]);

    // 使用实时扫描数据（与设置页保持一致）
    const realTimeStats = fileScanner.getStats();
    const messageStats = await fileScanner.getGlobalMessageStats();
    const totalSessions = realTimeStats.totalSessions;
    const totalMessages = messageStats.totalMessages;
    const firstUsedDate = (statsCache?.firstSessionDate as string) || '';

    // dailyActivity: [{ date, messageCount, sessionCount, toolCallCount }]
    const dailyActivityArr = (statsCache?.dailyActivity as DailyActivityEntry[]) || [];
    const dailyActivity: Record<string, number> = {};
    for (const day of dailyActivityArr) {
      if (day.date) dailyActivity[day.date] = day.messageCount || 0;
    }

    // longestSession: { sessionId, duration (ms), messageCount, timestamp }
    const ls = statsCache?.longestSession as Record<string, unknown> | null;

    // hourCounts: { "8": 4, "16": 30, ... }
    const hourCounts = (statsCache?.hourCounts as Record<string, number>) || {};
    let peakHour: { hour: number; count: number } | null = null;
    let maxHourCount = 0;
    for (const [h, c] of Object.entries(hourCounts)) {
      if (c > maxHourCount) {
        maxHourCount = c;
        peakHour = { hour: parseInt(h, 10), count: c };
      }
    }

    // 从 history.jsonl 聚合
    const heatmapData = this.buildHeatmap(historyEntries);
    const hourlyDistribution = this.buildHourlyDistributionFromCache(hourCounts);
    const activeDays = new Set(
      historyEntries
        .filter(e => e.timestamp)
        .map(e => e.timestamp.split('T')[0])
    ).size;

    // 最近 7 天活跃度
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentEntries = historyEntries.filter(e => {
      if (!e.timestamp) return false;
      return new Date(e.timestamp) >= sevenDaysAgo;
    });

    return {
      totalSessions,
      totalMessages,
      activeDays,
      firstUsedDate,
      recentActivityCount: recentEntries.length,
      longestSession: ls ? {
        sessionId: (ls.sessionId as string) || '',
        durationSeconds: Math.floor(((ls.duration as number) || 0) / 1000),
        messageCount: (ls.messageCount as number) || 0,
      } : null,
      peakHour,
      modelStats,
      heatmapData,
      hourlyDistribution,
      dailyActivity,
    };
  }

  /**
   * 递归收集所有 JSONL 文件路径
   */
  private collectJsonlFiles(dir: string): string[] {
    const files: string[] = [];
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...this.collectJsonlFiles(fullPath));
        } else if (entry.name.endsWith('.jsonl') && !entry.name.includes('prompt_suggestion')) {
          files.push(fullPath);
        }
      }
    } catch {
      // permission denied etc
    }
    return files;
  }

  /**
   * 从所有 JSONL 文件实时扫描模型 token 用量
   * token 数据在 message.usage 中
   */
  private async scanRealTokenUsage(): Promise<ModelStat[]> {
    const projectsDir = pathService.getHistoryPath();
    if (!existsSync(projectsDir)) return [];

    const modelMap = new Map<string, {
      input: number; output: number; cacheRead: number; cacheCreate: number;
    }>();

    const jsonlFiles = this.collectJsonlFiles(projectsDir);

    for (const filePath of jsonlFiles) {
      try {
        const stream = createReadStream(filePath, { encoding: 'utf-8' });
        const rl = createInterface({ input: stream, crlfDelay: Infinity });

        for await (const line of rl) {
          if (!line.trim()) continue;
          try {
            const entry = JSON.parse(line);
            const msg = entry.message;
            if (!msg || typeof msg !== 'object') continue;
            const usage = msg.usage;
            if (!usage || typeof usage !== 'object') continue;

            const inp = usage.input_tokens || 0;
            const out = usage.output_tokens || 0;
            const cr = usage.cache_read_input_tokens || 0;
            const cc = usage.cache_creation_input_tokens || 0;
            if (inp === 0 && out === 0 && cr === 0 && cc === 0) continue;

            const model = msg.model || entry.model || 'unknown';
            const existing = modelMap.get(model);
            if (existing) {
              existing.input += inp;
              existing.output += out;
              existing.cacheRead += cr;
              existing.cacheCreate += cc;
            } else {
              modelMap.set(model, { input: inp, output: out, cacheRead: cr, cacheCreate: cc });
            }
          } catch {
            // skip malformed line
          }
        }
      } catch {
        // skip unreadable file
      }
    }

    return Array.from(modelMap.entries()).map(([model, t]) => ({
      model,
      inputTokens: t.input,
      outputTokens: t.output,
      cacheReadTokens: t.cacheRead,
      cacheCreationTokens: t.cacheCreate,
      totalTokens: t.input + t.output + t.cacheRead + t.cacheCreate,
    }));
  }

  /**
   * 构建活跃热力图数据（每日）
   */
  private buildHeatmap(entries: HistoryEntry[]): HeatmapEntry[] {
    const dayMap = new Map<string, number>();
    for (const entry of entries) {
      if (!entry.timestamp) continue;
      const day = entry.timestamp.split('T')[0];
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
    }

    return Array.from(dayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 从 stats-cache 的 hourCounts 构建每小时分布
   */
  private buildHourlyDistributionFromCache(hourCounts: Record<string, number>): number[] {
    const hours = new Array(24).fill(0);
    for (const [h, c] of Object.entries(hourCounts)) {
      const hour = parseInt(h, 10);
      if (hour >= 0 && hour < 24) {
        hours[hour] = c;
      }
    }
    return hours;
  }

  /**
   * 获取最近会话列表（从 history.jsonl）
   */
  async getRecentSessions(limit = 10): Promise<RecentSession[]> {
    const entries = await this.readHistoryLog();

    // 按 sessionId 去重，取最新的
    const sessionMap = new Map<string, HistoryEntry>();
    for (const entry of entries) {
      if (!entry.sessionId) continue;
      const existing = sessionMap.get(entry.sessionId);
      if (!existing || entry.timestamp > existing.timestamp) {
        sessionMap.set(entry.sessionId, entry);
      }
    }

    return Array.from(sessionMap.values())
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit)
      .map(e => ({
        sessionId: e.sessionId,
        display: e.display,
        timestamp: e.timestamp,
        project: e.project,
      }));
  }

  /**
   * 获取 MCP 服务器配置列表
   */
  getMcpServers(): McpServerInfo[] {
    try {
      const settingsPath = join(pathService.getClaudePath(), 'settings.json');
      if (!existsSync(settingsPath)) return [];
      const content = readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(content);
      const mcpServers = settings.mcpServers || {};
      return Object.entries(mcpServers).map(([name, config]: [string, any]) => ({
        name,
        command: config.command || '',
        args: config.args || [],
        type: config.command?.includes('npx') ? 'npx' : config.command?.includes('node') ? 'node' : 'other',
      }));
    } catch {
      return [];
    }
  }

  /**
   * 获取所有会话的 Tasks
   */
  getAllTasks(): GlobalTaskInfo[] {
    const tasksDir = join(pathService.getClaudePath(), 'tasks');
    if (!existsSync(tasksDir)) return [];

    const tasks: GlobalTaskInfo[] = [];
    try {
      const files = readdirSync(tasksDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const filePath = join(tasksDir, file);
        const sessionId = file.replace('.json', '');
        try {
          const content = readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);
          const fileStat = statSync(filePath);
          const sessionTasks = data.tasks || [];

          for (const task of sessionTasks) {
            tasks.push({
              id: task.id,
              sessionId,
              subject: task.subject,
              description: task.description || '',
              status: task.status,
              createdAt: fileStat.birthtime.toISOString(),
              updatedAt: fileStat.mtime.toISOString(),
            });
          }
        } catch {
          // skip invalid file
        }
      }
    } catch {
      // ignore
    }

    return tasks.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  /**
   * 获取所有会话的 Todos
   */
  getAllTodos(): GlobalTodoInfo[] {
    const todosDir = join(pathService.getClaudePath(), 'todos');
    if (!existsSync(todosDir)) return [];

    const todos: GlobalTodoInfo[] = [];
    try {
      const files = readdirSync(todosDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const filePath = join(todosDir, file);
        const sessionId = file.replace('.json', '');
        try {
          const content = readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);
          const fileStat = statSync(filePath);
          const sessionTodos = Array.isArray(data) ? data : (data.todos || []);

          for (const todo of sessionTodos) {
            todos.push({
              id: todo.id,
              sessionId,
              content: todo.content,
              completed: todo.completed || false,
              updatedAt: fileStat.mtime.toISOString(),
            });
          }
        } catch {
          // skip invalid file
        }
      }
    } catch {
      // ignore
    }

    return todos.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
}

// Types
interface HistoryEntry {
  display: string;
  timestamp: string;
  project: string;
  sessionId: string;
  type: string;
}

interface DailyActivityEntry {
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
}

export interface HeatmapEntry {
  date: string;
  count: number;
}

export interface ModelStat {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  totalTokens: number;
}

export interface RecentSession {
  sessionId: string;
  display: string;
  timestamp: string;
  project: string;
}

export interface McpServerInfo {
  name: string;
  command: string;
  args: string[];
  type: string;
}

export interface DashboardOverview {
  totalSessions: number;
  totalMessages: number;
  activeDays: number;
  firstUsedDate: string;
  recentActivityCount: number;
  longestSession: {
    sessionId: string;
    durationSeconds: number;
    messageCount: number;
  } | null;
  peakHour: {
    hour: number;
    count: number;
  } | null;
  modelStats: ModelStat[];
  heatmapData: HeatmapEntry[];
  hourlyDistribution: number[];
  dailyActivity: Record<string, number>;
}

export interface GlobalTaskInfo {
  id: string;
  sessionId: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface GlobalTodoInfo {
  id: string;
  sessionId: string;
  content: string;
  completed: boolean;
  updatedAt: string;
}

export const statsService = StatsService.getInstance();
