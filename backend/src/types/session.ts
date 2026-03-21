/**
 * 会话类型枚举
 */
export type SessionType = 'single-file' | 'multi-agent';

/**
 * 消息类型枚举
 */
export type MessageType = 'user_text' | 'assistant_text' | 'tool_action' | 'system_event' | 'interrupt' | 'error' | 'chat';

/**
 * 图片信息
 */
export interface MessageImage {
  type: string;
  source: string;
  media_type?: string;
}

/**
 * Token 使用量信息（单条消息级别）
 */
export interface TokenUsage {
  /** 基础输入 tokens */
  input_tokens: number;
  /** 基础输出 tokens */
  output_tokens: number;
  /** 缓存写入 tokens（若有） */
  cache_creation_input_tokens?: number;
  /** 缓存命中 tokens（若有） */
  cache_read_input_tokens?: number;
}

/**
 * 会话级聚合指标
 */
export interface SessionMetrics {
  /** 总 token 消耗 */
  totalTokens: number;
  /** 输入 tokens 总和 */
  inputTokens: number;
  /** 输出 tokens 总和 */
  outputTokens: number;
  /** 缓存命中 tokens 总和 */
  cacheHitTokens: number;
  /** 缓存写入 tokens 总和 */
  cacheCreationTokens: number;
  /** 使用的模型列表（去重） */
  modelsUsed: string[];
}

/**
 * 项目级聚合指标
 */
export interface ProjectMetrics {
  /** 总 token 消耗 */
  totalTokens: number;
  /** 输入 tokens 总和 */
  inputTokens: number;
  /** 输出 tokens 总和 */
  outputTokens: number;
  /** 缓存命中 tokens 总和 */
  cacheHitTokens: number;
  /** 缓存写入 tokens 总和 */
  cacheCreationTokens: number;
  /** 使用的模型列表（去重） */
  modelsUsed: string[];
  /** 有 metrics 数据的会话数 */
  sessionsWithMetrics: number;
}

/**
 * 解析后的消息（拍平后的一维视图模型）
 */
export interface ParsedMessage {
  role: string;
  content: string;
  timestamp?: string;
  message_type: MessageType;
  is_system_noise: boolean;
  sub_type?: string;
  images?: MessageImage[];
  tool_names?: string[];
  /** tool_use 的工具名称 (如 Bash, Read, Edit) */
  tool_name?: string;
  /** tool_use 的输入参数 */
  tool_input?: Record<string, unknown>;
  /** 关联 tool_use 和 tool_result 的 ID */
  tool_use_id?: string;
  /** 是否存在完整输出文件（tool_result 被截断时） */
  has_full_output?: boolean;
  /** 完整输出文件的相对路径 (如 tool-results/xxx.txt) */
  full_output_path?: string;
  /** 来源 agent 文件名（多智能体场景） */
  agent_name?: string;
  /** 使用的模型名称（如 claude-3-5-sonnet） */
  model?: string;
  /** Token 使用量 */
  tokenUsage?: TokenUsage;
}

/**
 * 会话基本信息（列表展示）
 */
export interface SessionInfo {
  sessionId: string;
  type: SessionType;
  title: string;
  lastModified: Date;
  rawPath: string;        // 文件或文件夹的绝对路径
  projectPath: string;    // 所属项目路径（解码后）
  /** 聚合指标（可选，延迟计算） */
  metrics?: SessionMetrics;
}

/**
 * 会话详情（包含消息内容）
 */
export interface SessionDetail extends SessionInfo {
  messages: ParsedMessage[];
  messageCount: number;
  firstMessageAt: Date | null;
  lastMessageAt: Date | null;
  rawPath: string;
  gitBranch?: string;
  /** 聚合指标 */
  metrics: SessionMetrics;
}

/**
 * 项目信息
 */
export interface ProjectInfo {
  path: string;           // 解码后的项目路径
  encodedPath: string;    // 编码后的目录名
  sessionCount: number;
  lastActivityAt: Date | null;
  /** 聚合指标（可选） */
  metrics?: ProjectMetrics;
}

/**
 * 内容块类型
 */
export interface ContentBlock {
  type: string;
  text?: string;
  content?: string | ContentBlock[];
  /** tool_use 块的唯一 ID */
  id?: string;
  /** tool_result 块引用的 tool_use ID */
  tool_use_id?: string;
  name?: string;
  input?: object;
  thinking?: string;
  source?: {
    type?: string;
    data?: string;
    url?: string;
    media_type?: string;
  };
}

/**
 * 内容块拍平后的中间结构
 */
export interface FlattenedEntry {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking' | 'image';
  content: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_use_id?: string;
  images?: MessageImage[];
}

/**
 * JSONL 消息记录
 */
export interface JsonlMessage {
  type: string;
  uuid?: string;
  parentUuid?: string;
  sessionId?: string;
  cwd?: string;
  message?: {
    role: string;
    content: string | ContentBlock[];
    model?: string;
    usage?: TokenUsage;
  };
  timestamp?: string;
  isSidechain?: boolean;
  isMeta?: boolean;
  subtype?: string;
  toolUseResult?: object;
  /** 顶层 model 字段（某些记录格式） */
  model?: string;
  /** 顶层 usage 字段（某些记录格式） */
  usage?: TokenUsage;
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
