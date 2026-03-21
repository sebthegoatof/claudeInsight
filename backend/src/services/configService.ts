import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

/**
 * 配置文件结构
 */
interface AppConfig {
  claudePath?: string;
  [key: string]: string | undefined;
}

/**
 * ConfigService - 配置文件服务
 * 使用 JSON 文件存储应用配置，替代 SQLite 数据库
 */
export class ConfigService {
  private static instance: ConfigService;
  private configPath: string;
  private config: AppConfig;

  private constructor() {
    // 配置文件存储在用户主目录下
    const configDir = join(homedir(), '.claude-insight');
    this.configPath = join(configDir, 'config.json');
    this.config = this.loadConfig();
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * 加载配置文件
   */
  private loadConfig(): AppConfig {
    try {
      if (existsSync(this.configPath)) {
        const content = readFileSync(this.configPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('Failed to load config file:', error);
    }
    return {};
  }

  /**
   * 保存配置文件
   */
  private saveConfig(): void {
    try {
      const configDir = join(homedir(), '.claude-insight');
      if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true });
      }
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save config file:', error);
    }
  }

  /**
   * 获取配置项
   */
  get(key: string): string | undefined {
    return this.config[key];
  }

  /**
   * 设置配置项
   */
  set(key: string, value: string): void {
    this.config[key] = value;
    this.saveConfig();
  }

  /**
   * 删除配置项
   */
  delete(key: string): boolean {
    if (key in this.config) {
      delete this.config[key];
      this.saveConfig();
      return true;
    }
    return false;
  }

  /**
   * 获取所有配置
   */
  getAll(): AppConfig {
    return { ...this.config };
  }

  /**
   * 批量设置配置
   */
  setAll(settings: Record<string, string>): void {
    this.config = { ...this.config, ...settings };
    this.saveConfig();
  }

  /**
   * 获取配置文件路径
   */
  getConfigPath(): string {
    return this.configPath;
  }
}

export const configService = ConfigService.getInstance();
