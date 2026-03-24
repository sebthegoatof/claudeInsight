import { api, apiFetch } from './index';
import type { SkillTreeNode } from '@/types/skill';

// Types
export interface AssetItem {
  id: string;
  name: string;
  type: 'agent' | 'command' | 'style';
  path: string;
  description: string;
  category?: string;
  lastModified: string;
}

export interface AssetDetail extends AssetItem {
  content: string;
}

export interface InstalledPlugin {
  id: string;
  name: string;
  source: string;
  version: string;
  installPath: string;
  installedAt: string;
  lastUpdated: string;
}

export interface Marketplace {
  id: string;
  name: string;
  type: string;
  path?: string;
  url?: string;
}

export interface AssetTreeResponse {
  tree: SkillTreeNode;
}

export interface AssetFileResponse {
  content: string;
  path: string;
}

export interface TaskItem {
  sessionId: string;
  tasks: any[];
  lastModified: string;
}

export interface TodoItem {
  sessionId: string;
  todos: any[];
  lastModified: string;
}

// API
export const assetsApi = {
  // Agents (legacy)
  getAgents: () => api.get<AssetItem[]>('/api/assets/agents'),
  getAgent: (category: string, name: string) =>
    api.get<AssetDetail>(`/api/assets/agents/${category}/${name}`),
  saveAgent: (category: string, name: string, content: string) =>
    api.put<{ success: boolean }>(`/api/assets/agents/${category}/${name}`, { content }),
  deleteAgent: (category: string, name: string) =>
    api.delete<{ success: boolean }>(`/api/assets/agents/${category}/${name}`),

  // Agents (tree)
  getAgentTree: () => api.get<AssetTreeResponse>('/api/assets/agents/tree'),
  getAgentFile: (path: string) =>
    api.get<AssetFileResponse>(`/api/assets/agents/file?path=${encodeURIComponent(path)}`),
  saveAgentFile: (path: string, content: string) =>
    api.post<{ success: boolean; path: string }>('/api/assets/agents/file', { path, content }),
  createAgentNode: (parentPath: string, name: string, type: 'file' | 'directory') =>
    api.post<{ success: boolean; path?: string; error?: string }>('/api/assets/agents/create-node', { parentPath, name, type }),
  deleteAgentNode: (path: string) =>
    apiFetch<{ success: boolean; error?: string }>('/api/assets/agents/delete-node', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    }),

  // Commands (legacy)
  getCommands: () => api.get<AssetItem[]>('/api/assets/commands'),
  getCommand: (category: string, name: string) =>
    api.get<AssetDetail>(`/api/assets/commands/${category}/${name}`),
  saveCommand: (category: string, name: string, content: string) =>
    api.put<{ success: boolean }>(`/api/assets/commands/${category}/${name}`, { content }),
  deleteCommand: (category: string, name: string) =>
    api.delete<{ success: boolean }>(`/api/assets/commands/${category}/${name}`),

  // Commands (tree)
  getCommandTree: () => api.get<AssetTreeResponse>('/api/assets/commands/tree'),
  getCommandFile: (path: string) =>
    api.get<AssetFileResponse>(`/api/assets/commands/file?path=${encodeURIComponent(path)}`),
  saveCommandFile: (path: string, content: string) =>
    api.post<{ success: boolean; path: string }>('/api/assets/commands/file', { path, content }),
  createCommandNode: (parentPath: string, name: string, type: 'file' | 'directory') =>
    api.post<{ success: boolean; path?: string; error?: string }>('/api/assets/commands/create-node', { parentPath, name, type }),
  deleteCommandNode: (path: string) =>
    apiFetch<{ success: boolean; error?: string }>('/api/assets/commands/delete-node', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    }),

  // Styles
  getStyles: () => api.get<AssetItem[]>('/api/assets/styles'),
  getStyle: (name: string) =>
    api.get<AssetDetail>(`/api/assets/styles/${name}`),
  saveStyle: (name: string, content: string) =>
    api.put<{ success: boolean }>(`/api/assets/styles/${name}`, { content }),
  deleteStyle: (name: string) =>
    api.delete<{ success: boolean }>(`/api/assets/styles/${name}`),

  // Plugins
  getPlugins: () => api.get<InstalledPlugin[]>('/api/assets/plugins'),
  getMarketplaces: () => api.get<Marketplace[]>('/api/assets/marketplaces'),
  getBlocklist: () => api.get<string[]>('/api/assets/blocklist'),
  getEnabledPlugins: () => api.get<Record<string, boolean>>('/api/assets/plugins/enabled'),
  togglePluginEnabled: (pluginId: string, enabled: boolean) =>
    api.post<{ success: boolean }>('/api/assets/plugins/toggle', { pluginId, enabled }),

  // Tasks & Todos
  getTasks: () => api.get<TaskItem[]>('/api/assets/tasks'),
  getSessionTasks: (sessionId: string) =>
    api.get<TaskItem>(`/api/assets/tasks/${sessionId}`),
  getTodos: () => api.get<TodoItem[]>('/api/assets/todos'),
};
