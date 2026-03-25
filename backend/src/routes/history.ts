import { FastifyPluginAsync } from 'fastify';
import { fileScanner } from '../services/fileScanner.js';
import { pathService } from '../services/pathService.js';
import { specScanner } from '../services/specScanner.js';
import { skillScanner } from '../services/skillScanner.js';
import { linkageService } from '../services/linkageService.js';
import archiver from 'archiver';
import AdmZip from 'adm-zip';
import { existsSync, statSync, readdirSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';

const historyRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * 获取路径信息
   * GET /api/history/path-info
   */
  fastify.get('/path-info', () => {
    return pathService.getPathInfo();
  });

  /**
   * 设置自定义 Claude 路径
   * PUT /api/history/path
   */
  fastify.put<{ Body: { path: string } }>(
    '/path',
    async (request, reply) => {
      const { path } = request.body;

      if (!path) {
        reply.code(400);
        return { error: 'Path is required' };
      }

      if (!pathService.validatePath(path)) {
        reply.code(400);
        return { error: 'Invalid path or path does not exist' };
      }

      const success = pathService.setCustomPath(path);
      if (!success) {
        reply.code(500);
        return { error: 'Failed to save path' };
      }

      return { success: true, path };
    }
  );

  /**
   * 获取所有项目列表(实时扫描)
   * GET /api/history/projects
   */
  fastify.get('/projects', async () => {
    const projects = fileScanner.scanProjects();
    return projects.map((p) => ({
      path: p.path,
      encodedPath: p.encodedPath,
      name: p.path.split(/[/\\]/).filter(Boolean).pop() || p.path,
      sessionCount: p.sessionCount,
      lastActivityAt: p.lastActivityAt?.toISOString() || null,
    }));
  });

  /**
   * 获取单个项目详情
   * GET /api/history/projects/:encodedPath
   */
  fastify.get<{ Params: { encodedPath: string } }>(
    '/projects/:encodedPath',
    async (request, reply) => {
      const { encodedPath } = request.params;

      const projects = fileScanner.scanProjects();
      const project = projects.find((p) => p.encodedPath === encodedPath);

      if (!project) {
        reply.code(404);
        return { error: 'Project not found' };
      }

      // 获取项目级别的 metrics
      const metrics = await fileScanner.getProjectMetrics(project.path);

      return {
        path: project.path,
        encodedPath: project.encodedPath,
        name: project.path.split(/[/\\]/).filter(Boolean).pop() || project.path,
        sessionCount: project.sessionCount,
        lastActivityAt: project.lastActivityAt?.toISOString() || null,
        metrics,
      }
    }
  );

  /**
   * 获取项目下的会话列表(实时扫描)
   * GET /api/history/projects/:encodedPath/sessions
   * Query params:
   * - page: 页码 (默认 1)
   * - pageSize: 每页数量 (默认 20)
   * - withMetrics: 是否加载 metrics (默认 false)
   */
  fastify.get<{ Params: { encodedPath: string } }>(
    '/projects/:encodedPath/sessions',
    async (request, reply) => {
      const { encodedPath } = request.params;
      const { page = '1', pageSize = '20', withMetrics = 'false' } = request.query as {
        page?: string;
        pageSize?: string;
        withMetrics?: string;
      };

      const projects = fileScanner.scanProjects();
      const project = projects.find((p) => p.encodedPath === encodedPath);

      if (!project) {
        reply.code(404);
        return { error: 'Project not found' };
      }

      const pageNum = Math.max(1, parseInt(page, 10));
      const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10)));
      const result = await fileScanner.getProjectSessions(
        encodedPath,
        pageNum,
        pageSizeNum
      );

      // 如果请求 metrics，则加载
      if (withMetrics === 'true') {
        await fileScanner.loadSessionMetrics(result.data);
      }

      return {
        data: result.data.map((s) => ({
          sessionId: s.sessionId,
          type: s.type,
          title: s.title,
          lastModified: s.lastModified.toISOString(),
          projectPath: s.projectPath,
          metrics: s.metrics,
        })),
        project: {
          encodedPath: project.encodedPath,
          path: project.path,
        },
        pagination: result.pagination,
      };
    }
  );

  /**
   * 获取全局时间轴(所有项目的会话按时间排序)
   * GET /api/history/timeline
   * Query params:
   * - page: 页码 (默认 1)
   * - pageSize: 每页数量 (默认 20)
   * - withMetrics: 是否加载 metrics (默认 false)
   */
  fastify.get('/timeline', async (request) => {
    const {
      page = '1',
      pageSize = '20',
      withMetrics = 'false',
    } = request.query as {
      page?: string;
      pageSize?: string;
      withMetrics?: string;
    };

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10)));
    const result = await fileScanner.getTimeline(pageNum, pageSizeNum);

    // 如果请求 metrics，则加载
    if (withMetrics === 'true') {
      await fileScanner.loadSessionMetrics(result.data);
    }

    return {
      data: result.data.map((s) => ({
        sessionId: s.sessionId,
        type: s.type,
        title: s.title,
        lastModified: s.lastModified.toISOString(),
        rawPath: s.rawPath,
        projectPath: s.projectPath,
        metrics: s.metrics,
      })),
      pagination: result.pagination,
    };
  });

  /**
   * 获取单个会话详情(包含消息内容)
   * GET /api/history/sessions/:sessionId
   * Query params:
   * - projectPath: 项目路径 (必需)
   */
  fastify.get<{ Params: { sessionId: string } }>(
    '/sessions/:sessionId',
    async (request, reply) => {
      const { sessionId } = request.params;
      const { projectPath } = request.query as { projectPath?: string }

      if (!projectPath) {
        reply.code(400);
        return { error: 'projectPath query parameter is required' };
      }

      const detail = await fileScanner.getSessionDetail(sessionId, projectPath)

      if (!detail) {
        reply.code(404);
        return { error: 'Session not found' };
      }

      return {
        sessionId: detail.sessionId,
        type: detail.type,
        title: detail.title,
        lastModified: detail.lastModified.toISOString(),
        rawPath: detail.rawPath,
        projectPath: detail.projectPath,
        messages: detail.messages,
        messageCount: detail.messageCount,
        firstMessageAt: detail.firstMessageAt?.toISOString() || null,
        lastMessageAt: detail.lastMessageAt?.toISOString() || null,
        metrics: detail.metrics,
      }
    }
  );

  /**
   * 获取会话的联动信息（关联的 Skills/Agents/MCP/Models）
   * GET /api/history/sessions/:sessionId/links
   * Query params:
   * - projectPath: 项目路径 (必需)
   */
  fastify.get<{ Params: { sessionId: string } }>(
    '/sessions/:sessionId/links',
    async (request, reply) => {
      const { sessionId } = request.params;
      const { projectPath } = request.query as { projectPath?: string };

      if (!projectPath) {
        reply.code(400);
        return { error: 'projectPath query parameter is required' };
      }

      const links = await linkageService.analyzeSessionLinks(projectPath, sessionId);
      const tasks = linkageService.getSessionTasks(sessionId);
      const todos = linkageService.getSessionTodos(sessionId);

      return {
        sessionId,
        ...links,
        tasks,
        todos,
      };
    }
  );

  /**
   * 获取会话的文件变更历史
   * GET /api/history/sessions/:sessionId/file-history
   * Query params:
   * - projectPath: 项目路径 (必需)
   */
  fastify.get<{ Params: { sessionId: string } }>(
    '/sessions/:sessionId/file-history',
    async (request, reply) => {
      const { sessionId } = request.params;
      const { projectPath } = request.query as { projectPath?: string };

      if (!projectPath) {
        reply.code(400);
        return { error: 'projectPath query parameter is required' };
      }

      const { backupService } = await import('../services/backupService.js');
      return backupService.getSessionFileHistory(sessionId, projectPath);
    }
  );

  /**
   * 获取项目的联动统计（MCP 连接数、Agent 调用次数等）
   * GET /api/history/projects/:encodedPath/linkage-stats
   */
  fastify.get<{ Params: { encodedPath: string } }>(
    '/projects/:encodedPath/linkage-stats',
    async (request, reply) => {
      const { encodedPath } = request.params;

      // 解码项目路径
      const projectPath = fileScanner.resolveProjectPath(encodedPath);
      if (!projectPath) {
        reply.code(404);
        return { error: 'Project not found' };
      }

      const stats = await linkageService.analyzeProjectLinks(projectPath);
      return stats;
    }
  );

  /**
   * 读取完整的 tool-result 日志文件（按需加载）
   * GET /api/history/sessions/:sessionId/tool-result
   * Query params:
   * - projectPath: 项目路径 (必需)
   * - filePath: tool-results/ 下的相对路径 (必需)
   */
  fastify.get<{ Params: { sessionId: string } }>(
    '/sessions/:sessionId/tool-result',
    async (request, reply) => {
      const { sessionId } = request.params;
      const { projectPath, filePath } = request.query as {
        projectPath?: string;
        filePath?: string;
      };

      if (!projectPath || !filePath) {
        reply.code(400);
        return { error: 'projectPath and filePath query parameters are required' };
      }

      const content = fileScanner.readToolResult(sessionId, projectPath, filePath);

      if (content === null) {
        reply.code(404);
        return { error: 'Tool result file not found' };
      }

      return { content, filePath };
    }
  );

  /**
   * 获取统计数据
   * GET /api/history/stats
   */
  fastify.get('/stats', async () => {
    const projects = fileScanner.scanProjects();
    const timeline = await fileScanner.getTimeline(1, 100);
    const stats = fileScanner.getStats();
    const tokenMetrics = await fileScanner.getGlobalTokenMetrics();
    const messageStats = await fileScanner.getGlobalMessageStats();

    return {
      totalProjects: stats.totalProjects,
      totalConversations: stats.totalSessions,
      totalMessages: messageStats.totalMessages,
      // Token 统计
      totalTokens: tokenMetrics.totalTokens,
      inputTokens: tokenMetrics.inputTokens,
      outputTokens: tokenMetrics.outputTokens,
      cacheHitTokens: tokenMetrics.cacheHitTokens,
      cacheCreationTokens: tokenMetrics.cacheCreationTokens,
      // 最近项目
      recentProjects: projects.slice(0, 5).map((p) => ({
        path: p.path,
        encodedPath: p.encodedPath,
        name: p.path.split(/[/\\]/).filter(Boolean).pop() || p.path,
        sessionCount: p.sessionCount,
        lastActivityAt: p.lastActivityAt?.toISOString() || null,
      })),
      recentConversations: timeline.data.map((s) => ({
        sessionId: s.sessionId,
        type: s.type,
        title: s.title,
        lastModified: s.lastModified.toISOString(),
        projectPath: s.projectPath,
      })),
    };
  });

  /**
   * 全局搜索
   * GET /api/history/search
   * Query params:
   * - q: 搜索关键词（必需）
   * - page: 页码 (默认 1)
   * - pageSize: 每页数量 (默认 20)
   * - projectPath: 可选，限定在某个项目内搜索
   */
  fastify.get<{
    Querystring: {
      q?: string;
      page?: string;
      pageSize?: string;
      projectPath?: string;
    };
  }>('/search', async (request, reply) => {
    const { q, page = '1', pageSize = '20', projectPath } = request.query;

    if (!q || !q.trim()) {
      reply.code(400);
      return { error: 'Search query is required' };
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10)));

    const result = await fileScanner.search(q.trim(), pageNum, pageSizeNum, projectPath);

    return {
      data: result.data.map((r) => ({
        id: 0, // 兼容旧接口
        session_id: r.sessionId,
        title: r.title,
        project_path: r.projectPath,
        snippet: r.snippet,
        rank: r.rank,
      })),
      query: result.query,
      pagination: result.pagination,
    };
  });

  // ==================== Spec APIs ====================

  /**
   * 获取项目规范 (CLAUDE.md)
   * GET /api/history/projects/:encodedPath/spec
   */
  fastify.get<{ Params: { encodedPath: string } }>(
    '/projects/:encodedPath/spec',
    async (request) => {
      const { encodedPath } = request.params
      const projectPath = fileScanner.resolveProjectPath(encodedPath)
      const spec = specScanner.scanProjectSpec(projectPath)

      if (!spec) {
        return {
          content: '',
          summary: '',
          sections: []
        }
      }
      return spec
    }
  )

  /**
   * 更新项目规范
   * PUT /api/history/projects/:encodedPath/spec
   */
  fastify.put<{ Params: { encodedPath: string }; Body: { content: string } }>(
    '/projects/:encodedPath/spec',
    async (request, reply) => {
      const { encodedPath } = request.params
      const { content } = request.body
      const projectPath = fileScanner.resolveProjectPath(encodedPath)

      const result = specScanner.saveSpecToFile(projectPath, content)

      if (!result.success) {
        reply.code(500)
        return { error: result.error || 'Failed to save spec file' }
      }

      const spec = specScanner.parseSpecContent(content)
      return { success: true, spec }
    }
  )

  /**
   * 刷新项目规范（重新扫描文件）
   * POST /api/history/projects/:encodedPath/spec/refresh
   */
  fastify.post<{ Params: { encodedPath: string } }>(
    '/projects/:encodedPath/spec/refresh',
    async (request) => {
      const { encodedPath } = request.params
      const projectPath = fileScanner.resolveProjectPath(encodedPath)
      const spec = specScanner.scanProjectSpec(projectPath)
      return { success: true, spec }
    }
  )

  // ==================== Skills APIs ====================
  /**
   * 获取项目技能列表
   * GET /api/history/projects/:encodedPath/skills
   */
  fastify.get<{ Params: { encodedPath: string } }>(
    '/projects/:encodedPath/skills',
    async (request) => {
      const { encodedPath } = request.params
      const projectPath = fileScanner.resolveProjectPath(encodedPath)
      const skills = skillScanner.scanProjectSkills(projectPath)
      return skills
    }
  )

  /**
   * 获取全局技能列表
   * GET /api/skills/global
   */
  fastify.get('/skills/global', async () => {
    const globalSkills = skillScanner.scanGlobalSkills()
    return globalSkills
  })

  // ==================== Import/Export APIs ====================

  /**
   * 导出会话为 ZIP 文件
   * POST /api/history/sessions/export
   * Body: { projectPath: string, sessionIds: string[] }
   * Query params:
   * - includeAssets: 是否包含关联资产 (Skills/Agents/Commands/OutputStyles)
   * - projectPath: 项目路径（必需）
   * - sessionIds: 会话 ID 数组，如果包含 "all" 或为空则导出该项目下所有会话
   */
  fastify.post<{
    Body: { projectPath: string; sessionIds: string[] };
    Querystring: { includeAssets?: string };
  }>('/sessions/export', async (request, reply) => {
    const { projectPath, sessionIds } = request.body;
    const { includeAssets } = request.query;

    if (!projectPath) {
      reply.code(400);
      return { error: 'projectPath is required' };
    }

    const projectDir = fileScanner.resolveProjectDir(projectPath);
    if (!projectDir) {
      reply.code(404);
      return { error: 'Project not found' };
    }

    // 确定要导出的会话列表
    let sessionsToExport: string[] = [];

    if (!sessionIds || sessionIds.length === 0 || sessionIds.includes('all')) {
      // 导出所有会话
      const entries = readdirSync(projectDir, { withFileTypes: true });
      for (const entry of entries) {
        // 检查是否为有效的会话（UUID.jsonl 或 UUID/ 目录）
        const isJsonl = entry.isFile() && entry.name.endsWith('.jsonl');
        const isDir = entry.isDirectory() && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entry.name);

        if (isJsonl) {
          sessionsToExport.push(entry.name.replace('.jsonl', ''));
        } else if (isDir) {
          sessionsToExport.push(entry.name);
        }
      }
    } else {
      sessionsToExport = sessionIds;
    }

    if (sessionsToExport.length === 0) {
      reply.code(400);
      return { error: 'No sessions to export' };
    }

    // 设置响应头 - 直接在 reply.raw 上设置，因为后续会 hijack 响应
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `claude-sessions-export-${timestamp}.zip`;
    const origin = request.headers.origin || '*';

    // 创建 ZIP 归档
    const archive = archiver('zip', { zlib: { level: 9 } });

    // 处理归档错误
    archive.on('error', (err) => {
      console.error('Archive error:', err);
    });

    // 收集所有关联资产
    const collectedAssets = {
      skills: new Set<string>(),
      agents: new Set<string>(),
      commands: new Set<string>(),
    };

    // 遍历会话并添加文件
    for (const sessionId of sessionsToExport) {
      // 添加主干文件 [UUID].jsonl
      const jsonlPath = join(projectDir, `${sessionId}.jsonl`);
      if (existsSync(jsonlPath)) {
        archive.file(jsonlPath, { name: `sessions/${sessionId}.jsonl` });
      }

      // 添加支线目录 [UUID]/
      const sessionDir = join(projectDir, sessionId);
      if (existsSync(sessionDir) && statSync(sessionDir).isDirectory()) {
        archive.directory(sessionDir, `sessions/${sessionId}`);
      }

      // 分析会话链接，收集资产
      if (includeAssets === 'true') {
        try {
          const links = await linkageService.analyzeSessionLinks(projectPath, sessionId);
          links.skills.forEach(s => collectedAssets.skills.add(s.name));
          links.agents.forEach(a => collectedAssets.agents.add(a.type));
          links.commands.forEach(c => collectedAssets.commands.add(c));
        } catch {
          // ignore linkage errors
        }
      }
    }

    // 添加关联资产
    if (includeAssets === 'true') {
      const claudePath = pathService.getClaudePath();

      // 添加 Skills
      if (collectedAssets.skills.size > 0) {
        const skillsDir = join(claudePath, 'commands');
        if (existsSync(skillsDir)) {
          for (const skillName of collectedAssets.skills) {
            // 查找匹配的 skill 文件
            const skillPath = join(skillsDir, 'zcf', `${skillName}.md`);
            if (existsSync(skillPath)) {
              archive.file(skillPath, { name: `assets/skills/${skillName}.md` });
            }
          }
        }
      }

      // 添加 Agents
      if (collectedAssets.agents.size > 0) {
        const agentsDir = join(claudePath, 'agents');
        if (existsSync(agentsDir)) {
          for (const agentType of collectedAssets.agents) {
            // 查找匹配的 agent 文件
            const agentPath = join(agentsDir, 'zcf', `${agentType}.md`);
            if (existsSync(agentPath)) {
              archive.file(agentPath, { name: `assets/agents/${agentType}.md` });
            }
          }
        }
      }

      // 添加 Commands
      if (collectedAssets.commands.size > 0) {
        const commandsDir = join(claudePath, 'commands');
        if (existsSync(commandsDir)) {
          for (const cmdName of collectedAssets.commands) {
            // 移除前导斜杠
            const cleanName = cmdName.replace(/^\//, '');
            const cmdPath = join(commandsDir, 'zcf', `${cleanName}.md`);
            if (existsSync(cmdPath)) {
              archive.file(cmdPath, { name: `assets/commands/${cleanName}.md` });
            }
          }
        }
      }

      // 添加项目规范文件
      const spec = specScanner.scanProjectSpec(projectPath);
      if (spec) {
        archive.append(spec.content, { name: 'project/CLAUDE.md' });
      }

      // 添加清单文件
      const manifest = {
        exportDate: new Date().toISOString(),
        projectPath,
        sessions: sessionsToExport,
        assets: {
          skills: Array.from(collectedAssets.skills),
          agents: Array.from(collectedAssets.agents),
          commands: Array.from(collectedAssets.commands),
        },
      };
      archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
    }

    // 使用 hijack 接管响应，然后手动设置头部并管道流
    reply.hijack();

    // 直接在原始响应对象上设置头部
    reply.raw.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
    });

    // 将归档流直接管道到响应流
    archive.pipe(reply.raw);

    // 完成归档（这会关闭流并触发 'end' 事件）
    archive.finalize();

    // 返回 void，因为响应已经通过流发送
    return reply;
  });

  /**
   * 导入会话 ZIP 文件
   * POST /api/history/sessions/import
   * Content-Type: multipart/form-data
   * - file: ZIP 文件
   * - targetProjectId: 目标项目的 encodedPath
   */
  fastify.post('/sessions/import', async (request, reply) => {
    // 检查是否为 multipart 请求
    if (!request.isMultipart()) {
      reply.code(400);
      return { error: 'Request must be multipart/form-data' };
    }

    // 使用 parts() 获取所有 parts
    const parts = request.parts();
    let targetProjectId: string | undefined;
    let fileBuffer: Buffer | undefined;

    for await (const part of parts) {
      if (part.type === 'field') {
        // 处理普通字段
        if (part.fieldname === 'targetProjectId') {
          targetProjectId = part.value as string;
        }
      } else if (part.type === 'file') {
        // 处理文件
        if (part.fieldname === 'file') {
          fileBuffer = await part.toBuffer();
        }
      }
    }

    if (!targetProjectId) {
      reply.code(400);
      return { error: 'targetProjectId is required' };
    }

    if (!fileBuffer) {
      reply.code(400);
      return { error: 'No file uploaded' };
    }

    // 获取目标项目目录
    const projectsPath = pathService.getHistoryPath();
    const targetProjectDir = join(projectsPath, targetProjectId);

    // 如果目标目录不存在，创建它
    if (!existsSync(targetProjectDir)) {
      mkdirSync(targetProjectDir, { recursive: true });
    }

    try {
      // 使用 adm-zip 解压
      const zip = new AdmZip(fileBuffer);
      const zipEntries = zip.getEntries();

      // 解压所有文件，覆盖同名文件
      // 导出时会话文件被放在 sessions/ 前缀下，导入时需要去掉该前缀
      // 资产文件放在 assets/ 前缀下，跳过不处理（manifest.json 和 CLAUDE.md 也跳过）
      for (const entry of zipEntries) {
        let entryPath = entry.entryName;

        // 去掉 sessions/ 前缀，将会话文件直接放到项目目录下
        if (entryPath.startsWith('sessions/')) {
          entryPath = entryPath.slice('sessions/'.length);
        } else {
          // 跳过非会话文件（manifest.json, CLAUDE.md, assets/ 等）
          continue;
        }

        // 跳过空路径（sessions/ 目录本身）
        if (!entryPath) continue;

        if (!entry.isDirectory) {
          const targetPath = join(targetProjectDir, entryPath);

          // 确保父目录存在
          const parentDir = dirname(targetPath);
          if (!existsSync(parentDir)) {
            mkdirSync(parentDir, { recursive: true });
          }

          // 直接写入文件内容
          writeFileSync(targetPath, entry.getData());
        } else {
          // 创建目录
          const dirPath = join(targetProjectDir, entryPath);
          if (!existsSync(dirPath)) {
            mkdirSync(dirPath, { recursive: true });
          }
        }
      }

      return {
        success: true,
        message: `Successfully imported ${zipEntries.filter(e => !e.isDirectory && e.entryName.startsWith('sessions/')).length} files`,
        targetProjectId,
      };
    } catch (error) {
      console.error('Import error:', error);
      reply.code(500);
      return {
        error: 'Failed to import sessions',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
}

export default historyRoutes;
