import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join, basename, extname } from 'path';
import { pathService } from './pathService.js';

/**
 * 技能元数据
 */
export interface SkillMetadata {
  version?: string;
  author?: string;
  tags?: string[];
  dependencies?: string[];
  license?: string;
}

/**
 * 解析后的技能数据
 */
export interface ParsedSkill {
  name: string;
  filePath: string;
  description: string | null;
  scope: 'global' | 'project';
  metadata: SkillMetadata | null;
}

/**
 * SkillScanner - 技能扫描器
 * 扫描 .claude/skills/ 目录下的技能
 * 支持:
 * - SKILL.md 格式（目录形式的技能）
 * - JS/TS 脚本文件
 */
export class SkillScanner {
  private static instance: SkillScanner;

  // Supported skill file extensions
  private static readonly SUPPORTED_EXTENSIONS = ['.js', '.ts', '.mjs', '.cjs', '.md'];
  // Skill directory marker file
  private static readonly SKILL_FILE = 'SKILL.md';

  private constructor() {}

  static getInstance(): SkillScanner {
    if (!SkillScanner.instance) {
      SkillScanner.instance = new SkillScanner();
    }
    return SkillScanner.instance;
  }

  /**
   * 获取项目技能目录路径
   */
  getSkillsPath(projectPath: string): string {
    return join(projectPath, '.claude', 'skills');
  }

  /**
   * 获取全局技能目录路径
   */
  getGlobalSkillsPath(): string {
    return join(pathService.getClaudePath(), 'skills');
  }

  /**
   * 扫描项目技能
   */
  scanProjectSkills(projectPath: string): ParsedSkill[] {
    const skillsPath = this.getSkillsPath(projectPath);
    return this.scanSkillsDirectory(skillsPath, 'project');
  }

  /**
   * 扫描全局技能
   */
  scanGlobalSkills(): ParsedSkill[] {
    const skillsPath = this.getGlobalSkillsPath();
    return this.scanSkillsDirectory(skillsPath, 'global');
  }

