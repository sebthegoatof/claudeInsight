<script setup lang="ts">
import { ref, computed } from 'vue';
import { useConversationStore } from '../../stores/conversationStore';
import MessageContent from './MessageContent.vue';
import FileVersionBadges from './FileVersionBadges.vue';
import type { Message } from '../../types/conversation';
import type { SessionFileHistory } from '../../api/backup';
import {
  ChevronDown,
  ChevronRight,
  Terminal,
  FileText,
  Pencil,
  Eye,
  Search,
  Play,
  CheckCircle,
  Loader2,
  ExternalLink,
  ChevronUp,
  Cpu,
  Zap,
  Bot,
  Plug,
} from 'lucide-vue-next';

interface Props {
  actions: Message[];
  fileHistory?: SessionFileHistory | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'openPanel', panel: 'skill' | 'agent' | 'mcp', item?: string): void;
}>();

const conversationStore = useConversationStore();

// 折叠状态
const expanded = ref(false);

// 完整日志加载状态（按 tool_use_id 记录）
const fullOutputs = ref<Record<string, { loading: boolean; content: string | null }>>({});

// 内容展开状态（按 action 索引记录）
const contentExpanded = ref<Record<number, boolean>>({});

// 提取该组涉及的工具名称列表（去重）
const toolNames = computed(() => {
  const names = new Set<string>();
  for (const action of props.actions) {
    if (action.tool_name) {
      names.add(action.tool_name);
    }
  }
  return [...names];
});

// 工具调用数量
const toolUseCount = computed(() =>
  props.actions.filter((a) => a.sub_type?.startsWith('调用')).length
);

// 组标题摘要
const groupSummary = computed(() => {
  if (toolNames.value.length === 0) {
    return `${props.actions.length} 步操作`;
  }
  const names = toolNames.value.slice(0, 3).join(', ');
  const suffix = toolNames.value.length > 3 ? ` 等 ${toolNames.value.length} 个工具` : '';
  return `${names}${suffix}`;
});

// 获取工具图标
function getToolIcon(name?: string) {
  switch (name) {
    case 'Bash':
      return Terminal;
    case 'Read':
      return Eye;
    case 'Edit':
      return Pencil;
    case 'Write':
      return FileText;
    case 'Glob':
    case 'Grep':
      return Search;
    case 'Task':
      return Play;
    default:
      return Terminal;
  }
}

// 获取工具输入摘要
function getInputSummary(action: Message): string {
  if (!action.tool_input) return '';

  const input = action.tool_input;
  const name = action.tool_name;

  switch (name) {
    case 'Bash':
      return (input.command as string) || '';
    case 'Read':
      return (input.file_path as string) || '';
    case 'Edit':
      return (input.file_path as string) || '';
    case 'Write':
      return (input.file_path as string) || '';
    case 'Glob':
      return (input.pattern as string) || '';
    case 'Grep':
      return (input.pattern as string) || '';
    case 'Task':
      return (input.description as string) || (input.prompt as string)?.slice(0, 80) || '';
    default: {
      // 通用：取第一个字符串值
      const firstVal = Object.values(input).find((v) => typeof v === 'string');
      return typeof firstVal === 'string' ? firstVal.slice(0, 100) : '';
    }
  }
}

// 默认显示的最大字符数
const DEFAULT_MAX_LEN = 500;
const TRUNCATED_PREVIEW_LEN = 200;

// 判断内容是否需要截断
function needsTruncation(content: string, maxLen = DEFAULT_MAX_LEN): boolean {
  if (!content) return false;
  return content.length > maxLen;
}

// 获取显示内容（根据展开状态）
function getDisplayContent(content: string, index: number, maxLen = DEFAULT_MAX_LEN): string {
  if (!content) return '';
  if (content.length <= maxLen) return content;
  // 如果已展开，返回完整内容
  if (contentExpanded.value[index]) return content;
  // 否则返回截断内容
  return content.slice(0, maxLen);
}

// 切换内容展开状态
function toggleContentExpand(index: number) {
  contentExpanded.value[index] = !contentExpanded.value[index];
}

// 判断某个 action 的内容是否展开
function isContentExpanded(index: number): boolean {
  return contentExpanded.value[index] === true;
}

// 判断是否为 tool_use 消息
function isToolUse(action: Message): boolean {
  return action.sub_type?.startsWith('调用') === true;
}

