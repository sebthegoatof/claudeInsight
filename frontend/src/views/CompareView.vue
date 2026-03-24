<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { historyApi } from '@/api/history';
import type { SessionInfo } from '@/types/conversation';
import {
  RefreshCw,
  GitCompare,
  Search,
  MessageSquare,
  Clock,
  Zap,
  ArrowLeft,
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();

const sessions = ref<SessionInfo[]>([]);
const selectedSession1 = ref<string>('');
const selectedSession2 = ref<string>('');
const loading = ref(false);
const searchQuery = ref('');

// 会话详情
const session1Detail = ref<any>(null);
const session2Detail = ref<any>(null);
const loadingDetails = ref(false);

const filteredSessions = computed(() => {
  if (!searchQuery.value) return sessions.value;
  const query = searchQuery.value.toLowerCase();
  return sessions.value.filter((s: SessionInfo) =>
    s.title?.toLowerCase().includes(query) ||
    s.sessionId?.toLowerCase().includes(query)
  );
});

// 统计对比
const comparison = computed(() => {
  if (!session1Detail.value || !session2Detail.value) return null;

  const s1 = session1Detail.value;
  const s2 = session2Detail.value;

  return {
    messages: {
      s1: s1.messages?.length || 0,
      s2: s2.messages?.length || 0,
    },
    tokens: {
      s1: s1.summary?.totalTokens || 0,
      s2: s2.summary?.totalTokens || 0,
    },
    duration: {
      s1: calculateDuration(s1.messages),
      s2: calculateDuration(s2.messages),
    },
    tools: {
      s1: countTools(s1.messages),
      s2: countTools(s2.messages),
    },
  };
});

function calculateDuration(messages: any[]) {
  if (!messages || messages.length < 2) return 0;
  const first = new Date(messages[0].timestamp).getTime();
  const last = new Date(messages[messages.length - 1].timestamp).getTime();
  return Math.round((last - first) / 1000 / 60); // 分钟
}

function countTools(messages: any[]) {
  if (!messages) return 0;
  let count = 0;
  for (const msg of messages) {
    if (msg.toolUse?.length) count += msg.toolUse.length;
  }
  return count;
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function formatNumber(num: number) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 计算差异百分比
function getDiffPercent(s1: number, s2: number) {
  if (s1 === 0 && s2 === 0) return 0;
  if (s1 === 0) return 100;
  return Math.round(((s2 - s1) / s1) * 100);
}

function getDiffClass(diff: number) {
  if (diff > 0) return 'text-emerald-500';
  if (diff < 0) return 'text-red-500';
  return 'text-muted-foreground';
}

async function fetchSessions() {
  loading.value = true;
  try {
    const projectPath = route.query.project as string;
    if (projectPath) {
      const res = await historyApi.getProjectSessions(projectPath);
      sessions.value = res.data;
    } else {
      // 获取所有会话
      const projects = await historyApi.getProjects();
      const allSessions: SessionInfo[] = [];
      for (const p of projects) {
        const res = await historyApi.getProjectSessions(p.encodedPath);
        allSessions.push(...res.data.map((sess: SessionInfo) => ({ ...sess, projectPath: p.path })));
      }
      sessions.value = allSessions;
    }
  } catch (e) {
    console.error('加载会话失败', e);
  } finally {
    loading.value = false;
  }
}

async function loadSessionDetails() {
  if (!selectedSession1.value || !selectedSession2.value) return;

  loadingDetails.value = true;
  try {
    // 获取第一个选中的会话的项目路径
    const session1 = sessions.value.find(s => s.sessionId === selectedSession1.value);
    const session2 = sessions.value.find(s => s.sessionId === selectedSession2.value);

    const [detail1, detail2] = await Promise.all([
      historyApi.getSession(selectedSession1.value, session1?.projectPath || ''),
      historyApi.getSession(selectedSession2.value, session2?.projectPath || ''),
    ]);
    session1Detail.value = detail1;
    session2Detail.value = detail2;
  } catch (e) {
    console.error('加载会话详情失败', e);
  } finally {
    loadingDetails.value = false;
  }
}

function goBack() {
  router.back();
}

// 监听选择变化
watch([selectedSession1, selectedSession2], () => {
  if (selectedSession1.value && selectedSession2.value) {
    loadSessionDetails();
  } else {
    session1Detail.value = null;
    session2Detail.value = null;
  }
});

onMounted(fetchSessions);
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <header class="h-12 flex-shrink-0 border-b border-border bg-card/50 flex items-center justify-between px-4">
      <div class="flex items-center gap-3">
        <button
          @click="goBack"
          class="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
        >
          <ArrowLeft class="w-4 h-4" />
        </button>
        <div class="flex items-center gap-2">
          <GitCompare class="w-4 h-4 text-primary" />
          <h1 class="text-sm font-medium">会话对比</h1>
        </div>
      </div>
      <button
        @click="fetchSessions"
        :disabled="loading"
        class="flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-md transition-colors"
      >
        <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" />
        <span>刷新</span>
      </button>
    </header>

    <!-- 会话选择器 -->
    <div class="px-4 py-3 border-b border-border bg-muted/20">
      <div class="flex items-center gap-4">
        <!-- 搜索 -->
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索会话..."
            class="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <!-- 会话1 -->
        <select
          v-model="selectedSession1"
          class="flex-1 px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">选择会话 A...</option>
          <option
            v-for="session in filteredSessions"
            :key="session.sessionId"
            :value="session.sessionId"
          >
            {{ session.title || session.sessionId.slice(0, 8) }}
          </option>
        </select>

        <GitCompare class="w-5 h-5 text-muted-foreground" />

        <!-- 会话2 -->
        <select
          v-model="selectedSession2"
          class="flex-1 px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">选择会话 B...</option>
          <option
            v-for="session in filteredSessions"
            :key="session.sessionId"
            :value="session.sessionId"
            :disabled="session.sessionId === selectedSession1"
          >
            {{ session.title || session.sessionId.slice(0, 8) }}
          </option>
        </select>
      </div>
    </div>

    <!-- 对比内容 -->
    <div class="flex-1 overflow-auto p-4">
      <!-- 空状态 -->
      <div v-if="!selectedSession1 || !selectedSession2" class="h-full flex items-center justify-center">
        <div class="text-center">
          <GitCompare class="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p class="text-sm text-muted-foreground">选择两个会话进行对比</p>
        </div>
      </div>

      <!-- 加载中 -->
      <div v-else-if="loadingDetails" class="h-full flex items-center justify-center">
        <RefreshCw class="w-6 h-6 animate-spin text-muted-foreground" />
      </div>

      <!-- 对比结果 -->
      <div v-else-if="comparison" class="max-w-4xl mx-auto">
        <!-- 统计卡片 -->
        <div class="grid grid-cols-4 gap-4 mb-6">
          <!-- 消息数 -->
          <div class="bg-card border border-border rounded-lg p-4">
            <div class="flex items-center gap-2 text-muted-foreground mb-2">
              <MessageSquare class="w-4 h-4" />
              <span class="text-xs">消息数</span>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-center">
                <p class="text-xl font-semibold">{{ comparison.messages.s1 }}</p>
                <p class="text-xs text-muted-foreground">A</p>
              </div>
              <div class="text-center">
                <p :class="getDiffClass(getDiffPercent(comparison.messages.s1, comparison.messages.s2))">
                  {{ getDiffPercent(comparison.messages.s1, comparison.messages.s2) > 0 ? '+' : '' }}{{ getDiffPercent(comparison.messages.s1, comparison.messages.s2) }}%
                </p>
              </div>
              <div class="text-center">
                <p class="text-xl font-semibold">{{ comparison.messages.s2 }}</p>
                <p class="text-xs text-muted-foreground">B</p>
              </div>
            </div>
          </div>

          <!-- Token 数 -->
          <div class="bg-card border border-border rounded-lg p-4">
            <div class="flex items-center gap-2 text-muted-foreground mb-2">
              <Zap class="w-4 h-4" />
              <span class="text-xs">Token 用量</span>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-center">
                <p class="text-xl font-semibold">{{ formatNumber(comparison.tokens.s1) }}</p>
                <p class="text-xs text-muted-foreground">A</p>
              </div>
              <div class="text-center">
                <p :class="getDiffClass(getDiffPercent(comparison.tokens.s1, comparison.tokens.s2))">
                  {{ getDiffPercent(comparison.tokens.s1, comparison.tokens.s2) > 0 ? '+' : '' }}{{ getDiffPercent(comparison.tokens.s1, comparison.tokens.s2) }}%
                </p>
              </div>
              <div class="text-center">
                <p class="text-xl font-semibold">{{ formatNumber(comparison.tokens.s2) }}</p>
                <p class="text-xs text-muted-foreground">B</p>
              </div>
            </div>
          </div>

          <!-- 时长 -->
          <div class="bg-card border border-border rounded-lg p-4">
            <div class="flex items-center gap-2 text-muted-foreground mb-2">
              <Clock class="w-4 h-4" />
              <span class="text-xs">会话时长</span>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-center">
                <p class="text-xl font-semibold">{{ formatDuration(comparison.duration.s1) }}</p>
                <p class="text-xs text-muted-foreground">A</p>
              </div>
              <div class="text-center">
                <p :class="getDiffClass(getDiffPercent(comparison.duration.s1, comparison.duration.s2))">
                  {{ getDiffPercent(comparison.duration.s1, comparison.duration.s2) > 0 ? '+' : '' }}{{ getDiffPercent(comparison.duration.s1, comparison.duration.s2) }}%
                </p>
              </div>
              <div class="text-center">
                <p class="text-xl font-semibold">{{ formatDuration(comparison.duration.s2) }}</p>
                <p class="text-xs text-muted-foreground">B</p>
              </div>
            </div>
          </div>

          <!-- 工具调用 -->
          <div class="bg-card border border-border rounded-lg p-4">
            <div class="flex items-center gap-2 text-muted-foreground mb-2">
              <Zap class="w-4 h-4" />
              <span class="text-xs">工具调用</span>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-center">
                <p class="text-xl font-semibold">{{ comparison.tools.s1 }}</p>
                <p class="text-xs text-muted-foreground">A</p>
              </div>
              <div class="text-center">
                <p :class="getDiffClass(getDiffPercent(comparison.tools.s1, comparison.tools.s2))">
                  {{ getDiffPercent(comparison.tools.s1, comparison.tools.s2) > 0 ? '+' : '' }}{{ getDiffPercent(comparison.tools.s1, comparison.tools.s2) }}%
                </p>
              </div>
              <div class="text-center">
                <p class="text-xl font-semibold">{{ comparison.tools.s2 }}</p>
                <p class="text-xs text-muted-foreground">B</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 会话基本信息 -->
        <div class="grid grid-cols-2 gap-4">
          <!-- 会话 A -->
          <div class="bg-card border border-border rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-sm font-medium">会话 A</h4>
              <span class="text-xs text-muted-foreground">
                {{ session1Detail?.sessionId?.slice(0, 8) }}
              </span>
            </div>
            <div class="space-y-2 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground">标题</span>
                <span class="truncate max-w-[200px]">{{ session1Detail?.title || '无标题' }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground">创建时间</span>
                <span>{{ formatDate(session1Detail?.startTime) }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground">模型</span>
                <span class="font-mono text-xs">{{ session1Detail?.summary?.model || '-' }}</span>
              </div>
            </div>
          </div>

          <!-- 会话 B -->
          <div class="bg-card border border-border rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-sm font-medium">会话 B</h4>
              <span class="text-xs text-muted-foreground">
                {{ session2Detail?.sessionId?.slice(0, 8) }}
              </span>
            </div>
            <div class="space-y-2 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground">标题</span>
                <span class="truncate max-w-[200px]">{{ session2Detail?.title || '无标题' }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground">创建时间</span>
                <span>{{ formatDate(session2Detail?.startTime) }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground">模型</span>
                <span class="font-mono text-xs">{{ session2Detail?.summary?.model || '-' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
