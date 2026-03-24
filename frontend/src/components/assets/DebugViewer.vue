<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { debugApi, type DebugLogItem, type DebugLogDetail } from '@/api/backup';
import {
  RefreshCw,
  Bug,
  ChevronRight,
  Calendar,
  HardDrive,
  Search,
  X,
  Link,
  FileCode,
  FileText,
} from 'lucide-vue-next';

const logs = ref<DebugLogItem[]>([]);
const selectedLog = ref<DebugLogDetail | null>(null);
const loading = ref(false);
const searchQuery = ref('');

const filteredLogs = computed(() => {
  if (!searchQuery.value) return logs.value;
  const query = searchQuery.value.toLowerCase();
  return logs.value.filter(l =>
    l.filename.toLowerCase().includes(query) ||
    l.sessionId?.toLowerCase().includes(query)
  );
});

// 统计
const stats = computed(() => {
  const jsonLogs = logs.value.filter(l => l.filename.endsWith('.json'));
  const textLogs = logs.value.filter(l => l.filename.endsWith('.log'));
  const withSession = logs.value.filter(l => l.sessionId);
  return { json: jsonLogs.length, text: textLogs.length, withSession: withSession.length };
});

async function fetchLogs() {
  loading.value = true;
  try {
    logs.value = await debugApi.getLogs();
  } catch (e) {
    console.error('加载调试日志失败', e);
  } finally {
    loading.value = false;
  }
}

async function selectLog(log: DebugLogItem) {
  try {
    selectedLog.value = await debugApi.getLog(log.id);
  } catch (e) {
    console.error('加载日志详情失败', e);
  }
}

function closeDetail() {
  selectedLog.value = null;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// 格式化 JSON 内容
function formatContent(content: string, isJson: boolean) {
  if (isJson) {
    try {
      return JSON.stringify(JSON.parse(content), null, 2);
    } catch {
      return content;
    }
  }
  return content;
}

// 跳转到会话
function goToSession(sessionId: string) {
  // TODO: 实现跳转逻辑
  console.log('跳转到会话:', sessionId);
}

onMounted(fetchLogs);
</script>

<template>
  <div class="h-full flex">
    <!-- 列表 -->
    <div class="w-80 flex-shrink-0 border-r border-border flex flex-col">
      <!-- 头部 -->
      <div class="px-4 py-3 border-b border-border">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium">调试日志</h3>
          <button
            @click="fetchLogs"
            :disabled="loading"
            class="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          >
            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" />
          </button>
        </div>
        <!-- 搜索 -->
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索日志..."
            class="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <!-- 统计 -->
        <div class="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span>{{ stats.json }} JSON</span>
          <span>{{ stats.text }} Log</span>
          <span>{{ stats.withSession }} 关联会话</span>
        </div>
      </div>

      <!-- 日志列表 -->
      <div class="flex-1 overflow-auto">
        <div v-if="loading && logs.length === 0" class="py-12 text-center">
          <RefreshCw class="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
        </div>

        <div v-else-if="filteredLogs.length === 0" class="py-12 text-center">
          <Bug class="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
          <p class="text-sm text-muted-foreground">
            {{ searchQuery ? '未找到匹配的日志' : '暂无调试日志' }}
          </p>
        </div>

        <div v-else>
          <button
            v-for="log in filteredLogs"
            :key="log.id"
            @click="selectLog(log)"
            class="w-full px-4 py-3 text-left border-b border-border hover:bg-muted/30 transition-colors"
            :class="{ 'bg-primary/5': selectedLog?.id === log.id }"
          >
            <div class="flex items-start gap-3">
              <component
                :is="log.filename.endsWith('.json') ? FileCode : FileText"
                class="w-4 h-4 mt-0.5 text-orange-500 flex-shrink-0"
              />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate font-mono">{{ log.filename }}</p>
                <div class="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span class="flex items-center gap-1">
                    <Calendar class="w-3 h-3" />
                    {{ formatDate(log.modifiedAt) }}
                  </span>
                  <span class="flex items-center gap-1">
                    <HardDrive class="w-3 h-3" />
                    {{ formatSize(log.size) }}
                  </span>
                </div>
                <div v-if="log.sessionId" class="mt-1">
                  <span class="inline-flex items-center gap-1 text-xs text-primary">
                    <Link class="w-3 h-3" />
                    {{ log.sessionId.slice(0, 8) }}...
                  </span>
                </div>
              </div>
              <ChevronRight class="w-4 h-4 text-muted-foreground" />
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- 详情 -->
    <div class="flex-1 overflow-auto">
      <!-- 未选择 -->
      <div v-if="!selectedLog" class="h-full flex items-center justify-center">
        <div class="text-center">
          <Bug class="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p class="text-sm text-muted-foreground">选择一个日志查看详情</p>
        </div>
      </div>

      <!-- 详情内容 -->
      <div v-else class="h-full flex flex-col">
        <!-- 头部 -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
          <div class="flex items-center gap-3">
            <component
              :is="selectedLog.isJson ? FileCode : FileText"
              class="w-4 h-4 text-orange-500"
            />
            <div>
              <h4 class="text-sm font-medium font-mono">{{ selectedLog.filename }}</h4>
              <div class="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                <span>{{ formatDate(selectedLog.modifiedAt) }}</span>
                <span>{{ formatSize(selectedLog.size) }}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="selectedLog.sessionId"
              @click="goToSession(selectedLog.sessionId)"
              class="flex items-center gap-1.5 px-2.5 py-1 text-xs text-primary hover:bg-primary/10 rounded-md transition-colors"
            >
              <Link class="w-3.5 h-3.5" />
              查看会话
            </button>
            <button
              @click="closeDetail"
              class="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- 日志内容 -->
        <div class="flex-1 overflow-auto p-4">
          <pre class="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">{{ formatContent(selectedLog.content, selectedLog.isJson) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>
