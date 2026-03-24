<script setup lang="ts">
import { ref, computed } from 'vue';
import MessageItem from './MessageItem.vue';
import AssistantTurn from './AssistantTurn.vue';
import ToolActionGroup from './ToolActionGroup.vue';
import { useConversationStore } from '../../stores/conversationStore';
import { Eye, EyeOff, Filter, ChevronDown, ChevronRight, Terminal } from 'lucide-vue-next';
import type { Message, DisplayItem, TurnSegment } from '../../types/conversation';
import type { SessionFileHistory } from '../../api/backup';

interface Props {
  messages: Message[];
  fileHistory?: SessionFileHistory | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'openPanel', panel: 'skill' | 'agent' | 'mcp', item?: string): void;
}>();

const conversationStore = useConversationStore();

// 显示系统消息开关（控制 system_event, interrupt, error 的显示）
const showSystemMessages = ref(false);

// 展开噪音统计详情
const showNoiseDetails = ref(false);

// 统计各类消息数量
const messageStats = computed(() => {
  const stats = {
    total: props.messages.length,
    userText: 0,
    assistantText: 0,
    toolAction: 0,
    systemEvent: 0,
    interrupt: 0,
    error: 0,
  };

  for (const msg of props.messages) {
    switch (msg.message_type) {
      case 'user_text':
        stats.userText++;
        break;
      case 'assistant_text':
        stats.assistantText++;
        break;
      case 'tool_action':
        stats.toolAction++;
        break;
      case 'system_event':
        stats.systemEvent++;
        break;
      case 'interrupt':
        stats.interrupt++;
        break;
      case 'error':
        stats.error++;
        break;
      default:
        if (msg.is_system_noise) {
          stats.systemEvent++;
        } else if (msg.role === 'user') {
          stats.userText++;
        } else {
          stats.assistantText++;
        }
    }
  }

  return stats;
});

// 噪音消息数 (不含 tool_action，因为 tool_action 会作为折叠面板展示)
const nonToolNoiseCount = computed(() => {
  const stats = messageStats.value;
  return stats.systemEvent + stats.interrupt + stats.error;
});

// 有效消息数量
const validCount = computed(() => {
  const stats = messageStats.value;
  return stats.userText + stats.assistantText;
});

/**
 * 核心：将拍平的消息列表按"对话轮次"分组
 * - 用户消息 → 独立 message 项
 * - 两条用户消息之间的所有助手内容 → 合并为一个 assistant_turn
 *   - 连续 tool_action → tool_group segment
 *   - assistant_text → text segment
 *   - system_event/interrupt/error → system segment（受 toggle 控制）
 */
const displayItems = computed<DisplayItem[]>(() => {
  const items: DisplayItem[] = [];
  let i = 0;
  const msgs = props.messages;

  while (i < msgs.length) {
    const msg = msgs[i];

    // 用户消息 → 独立展示，标志新轮次开始（排除子代理的 prompt，它们虽然 role=user 但不是人类输入）
    if (msg.role === 'user' && (msg.message_type === 'user_text' || msg.message_type === 'chat') && !msg.agent_name) {
      items.push({ kind: 'message', message: msg });
      i++;
      continue;
    }

    // 非用户消息 → 收集到一个 assistant_turn
    const segments: TurnSegment[] = [];
    let currentToolGroup: Message[] = [];
    let turnModel: string | undefined;

    function flushToolGroup() {
      if (currentToolGroup.length > 0) {
        segments.push({ kind: 'tool_group', actions: [...currentToolGroup] });
        currentToolGroup = [];
      }
    }

    while (i < msgs.length) {
      const m = msgs[i];

      // 遇到下一条人类用户消息，结束当前 turn
      if (m.role === 'user' && (m.message_type === 'user_text' || m.message_type === 'chat') && !m.agent_name) {
        break;
      }

      // 记录 turn 使用的模型
      if (m.model && !turnModel) {
        turnModel = m.model;
      }

      if (m.message_type === 'tool_action') {
        currentToolGroup.push(m);
      } else if (m.message_type === 'system_event' || m.message_type === 'interrupt' || m.message_type === 'error') {
        if (showSystemMessages.value) {
          flushToolGroup();
          segments.push({ kind: 'system', message: m });
        }
      } else {
        // assistant_text / chat 等
        flushToolGroup();
        segments.push({ kind: 'text', message: m });
      }

      i++;
    }

    flushToolGroup();

    if (segments.length > 0) {
      items.push({ kind: 'assistant_turn', segments, model: turnModel });
    }
  }

  return items;
});

