import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import settingsRoutes from './routes/settings.js';
import historyRoutes from './routes/history.js';
import skillsRoutes from './routes/skills.js';
import configRoutes from './routes/config.js';
import statsRoutes from './routes/stats.js';
import assetsRoutes from './routes/assets.js';

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // Register CORS
  await fastify.register(cors, {
    origin: true,
  });

  // Register multipart for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB max file size
    },
  });

  // Health check route
  fastify.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Welcome route
  fastify.get('/', async () => {
    return {
      message: 'Welcome to Claude Insight API',
      version: '1.0.0',
    };
  });

  // Register routes
  await fastify.register(settingsRoutes, { prefix: '/api/settings' });
  await fastify.register(historyRoutes, { prefix: '/api/history' });
  await fastify.register(skillsRoutes, { prefix: '/api/skills' });
  await fastify.register(configRoutes, { prefix: '/api/config' });
  await fastify.register(statsRoutes, { prefix: '/api/stats' });
  await fastify.register(assetsRoutes, { prefix: '/api/assets' });

  return fastify;
}
