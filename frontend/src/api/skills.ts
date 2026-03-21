import { api, apiFetch } from './index';
import type {
  SkillTreeResponse,
  SkillFileResponse,
  SaveFileRequest,
  CreateNodeRequest,
  DeleteNodeRequest,
  SkillApiResponse,
} from '@/types/skill';

export const skillsApi = {
  /**
   * 获取技能文件树
   */
  getTree: (scope: 'global' | 'project' = 'global', projectPath?: string) => {
    const params = new URLSearchParams({ scope });
    if (projectPath) params.append('projectPath', projectPath);
    return api.get<SkillTreeResponse>(`/api/skills/tree?${params}`);
  },

  /**
   * 读取文件内容
   */
  getFile: (path: string, scope: 'global' | 'project' = 'global', projectPath?: string) => {
    const params = new URLSearchParams({ path, scope });
    if (projectPath) params.append('projectPath', projectPath);
    return api.get<SkillFileResponse>(`/api/skills/file?${params}`);
  },

  /**
   * 保存文件内容
   */
  saveFile: (data: SaveFileRequest) =>
    api.post<SkillApiResponse>('/api/skills/file', {
      path: data.path,
      content: data.content,
      scope: data.scope || 'global',
      projectPath: data.projectPath,
    }),

  /**
   * 创建文件或目录
   */
  createNode: (data: CreateNodeRequest) =>
    api.post<SkillApiResponse>('/api/skills/create', {
      parentPath: data.parentPath || '',
      name: data.name,
      type: data.type,
      scope: data.scope || 'global',
      projectPath: data.projectPath,
    }),

  /**
   * 删除文件或目录
   */
  deleteNode: (data: DeleteNodeRequest) => {
    const options: RequestInit = {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: data.path,
        scope: data.scope || 'global',
        projectPath: data.projectPath,
      }),
    };
    return apiFetch<SkillApiResponse>('/api/skills/delete', options);
  },
};
