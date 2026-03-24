import { readFileSync, existsSync, readdirSync, writeFileSync, unlinkSync, mkdirSync, statSync, rmSync } from 'fs';
import { join, dirname, relative, extname, basename } from 'path';
import { pathService } from './pathService.js';

/**
 * AssetScanner - 资产扫描服务
 * 扫描 ~/.claude/ 下的 agents/、commands/、output-styles/、plugins/ 目录
 */
export class AssetScanner {
  private static instance: AssetScanner;

  private constructor() {}

  static getInstance(): AssetScanner {
    if (!AssetScanner.instance) {
      AssetScanner.instance = new AssetScanner();
    }
    return AssetScanner.instance;
  }

  // ==================== Agents ====================

  /**
   * 扫描 Agent 模板目录
   */
  scanAgents(): AssetItem[] {
    const agentsDir = join(pathService.getClaudePath(), 'agents');
    return this.scanMarkdownDirectory(agentsDir, 'agent');
  }

  /**
   * 获取 Agent 文件树
   */
  getAgentTree(): AssetTreeNode {
    return this.getAssetTree('agents');
  }

  /**
   * 获取 Agent 详情
   */
  getAgent(category: string, name: string): AssetDetail | null {
    const filePath = join(pathService.getClaudePath(), 'agents', category, `${name}.md`);
    return this.readMarkdownFile(filePath, 'agent', `${category}/${name}`);
  }

  /**
   * 保存 Agent
   */
  saveAgent(category: string, name: string, content: string): boolean {
    const dir = join(pathService.getClaudePath(), 'agents', category);
    const filePath = join(dir, `${name}.md`);
    return this.writeFile(filePath, content);
  }

  /**
   * 删除 Agent
   */
  deleteAgent(category: string, name: string): boolean {
    const filePath = join(pathService.getClaudePath(), 'agents', category, `${name}.md`);
    return this.deleteFile(filePath);
  }

  // ==================== Commands ====================

  /**
   * 扫描自定义命令目录
   */
  scanCommands(): AssetItem[] {
    const commandsDir = join(pathService.getClaudePath(), 'commands');
    return this.scanMarkdownDirectory(commandsDir, 'command');
  }

  /**
   * 获取 Command 文件树
   */
  getCommandTree(): AssetTreeNode {
    return this.getAssetTree('commands');
  }

  /**
   * 获取 Command 详情
   */
  getCommand(category: string, name: string): AssetDetail | null {
    const filePath = join(pathService.getClaudePath(), 'commands', category, `${name}.md`);
    return this.readMarkdownFile(filePath, 'command', `${category}/${name}`);
  }

  /**
   * 保存 Command
   */
  saveCommand(category: string, name: string, content: string): boolean {
    const dir = join(pathService.getClaudePath(), 'commands', category);
    const filePath = join(dir, `${name}.md`);
    return this.writeFile(filePath, content);
  }

  /**
   * 删除 Command
   */
  deleteCommand(category: string, name: string): boolean {
    const filePath = join(pathService.getClaudePath(), 'commands', category, `${name}.md`);
    return this.deleteFile(filePath);
  }

  // ==================== Output Styles ====================