  /**
   * 扫描技能目录
   */
  private scanSkillsDirectory(
    dirPath: string,
    scope: 'global' | 'project'
  ): ParsedSkill[] {
    const skills: ParsedSkill[] = [];

    if (!existsSync(dirPath)) {
      return skills;
    }

    try {
      const entries = readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = join(dirPath, entry.name);

        // Check if it's a directory (including symlinked directories)
        const isDirectory = entry.isDirectory() || (
          entry.isSymbolicLink() && this.isDirectory(entryPath)
        );

        if (isDirectory) {
          // Check if directory contains SKILL.md (directory-based skill)
          const skillMdPath = join(entryPath, SkillScanner.SKILL_FILE);
          if (existsSync(skillMdPath)) {
            const skill = this.parseSkillMdFile(skillMdPath, scope);
            if (skill) {
              skills.push(skill);
            }
          } else {
            // Recursively scan subdirectories for other skills
            const subSkills = this.scanSkillsDirectory(entryPath, scope);
            skills.push(...subSkills);
          }
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();

          if (SkillScanner.SUPPORTED_EXTENSIONS.includes(ext)) {
            const skill = this.parseSkillFile(entryPath, scope);

            if (skill) {
              skills.push(skill);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Failed to scan skills directory ${dirPath}:`, error);
    }

    return skills;
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
   * 解析 SKILL.md 文件
   */
  private parseSkillMdFile(
    filePath: string,
    scope: 'global' | 'project'
  ): ParsedSkill | null {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const dirName = basename(join(filePath, '..'));

      // Normalize line endings
      const normalizedContent = content.replace(/\r\n/g, '\n');

      // Parse YAML front matter
      const frontMatterMatch = normalizedContent.match(/^---\n([\s\S]*?)\n---/);
      let name = this.formatSkillName(dirName);
      let description: string | null = null;
      let metadata: SkillMetadata = {};

      if (frontMatterMatch) {
        const frontMatter = frontMatterMatch[1];

        // Extract name
        const nameMatch = frontMatter.match(/^name:\s*(.+)$/m);
        if (nameMatch) {
          name = nameMatch[1].trim();
        }

        // Extract description (may span multiple lines until next key or end)
        const descMatch = frontMatter.match(/^description:\s*([\s\S]*?)(?=\n\w+:|$)/m);
        if (descMatch) {
          description = descMatch[1].trim().replace(/\s+/g, ' ');
          // Limit description length
          if (description.length > 300) {
            description = description.slice(0, 300) + '...';
          }
        }

        // Extract license
        const licenseMatch = frontMatter.match(/^license:\s*(.+)$/m);
        if (licenseMatch) {
          metadata.license = licenseMatch[1].trim();
        }
      }

      // If no description from front matter, try to extract from content
      if (!description) {
        description = this.extractDescriptionFromMarkdown(content);
      }

      return {
        name,
        filePath: join(filePath, '..'), // Store directory path
        description,
        scope,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      };
    } catch (error) {
      console.error(`Failed to parse SKILL.md file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * 从 Markdown 内容提取描述
   */
  private extractDescriptionFromMarkdown(content: string): string | null {
    // Remove front matter
    const contentWithoutFrontMatter = content.replace(/^---\n[\s\S]*?\n---\n?/, '');

    // Find first paragraph
    const lines = contentWithoutFrontMatter.split('\n');
    const paragraph: string[] = [];
    let inParagraph = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip headers
      if (trimmed.startsWith('#')) {
        if (inParagraph) break;
        continue;
      }

      // Skip empty lines
      if (!trimmed) {
        if (inParagraph) break;
        continue;
      }

      // Found content
      inParagraph = true;
      paragraph.push(trimmed);
    }

    if (paragraph.length > 0) {
      const desc = paragraph.join(' ');
      return desc.length > 200 ? desc.slice(0, 200) + '...' : desc;
    }

    return null;
  }

  /**
   * 解析技能文件
   */
  private parseSkillFile(
    filePath: string,
    scope: 'global' | 'project'
  ): ParsedSkill | null {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const fileName = basename(filePath, extname(filePath));

      // Extract metadata from file
      const metadata = this.extractMetadata(content);
      const description = this.extractDescription(content);

      return {
        name: this.formatSkillName(fileName),
        filePath,
        description,
        scope,
        metadata,
      };
    } catch (error) {
      console.error(`Failed to parse skill file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * 格式化技能名称
   */
  private formatSkillName(fileName: string): string {
    // Convert kebab-case or snake_case to Title Case
    return fileName
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * 从文件内容提取描述
   */
  private extractDescription(content: string): string | null {
    // Try to extract from JSDoc @description tag
    const jsdocDescMatch = content.match(/@description\s+(.+)/);
    if (jsdocDescMatch) {
      return jsdocDescMatch[1].trim();
    }

    // Try to extract from first JSDoc comment
    const jsdocMatch = content.match(/\/\*\*[\s\S]*?\*\//);
    if (jsdocMatch) {
      const comment = jsdocMatch[0];
      const lines = comment
        .replace(/\/\*\*|\*\//g, '')
        .split('\n')
        .map((line) => line.replace(/^\s*\*\s?/, '').trim())
        .filter((line) => line && !line.startsWith('@'));

      if (lines.length > 0) {
        return lines.join(' ').slice(0, 200);
      }
    }

    // Try to extract from single-line comment at the top
    const singleLineMatch = content.match(/\/\/\s*(.+)/);
    if (singleLineMatch) {
      return singleLineMatch[1].trim().slice(0, 200);
    }

    return null;
  }

  /**
   * 从文件内容提取元数据
   */
  private extractMetadata(content: string): SkillMetadata | null {
    const metadata: SkillMetadata = {};
    let hasMetadata = false;

    // Extract version
    const versionMatch = content.match(/@version\s+(.+)/);
    if (versionMatch) {
      metadata.version = versionMatch[1].trim();
      hasMetadata = true;
    }

    // Extract author
    const authorMatch = content.match(/@author\s+(.+)/);
    if (authorMatch) {
      metadata.author = authorMatch[1].trim();
      hasMetadata = true;
    }

    // Extract tags
    const tagsMatch = content.match(/@tags\s+(.+)/);
    if (tagsMatch) {
      metadata.tags = tagsMatch[1]
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      hasMetadata = true;
    }

    return hasMetadata ? metadata : null;
  }
}

export const skillScanner = SkillScanner.getInstance();
