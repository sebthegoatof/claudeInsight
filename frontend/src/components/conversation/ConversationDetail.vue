<script setup lang="ts">
import { ref, computed } from 'vue';
import { useConversationStore } from '../../stores/conversationStore';
import { useLinkageStore } from '../../stores/linkageStore';
import MessageList from './MessageList.vue';
import ContextBar from './ContextBar.vue';
import SlideOver from '@/components/ui/SlideOver.vue';
import TaskPanel from '@/components/panels/TaskPanel.vue';
import SkillPanel from '@/components/panels/SkillPanel.vue';
import AgentPanel from '@/components/panels/AgentPanel.vue';
import McpPanel from '@/components/panels/McpPanel.vue';
import FileHistoryPanel from '@/components/panels/FileHistoryPanel.vue';
import { X, Download, Clock, MessagesSquare, Cpu, ArrowDownToLine, ArrowUpFromLine, Zap } from 'lucide-vue-next';

const conversationStore = useConversationStore();
const linkageStore = useLinkageStore();

// 侧边栏面板状态
const slideOverOpen = ref(false);
const slideOverTitle = ref('');
const activePanelType = ref<'tasks' | 'skill' | 'agent' | 'mcp' | 'file-history' | null>(null);

const parsedMessages = computed(() => {
  if (!conversationStore.currentSession?.messages) return [];
  return conversationStore.currentSession.messages;
});

function closeDetail() {
  conversationStore.clearCurrentSession();
  slideOverOpen.value = false;
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

// 打开任务面板
function openTasksPanel() {
  activePanelType.value = 'tasks';
  slideOverTitle.value = '任务与待办';
  slideOverOpen.value = true;
}

// 打开文件历史面板
function openFileHistoryPanel() {
  activePanelType.value = 'file-history';
  slideOverTitle.value = '文件变更历史';
  slideOverOpen.value = true;
}

// 打开联动面板（只用本地状态，不更新 linkageStore 以避免触发 HistoryView 的重复面板）
function openLinkagePanel(panel: 'skill' | 'agent' | 'mcp', item?: string) {
  activePanelType.value = panel;
  switch (panel) {
    case 'skill':
      slideOverTitle.value = 'Skill 详情';
      break;
    case 'agent':
      slideOverTitle.value = 'Agent 详情';
      break;
    case 'mcp':
      slideOverTitle.value = 'MCP 服务器';
      break;
  }
  // 只设置 activeItem 用于面板内读取，不触发 activePanel 变更
  linkageStore.activeItem = item || null;
  slideOverOpen.value = true;
}

// 关闭侧边栏
function closeSlideOver() {
  slideOverOpen.value = false;
  activePanelType.value = null;
  linkageStore.activeItem = null;
}
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

    <!-- Context Bar - 显示联动信息 -->
    <ContextBar @open-tasks="openTasksPanel" @open-file-history="openFileHistoryPanel" />

    <!-- 消息列表 - 带过渡动画 -->
    <div class="flex-1 overflow-hidden relative">
      <!-- 加载中状态 - 骨架屏 -->
      <Transition name="fade" mode="out-in">
        <div v-if="conversationStore.detailLoading" class="absolute inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm z-10">
          <div class="flex flex-col items-center gap-4">
            <!-- 会话骨架预览 -->
            <div class="w-full max-w-md px-4">
              <!-- 头部骨架 -->
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-full bg-muted animate-pulse" />
                <div class="flex-1">
                  <div class="h-4 bg-muted rounded animate-pulse w-3/4 mb-2" />
                  <div class="h-3 bg-muted rounded animate-pulse w-1/2" />
                </div>
              </div>

              <!-- 消息骨架 -->
              <div class="space-y-3">
                <div class="flex gap-3">
                  <div class="w-8 h-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
                  <div class="flex-1 space-y-2">
                    <div class="h-3 bg-muted rounded animate-pulse" />
                    <div class="h-3 bg-muted rounded animate-pulse w-5/6" />
                    <div class="h-3 bg-muted rounded animate-pulse w-4/6" />
                  </div>
                </div>
                <div class="flex gap-3">
                  <div class="w-8 h-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
                  <div class="flex-1 space-y-2">
                    <div class="h-3 bg-muted rounded animate-pulse w-2/3" />
                    <div class="h-3 bg-muted rounded animate-pulse w-5/6" />
                  </div>
                </div>
                <div class="flex gap-3">
                  <div class="w-8 h-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
                  <div class="flex-1 space-y-2">
                    <div class="h-3 bg-muted rounded animate-pulse" />
                    <div class="h-3 bg-muted rounded animate-pulse w-3/4" />
                    <div class="h-3 bg-muted rounded animate-pulse w-1/2" />
                  </div>
                </div>
              </div>
            </div>

            <!-- 加载提示 -->
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <div class="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span>加载会话内容...</span>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 空状态 -->
      <Transition name="fade" mode="out-in">
        <div
          v-if="!conversationStore.detailLoading && !conversationStore.currentSession"
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
      </Transition>

      <!-- 消息列表 - 滑入动画 -->
      <Transition name="slide-up" mode="out-in">
        <MessageList
          v-if="!conversationStore.detailLoading && conversationStore.currentSession"
          :messages="parsedMessages"
          :file-history="linkageStore.sessionFileHistory"
          @open-panel="openLinkagePanel"
        />
      </Transition>
    </div>

    <!-- 侧边栏滑出面板 -->
    <SlideOver
      :open="slideOverOpen"
      :title="slideOverTitle"
      width="450px"
      @close="closeSlideOver"
    >
      <TaskPanel v-if="activePanelType === 'tasks'" />
      <SkillPanel v-else-if="activePanelType === 'skill'" :skill-name="linkageStore.activeItem || undefined" />
      <AgentPanel v-else-if="activePanelType === 'agent'" :agent-type="linkageStore.activeItem || undefined" />
      <McpPanel v-else-if="activePanelType === 'mcp'" />
      <FileHistoryPanel v-else-if="activePanelType === 'file-history'" />
    </SlideOver>
  </div>
</template>

<style scoped>
/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 滑入动画 */
.slide-up-enter-active {
  transition: all 0.3s ease-out;
}

.slide-up-leave-active {
  transition: all 0.2s ease-in;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 加载动画 */
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

/* 骨架屏闪烁动画 */
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
