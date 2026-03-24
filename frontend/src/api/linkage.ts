import { api } from './index';

export interface SessionLinks {
  sessionId: string;
  skills: Array<{ name: string; type: string }>;
  agents: Array<{ type: string; name: string }>;
  mcpServers: Array<{ name: string }>;
  models: string[];
  commands: string[];
  tasks: TaskInfo[];
  todos: TodoInfo[];
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

export const linkageApi = {
  getSessionLinks: (sessionId: string, projectPath: string) =>
    api.get<SessionLinks>(`/api/history/sessions/${sessionId}/links?projectPath=${encodeURIComponent(projectPath)}`),

  getProjectLinkStats: (encodedPath: string) =>
    api.get<ProjectLinkStats>(`/api/history/projects/${encodeURIComponent(encodedPath)}/linkage-stats`),
};

// 导出增强功能
export interface ExportOptions {
  projectPath: string;
  sessionIds: string[];
  includeLinkedAssets?: boolean;
}

export const exportApi = {
  // 导出会话（带可选资产）
  exportSessions: async (options: ExportOptions) => {
    const params = new URLSearchParams();
    params.append('projectPath', options.projectPath);
    options.sessionIds.forEach(id => params.append('sessionIds', id));
    if (options.includeLinkedAssets) {
      params.append('includeAssets', 'true');
    }

    const response = await fetch(
      `${import.meta.env.VITE_API_BASE || 'http://localhost:3000'}/api/history/sessions/export?${params}`,
      { method: 'POST' }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Export failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'claude-sessions-export.zip';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match) filename = match[1];
    }

    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return { success: true };
  },
};
