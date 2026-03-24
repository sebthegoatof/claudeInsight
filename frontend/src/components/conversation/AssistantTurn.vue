<script setup lang="ts">
import { computed } from 'vue';
import MessageContent from './MessageContent.vue';
import MessageItem from './MessageItem.vue';
import ToolActionGroup from './ToolActionGroup.vue';
import type { TurnSegment } from '../../types/conversation';
import type { SessionFileHistory } from '../../api/backup';
import { Sparkles, Cpu, Zap } from 'lucide-vue-next';

interface Props {
  segments: TurnSegment[];
  model?: string;
  fileHistory?: SessionFileHistory | null;
  sessionId?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'openPanel', panel: 'skill' | 'agent' | 'mcp', item?: string): void;
}>();

// 获取模型简短名称
function getModelShortName(model: string): string {
  if (!model) return '';
  const match = model.match(/claude[-_](\d+[-_]?\d*)[-_](\w+)/i);
  if (match) {
    const version = match[1].replace('-', '.');
    const name = match[2].charAt(0).toUpperCase() + match[2].slice(1);
    return `${name} ${version}`;
  }
  return model.split('/').pop() || model;
}

// 汇总该回合的 Token 使用
const turnTokens = computed(() => {
  let input = 0;
  let output = 0;
  let cacheHit = 0;

  for (const seg of props.segments) {
    const msgs = seg.kind === 'tool_group' ? seg.actions : [seg.message];
    for (const m of msgs) {
      if (m.tokenUsage) {
        input += m.tokenUsage.input_tokens || 0;
        output += m.tokenUsage.output_tokens || 0;
        cacheHit += m.tokenUsage.cache_read_input_tokens || 0;
      }
    }
  }

  const total = input + output + cacheHit;
  return total > 0 ? { input, output, cacheHit, total } : null;
});

// 格式化 Token 数量
function formatTokens(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

// 获取回合时间范围
const timeRange = computed(() => {
  let first: string | undefined;
  let last: string | undefined;

  for (const seg of props.segments) {
    const msgs = seg.kind === 'tool_group' ? seg.actions : [seg.message];
    for (const m of msgs) {
      if (m.timestamp) {
        if (!first) first = m.timestamp;
        last = m.timestamp;
      }
    }
  }

  if (!first) return null;
  const fmt = (ts: string) => new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  return first === last ? fmt(first) : `${fmt(first)} - ${fmt(last!)}`;
});
</script>

<template>
  <div class="assistant-turn bg-background">
    <div class="flex gap-3 px-4 md:px-6 py-4">
      <!-- 左侧头像 -->
      <div class="flex-shrink-0">
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center">
          <Sparkles class="w-4 h-4" />
        </div>
      </div>

      <!-- 右侧内容区 -->
      <div class="flex-1 min-w-0">
        <!-- 头部：名称 + 模型 + 时间 -->
        <div class="flex items-center gap-2 mb-2">
          <span class="text-sm font-semibold">Claude</span>
          <span
            v-if="model"
            class="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500"
          >
            {{ getModelShortName(model) }}
          </span>
          <span
            v-if="timeRange"
            class="text-[10px] text-muted-foreground ml-auto"
          >
            {{ timeRange }}
          </span>
        </div>

        <!-- Segments 渲染 -->
        <div class="space-y-2">
          <template v-for="(seg, idx) in segments" :key="idx">
            <!-- 文本段 -->
            <div v-if="seg.kind === 'text'" class="turn-text-segment">
              <!-- 图片 -->
              <div v-if="seg.message.images?.length" class="flex flex-wrap gap-2 mb-2">
                <img
                  v-for="(img, imgIdx) in seg.message.images"
                  :key="imgIdx"
                  :src="img.source"
                  alt="图片"
                  class="max-w-[200px] max-h-[200px] rounded-lg border border-border object-cover"
                />
              </div>
              <MessageContent v-if="seg.message.content" :content="seg.message.content" />
            </div>

            <!-- 工具组段 -->
            <ToolActionGroup
              v-else-if="seg.kind === 'tool_group'"
              :actions="seg.actions"
              :file-history="fileHistory"
              @open-panel="(panel, item) => emit('openPanel', panel, item)"
            />

            <!-- 系统消息段 -->
            <MessageItem
              v-else-if="seg.kind === 'system'"
              :message="seg.message"
              :index="idx"
              class="!px-0 !py-1"
            />
          </template>
        </div>

        <!-- 底部 Token 汇总 -->
        <div
          v-if="turnTokens"
          class="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-border/20"
        >
          <span class="text-[10px] text-muted-foreground/70 flex items-center gap-1">
            <Cpu class="w-3 h-3" />
            {{ formatTokens(turnTokens.total) }} tokens
          </span>
          <span
            v-if="turnTokens.cacheHit > 0"
            class="text-[10px] text-green-500/80 flex items-center gap-0.5"
          >
            <Zap class="w-2.5 h-2.5" />
            命中 {{ formatTokens(turnTokens.cacheHit) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.assistant-turn {
  border-bottom: 1px solid hsl(var(--border) / 0.3);
}
</style>
