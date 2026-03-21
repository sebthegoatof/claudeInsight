import type { ProjectMetrics, SessionInfo } from './conversation';

export interface Project {
  encodedPath: string;    // 编码后的目录名
  path: string;            // 解码后的项目路径
  name: string;
  sessionCount: number;
  lastActivityAt: string | null;
  spec_updated_at?: string | null;
  instructions?: string;   // CLAUDE.md 内容
  /** 聚合指标 */
  metrics?: ProjectMetrics;
}

export interface ProjectSpec {
  content: string;
  summary?: string | null;
  sections?: { title: string; level: number }[];
  updatedAt?: string | null;
}

export interface ProjectDashboard {
  project: Project;
  sessions: SessionInfo[];
  stats: {
    totalConversations: number;
    totalMessages: number;
    last7DaysActivity: number;
  };
  spec: ProjectSpec | null;
}

