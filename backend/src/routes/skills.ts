import { FastifyPluginAsync } from 'fastify';
import { skillFileManager } from '../services/skillFileManager.js';

const skillsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * 获取技能文件树
   * GET /api/skills/tree
   * Query params:
   * - scope: 'global' | 'project' (默认 global)
   * - projectPath: 项目路径（当 scope=project 时必需）
   */
  fastify.get<{
    Querystring: { scope?: string; projectPath?: string };
  }>('/tree', async (request) => {
    const { scope = 'global', projectPath } = request.query;

    if (scope !== 'global' && scope !== 'project') {
      return { error: 'Invalid scope. Must be "global" or "project"' };
    }

    if (scope === 'project' && !projectPath) {
      return { error: 'projectPath is required when scope is "project"' };
    }

    const tree = skillFileManager.getSkillTree(
      scope as 'global' | 'project',
      projectPath
    );

    return { tree };
  });

  /**
   * 读取技能文件内容
   * GET /api/skills/file
   * Query params:
   * - path: 相对路径（必需）
   * - scope: 'global' | 'project' (默认 global)
   * - projectPath: 项目路径（当 scope=project 时必需）
   */
  fastify.get<{
    Querystring: { path?: string; scope?: string; projectPath?: string };
  }>('/file', async (request, reply) => {
    const { path, scope = 'global', projectPath } = request.query;

    if (!path) {
      reply.code(400);
      return { error: 'Path is required' };
    }

    if (scope !== 'global' && scope !== 'project') {
      reply.code(400);
      return { error: 'Invalid scope' };
    }

    if (scope === 'project' && !projectPath) {
      reply.code(400);
      return { error: 'projectPath is required when scope is "project"' };
    }

    const content = skillFileManager.readFile(
      path,
      scope as 'global' | 'project',
      projectPath
    );

    if (content === null) {
      reply.code(404);
      return { error: 'File not found' };
    }

    return { content, path };
  });

  /**
   * 保存技能文件内容
   * POST /api/skills/file
   * Body:
   * - path: 相对路径（必需）
   * - content: 文件内容（必需）
   * - scope: 'global' | 'project' (默认 global)
   * - projectPath: 项目路径（当 scope=project 时必需）
   */
  fastify.post<{
    Body: {
      path?: string;
      content?: string;
      scope?: string;
      projectPath?: string;
    };
  }>('/file', async (request, reply) => {
    const { path, content, scope = 'global', projectPath } = request.body;

    if (!path) {
      reply.code(400);
      return { error: 'Path is required' };
    }

    if (content === undefined) {
      reply.code(400);
      return { error: 'Content is required' };
    }

    if (scope !== 'global' && scope !== 'project') {
      reply.code(400);
      return { error: 'Invalid scope' };
    }

    if (scope === 'project' && !projectPath) {
      reply.code(400);
      return { error: 'projectPath is required when scope is "project"' };
    }

    const result = skillFileManager.saveFile(
      path,
      content,
      scope as 'global' | 'project',
      projectPath
    );

    if (!result.success) {
      reply.code(500);
      return { error: result.error || 'Failed to save file' };
    }

    return { success: true, path };
  });

  /**
   * 创建文件或目录
   * POST /api/skills/create
   * Body:
   * - parentPath: 父目录路径（空字符串表示根目录）
   * - name: 名称（必需）
   * - type: 'file' | 'directory'（必需）
   * - scope: 'global' | 'project' (默认 global)
   * - projectPath: 项目路径（当 scope=project 时必需）
   */
  fastify.post<{
    Body: {
      parentPath?: string;
      name?: string;
      type?: string;
      scope?: string;
      projectPath?: string;
    };
  }>('/create', async (request, reply) => {
    const { parentPath = '', name, type, scope = 'global', projectPath } = request.body;

    if (!name) {
      reply.code(400);
      return { error: 'Name is required' };
    }

    if (type !== 'file' && type !== 'directory') {
      reply.code(400);
      return { error: 'Type must be "file" or "directory"' };
    }

    if (scope !== 'global' && scope !== 'project') {
      reply.code(400);
      return { error: 'Invalid scope' };
    }

    if (scope === 'project' && !projectPath) {
      reply.code(400);
      return { error: 'projectPath is required when scope is "project"' };
    }

    const result = skillFileManager.createNode(
      parentPath,
      name,
      type as 'file' | 'directory',
      scope as 'global' | 'project',
      projectPath
    );

    if (!result.success) {
      reply.code(400);
      return { error: result.error || 'Failed to create' };
    }

    return { success: true, path: result.path };
  });

  /**
   * 删除文件或目录
   * DELETE /api/skills/delete
   * Body:
   * - path: 相对路径（必需）
   * - scope: 'global' | 'project' (默认 global)
   * - projectPath: 项目路径（当 scope=project 时必需）
   */
  fastify.delete<{
    Body: {
      path?: string;
      scope?: string;
      projectPath?: string;
    };
  }>('/delete', async (request, reply) => {
    const { path, scope = 'global', projectPath } = request.body;

    if (!path) {
      reply.code(400);
      return { error: 'Path is required' };
    }

    if (scope !== 'global' && scope !== 'project') {
      reply.code(400);
      return { error: 'Invalid scope' };
    }

    if (scope === 'project' && !projectPath) {
      reply.code(400);
      return { error: 'projectPath is required when scope is "project"' };
    }

    const result = skillFileManager.deleteNode(
      path,
      scope as 'global' | 'project',
      projectPath
    );

    if (!result.success) {
      reply.code(400);
      return { error: result.error || 'Failed to delete' };
    }

    return { success: true };
  });
};

export default skillsRoutes;
