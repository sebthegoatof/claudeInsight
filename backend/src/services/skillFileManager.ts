import {
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  statSync,
  mkdirSync,
  rmSync,
  lstatSync,
} from 'fs';
import { join, basename, extname, relative } from 'path';
import { pathService } from './pathService.js';

/**
 * 文件树节点
 */
export interface SkillTreeNode {
  name: string;
  path: string;        // 相对路径
  type: 'file' | 'directory';
  description?: string; // 仅文件有
  children?: SkillTreeNode[];
}

/**
 * 技能元数据（从 frontmatter 解析）
 */
export interface SkillFrontmatter {
  name?: string;
  description?: string;
  [key: string]: string | undefined;
}

/**
 * SkillFileManager - 基于文件系统的技能管理器
 * 直接操作 ~/.claude/skills 目录，不使用数据库
 */
export class SkillFileManager {
  private static instance: SkillFileManager;

  private constructor() {}

  static getInstance(): SkillFileManager {
    if (!SkillFileManager.instance) {
      SkillFileManager.instance = new SkillFileManager();
    }
    return SkillFileManager.instance;
  }

  /**
   * 获取全局技能目录路径
   */
  getGlobalSkillsPath(): string {
    return join(pathService.getClaudePath(), 'skills');
  }

  /**
   * 获取项目技能目录路径
   */
  getProjectSkillsPath(projectPath: string): string {
    return join(projectPath, '.claude', 'skills');
  }

  /**
   * 获取文件树（全局或项目）
   */
  getSkillTree(scope: 'global' | 'project', projectPath?: string): SkillTreeNode {
    const basePath = scope === 'global'
      ? this.getGlobalSkillsPath()
      : projectPath ? this.getProjectSkillsPath(projectPath) : '';

    if (!basePath || !existsSync(basePath)) {
      return {
        name: scope === 'global' ? '全局技能' : '项目技能',
        path: '',
        type: 'directory',
        children: [],
      };
    }

    return {
      name: scope === 'global' ? '全局技能' : '项目技能',
      path: '',
      type: 'directory',
      children: this.scanDirectory(basePath, basePath),
    };
  }

  /**
   * 递归扫描目录
   */
  private scanDirectory(dirPath: string, basePath: string): SkillTreeNode[] {
    const nodes: SkillTreeNode[] = [];

    try {
      const entries = readdirSync(dirPath, { withFileTypes: true });

      // 排序：文件夹在前，然后按名称排序
      const sortedEntries = entries.sort((a, b) => {
        const aIsDir = a.isDirectory() || (a.isSymbolicLink() && this.isDirectory(join(dirPath, a.name)));
        const bIsDir = b.isDirectory() || (b.isSymbolicLink() && this.isDirectory(join(dirPath, b.name)));
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return a.name.localeCompare(b.name);
      });

      for (const entry of sortedEntries) {
        const entryPath = join(dirPath, entry.name);
        const relativePath = relative(basePath, entryPath);

        // 处理符号链接
        const isDirectory = entry.isDirectory() || (
          entry.isSymbolicLink() && this.isDirectory(entryPath)
        );

        if (isDirectory) {
          const children = this.scanDirectory(entryPath, basePath);
          nodes.push({
            name: entry.name,
            path: relativePath,
            type: 'directory',
            children,
          });
        } else if (entry.isFile()) {
          // 只显示支持的文件类型
          const ext = extname(entry.name).toLowerCase();
          if (['.md', '.txt', '.js', '.ts', '.mjs', '.cjs', '.json', '.html', '.css'].includes(ext)) {
            const description = this.extractDescription(entryPath);
            nodes.push({
              name: entry.name,
              path: relativePath,
              type: 'file',
              description,
            });
          }
        }
      }
    } catch (error) {
      console.error(`Failed to scan directory ${dirPath}:`, error);
    }

    return nodes;
  }