// 判断是否为 tool_result 消息
function isToolResult(action: Message): boolean {
  return action.sub_type === '工具结果';
}

// 判断是否为 MCP 工具调用
function isMcpTool(toolName?: string): boolean {
  return !!toolName && toolName.startsWith('mcp__');
}

// 从 MCP 工具名称中提取服务器名
function getMcpServerName(toolName?: string): string {
  if (!toolName || !toolName.startsWith('mcp__')) return '';
  const parts = toolName.split('__');
  return parts[1] || '';
}

// 从 MCP 工具名称中提取工具名
function getMcpToolName(toolName?: string): string {
  if (!toolName || !toolName.startsWith('mcp__')) return toolName || '';
  const parts = toolName.split('__');
  return parts.slice(2).join('__') || toolName;
}

// 判断是否为 Agent 调用
function isAgentTool(toolName?: string): boolean {
  return toolName === 'Agent' || toolName === 'agent';
}

// 判断是否为 Skill 调用
function isSkillTool(toolName?: string): boolean {
  return toolName === 'Skill' || toolName === 'skill';
}

// 获取工具类型标签配置
function getToolTypeConfig(action: Message): {
  type: 'mcp' | 'agent' | 'skill';
  icon: typeof Plug;
  color: string;
  bgClass: string;
  label: string;
  toolName: string;
} | null {
  const toolName = action.tool_name;

  if (isMcpTool(toolName)) {
    return {
      type: 'mcp' as const,
      icon: Plug,
      color: 'text-emerald-500',
      bgClass: 'bg-emerald-500/10',
      label: getMcpServerName(toolName),
      toolName: getMcpToolName(toolName),
    };
  }

  if (isAgentTool(toolName)) {
    const input = action.tool_input || {};
    return {
      type: 'agent' as const,
      icon: Bot,
      color: 'text-accent',
      bgClass: 'bg-accent/10',
      label: 'Agent',
      toolName: String(input.subagent_type || input.agent_type || 'unknown'),
    };
  }

  if (isSkillTool(toolName)) {
    const input = action.tool_input || {};
    return {
      type: 'skill' as const,
      icon: Zap,
      color: 'text-primary',
      bgClass: 'bg-primary/10',
      label: 'Skill',
      toolName: String(input.skill || input.name || 'unknown'),
    };
  }

  return null;
}

// 打开联动面板（只通过 emit 通知父组件，避免直接操作 store 导致多面板同时打开）
function openLinkagePanel(type: 'skill' | 'agent' | 'mcp', item?: string) {
  emit('openPanel', type, item);
}

// 处理打开联动面板（从模板调用）
function handleOpenLinkagePanel(action: Message) {
  const config = getToolTypeConfig(action);
  if (!config) return;

  const item = config.type === 'mcp' ? config.label : config.toolName;
  openLinkagePanel(config.type as 'skill' | 'agent' | 'mcp', item);
}

// 判断是否为代码输出/助手回复（有实际内容需要展示）
function isAssistantOutput(action: Message): boolean {
  // 这些 sub_type 通常包含 assistant 的实际回复内容
  const outputTypes = ['代码输出', '文本输出', '回复', 'response', 'output'];
  return outputTypes.includes(action.sub_type || '') ||
         (action.role === 'assistant' && !!action.content && !isToolUse(action) && !isToolResult(action));
}

// 是否包含截断的完整输出指针
function hasFullOutputPointer(action: Message): boolean {
  if (action.has_full_output && action.full_output_path) return true;
  // 也检查内容中是否有 tool-results/ 路径
  return /tool-results\/[\w./-]+/.test(action.content || '');
}

// 获取 full output 路径
function getFullOutputPath(action: Message): string {
  if (action.full_output_path) return action.full_output_path;
  const match = (action.content || '').match(/tool-results\/[\w./-]+/);
  return match?.[0] || '';
}

// 加载完整输出
async function loadFullOutput(action: Message) {
  const path = getFullOutputPath(action);
  if (!path) return;

  const key = action.tool_use_id || path;
  fullOutputs.value[key] = { loading: true, content: null };

  const content = await conversationStore.fetchToolResult(path);
  fullOutputs.value[key] = { loading: false, content };
}

// 获取已加载的完整输出
function getLoadedOutput(action: Message): { loading: boolean; content: string | null } | null {
  const key = action.tool_use_id || getFullOutputPath(action);
  return fullOutputs.value[key] || null;
}

