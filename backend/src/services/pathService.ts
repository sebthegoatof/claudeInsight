import { homedir, platform } from 'os';
import { join, normalize } from 'path';
import { existsSync } from 'fs';
import { configService } from './configService.js';

/**
 * PathService - 路径探测服务
 * 自动定位默认的 .claude 目录，支持 Windows 和 Unix 路径
 * 支持从配置文件读取用户自定义路径
 */
export class PathService {
  private static instance: PathService;
  private cachedDefaultPath: string | null = null;

  private constructor() {}

  static getInstance(): PathService {
    if (!PathService.instance) {
      PathService.instance = new PathService();
    }
    return PathService.instance;
  }

  /**
   * 获取默认的 .claude 目录路径
   * Windows: %USERPROFILE%\.claude
   * Unix: ~/.claude
   */
  getDefaultClaudePath(): string {
    if (this.cachedDefaultPath) {
      return this.cachedDefaultPath;
    }

    const home = homedir();
    const claudePath = join(home, '.claude');
    this.cachedDefaultPath = normalize(claudePath);

    return this.cachedDefaultPath;
  }

  /**
   * 获取用户配置的 .claude 路径（优先从配置文件读取）
   * 如果没有配置或配置无效，返回默认路径
   */
  getClaudePath(): string {
    const customPath = this.getCustomPathFromConfig();

    if (customPath && this.validatePath(customPath)) {
      return normalize(customPath);
    }

    return this.getDefaultClaudePath();
  }

  /**
   * 从配置文件读取自定义路径
   */
  private getCustomPathFromConfig(): string | null {
    try {
      return configService.get('claudePath') || null;
    } catch (error) {
      console.error('Failed to read custom path from config:', error);
      return null;
    }
  }

  /**
   * 设置自定义路径到配置文件
   */
  setCustomPath(path: string): boolean {
    try {
      configService.set('claudePath', normalize(path));
      return true;
    } catch (error) {
      console.error('Failed to save custom path to config:', error);
      return false;
    }
  }

  /**
   * 清除自定义路径设置
   */
  clearCustomPath(): boolean {
    try {
      configService.delete('claudePath');
      return true;
    } catch (error) {
      console.error('Failed to clear custom path:', error);
      return false;
    }
  }

  /**
   * 验证路径是否存在
   */
  validatePath(path: string): boolean {
    try {
      return existsSync(path);
    } catch {
      return false;
    }
  }

  /**
   * 检测当前平台
   */
  getPlatform(): 'windows' | 'macos' | 'linux' | 'other' {
    const p = platform();
    switch (p) {
      case 'win32':
        return 'windows';
      case 'darwin':
        return 'macos';
      case 'linux':
        return 'linux';
      default:
        return 'other';
    }
  }

  /**
   * 获取路径信息
   */
  getPathInfo(): {
    currentPath: string;
    defaultPath: string;
    isCustom: boolean;
    exists: boolean;
    platform: 'windows' | 'macos' | 'linux' | 'other';
  } {
    const defaultPath = this.getDefaultClaudePath();
    const customPath = this.getCustomPathFromConfig();
    const currentPath = customPath || defaultPath;

    return {
      currentPath,
      defaultPath,
      isCustom: customPath !== null,
      exists: this.validatePath(currentPath),
      platform: this.getPlatform(),
    };
  }

  /**
   * 获取历史文件目录路径
   * Claude 的历史文件通常存储在 .claude/projects/ 目录下
   */
  getHistoryPath(): string {
    return join(this.getClaudePath(), 'projects');
  }

  /**
   * 获取所有可能的历史目录
   */
  getHistoryDirectories(): string[] {
    const claudePath = this.getClaudePath();
    return [
      join(claudePath, 'projects'),
      join(claudePath, 'history'),
      join(claudePath, 'conversations'),
    ];
  }
}

export const pathService = PathService.getInstance();
