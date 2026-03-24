import { FastifyInstance } from 'fastify';
import { statsService } from '../services/statsService.js';

export default async function statsRoutes(fastify: FastifyInstance) {
  // Dashboard 概览数据
  fastify.get('/overview', async (_request, reply) => {
    try {
      const overview = await statsService.getOverview();
      return overview;
    } catch (error) {
      fastify.log.error(error, 'Failed to get overview stats');
      return reply.status(500).send({ error: 'Failed to get overview stats' });
    }
  });

  // 最近会话
  fastify.get('/recent-sessions', async (request, reply) => {
    try {
      const { limit } = request.query as { limit?: string };
      const sessions = await statsService.getRecentSessions(
        limit ? parseInt(limit, 10) : 10
      );
      return sessions;
    } catch (error) {
      fastify.log.error(error, 'Failed to get recent sessions');
      return reply.status(500).send({ error: 'Failed to get recent sessions' });
    }
  });

  // MCP 服务器列表
  fastify.get('/mcp-servers', async (_request, reply) => {
    try {
      const servers = statsService.getMcpServers();
      return servers;
    } catch (error) {
      fastify.log.error(error, 'Failed to get MCP servers');
      return reply.status(500).send({ error: 'Failed to get MCP servers' });
    }
  });

  // 全局 Tasks 列表
  fastify.get('/tasks', async (_request, reply) => {
    try {
      const tasks = statsService.getAllTasks();
      return tasks;
    } catch (error) {
      fastify.log.error(error, 'Failed to get tasks');
      return reply.status(500).send({ error: 'Failed to get tasks' });
    }
  });

  // 全局 Todos 列表
  fastify.get('/todos', async (_request, reply) => {
    try {
      const todos = statsService.getAllTodos();
      return todos;
    } catch (error) {
      fastify.log.error(error, 'Failed to get todos');
      return reply.status(500).send({ error: 'Failed to get todos' });
    }
  });
}