// 格式化 Token 数量
function formatTokens(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

// 文件修改类工具集合
const FILE_MODIFY_TOOLS = new Set(['Write', 'Edit', 'NotebookEdit']);

// 为 tool_use action 匹配文件版本
function getFileVersions(action: Message): { filePath: string; versions: SessionFileHistory['files'][0]['versions'] } | null {
  if (!props.fileHistory?.files?.length) return null;
  if (!action.tool_input || !FILE_MODIFY_TOOLS.has(action.tool_name || '')) return null;

  const targetPath = (action.tool_input.file_path as string) || (action.tool_input.notebook_path as string);
  if (!targetPath) return null;

  // 在 fileHistory 中查找匹配的文件
  for (const file of props.fileHistory.files) {
    // 精确匹配或尾部匹配
    if (file.filePath === targetPath ||
        targetPath.endsWith(file.filePath) ||
        file.filePath.endsWith(targetPath)) {
      return { filePath: file.filePath, versions: file.versions };
    }
  }
  return null;
}

// 获取当前 sessionId
const currentSessionId = computed(() => conversationStore.currentSession?.sessionId || '');
</script>

<template>
  <div class="tool-action-group border-b border-border/30">
    <!-- 折叠头部 -->
    <button
      @click="expanded = !expanded"
      class="w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-muted/30"
      :class="expanded ? 'bg-muted/20' : ''"
    >
      <!-- 展开/折叠图标 -->
      <ChevronDown v-if="expanded" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <ChevronRight v-else class="w-4 h-4 text-muted-foreground flex-shrink-0" />

      <!-- 工具图标 -->
      <div class="flex -space-x-1">
        <div
          v-for="name in toolNames.slice(0, 3)"
          :key="name"
          class="w-5 h-5 rounded bg-blue-500/10 flex items-center justify-center"
        >
          <component :is="getToolIcon(name)" class="w-3 h-3 text-blue-500" />
        </div>
      </div>

      <!-- 摘要信息 -->
      <span class="text-xs font-medium text-muted-foreground flex-1 truncate">
        {{ groupSummary }}
      </span>

      <!-- 步骤数 -->
      <span class="text-[10px] text-muted-foreground/60 flex-shrink-0">
        {{ toolUseCount }} 次调用
      </span>
    </button>

    <!-- 展开内容 -->
    <div v-if="expanded" class="border-t border-border/20">
      <div
        v-for="(action, idx) in actions"
        :key="idx"
        class="border-b border-border/10 last:border-b-0"
      >
        <!-- Tool Use 条目 -->
        <div v-if="isToolUse(action)" class="px-4 py-2">
          <div class="flex items-center gap-2 mb-1.5">
            <!-- MCP/Agent/Skill 特殊图标 -->
            <template v-if="getToolTypeConfig(action)">
              <component
                :is="getToolTypeConfig(action)!.icon"
                class="w-3.5 h-3.5"
                :class="getToolTypeConfig(action)!.color"
              />
              <span class="text-xs font-semibold" :class="getToolTypeConfig(action)!.color">
                {{ getToolTypeConfig(action)!.label }}
              </span>
              <span class="text-[10px] text-muted-foreground">
                {{ getToolTypeConfig(action)!.toolName }}
              </span>
            </template>
            <template v-else>
              <component :is="getToolIcon(action.tool_name)" class="w-3.5 h-3.5 text-blue-500" />
              <span class="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {{ action.tool_name }}
              </span>
            </template>
            <span
              v-if="action.timestamp"
              class="text-[10px] text-muted-foreground/50 ml-auto"
            >
              {{ new Date(action.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }}
            </span>
          </div>

          <!-- 工具输入摘要 -->
          <div
            v-if="getInputSummary(action)"
            class="tool-terminal rounded-md p-2.5 text-xs font-mono overflow-x-auto"
          >
            <span class="text-green-400 select-none">$ </span>
            <span class="text-gray-200">{{ getInputSummary(action) }}</span>
          </div>

          <!-- 联动徽章（可点击打开面板） -->
          <div
            v-if="getToolTypeConfig(action) && ['mcp', 'agent', 'skill'].includes(getToolTypeConfig(action)!.type)"
            class="mt-2"
          >
            <button
              @click.stop="handleOpenLinkagePanel(action)"
              class="text-[10px] px-2 py-0.5 rounded transition-colors"
              :class="getToolTypeConfig(action)!.bgClass + ' ' + getToolTypeConfig(action)!.color + ' hover:opacity-80'"
            >
              查看详情 →
            </button>
          </div>

          <!-- 文件版本徽章 -->
          <FileVersionBadges
            v-if="getFileVersions(action)"
            :file-path="getFileVersions(action)!.filePath"
            :versions="getFileVersions(action)!.versions"
            :session-id="currentSessionId"
          />
        </div>

        <!-- Tool Result 条目 -->
        <div v-else-if="isToolResult(action)" class="px-4 py-2">
          <div class="flex items-center gap-1.5 mb-1.5">
            <CheckCircle class="w-3 h-3 text-green-500" />
            <span class="text-[11px] text-muted-foreground">执行结果</span>
          </div>

          <!-- 判断是否为截断输出（有完整输出文件） -->
          <template v-if="hasFullOutputPointer(action)">
            <!-- 截断提示 + 加载按钮 -->
            <div class="tool-terminal rounded-md p-2.5 text-xs font-mono">
              <div class="text-gray-400 mb-2 whitespace-pre-wrap break-words">{{ getDisplayContent(action.content || '', idx, TRUNCATED_PREVIEW_LEN) }}</div>

              <template v-if="getLoadedOutput(action)">
                <!-- 加载中 -->
                <div v-if="getLoadedOutput(action)!.loading" class="flex items-center gap-2 text-blue-400">
                  <Loader2 class="w-3.5 h-3.5 animate-spin" />
                  <span>加载完整日志...</span>
                </div>
                <!-- 已加载 -->
                <div v-else-if="getLoadedOutput(action)!.content" class="mt-2">
                  <div class="text-[10px] text-muted-foreground/50 mb-1">完整输出:</div>
                  <pre class="text-gray-200 whitespace-pre-wrap break-words max-h-96 overflow-y-auto">{{ getLoadedOutput(action)!.content }}</pre>
                </div>
                <div v-else class="text-red-400 text-xs">加载失败</div>
              </template>

              <div v-else class="flex items-center gap-2 mt-2 flex-wrap">
                <!-- 展开预览按钮（如果内容较长且未展开） -->
                <button
                  v-if="needsTruncation(action.content || '', TRUNCATED_PREVIEW_LEN) && !isContentExpanded(idx)"
                  @click.stop="toggleContentExpand(idx)"
                  class="flex items-center gap-1 px-2 py-1 rounded bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-300 transition-colors text-xs font-sans"
                >
                  <ChevronDown class="w-3 h-3" />
                  展开预览
                </button>
                <!-- 收起按钮 -->
                <button
                  v-if="isContentExpanded(idx)"
                  @click.stop="toggleContentExpand(idx)"
                  class="flex items-center gap-1 px-2 py-1 rounded bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-300 transition-colors text-xs font-sans"
                >
                  <ChevronUp class="w-3 h-3" />
                  收起
                </button>
                <!-- 查看完整日志按钮 -->
                <button
                  @click.stop="loadFullOutput(action)"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors text-xs font-sans"
                >
                  <ExternalLink class="w-3.5 h-3.5" />
                  查看完整日志
                </button>
              </div>
            </div>
          </template>

          <!-- 普通结果输出 -->
          <template v-else>
            <div
              v-if="action.content"
              class="tool-terminal rounded-md p-2.5 text-xs font-mono"
              :class="isContentExpanded(idx) ? '' : 'max-h-60 overflow-y-auto'"
            >
              <pre class="text-gray-200 whitespace-pre-wrap break-words">{{ getDisplayContent(action.content, idx) }}</pre>
              <!-- 展开/收起按钮 -->
              <div v-if="needsTruncation(action.content)" class="mt-2">
                <button
                  v-if="!isContentExpanded(idx)"
                  @click.stop="toggleContentExpand(idx)"
                  class="flex items-center gap-1 px-2 py-1 rounded bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-300 transition-colors text-xs font-sans"
                >
                  <ChevronDown class="w-3 h-3" />
                  展开全部 ({{ action.content.length - DEFAULT_MAX_LEN }} 字符)
                </button>
                <button
                  v-else
                  @click.stop="toggleContentExpand(idx)"
                  class="flex items-center gap-1 px-2 py-1 rounded bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-300 transition-colors text-xs font-sans"
                >
                  <ChevronUp class="w-3 h-3" />
                  收起
                </button>
              </div>
            </div>
          </template>
        </div>

        <!-- 代码输出/助手回复（有实际内容） -->
        <div v-else-if="isAssistantOutput(action)" class="px-4 py-3 bg-muted/10">
          <div class="flex items-center gap-1.5 mb-2">
            <component :is="getToolIcon(action.tool_name)" class="w-3 h-3 text-violet-500" />
            <span class="text-[11px] font-medium text-violet-500">{{ action.sub_type || '输出' }}</span>
            <span
              v-if="action.model"
              class="text-[10px] text-muted-foreground/50 ml-auto"
            >
              {{ action.model.split('/').pop() || action.model }}
            </span>
          </div>
          <!-- 使用 MessageContent 组件渲染 Markdown -->
          <div v-if="action.content" class="assistant-output-content">
            <MessageContent
              v-if="isContentExpanded(idx) || (action.content.length <= 2000)"
              :content="action.content"
            />
            <MessageContent
              v-else
              :content="action.content.slice(0, 2000) + '\n\n...'"
            />
          </div>
          <!-- Token 使用信息 -->
          <div
            v-if="action.tokenUsage && (action.tokenUsage.input_tokens > 0 || action.tokenUsage.output_tokens > 0)"
            class="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-border/20"
          >
            <span class="text-[10px] text-muted-foreground/70 flex items-center gap-1">
              <Cpu class="w-3 h-3" />
              {{ formatTokens((action.tokenUsage.input_tokens || 0) + (action.tokenUsage.output_tokens || 0)) }} tokens
            </span>
            <span
              v-if="action.tokenUsage.cache_read_input_tokens"
              class="text-[10px] text-green-500/80 flex items-center gap-0.5"
            >
              <Zap class="w-2.5 h-2.5" />
              缓存命中 {{ formatTokens(action.tokenUsage.cache_read_input_tokens) }}
            </span>
          </div>
          <!-- 展开/收起按钮 -->
          <div v-if="needsTruncation(action.content || '', 2000)" class="mt-2">
            <button
              v-if="!isContentExpanded(idx)"
              @click.stop="toggleContentExpand(idx)"
              class="flex items-center gap-1 px-2 py-1 rounded bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-xs font-sans"
            >
              <ChevronDown class="w-3 h-3" />
              展开全部 ({{ action.content.length - 2000 }} 字符)
            </button>
            <button
              v-else
              @click.stop="toggleContentExpand(idx)"
              class="flex items-center gap-1 px-2 py-1 rounded bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-xs font-sans"
            >
              <ChevronUp class="w-3 h-3" />
              收起
            </button>
          </div>
        </div>

        <!-- 其他工具操作（系统事件等） -->
        <div v-else class="px-4 py-1.5">
          <div class="text-[11px] text-muted-foreground/60 truncate">
            {{ action.sub_type || '系统操作' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-terminal {
  background-color: #1a1a2e;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

:deep(.tool-terminal) pre {
  margin: 0;
}

/* Assistant output 内容样式 */
.assistant-output-content {
  @apply text-sm;
}

.assistant-output-content :deep(.message-content) {
  @apply text-sm;
}

.assistant-output-content :deep(p) {
  @apply my-1.5;
}

.assistant-output-content :deep(h1),
.assistant-output-content :deep(h2),
.assistant-output-content :deep(h3),
.assistant-output-content :deep(h4) {
  @apply my-2 font-semibold;
}

.assistant-output-content :deep(h1) {
  @apply text-base;
}

.assistant-output-content :deep(h2) {
  @apply text-sm;
}

.assistant-output-content :deep(h3),
.assistant-output-content :deep(h4) {
  @apply text-xs;
}

.assistant-output-content :deep(table) {
  @apply my-2 w-full border-collapse text-xs;
}

.assistant-output-content :deep(th),
.assistant-output-content :deep(td) {
  @apply border border-border px-2 py-1 text-left;
}

.assistant-output-content :deep(th) {
  @apply bg-muted/50 font-semibold;
}

.assistant-output-content :deep(ul),
.assistant-output-content :deep(ol) {
  @apply my-1.5 pl-5;
}

.assistant-output-content :deep(li) {
  @apply my-0.5 text-xs;
}
</style>