  /**
   * 检查路径是否为目录（处理符号链接）
   */
  private isDirectory(path: string): boolean {
    try {
      return statSync(path).isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * 从文件提取描述
   */
  private extractDescription(filePath: string): string | undefined {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const ext = extname(filePath).toLowerCase();

      if (ext === '.md') {
        return this.extractMarkdownDescription(content);
      } else if (['.js', '.ts', '.mjs', '.cjs'].includes(ext)) {
        return this.extractJsDescription(content);
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * 从 Markdown 文件提取描述
   */
  private extractMarkdownDescription(content: string): string | undefined {
    // 尝试解析 YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const descMatch = frontmatter.match(/^description:\s*([\s\S]*?)(?=\n\w+:|$)/m);
      if (descMatch) {
        const desc = descMatch[1].trim().replace(/\s+/g, ' ');
        return desc.length > 150 ? desc.slice(0, 150) + '...' : desc;
      }
    }

    // 尝试从内容中提取第一段
    const contentWithoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
    const lines = contentWithoutFrontmatter.split('\n');
    const paragraph: string[] = [];
    let inParagraph = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) {
        if (inParagraph) break;
        continue;
      }
      if (!trimmed) {
        if (inParagraph) break;
        continue;
      }
      inParagraph = true;
      paragraph.push(trimmed);
    }

    if (paragraph.length > 0) {
      const desc = paragraph.join(' ');
      return desc.length > 150 ? desc.slice(0, 150) + '...' : desc;
    }

    return undefined;
  }

  /**
   * 从 JS/TS 文件提取描述
   */
  private extractJsDescription(content: string): string | undefined {
    // 尝试从 JSDoc 提取
    const jsdocMatch = content.match(/\/\*\*[\s\S]*?\*\//);
    if (jsdocMatch) {
      const comment = jsdocMatch[0];
      const lines = comment
        .replace(/\/\*\*|\*\//g, '')
        .split('\n')
        .map(line => line.replace(/^\s*\*\s?/, '').trim())
        .filter(line => line && !line.startsWith('@'));

      if (lines.length > 0) {
        const desc = lines.join(' ');
        return desc.length > 150 ? desc.slice(0, 150) + '...' : desc;
      }
    }

    return undefined;
  }

  /**
   * 读取文件内容
   */
  readFile(relativePath: string, scope: 'global' | 'project', projectPath?: string): string | null {
    const basePath = scope === 'global'
      ? this.getGlobalSkillsPath()
      : projectPath ? this.getProjectSkillsPath(projectPath) : '';

    if (!basePath) return null;

    const filePath = join(basePath, relativePath);

    // 安全检查：确保路径在基础目录内
    if (!this.isPathSafe(filePath, basePath)) {
      console.error('Unsafe path access attempted:', relativePath);
      return null;
    }

    try {
      if (!existsSync(filePath)) {
        return null;
      }
      return readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.error(`Failed to read file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * 保存文件内容
   */
  saveFile(relativePath: string, content: string, scope: 'global' | 'project', projectPath?: string): { success: boolean; error?: string } {
    const basePath = scope === 'global'
      ? this.getGlobalSkillsPath()
      : projectPath ? this.getProjectSkillsPath(projectPath) : '';

    if (!basePath) {
      return { success: false, error: 'Invalid base path' };
    }

    const filePath = join(basePath, relativePath);

    // 安全检查
    if (!this.isPathSafe(filePath, basePath)) {
      return { success: false, error: 'Unsafe path access' };
    }

    try {
      writeFileSync(filePath, content, 'utf-8');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 创建文件或目录
   */
  createNode(
    parentPath: string,
    name: string,
    type: 'file' | 'directory',
    scope: 'global' | 'project',
    projectPath?: string
  ): { success: boolean; error?: string; path?: string } {
    const basePath = scope === 'global'
      ? this.getGlobalSkillsPath()
      : projectPath ? this.getProjectSkillsPath(projectPath) : '';

    if (!basePath) {
      return { success: false, error: 'Invalid base path' };
    }

    // 确保基础目录存在
    if (!existsSync(basePath)) {
      try {
        mkdirSync(basePath, { recursive: true });
      } catch (error) {
        return { success: false, error: 'Failed to create skills directory' };
      }
    }

    const targetPath = parentPath ? join(basePath, parentPath, name) : join(basePath, name);

    // 安全检查
    if (!this.isPathSafe(targetPath, basePath)) {
      return { success: false, error: 'Unsafe path access' };
    }

    // 检查是否已存在
    if (existsSync(targetPath)) {
      return { success: false, error: 'File or directory already exists' };
    }

    try {
      if (type === 'directory') {
        mkdirSync(targetPath, { recursive: true });
      } else {
        // 创建带模板的文件
        const ext = extname(name).toLowerCase();
        let content = '';

        if (ext === '.md') {
          content = `---
name: ${basename(name, ext)}
description: 技能描述
---

# ${basename(name, ext)}

技能内容...
`;
        }

        writeFileSync(targetPath, content, 'utf-8');
      }

      const relativePath = parentPath ? join(parentPath, name) : name;
      return { success: true, path: relativePath };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 删除文件或目录
   */
  deleteNode(
    relativePath: string,
    scope: 'global' | 'project',
    projectPath?: string
  ): { success: boolean; error?: string } {
    const basePath = scope === 'global'
      ? this.getGlobalSkillsPath()
      : projectPath ? this.getProjectSkillsPath(projectPath) : '';

    if (!basePath) {
      return { success: false, error: 'Invalid base path' };
    }

    const targetPath = join(basePath, relativePath);

    // 安全检查
    if (!this.isPathSafe(targetPath, basePath)) {
      return { success: false, error: 'Unsafe path access' };
    }

    // 不允许删除根目录
    if (targetPath === basePath) {
      return { success: false, error: 'Cannot delete root directory' };
    }

    try {
      if (!existsSync(targetPath)) {
        return { success: false, error: 'File or directory not found' };
      }

      const stats = lstatSync(targetPath);

      if (stats.isDirectory()) {
        rmSync(targetPath, { recursive: true, force: true });
      } else {
        rmSync(targetPath);
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 安全检查：确保路径在基础目录内
   */
  private isPathSafe(targetPath: string, basePath: string): boolean {
    const normalizedTarget = this.normalizePath(targetPath);
    const normalizedBase = this.normalizePath(basePath);

    // 检查是否以基础路径开头
    if (!normalizedTarget.startsWith(normalizedBase)) {
      return false;
    }

    // 检查路径中是否包含 ..（防止目录遍历攻击）
    if (normalizedTarget.includes('..')) {
      return false;
    }

    return true;
  }

  /**
   * 规范化路径
   */
  private normalizePath(p: string): string {
    return p.replace(/\\/g, '/').replace(/\/+/g, '/');
  }
}

export const skillFileManager = SkillFileManager.getInstance();
