<script setup lang="ts">
import { ref, computed } from 'vue';
import { useConversationStore } from '../../stores/conversationStore';
import type { Message } from '../../types/conversation';
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
} from 'lucide-vue-next';

interface Props {
  actions: Message[];
}

const props = defineProps<Props>();
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
            <component :is="getToolIcon(action.tool_name)" class="w-3.5 h-3.5 text-blue-500" />
            <span class="text-xs font-semibold text-blue-600 dark:text-blue-400">
              {{ action.tool_name }}
            </span>
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
</style>
