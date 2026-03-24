import { api } from './index';

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

export interface ModelStat {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  totalTokens: number;
}

export interface HeatmapEntry {
  date: string;
  count: number;
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

export const statsApi = {
  getOverview: () => api.get<DashboardOverview>('/api/stats/overview'),
  getRecentSessions: (limit = 10) =>
    api.get<RecentSession[]>(`/api/stats/recent-sessions?limit=${limit}`),
  getMcpServers: () => api.get<McpServerInfo[]>('/api/stats/mcp-servers'),
  getTasks: () => api.get<GlobalTaskInfo[]>('/api/stats/tasks'),
  getTodos: () => api.get<GlobalTodoInfo[]>('/api/stats/todos'),
};
