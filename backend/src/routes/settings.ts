import { FastifyPluginAsync } from 'fastify';
import { pathService } from '../services/pathService.js';
import { configService } from '../services/configService.js';
import { existsSync } from 'fs';

interface SettingInput {
  key: string;
  value?: string;
}

interface BatchUpdateInput {
  settings: Array<{ key: string; value: string }>;
}

const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all settings
  fastify.get('/', async () => {
    const config = configService.getAll();
    return Object.entries(config).map(([key, value]) => ({
      key,
      value: value || null,
    }));
  });

  // Get path info
  fastify.get('/path-info', async () => {
    return pathService.getPathInfo();
  });

  // Get setting by key
  fastify.get<{ Params: { key: string } }>('/:key', async (request, reply) => {
    const { key } = request.params;
    const value = configService.get(key);

    if (value === undefined) {
      reply.code(404);
      return { error: 'Setting not found' };
    }

    return { key, value };
  });

  // Create or update setting
  fastify.post<{ Body: SettingInput }>('/', async (request, reply) => {
    const { key, value } = request.body;

    if (value !== undefined) {
      configService.set(key, value);
    }

    reply.code(201);
    return { key, value: value || null };
  });

  // Batch update settings
  fastify.post<{ Body: BatchUpdateInput }>('/batch', async (request, reply) => {
    const { settings } = request.body;

    const settingsMap: Record<string, string> = {};
    for (const setting of settings) {
      settingsMap[setting.key] = setting.value;
    }

    // 如果更新了 claude_path，需要重新扫描
    const claudePathSetting = settings.find(s => s.key === 'claude_path');
    if (claudePathSetting) {
      // 验证路径是否存在
      if (!existsSync(claudePathSetting.value)) {
        reply.code(400);
        return { error: '指定的路径不存在', key: 'claude_path' };
      }
    }

    configService.setAll(settingsMap);

    reply.code(200);
    return { success: true, updated: settings.length };
  });

  // Update claude path and trigger rescan
  fastify.put<{ Body: { path: string } }>('/claude-path', async (request, reply) => {
    const { path } = request.body;

    if (!path) {
      reply.code(400);
      return { error: 'Path is required' };
    }

    if (!existsSync(path)) {
      reply.code(400);
      return { error: '指定的路径不存在' };
    }

    // 更新配置
    configService.set('claudePath', path);

    // 清除缓存
    pathService.clearCustomPath();

    return { success: true, path };
  });

  // Reset claude path to default
  fastify.delete('/claude-path', async () => {
    configService.delete('claudePath');
    pathService.clearCustomPath();

    return { success: true, defaultPath: pathService.getDefaultClaudePath() };
  });

  // Delete setting
  fastify.delete<{ Params: { key: string } }>('/:key', async (request, reply) => {
    const { key } = request.params;
    const deleted = configService.delete(key);

    if (!deleted) {
      reply.code(404);
      return { error: 'Setting not found' };
    }

    reply.code(204);
    return;
  });
};

export default settingsRoutes;
