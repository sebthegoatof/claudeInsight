import { FastifyPluginAsync } from 'fastify';
import { assetScanner } from '../services/assetScanner.js';
import { backupService } from '../services/backupService.js';

const assetsRoutes: FastifyPluginAsync = async (fastify) => {
  // ==================== Agents ====================

  /**
   * 获取 Agent 列表
   * GET /api/assets/agents
   */
  fastify.get('/agents', async () => {
    return assetScanner.scanAgents();
  });

  /**
   * 获取 Agent 文件树
   * GET /api/assets/agents/tree
   */
  fastify.get('/agents/tree', async () => {
    return { tree: assetScanner.getAgentTree() };
  });

  /**
   * 读取 Agent 文件内容（按相对路径）
   * GET /api/assets/agents/file?path=...
   */
  fastify.get<{ Querystring: { path?: string } }>(
    '/agents/file',
    async (request, reply) => {
      const { path } = request.query;
      if (!path) { reply.code(400); return { error: 'Path is required' }; }
      const content = assetScanner.readAssetFile('agents', path);
      if (content === null) { reply.code(404); return { error: 'File not found' }; }
      return { content, path };
    }
  );

  /**
   * 保存 Agent 文件内容（按相对路径）
   * POST /api/assets/agents/file
   */
  fastify.post<{ Body: { path?: string; content?: string } }>(
    '/agents/file',
    async (request, reply) => {
      const { path, content } = request.body;
      if (!path || content === undefined) { reply.code(400); return { error: 'Path and content are required' }; }
      const result = assetScanner.saveAssetFile('agents', path, content);
      if (!result.success) { reply.code(500); return { error: result.error }; }
      return { success: true, path };
    }
  );

  /**
   * 在 Agent 目录中创建文件或目录
   * POST /api/assets/agents/create-node
   */
  fastify.post<{ Body: { parentPath?: string; name?: string; type?: string } }>(
    '/agents/create-node',
    async (request, reply) => {
      const { parentPath = '', name, type } = request.body;
      if (!name || (type !== 'file' && type !== 'directory')) {
        reply.code(400); return { error: 'Name and valid type required' };
      }
      const result = assetScanner.createAssetNode('agents', parentPath, name, type as 'file' | 'directory');
      if (!result.success) { reply.code(400); return { error: result.error }; }
      return { success: true, path: result.path };
    }
  );

  /**
   * 删除 Agent 文件或目录
   * DELETE /api/assets/agents/delete-node
   */
  fastify.delete<{ Body: { path?: string } }>(
    '/agents/delete-node',
    async (request, reply) => {
      const { path } = request.body as { path?: string };
      if (!path) { reply.code(400); return { error: 'Path is required' }; }
      const result = assetScanner.deleteAssetNode('agents', path);
      if (!result.success) { reply.code(400); return { error: result.error }; }
      return { success: true };
    }
  );

  /**
   * 获取 Agent 详情
   * GET /api/assets/agents/:category/:name
   */
  fastify.get<{ Params: { category: string; name: string } }>(
    '/agents/:category/:name',
    async (request, reply) => {
      const { category, name } = request.params;
      const agent = assetScanner.getAgent(category, name);
      if (!agent) {
        reply.code(404);
        return { error: 'Agent not found' };
      }
      return agent;
    }
  );

  /**
   * 保存 Agent
   * PUT /api/assets/agents/:category/:name
   */
  fastify.put<{ Params: { category: string; name: string }; Body: { content: string } }>(
    '/agents/:category/:name',
    async (request, reply) => {
      const { category, name } = request.params;
      const { content } = request.body;
      if (!content) {
        reply.code(400);
        return { error: 'Content is required' };
      }
      const success = assetScanner.saveAgent(category, name, content);
      if (!success) {
        reply.code(500);
        return { error: 'Failed to save agent' };
      }
      return { success: true };
    }
  );

  /**
   * 删除 Agent
   * DELETE /api/assets/agents/:category/:name
   */
  fastify.delete<{ Params: { category: string; name: string } }>(
    '/agents/:category/:name',
    async (request, reply) => {
      const { category, name } = request.params;
      const success = assetScanner.deleteAgent(category, name);
      if (!success) {
        reply.code(500);
        return { error: 'Failed to delete agent' };
      }
      return { success: true };
    }
  );

  // ==================== Commands ====================

  /**
   * 获取 Command 列表
   * GET /api/assets/commands
   */
  fastify.get('/commands', async () => {
    return assetScanner.scanCommands();
  });

  /**
   * 获取 Command 文件树
   * GET /api/assets/commands/tree
   */
  fastify.get('/commands/tree', async () => {
    return { tree: assetScanner.getCommandTree() };
  });

  /**
   * 读取 Command 文件内容（按相对路径）
   * GET /api/assets/commands/file?path=...
   */
  fastify.get<{ Querystring: { path?: string } }>(
    '/commands/file',
    async (request, reply) => {
      const { path } = request.query;
      if (!path) { reply.code(400); return { error: 'Path is required' }; }
      const content = assetScanner.readAssetFile('commands', path);
      if (content === null) { reply.code(404); return { error: 'File not found' }; }
      return { content, path };
    }
  );

  /**
   * 保存 Command 文件内容（按相对路径）
   * POST /api/assets/commands/file
   */
  fastify.post<{ Body: { path?: string; content?: string } }>(
    '/commands/file',
    async (request, reply) => {
      const { path, content } = request.body;
      if (!path || content === undefined) { reply.code(400); return { error: 'Path and content are required' }; }
      const result = assetScanner.saveAssetFile('commands', path, content);
      if (!result.success) { reply.code(500); return { error: result.error }; }
      return { success: true, path };
    }
  );

  /**
   * 在 Command 目录中创建文件或目录
   * POST /api/assets/commands/create-node
   */
  fastify.post<{ Body: { parentPath?: string; name?: string; type?: string } }>(
    '/commands/create-node',
    async (request, reply) => {
      const { parentPath = '', name, type } = request.body;
      if (!name || (type !== 'file' && type !== 'directory')) {
        reply.code(400); return { error: 'Name and valid type required' };
      }
      const result = assetScanner.createAssetNode('commands', parentPath, name, type as 'file' | 'directory');
      if (!result.success) { reply.code(400); return { error: result.error }; }
      return { success: true, path: result.path };
    }
  );

  /**
   * 删除 Command 文件或目录
   * DELETE /api/assets/commands/delete-node
   */
  fastify.delete<{ Body: { path?: string } }>(
    '/commands/delete-node',
    async (request, reply) => {
      const { path } = request.body as { path?: string };
      if (!path) { reply.code(400); return { error: 'Path is required' }; }
      const result = assetScanner.deleteAssetNode('commands', path);
      if (!result.success) { reply.code(400); return { error: result.error }; }
      return { success: true };
    }
  );

  /**
   * 获取 Command 详情
   * GET /api/assets/commands/:category/:name
   */
  fastify.get<{ Params: { category: string; name: string } }>(
    '/commands/:category/:name',
    async (request, reply) => {
      const { category, name } = request.params;
      const command = assetScanner.getCommand(category, name);
      if (!command) {
        reply.code(404);
        return { error: 'Command not found' };
      }
      return command;
    }
  );

  /**
   * 保存 Command
   * PUT /api/assets/commands/:category/:name
   */
  fastify.put<{ Params: { category: string; name: string }; Body: { content: string } }>(
    '/commands/:category/:name',
    async (request, reply) => {
      const { category, name } = request.params;
      const { content } = request.body;
      if (!content) {
        reply.code(400);
        return { error: 'Content is required' };
      }
      const success = assetScanner.saveCommand(category, name, content);
      if (!success) {
        reply.code(500);
        return { error: 'Failed to save command' };
      }
      return { success: true };
    }
  );

  /**
   * 删除 Command
   * DELETE /api/assets/commands/:category/:name
   */
  fastify.delete<{ Params: { category: string; name: string } }>(
    '/commands/:category/:name',
    async (request, reply) => {
      const { category, name } = request.params;
      const success = assetScanner.deleteCommand(category, name);
      if (!success) {
        reply.code(500);
        return { error: 'Failed to delete command' };
      }
      return { success: true };
    }
  );

  // ==================== Output Styles ====================

  /**
   * 获取 Output Style 列表
   * GET /api/assets/styles
   */
  fastify.get('/styles', async () => {
    return assetScanner.scanOutputStyles();
  });

  /**
   * 获取 Output Style 详情
   * GET /api/assets/styles/:name
   */
  fastify.get<{ Params: { name: string } }>(
    '/styles/:name',
    async (request, reply) => {
      const { name } = request.params;
      const style = assetScanner.getOutputStyle(name);
      if (!style) {
        reply.code(404);
        return { error: 'Style not found' };
      }
      return style;
    }
  );

  /**
   * 保存 Output Style
   * PUT /api/assets/styles/:name
   */
  fastify.put<{ Params: { name: string }; Body: { content: string } }>(
    '/styles/:name',
    async (request, reply) => {
      const { name } = request.params;
      const { content } = request.body;
      if (!content) {
        reply.code(400);
        return { error: 'Content is required' };
      }
      const success = assetScanner.saveOutputStyle(name, content);
      if (!success) {
        reply.code(500);
        return { error: 'Failed to save style' };
      }
      return { success: true };
    }
  );

  /**
   * 删除 Output Style
   * DELETE /api/assets/styles/:name
   */
  fastify.delete<{ Params: { name: string } }>(
    '/styles/:name',
    async (request, reply) => {
      const { name } = request.params;
      const success = assetScanner.deleteOutputStyle(name);
      if (!success) {
        reply.code(500);
        return { error: 'Failed to delete style' };
      }
      return { success: true };
    }
  );

  // ==================== Plugins ====================

  /**
   * 获取已安装插件列表
   * GET /api/assets/plugins
   */
  fastify.get('/plugins', async () => {
    return assetScanner.getInstalledPlugins();
  });

  /**
   * 获取市场列表
   * GET /api/assets/marketplaces
   */
  fastify.get('/marketplaces', async () => {
    return assetScanner.getMarketplaces();
  });

  /**
   * 获取插件黑名单
   * GET /api/assets/blocklist
   */
  fastify.get('/blocklist', async () => {
    return assetScanner.getBlocklist();
  });

  /**
   * 获取插件启用状态
   * GET /api/assets/plugins/enabled
   */
  fastify.get('/plugins/enabled', async () => {
    return assetScanner.getEnabledPlugins();
  });

  /**
   * 切换插件启用/禁用状态
   * POST /api/assets/plugins/toggle
   */
  fastify.post<{ Body: { pluginId?: string; enabled?: boolean } }>(
    '/plugins/toggle',
    async (request, reply) => {
      const { pluginId, enabled } = request.body;
      if (!pluginId || typeof enabled !== 'boolean') {
        reply.code(400);
        return { error: 'pluginId and enabled are required' };
      }
      const success = assetScanner.togglePluginEnabled(pluginId, enabled);
      if (!success) {
        reply.code(500);
        return { error: 'Failed to toggle plugin' };
      }
      return { success: true };
    }
  );

  // ==================== Tasks & Todos ====================

  /**
   * 获取所有 Tasks
   * GET /api/assets/tasks
   */
  fastify.get('/tasks', async () => {
    return assetScanner.scanTasks();
  });

  /**
   * 获取指定会话的 Tasks
   * GET /api/assets/tasks/:sessionId
   */
  fastify.get<{ Params: { sessionId: string } }>(
    '/tasks/:sessionId',
    async (request, reply) => {
      const { sessionId } = request.params;
      const tasks = assetScanner.getSessionTasks(sessionId);
      if (!tasks) {
        reply.code(404);
        return { error: 'Tasks not found' };
      }
      return tasks;
    }
  );

  /**
   * 获取所有 Todos
   * GET /api/assets/todos
   */
  fastify.get('/todos', async () => {
    return assetScanner.scanTodos();
  });

  // ==================== Backups ====================

  /**
   * 获取备份列表
   * GET /api/assets/backups
   */
  fastify.get('/backups', async () => {
    return backupService.getBackups();
  });

  /**
   * 获取备份详情
   * GET /api/assets/backups/:id
   */
  fastify.get<{ Params: { id: string } }>(
    '/backups/:id',
    async (request, reply) => {
      const { id } = request.params;
      const backup = backupService.getBackup(id);
      if (!backup) {
        reply.code(404);
        return { error: 'Backup not found' };
      }
      return backup;
    }
  );

  /**
   * 比较两个备份
   * GET /api/assets/backups/compare/:id1/:id2
   */
  fastify.get<{ Params: { id1: string; id2: string } }>(
    '/backups/compare/:id1/:id2',
    async (request, reply) => {
      const { id1, id2 } = request.params;
      const diff = backupService.compareBackups(id1, id2);
      if (!diff) {
        reply.code(404);
        return { error: 'One or both backups not found' };
      }
      return diff;
    }
  );

  /**
   * 比较备份与当前配置
   * GET /api/assets/backups/compare/:id/current
   */
  fastify.get<{ Params: { id: string } }>(
    '/backups/compare/:id/current',
    async (request, reply) => {
      const { id } = request.params;
      const diff = backupService.compareWithCurrent(id);
      if (!diff) {
        reply.code(404);
        return { error: 'Backup not found' };
      }
      return diff;
    }
  );

  // ==================== Plans ====================

  /**
   * 获取计划列表
   * GET /api/assets/plans
   */
  fastify.get('/plans', async () => {
    return backupService.getPlans();
  });

  /**
   * 获取计划详情
   * GET /api/assets/plans/:id
   */
  fastify.get<{ Params: { id: string } }>(
    '/plans/:id',
    async (request, reply) => {
      const { id } = request.params;
      const plan = backupService.getPlan(id);
      if (!plan) {
        reply.code(404);
        return { error: 'Plan not found' };
      }
      return plan;
    }
  );

  // ==================== Debug Logs ====================

  /**
   * 获取调试日志列表
   * GET /api/assets/debug
   */
  fastify.get('/debug', async () => {
    return backupService.getDebugLogs();
  });

  /**
   * 获取调试日志详情
   * GET /api/assets/debug/:id
   */
  fastify.get<{ Params: { id: string } }>(
    '/debug/:id',
    async (request, reply) => {
      const { id } = request.params;
      const log = backupService.getDebugLog(id);
      if (!log) {
        reply.code(404);
        return { error: 'Debug log not found' };
      }
      return log;
    }
  );

  // ==================== File History ====================

  /**
   * 获取文件变更历史列表（按 session 分组）
   * GET /api/assets/file-history
   */
  fastify.get('/file-history', async () => {
    return backupService.getFileHistory();
  });

  /**
   * 获取指定会话的文件历史详情（带正确路径）
   * GET /api/assets/file-history/:sessionId
   */
  fastify.get<{ Params: { sessionId: string }; Querystring: { projectPath?: string } }>(
    '/file-history/:sessionId',
    async (request, reply) => {
      const { sessionId } = request.params;
      const { projectPath } = request.query;

      // 如果没提供 projectPath，尝试反向查找
      let resolvedProjectPath = projectPath;
      if (!resolvedProjectPath) {
        const { fileScanner } = await import('../services/fileScanner.js');
        const project = fileScanner.findProjectBySessionId(sessionId);
        resolvedProjectPath = project?.projectPath;
      }

      if (!resolvedProjectPath) {
        reply.code(404);
        return { error: 'Cannot find project for this session' };
      }

      return backupService.getSessionFileHistory(sessionId, resolvedProjectPath);
    }
  );

  /**
   * 获取文件版本内容
   * GET /api/assets/file-history/:sessionId/:versionId
   */
  fastify.get<{ Params: { sessionId: string; versionId: string } }>(
    '/file-history/:sessionId/:versionId',
    async (request, reply) => {
      const { sessionId, versionId } = request.params;
      const version = backupService.getFileVersion(sessionId, versionId);
      if (!version) {
        reply.code(404);
        return { error: 'File version not found' };
      }
      return version;
    }
  );
};

export default assetsRoutes;