// fileHistory prop 透传给 AssistantTurn / MessageItem
const fileHistory = computed(() => props.fileHistory);

// 获取下一条用户消息的时间戳（用于确定文件变更的时间范围）
function getNextMessageTime(currentIndex: number): string | null {
  const items = displayItems.value;
  for (let i = currentIndex + 1; i < items.length; i++) {
    const item = items[i];
    if (item.kind === 'message') {
      return item.message.timestamp || null;
    }
  }
  return null;
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 工具栏 -->
    <div
      v-if="messageStats.toolAction > 0 || nonToolNoiseCount > 0"
      class="flex-shrink-0 px-4 py-2 border-b border-border bg-muted/20"
    >
      <div class="flex items-center justify-between">
        <!-- 左侧统计 -->
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-muted-foreground">对话:</span>
            <span class="font-medium text-foreground">{{ validCount }}</span>
          </div>

          <div class="flex items-center gap-1 text-xs text-blue-500">
            <Terminal class="w-3 h-3" />
            <span>{{ messageStats.toolAction }} 工具操作</span>
          </div>

          <button
            v-if="nonToolNoiseCount > 0"
            @click="showNoiseDetails = !showNoiseDetails"
            class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown v-if="showNoiseDetails" class="w-3 h-3" />
            <ChevronRight v-else class="w-3 h-3" />
            <span>系统: {{ nonToolNoiseCount }}</span>
          </button>

          <!-- 展开的详情 -->
          <div v-if="showNoiseDetails" class="flex items-center gap-3 text-[11px]">
            <span v-if="messageStats.interrupt > 0" class="text-orange-500">
              中断 {{ messageStats.interrupt }}
            </span>
            <span v-if="messageStats.systemEvent > 0" class="text-purple-500">
              系统 {{ messageStats.systemEvent }}
            </span>
            <span v-if="messageStats.error > 0" class="text-red-500">
              错误 {{ messageStats.error }}
            </span>
          </div>
        </div>

        <!-- 右侧切换按钮 -->
        <button
          v-if="nonToolNoiseCount > 0"
          @click="showSystemMessages = !showSystemMessages"
          class="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors"
          :class="showSystemMessages ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'"
        >
          <Eye v-if="showSystemMessages" class="w-3.5 h-3.5" />
          <EyeOff v-else class="w-3.5 h-3.5" />
          <span>{{ showSystemMessages ? '隐藏系统' : '显示系统' }}</span>
        </button>
      </div>
    </div>

    <!-- 消息/工具组 列表 -->
    <div class="flex-1 overflow-y-auto">
      <!-- 空状态 -->
      <div
        v-if="displayItems.length === 0"
        class="h-full flex items-center justify-center p-8"
      >
        <div class="text-center">
          <div class="w-12 h-12 mx-auto rounded-xl bg-muted/50 flex items-center justify-center mb-3">
            <Filter class="w-6 h-6 text-muted-foreground" />
          </div>
          <p class="text-sm text-muted-foreground">暂无消息</p>
          <button
            v-if="nonToolNoiseCount > 0"
            @click="showSystemMessages = true"
            class="mt-2 text-xs text-primary hover:underline"
          >
            显示系统消息
          </button>
        </div>
      </div>

      <!-- 渲染分组后的 DisplayItem -->
      <template v-for="(item, index) in displayItems" :key="index">
        <!-- 用户消息气泡 -->
        <MessageItem
          v-if="item.kind === 'message'"
          :message="item.message"
          :index="index"
          :file-history="fileHistory"
          :session-id="conversationStore.currentSession?.sessionId"
          :next-message-time="getNextMessageTime(index)"
        />

        <!-- 助手回合容器 -->
        <AssistantTurn
          v-else-if="item.kind === 'assistant_turn'"
          :segments="item.segments"
          :model="item.model"
          :file-history="fileHistory"
          :session-id="conversationStore.currentSession?.sessionId"
          @open-panel="(panel, item) => emit('openPanel', panel, item)"
        />

        <!-- 独立工具组（兼容旧类型） -->
        <ToolActionGroup
          v-else-if="item.kind === 'tool_group'"
          :actions="item.actions"
          @open-panel="(panel, item) => emit('openPanel', panel, item)"
        />
      </template>
    </div>
  </div>
</template>
