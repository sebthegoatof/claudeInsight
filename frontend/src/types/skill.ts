/**
 * 旧版技能类型（保留兼容性）
 */
export interface Skill {
  id: number;
  project_id: number | null;
  name: string;
  file_path: string;
  description: string | null;
  scope: 'global' | 'project';
  metadata: SkillMetadata | null;
  created_at: string;
  updated_at: string;
}

export interface SkillMetadata {
  version?: string;
  author?: string;
  tags?: string[];
  dependencies?: string[];
}

/**
 * 文件树节点
 */
export interface SkillTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  description?: string;
  children?: SkillTreeNode[];
}

/**
 * 技能文件树响应
 */
export interface SkillTreeResponse {
  tree: SkillTreeNode;
}

/**
 * 技能文件内容响应
 */
export interface SkillFileResponse {
  content: string;
  path: string;
}

/**
 * 保存文件请求
 */
export interface SaveFileRequest {
  path: string;
  content: string;
  scope?: 'global' | 'project';
  projectPath?: string;
}

/**
 * 创建节点请求
 */
export interface CreateNodeRequest {
  parentPath?: string;
  name: string;
  type: 'file' | 'directory';
  scope?: 'global' | 'project';
  projectPath?: string;
}

/**
 * 删除节点请求
 */
export interface DeleteNodeRequest {
  path: string;
  scope?: 'global' | 'project';
  projectPath?: string;
}

/**
 * 通用响应
 */
export interface SkillApiResponse {
  success: boolean;
  error?: string;
  path?: string;
}