  /**
   * 扫描输出风格目录
   */
  scanOutputStyles(): AssetItem[] {
    const stylesDir = join(pathService.getClaudePath(), 'output-styles');
    if (!existsSync(stylesDir)) return [];

    const items: AssetItem[] = [];
    try {
      const files = readdirSync(stylesDir);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const filePath = join(stylesDir, file);
        const name = file.replace('.md', '');
        const detail = this.readMarkdownFile(filePath, 'style', name);
        if (detail) {
          items.push({
            id: name,
            name,
            type: 'style',
            path: filePath,
            description: detail.description || '',
            lastModified: detail.lastModified,
          });
        }
      }
    } catch {
      // ignore
    }
    return items;
  }

  /**
   * 获取 Output Style 详情
   */
  getOutputStyle(name: string): AssetDetail | null {
    const filePath = join(pathService.getClaudePath(), 'output-styles', `${name}.md`);
    return this.readMarkdownFile(filePath, 'style', name);
  }

  /**
   * 保存 Output Style
   */
  saveOutputStyle(name: string, content: string): boolean {
    const filePath = join(pathService.getClaudePath(), 'output-styles', `${name}.md`);
    return this.writeFile(filePath, content);
  }

  /**
   * 删除 Output Style
   */
  deleteOutputStyle(name: string): boolean {
    const filePath = join(pathService.getClaudePath(), 'output-styles', `${name}.md`);
    return this.deleteFile(filePath);
  }

  // ==================== Plugins ====================

  /**
   * 获取已安装插件列表
   */
  getInstalledPlugins(): InstalledPlugin[] {
    const pluginsPath = join(pathService.getClaudePath(), 'plugins', 'installed_plugins.json');
    if (!existsSync(pluginsPath)) return [];

    try {
      const content = readFileSync(pluginsPath, 'utf-8');
      const data = JSON.parse(content);
      const plugins: InstalledPlugin[] = [];

      for (const [pluginId, installs] of Object.entries(data.plugins || {})) {
        for (const install of installs as any[]) {
          plugins.push({
            id: pluginId,
            name: pluginId.split('@')[0],
            source: pluginId.split('@')[1] || 'unknown',
            version: install.version,
            installPath: install.installPath,
            installedAt: install.installedAt,
            lastUpdated: install.lastUpdated,
          });
        }
      }
      return plugins;
    } catch {
      return [];
    }
  }

  /**
   * 获取已知市场列表
   */
  getMarketplaces(): Marketplace[] {
    const marketsPath = join(pathService.getClaudePath(), 'plugins', 'known_marketplaces.json');
    if (!existsSync(marketsPath)) return [];

    try {
      const content = readFileSync(marketsPath, 'utf-8');
      const data = JSON.parse(content);
      return Object.entries(data).map(([id, config]: [string, any]) => ({
        id,
        name: config.name || id,
        type: config.type || 'unknown',
        path: config.path,
        url: config.url,
      }));
    } catch {
      return [];
    }
  }

  /**
   * 获取插件黑名单
   */
  getBlocklist(): string[] {
    const blocklistPath = join(pathService.getClaudePath(), 'plugins', 'blocklist.json');
    if (!existsSync(blocklistPath)) return [];

    try {
      const content = readFileSync(blocklistPath, 'utf-8');
      const data = JSON.parse(content);
      return data.plugins || [];
    } catch {
      return [];
    }
  }

  // ==================== Tasks & Todos ====================

  /**
   * 扫描 Tasks 目录
   */
  scanTasks(): TaskItem[] {
    const tasksDir = join(pathService.getClaudePath(), 'tasks');
    if (!existsSync(tasksDir)) return [];

    const items: TaskItem[] = [];
    try {
      const files = readdirSync(tasksDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const filePath = join(tasksDir, file);
        try {
          const content = readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);
          items.push({
            sessionId: file.replace('.json', ''),
            tasks: data.tasks || [],
            lastModified: new Date(existsSync(filePath) ? require('fs').statSync(filePath).mtime : Date.now()).toISOString(),
          });
        } catch {
          // skip invalid
        }
      }
    } catch {
      // ignore
    }
    return items;
  }

  /**
   * 获取指定会话的 Tasks
   */
  getSessionTasks(sessionId: string): TaskItem | null {
    const filePath = join(pathService.getClaudePath(), 'tasks', `${sessionId}.json`);
    if (!existsSync(filePath)) return null;

    try {
      const content = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      return {
        sessionId,
        tasks: data.tasks || [],
        lastModified: new Date(require('fs').statSync(filePath).mtime).toISOString(),
      };
    } catch {
      return null;
    }
  }

  /**
   * 扫描 Todos 目录
   */
  scanTodos(): TodoItem[] {
    const todosDir = join(pathService.getClaudePath(), 'todos');
    if (!existsSync(todosDir)) return [];

    const items: TodoItem[] = [];
    try {
      const files = readdirSync(todosDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const filePath = join(todosDir, file);
        try {
          const content = readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);
          items.push({
            sessionId: file.replace('.json', ''),
            todos: data.todos || data || [],
            lastModified: new Date(require('fs').statSync(filePath).mtime).toISOString(),
          });
        } catch {
          // skip invalid
        }
      }
    } catch {
      // ignore
    }
    return items;
  }

  // ==================== 通用方法 ====================

  /**
   * 获取资产文件树
   */
  private getAssetTree(assetType: 'agents' | 'commands'): AssetTreeNode {
    const dir = join(pathService.getClaudePath(), assetType);
    if (!existsSync(dir)) {
      return { name: assetType, path: '', type: 'directory', children: [] };
    }
    return {
      name: assetType,
      path: '',
      type: 'directory',
      children: this.scanDirectoryTree(dir, dir),
    };
  }

  /**
   * 递归扫描目录生成树形结构
   */
  private scanDirectoryTree(dirPath: string, basePath: string): AssetTreeNode[] {
    const nodes: AssetTreeNode[] = [];
    try {
      const entries = readdirSync(dirPath, { withFileTypes: true });
      const sorted = entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

      for (const entry of sorted) {
        if (entry.name.startsWith('.')) continue;
        const fullPath = join(dirPath, entry.name);
        const relativePath = relative(basePath, fullPath);

        if (entry.isDirectory()) {
          nodes.push({
            name: entry.name,
            path: relativePath,
            type: 'directory',
            children: this.scanDirectoryTree(fullPath, basePath),
          });
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          if (['.md', '.txt', '.js', '.ts', '.mjs', '.cjs', '.json'].includes(ext)) {
            nodes.push({
              name: entry.name,
              path: relativePath,
              type: 'file',
              description: this.extractFileDescription(fullPath),
            });
          }
        }
      }
    } catch {
      // ignore
    }
    return nodes;
  }

  /**
   * 从文件提取描述
   */
  private extractFileDescription(filePath: string): string | undefined {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === '---') continue;
        if (trimmed.startsWith('description:')) {
          return trimmed.slice(12).trim().slice(0, 100);
        }
        if (trimmed.startsWith('# ')) {
          return trimmed.slice(2).slice(0, 100);
        }
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  /**
   * 按相对路径读取资产文件
   */
  readAssetFile(assetType: 'agents' | 'commands', relativePath: string): string | null {
    const basePath = join(pathService.getClaudePath(), assetType);
    const filePath = join(basePath, relativePath);

    if (!filePath.startsWith(basePath) || relativePath.includes('..')) return null;

    try {
      if (!existsSync(filePath)) return null;
      return readFileSync(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  /**
   * 按相对路径保存资产文件
   */
  saveAssetFile(assetType: 'agents' | 'commands', relativePath: string, content: string): { success: boolean; error?: string } {
    const basePath = join(pathService.getClaudePath(), assetType);
    const filePath = join(basePath, relativePath);

    if (!filePath.startsWith(basePath) || relativePath.includes('..')) {
      return { success: false, error: 'Unsafe path' };
    }

    try {
      const dir = dirname(filePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(filePath, content, 'utf-8');
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  /**
   * 在资产目录中创建文件或目录
   */
  createAssetNode(
    assetType: 'agents' | 'commands',
    parentPath: string,
    name: string,
    nodeType: 'file' | 'directory'
  ): { success: boolean; error?: string; path?: string } {
    const basePath = join(pathService.getClaudePath(), assetType);

    if (!existsSync(basePath)) {
      try { mkdirSync(basePath, { recursive: true }); } catch {
        return { success: false, error: 'Failed to create base directory' };
      }
    }

    const targetPath = parentPath ? join(basePath, parentPath, name) : join(basePath, name);

    if (!targetPath.startsWith(basePath)) {
      return { success: false, error: 'Unsafe path' };
    }

    if (existsSync(targetPath)) {
      return { success: false, error: 'Already exists' };
    }

    try {
      if (nodeType === 'directory') {
        mkdirSync(targetPath, { recursive: true });
      } else {
        const dir = dirname(targetPath);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        const ext = extname(name).toLowerCase();
        let content = '';
        if (ext === '.md') {
          const baseName = basename(name, ext);
          content = `---\nname: ${baseName}\ndescription: 描述\n---\n\n# ${baseName}\n\n内容...\n`;
        }
        writeFileSync(targetPath, content, 'utf-8');
      }
      const relativePath = parentPath ? join(parentPath, name) : name;
      return { success: true, path: relativePath };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  /**
   * 删除资产文件或目录
   */
  deleteAssetNode(assetType: 'agents' | 'commands', relativePath: string): { success: boolean; error?: string } {
    const basePath = join(pathService.getClaudePath(), assetType);
    const targetPath = join(basePath, relativePath);

    if (!targetPath.startsWith(basePath) || relativePath.includes('..') || targetPath === basePath) {
      return { success: false, error: 'Unsafe path' };
    }

    try {
      if (!existsSync(targetPath)) return { success: false, error: 'Not found' };
      rmSync(targetPath, { recursive: true, force: true });
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  // ==================== 插件启用/禁用 ====================

  /**
   * 读取 settings.json
   */
  private readSettings(): Record<string, unknown> {
    const settingsPath = join(pathService.getClaudePath(), 'settings.json');
    if (!existsSync(settingsPath)) return {};
    try {
      return JSON.parse(readFileSync(settingsPath, 'utf-8'));
    } catch {
      return {};
    }
  }

  /**
   * 写入 settings.json
   */
  private writeSettings(settings: Record<string, unknown>): boolean {
    const settingsPath = join(pathService.getClaudePath(), 'settings.json');
    try {
      writeFileSync(settingsPath, JSON.stringify(settings, null, 4), 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取插件启用状态 (从 settings.json 的 enabledPlugins 字段读取)
   */
  getEnabledPlugins(): Record<string, boolean> {
    const settings = this.readSettings();
    const enabledPlugins = settings.enabledPlugins as Record<string, boolean> | undefined;
    return enabledPlugins || {};
  }

  /**
   * 切换插件启用/禁用状态 (修改 settings.json 的 enabledPlugins 字段)
   */
  togglePluginEnabled(pluginId: string, enabled: boolean): boolean {
    const settings = this.readSettings();
    if (!settings.enabledPlugins || typeof settings.enabledPlugins !== 'object') {
      settings.enabledPlugins = {};
    }
    (settings.enabledPlugins as Record<string, boolean>)[pluginId] = enabled;
    return this.writeSettings(settings);
  }

  /**
   * 扫描 Markdown 目录（支持子目录分类）
   */
  private scanMarkdownDirectory(dir: string, type: AssetType): AssetItem[] {
    if (!existsSync(dir)) return [];

    const items: AssetItem[] = [];
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          // 递归扫描子目录
          const subItems = this.scanMarkdownDirectory(fullPath, type);
          for (const sub of subItems) {
            items.push({
              ...sub,
              category: entry.name,
              id: `${entry.name}/${sub.name}`,
            });
          }
        } else if (entry.name.endsWith('.md')) {
          const name = entry.name.replace('.md', '');
          const detail = this.readMarkdownFile(fullPath, type, name);
          if (detail) {
            items.push({
              id: name,
              name,
              type,
              path: fullPath,
              description: detail.description || '',
              lastModified: detail.lastModified,
            });
          }
        }
      }
    } catch {
      // ignore
    }
    return items;
  }

  /**
   * 读取 Markdown 文件
   */
  private readMarkdownFile(filePath: string, type: AssetType, name: string): AssetDetail | null {
    if (!existsSync(filePath)) return null;

    try {
      const content = readFileSync(filePath, 'utf-8');
      const fileStat = statSync(filePath);

      // 从文件开头提取描述（第一个标题或段落）
      let description = '';
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          description = trimmed.slice(0, 100);
          break;
        } else if (trimmed.startsWith('# ')) {
          description = trimmed.slice(2).slice(0, 100);
          break;
        }
      }

      return {
        id: name,
        name,
        type,
        path: filePath,
        content,
        description,
        lastModified: fileStat.mtime.toISOString(),
      };
    } catch {
      return null;
    }
  }

  /**
   * 写入文件（自动创建目录）
   */
  private writeFile(filePath: string, content: string): boolean {
    try {
      const dir = dirname(filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(filePath, content, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 删除文件
   */
  private deleteFile(filePath: string): boolean {
    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
      return true;
    } catch {
      return false;
    }
  }
}

// Types
export type AssetType = 'agent' | 'command' | 'style';

export interface AssetTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  description?: string;
  children?: AssetTreeNode[];
}

export interface AssetItem {
  id: string;
  name: string;
  type: AssetType;
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

export const assetScanner = AssetScanner.getInstance();
