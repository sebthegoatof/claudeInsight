import { FastifyPluginAsync } from 'fastify';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface ConfigInput {
  ANTHROPIC_DEFAULT_HAIKU_MODEL?: string;
  ANTHROPIC_DEFAULT_SONNET_MODEL?: string;
  ANTHROPIC_DEFAULT_OPUS_MODEL?: string;
  ANTHROPIC_AUTH_TOKEN?: string;
  ANTHROPIC_BASE_URL?: string;
}

interface ConfigOutput {
  ANTHROPIC_DEFAULT_HAIKU_MODEL: string | null;
  ANTHROPIC_DEFAULT_SONNET_MODEL: string | null;
  ANTHROPIC_DEFAULT_OPUS_MODEL: string | null;
  ANTHROPIC_AUTH_TOKEN: string | null;
  ANTHROPIC_BASE_URL: string | null;
}

const configRoutes: FastifyPluginAsync = async (fastify) => {
  // Get the settings.json file path
  function getConfigFilePath(): string {
    return join(homedir(), '.claude', 'settings.json');
  }

  // Read and parse settings.json
  function readSettingsFile(): Record<string, unknown> {
    const configPath = getConfigFilePath();
    if (!existsSync(configPath)) {
      return {};
    }
    try {
      const content = readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  // Write settings.json
  function writeSettingsFile(settings: Record<string, unknown>): void {
    const configPath = getConfigFilePath();
    writeFileSync(configPath, JSON.stringify(settings, null, 2), 'utf-8');
  }

  // Extract managed keys from settings.env object
  function extractManagedConfig(settings: Record<string, unknown>): ConfigOutput {
    const env = (settings.env as Record<string, unknown>) || {};
    return {
      ANTHROPIC_DEFAULT_HAIKU_MODEL: (env.ANTHROPIC_DEFAULT_HAIKU_MODEL as string) || null,
      ANTHROPIC_DEFAULT_SONNET_MODEL: (env.ANTHROPIC_DEFAULT_SONNET_MODEL as string) || null,
      ANTHROPIC_DEFAULT_OPUS_MODEL: (env.ANTHROPIC_DEFAULT_OPUS_MODEL as string) || null,
      ANTHROPIC_AUTH_TOKEN: (env.ANTHROPIC_AUTH_TOKEN as string) || null,
      ANTHROPIC_BASE_URL: (env.ANTHROPIC_BASE_URL as string) || null,
    };
  }

  // GET /api/config - Read current configuration
  fastify.get('/', async () => {
    const settings = readSettingsFile();
    return extractManagedConfig(settings);
  });

  // POST /api/config - Update configuration (partial overwrite)
  fastify.post<{ Body: ConfigInput }>('/', async (request, reply) => {
    // Read existing settings
    const settings = readSettingsFile();

    // Ensure env object exists
    if (!settings.env || typeof settings.env !== 'object') {
      settings.env = {};
    }
    const env = settings.env as Record<string, unknown>;

    // Update only the managed keys that were provided
    if (request.body.ANTHROPIC_DEFAULT_HAIKU_MODEL !== undefined) {
      if (request.body.ANTHROPIC_DEFAULT_HAIKU_MODEL) {
        env.ANTHROPIC_DEFAULT_HAIKU_MODEL = request.body.ANTHROPIC_DEFAULT_HAIKU_MODEL;
      } else {
        delete env.ANTHROPIC_DEFAULT_HAIKU_MODEL;
      }
    }

    if (request.body.ANTHROPIC_DEFAULT_SONNET_MODEL !== undefined) {
      if (request.body.ANTHROPIC_DEFAULT_SONNET_MODEL) {
        env.ANTHROPIC_DEFAULT_SONNET_MODEL = request.body.ANTHROPIC_DEFAULT_SONNET_MODEL;
      } else {
        delete env.ANTHROPIC_DEFAULT_SONNET_MODEL;
      }
    }

    if (request.body.ANTHROPIC_DEFAULT_OPUS_MODEL !== undefined) {
      if (request.body.ANTHROPIC_DEFAULT_OPUS_MODEL) {
        env.ANTHROPIC_DEFAULT_OPUS_MODEL = request.body.ANTHROPIC_DEFAULT_OPUS_MODEL;
      } else {
        delete env.ANTHROPIC_DEFAULT_OPUS_MODEL;
      }
    }

    if (request.body.ANTHROPIC_AUTH_TOKEN !== undefined) {
      if (request.body.ANTHROPIC_AUTH_TOKEN) {
        env.ANTHROPIC_AUTH_TOKEN = request.body.ANTHROPIC_AUTH_TOKEN;
      } else {
        delete env.ANTHROPIC_AUTH_TOKEN;
      }
    }

    if (request.body.ANTHROPIC_BASE_URL !== undefined) {
      if (request.body.ANTHROPIC_BASE_URL) {
        env.ANTHROPIC_BASE_URL = request.body.ANTHROPIC_BASE_URL;
      } else {
        delete env.ANTHROPIC_BASE_URL;
      }
    }

    // Write back to file
    try {
      writeSettingsFile(settings);
      return extractManagedConfig(settings);
    } catch (error) {
      fastify.log.error(error, 'Failed to write config file');
      reply.code(500);
      return { error: 'Failed to write configuration file' };
    }
  });
};

export default configRoutes;
