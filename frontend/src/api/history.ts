import { api } from './index';
import type { SessionInfo, SessionDetail, PaginatedResponse } from '../types/conversation';
import type { Project } from '../types/project';
import type { SearchResponse } from '../types/search';
import type { Skill } from '../types/skill';

import type { ProjectSpec } from '../types/project';

export const historyApi = {
  // 获取项目列表
  getProjects: () => api.get<Project[]>('/api/history/projects'),

  // 获取项目详情
  getProject: (encodedPath: string) => api.get<Project>(`/api/history/projects/${encodeURIComponent(encodedPath)}`),

  // 获取项目规范 (CLAUDE.md)
  getProjectSpec: (encodedPath: string) =>
    api.get<ProjectSpec>(`/api/history/projects/${encodeURIComponent(encodedPath)}/spec`),

  // 更新项目规范
  updateProjectSpec: (encodedPath: string, content: string) =>
    api.put<{ success: boolean; spec: ProjectSpec }>(`/api/history/projects/${encodeURIComponent(encodedPath)}/spec`, { content }),

  // 获取项目技能列表
  getProjectSkills: (encodedPath: string) =>
    api.get<Skill[]>(`/api/history/projects/${encodeURIComponent(encodedPath)}/skills`),

  // 获取全局技能
  getGlobalSkills: () =>
    api.get<Skill[]>('/api/history/skills/global'),

  // 获取项目概览数据
  getProjectDashboard: (encodedPath: string) =>
    api.get<{
      project: Project;
      sessions: SessionInfo[];
      stats: {
        totalConversations: number;
        totalMessages: number;
        last7DaysActivity: number;
      };
    }>(`/api/history/projects/${encodeURIComponent(encodedPath)}/dashboard`),

  // 获取全局时间轴
  getTimeline: (page = 1, pageSize = 20, withMetrics = false) =>
    api.get<PaginatedResponse<SessionInfo>>(`/api/history/timeline?page=${page}&pageSize=${pageSize}&withMetrics=${withMetrics}`),

  // 获取项目下的会话列表
  getProjectSessions: (encodedPath: string, page = 1, pageSize = 20, withMetrics = false) =>
    api.get<PaginatedResponse<SessionInfo> & { project: { encodedPath: string; path: string } }>(
      `/api/history/projects/${encodeURIComponent(encodedPath)}/sessions?page=${page}&pageSize=${pageSize}&withMetrics=${withMetrics}`
    ),

  // 获取会话详情
  getSession: (sessionId: string, projectPath: string) => {
    const params = new URLSearchParams({ projectPath });
    return api.get<SessionDetail>(`/api/history/sessions/${sessionId}?${params}`);
  },

  // 获取完整的 tool-result 日志（按需加载）
  getToolResult: (sessionId: string, projectPath: string, filePath: string) => {
    const params = new URLSearchParams({ projectPath, filePath });
    return api.get<{ content: string; filePath: string }>(
      `/api/history/sessions/${sessionId}/tool-result?${params}`
    );
  },

  // 全文搜索
  search: (query: string, page = 1, pageSize = 20, projectPath?: string) => {
    const params = new URLSearchParams({ q: query, page: String(page), pageSize: String(pageSize) });
    if (projectPath) params.append('projectPath', projectPath);
    return api.get<SearchResponse>(`/api/history/search?${params}`);
  },

  // 获取统计数据
  getStats: () => api.get<{
    totalConversations: number;
    totalProjects: number;
    totalMessages: number;
    // Token 统计
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    cacheHitTokens: number;
    cacheCreationTokens: number;
    recentProjects: Project[];
    recentConversations: SessionInfo[];
  }>('/api/history/stats'),

  // 技能管理
  createSkill: (projectEncodedPath: string, data: { name: string; description?: string; content?: string }) =>
    api.post<{ success: boolean; skill: Skill }>(`/api/history/projects/${encodeURIComponent(projectEncodedPath)}/skills`, data),

  updateSkill: (skillId: number, data: { name: string; description?: string; content?: string }) =>
    api.put<{ success: boolean; skill: Skill }>(`/api/history/skills/${skillId}`, data),

  deleteSkill: (skillId: number) =>
    api.delete<{ success: boolean }>(`/api/history/skills/${skillId}`),

  scanProjectSkills: (projectEncodedPath: string) =>
    api.post<{ success: boolean; count: number; errors?: string[] }>(`/api/history/projects/${encodeURIComponent(projectEncodedPath)}/skills/scan`),

  refreshProjectSpec: (projectEncodedPath: string) =>
    api.post<{ success: boolean; spec: ProjectSpec }>(`/api/history/projects/${encodeURIComponent(projectEncodedPath)}/spec/refresh`),

  // ==================== Import/Export APIs ====================

  /**
   * 导出会话为 ZIP 文件
   * @param projectPath 项目路径
   * @param sessionIds 会话 ID 数组，如果为空或包含 "all" 则导出所有会话
   */
  exportSessions: async (projectPath: string, sessionIds: string[]) => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:3000'}/api/history/sessions/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ projectPath, sessionIds }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Export failed');
    }

    // 获取 Blob
    const blob = await response.blob();

    // 触发下载
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    // 从响应头获取文件名，或使用默认值
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'claude-sessions-export.zip';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match) {
        filename = match[1];
      }
    }

    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return { success: true };
  },

  /**
   * 导入会话 ZIP 文件
   * @param file ZIP 文件
   * @param targetProjectId 目标项目的 encodedPath
   */
  importSessions: async (file: File, targetProjectId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetProjectId', targetProjectId);

    const response = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:3000'}/api/history/sessions/import`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Import failed');
    }

    return response.json() as Promise<{ success: boolean; message: string; targetProjectId: string }>;
  },
};
