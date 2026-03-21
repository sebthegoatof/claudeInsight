<script setup lang="ts">
import { computed } from 'vue';
import { useConversationStore } from '../../stores/conversationStore';
import MessageList from './MessageList.vue';
import { X, Download, Clock, MessagesSquare, Cpu, ArrowDownToLine, ArrowUpFromLine, Zap } from 'lucide-vue-next';

const conversationStore = useConversationStore();

const parsedMessages = computed(() => {
  if (!conversationStore.currentSession?.messages) return [];
  return conversationStore.currentSession.messages;
});

function closeDetail() {
  conversationStore.clearCurrentSession();
}

// 导出会话为 JSON 文件
function exportSession() {
  const session = conversationStore.currentSession;
  if (!session) return;

  const exportData = {
    sessionId: session.sessionId,
    title: session.title,
    projectPath: session.projectPath,
    lastModified: session.lastModified,
    messageCount: session.messageCount,
    firstMessageAt: session.firstMessageAt,
    lastMessageAt: session.lastMessageAt,
    metrics: session.metrics,
    messages: session.messages,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${session.sessionId}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

// 获取主要模型（第一个使用的模型）
const primaryModel = computed(() => {
  const models = conversationStore.currentSession?.metrics?.modelsUsed;
  return models && models.length > 0 ? models[0] : null;
});
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- 头部 -->
    <div v-if="conversationStore.currentSession" class="px-4 py-3 border-b border-border">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0 flex-1">
          <h2 class="text-base font-semibold truncate">
            {{ conversationStore.currentSession.title || '无标题会话' }}
          </h2>
        </div>
        <div class="flex items-center gap-1">
          <button
            @click="exportSession"
            class="p-1.5 rounded-md hover:bg-muted transition-colors"
            title="导出会话"
          >
            <Download class="w-4 h-4" />
          </button>
          <button
            @click="closeDetail"
            class="p-1.5 rounded-md hover:bg-muted transition-colors"
            title="关闭"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- 元信息 -->
      <div class="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span class="flex items-center gap-1">
          <MessagesSquare class="w-3.5 h-3.5" />
          {{ conversationStore.currentSession.messageCount }} 条消息
        </span>
        <span class="flex items-center gap-1">
          <Clock class="w-3.5 h-3.5" />
          {{ formatDate(conversationStore.currentSession.lastMessageAt) }}
        </span>
      </div>

      <!-- Token 统计 Badge -->
      <div
        v-if="conversationStore.currentSession.metrics"
        class="flex flex-wrap items-center gap-2 mt-3"
      >
        <!-- 模型 -->
        <span
          v-if="primaryModel"
          class="inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded-full bg-purple-500/10 text-purple-500"
        >
          🤖 {{ getModelShortName(primaryModel) }}
        </span>

        <!-- 总 Tokens -->
        <span class="inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded-full bg-blue-500/10 text-blue-500">
          <Cpu class="w-3 h-3" />
          总 Tokens: {{ formatTokens(conversationStore.currentSession.metrics.totalTokens) }}
        </span>

        <!-- 输入 Tokens -->
        <span class="inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded-full bg-gray-500/10 text-gray-500">
          <ArrowDownToLine class="w-3 h-3" />
          输入: {{ formatTokens(conversationStore.currentSession.metrics.inputTokens) }}
        </span>

        <!-- 输出 Tokens -->
        <span class="inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded-full bg-green-500/10 text-green-500">
          <ArrowUpFromLine class="w-3 h-3" />
          输出: {{ formatTokens(conversationStore.currentSession.metrics.outputTokens) }}
        </span>

        <!-- 缓存命中 -->
        <span
          v-if="conversationStore.currentSession.metrics.cacheHitTokens > 0"
          class="inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded-full bg-yellow-500/10 text-yellow-600"
        >
          <Zap class="w-3 h-3" />
          命中缓存: {{ formatTokens(conversationStore.currentSession.metrics.cacheHitTokens) }}
        </span>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="flex-1 overflow-hidden">
      <!-- 加载中 -->
      <div v-if="conversationStore.detailLoading" class="h-full flex items-center justify-center">
        <div class="flex flex-col items-center gap-3">
          <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span class="text-sm text-muted-foreground">加载中...</span>
        </div>
      </div>

      <!-- 空状态 -->
      <div
        v-else-if="!conversationStore.currentSession"
        class="h-full flex items-center justify-center p-8"
      >
        <div class="text-center max-w-xs">
          <div class="w-16 h-16 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <MessagesSquare class="w-8 h-8 text-muted-foreground" />
          </div>
          <p class="text-base font-medium text-foreground">选择一个会话</p>
          <p class="text-sm text-muted-foreground mt-1">
            从左侧列表选择会话查看详情，或使用 <kbd class="px-1.5 py-0.5 bg-muted rounded text-xs">⌘K</kbd> 搜索
          </p>
        </div>
      </div>

      <!-- 消息列表 -->
      <MessageList v-else :messages="parsedMessages" />
    </div>
  </div>
</template>

<style scoped>
.loading-dots {
  @apply flex gap-1;
}

.loading-dots span {
  @apply w-2 h-2 rounded-full bg-primary;
  animation: bounce 1s infinite;
}

.loading-dots span:nth-child(2) {
  animation-delay: 0.1s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0.2s;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}
</style>
