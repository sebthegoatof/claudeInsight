<script setup lang="ts">
import type { SessionInfo } from '../../types/conversation';
import { MessageSquare, Clock, Cpu, Zap } from 'lucide-vue-next';

interface Props {
  conversation: SessionInfo;
  isActive?: boolean;
  showCheckbox?: boolean;
  checked?: boolean;
}

defineProps<Props>();
const emit = defineEmits<{
  (e: 'click'): void;
  (e: 'toggle-check'): void;
}>();

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return '昨天';
  } else if (diffDays < 7) {
    return `${diffDays} 天前`;
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }
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

function handleCheckboxClick(e: Event) {
  e.stopPropagation();
  emit('toggle-check');
}
</script>

<template>
  <div
    :class="[
      'w-full px-4 py-3 text-left transition-all duration-200 group cursor-pointer',
      isActive
        ? 'bg-primary/5 border-l-2 border-l-primary'
        : 'hover:bg-muted/50 border-l-2 border-l-transparent',
    ]"
    @click="emit('click')"
  >
    <div class="flex items-start gap-3">
      <!-- 复选框 -->
      <div
        v-if="showCheckbox"
        class="flex-shrink-0 pt-1"
        @click.stop
      >
        <input
          type="checkbox"
          :checked="checked"
          @change="handleCheckboxClick"
          class="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
        />
      </div>

      <!-- 图标 -->
      <div
        :class="[
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
          isActive ? 'bg-primary/10' : 'bg-muted group-hover:bg-muted/80',
        ]"
      >
        <MessageSquare
          :class="[
            'w-4 h-4',
            isActive ? 'text-primary' : 'text-muted-foreground',
          ]"
        />
      </div>

      <!-- 内容 -->
      <div class="min-w-0 flex-1">
        <!-- 标题 -->
        <div
          :class="[
            'text-sm font-medium truncate transition-colors',
            isActive ? 'text-primary' : 'text-foreground',
          ]"
        >
          {{ conversation.title || '无标题会话' }}
        </div>

        <!-- 元信息 -->
        <div class="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
          <!-- Token 统计 -->
          <span
            v-if="conversation.metrics"
            class="flex items-center gap-1 text-[10px]"
            :class="conversation.metrics.cacheHitTokens > 0 ? 'text-green-500' : 'text-muted-foreground'"
          >
            <Cpu class="w-3 h-3" />
            {{ formatTokens(conversation.metrics.totalTokens) }}
            <Zap
              v-if="conversation.metrics.cacheHitTokens > 0"
              class="w-2.5 h-2.5 ml-0.5"
            />
            <span v-if="conversation.metrics.cacheHitTokens > 0" class="text-green-500">
              {{ formatTokens(conversation.metrics.cacheHitTokens) }}
            </span>
          </span>

          <!-- 时间 -->
          <span class="flex items-center gap-1 ml-auto">
            <Clock class="w-3 h-3" />
            {{ formatDate(conversation.lastModified) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
