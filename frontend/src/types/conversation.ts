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

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  message_type?: 'user_text' | 'assistant_text' | 'tool_action' | 'system_event' | 'interrupt' | 'error' | 'chat';
  is_system_noise: boolean;
  sub_type?: string;
  images?: MessageImage[];
  tool_names?: string[];
  /** tool_use 的工具名称 */
  tool_name?: string;
  /** tool_use 的输入参数 */
  tool_input?: Record<string, unknown>;
  /** 关联 tool_use 和 tool_result 的 ID */
  tool_use_id?: string;
  /** 是否存在完整输出文件 */
  has_full_output?: boolean;
  /** 完整输出文件的相对路径 */
  full_output_path?: string;
  /** 来源 agent 文件名 */
  agent_name?: string;
  /** 使用的模型名称 */
  model?: string;
  /** Token 使用量 */
  tokenUsage?: TokenUsage;
}

export interface SessionInfo {
  sessionId: string;
  type: 'single-file' | 'multi-agent';
  title: string;
  lastModified: string;
  projectPath: string;
  /** 聚合指标（可选） */
  metrics?: SessionMetrics;
}

export interface SessionDetail extends SessionInfo {
  messages: Message[];
  messageCount: number;
  firstMessageAt: string | null;
  lastMessageAt: string | null;
  rawPath?: string;
  /** 聚合指标 */
  metrics: SessionMetrics;
}

export interface Conversation {
  id: number;
  session_id: string;
  title: string;
  project_path: string;
  message_count: number;
  first_message_at: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail extends Conversation {
  messages: string;
  file_path: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 前端展示模型：消息分组后的显示项
 */
export type DisplayItem =
  | { kind: 'message'; message: Message }
  | { kind: 'tool_group'; actions: Message[] };
