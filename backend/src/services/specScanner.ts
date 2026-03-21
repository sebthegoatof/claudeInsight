import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * 规范章节
 */
export interface SpecSection {
  title: string;
  content: string;
  level: number;
}

/**
 * 解析后的规范数据
 */
export interface ParsedSpec {
  content: string;
  summary: string;
  sections: SpecSection[];
}

/**
 * SpecScanner - CLAUDE.md 规范扫描器
 * 扫描项目根目录的 CLAUDE.md 文件并解析内容
 */
export class SpecScanner {
  private static instance: SpecScanner;

  private constructor() {}

  static getInstance(): SpecScanner {
    if (!SpecScanner.instance) {
      SpecScanner.instance = new SpecScanner();
    }
    return SpecScanner.instance;
  }

  /**
   * 获取项目 CLAUDE.md 文件路径
   */
  getSpecPath(projectPath: string): string {
    return join(projectPath, 'CLAUDE.md');
  }

  /**
   * 扫描项目规范
   */
  scanProjectSpec(projectPath: string): ParsedSpec | null {
    const specPath = this.getSpecPath(projectPath);

    if (!existsSync(specPath)) {
      return null;
    }

    try {
      const content = readFileSync(specPath, 'utf-8');
      return this.parseSpecContent(content);
    } catch (error) {
      console.error(`Failed to read spec file ${specPath}:`, error);
      return null;
    }
  }

  /**
   * 解析规范内容
   */
  parseSpecContent(content: string): ParsedSpec {
    const sections = this.extractSections(content);
    const summary = this.generateSummary(content, sections);

    return {
      content,
      summary,
      sections,
    };
  }

  /**
   * 提取 Markdown 章节
   */
  private extractSections(content: string): SpecSection[] {
    const sections: SpecSection[] = [];
    const lines = content.split('\n');

    let currentSection: SpecSection | null = null;
    let currentContent: string[] = [];

    for (const line of lines) {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headerMatch) {
        // Save previous section
        if (currentSection) {
          currentSection.content = currentContent.join('\n').trim();
          sections.push(currentSection);
        }

        // Start new section
        const level = headerMatch[1].length;
        const title = headerMatch[2].trim();

        currentSection = {
          title,
          content: '',
          level,
        };
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentSection) {
      currentSection.content = currentContent.join('\n').trim();
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * 生成规范摘要
   */
  private generateSummary(content: string, sections: SpecSection[]): string {
    // Try to use the first paragraph as summary
    const lines = content.split('\n');
    const firstParagraph: string[] = [];
    let foundContent = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip headers
      if (trimmed.startsWith('#')) {
        if (foundContent) break;
        continue;
      }

      // Skip empty lines at the beginning
      if (!trimmed && !foundContent) continue;

      // Found content
      if (trimmed) {
        foundContent = true;
        firstParagraph.push(trimmed);
      } else if (foundContent) {
        // End of paragraph
        break;
      }
    }

    if (firstParagraph.length > 0) {
      const summary = firstParagraph.join(' ');
      return summary.length > 200 ? summary.slice(0, 200) + '...' : summary;
    }

    // Fallback: use first section title
    if (sections.length > 0) {
      return `主要章节: ${sections.slice(0, 3).map(s => s.title).join(', ')}`;
    }

    return '';
  }

  /**
   * 保存规范到本地文件
   */
  saveSpecToFile(projectPath: string, content: string): { success: boolean; error?: string } {
    const specPath = this.getSpecPath(projectPath);

    try {
      // 确保项目目录存在
      if (!existsSync(projectPath)) {
        mkdirSync(projectPath, { recursive: true });
      }

      writeFileSync(specPath, content, 'utf-8');

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to save spec to ${specPath}:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }
}

export const specScanner = SpecScanner.getInstance();
