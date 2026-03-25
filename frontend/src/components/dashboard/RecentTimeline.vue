<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import type { RecentSession } from '@/api/stats';
import { MessageSquare, ArrowRight, Loader2 } from 'lucide-vue-next';

defineProps<{
  sessions: RecentSession[];
}>();

const router = useRouter();
const navigatingSessionId = ref<string | null>(null);

async function navigateToSession(session: RecentSession) {
  // 显示加载状态
  navigatingSessionId.value = session.sessionId;

  // 跳转到会话页，带上项目和会话信息
  router.push({
    path: '/sessions',
    query: {
      sessionId: session.sessionId,
      project: session.project,
    },
  });

  // 延迟清除加载状态（给页面加载时间）
  setTimeout(() => {
    navigatingSessionId.value = null;
  }, 1000);
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function getProjectName(project: string): string {
  if (!project) return '未知项目';
  // 支持 Unix(/) 和 Windows(\) 路径分隔符
  const parts = project.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] || project;
}
</script>

<template>
  <div class="bg-card border border-border rounded-lg p-4 h-full">
    <div class="flex items-center justify-between mb-3">
      <div class="text-sm font-medium">最近会话</div>
      <button
        @click="router.push('/sessions')"
        class="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
      >
        查看全部
        <ArrowRight class="w-3 h-3" />
      </button>
    </div>

    <div v-if="sessions.length === 0" class="flex items-center justify-center h-32 text-sm text-muted-foreground">
      暂无数据
    </div>

    <div v-else class="space-y-1">
      <button
        v-for="session in sessions"
        :key="session.sessionId"
        @click="navigateToSession(session)"
        :disabled="navigatingSessionId === session.sessionId"
        class="w-full flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors text-left group disabled:opacity-60 disabled:cursor-wait"
      >
        <div class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Loader2
            v-if="navigatingSessionId === session.sessionId"
            class="w-3 h-3 text-primary animate-spin"
          />
          <MessageSquare v-else class="w-3 h-3 text-primary" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm truncate group-hover:text-primary transition-colors">
            {{ session.display || '未命名会话' }}
          </div>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="text-[10px] text-muted-foreground truncate">{{ getProjectName(session.project) }}</span>
            <span class="text-[10px] text-muted-foreground">{{ formatTime(session.timestamp) }}</span>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>
