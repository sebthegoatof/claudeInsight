<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { fileHistoryApi, type FileHistorySession, type SessionFileHistory, type FileVersionDetail } from '@/api/backup';
import {
  RefreshCw,
  History,
  Search,
  FileCode,
  Layers,
  Calendar,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  FolderOpen,
  HardDrive,
  Code,
  ExternalLink,
} from 'lucide-vue-next';

const router = useRouter();

const sessions = ref<FileHistorySession[]>([]);
const selectedSession = ref<FileHistorySession | null>(null);
const sessionDetail = ref<SessionFileHistory | null>(null);
const selectedVersion = ref<FileVersionDetail | null>(null);
const expandedFile = ref<string | null>(null);

const loading = ref(false);
const detailLoading = ref(false);
const versionLoading = ref(false);
const searchQuery = ref('');

const filteredSessions = computed(() => {
  if (!searchQuery.value) return sessions.value;
  const query = searchQuery.value.toLowerCase();
  return sessions.value.filter(s =>
    s.sessionId.toLowerCase().includes(query) ||
    s.projectPath?.toLowerCase().includes(query)
  );
});

const stats = computed(() => {
  const totalVersions = sessions.value.reduce((sum, s) => sum + s.totalVersions, 0);
  const totalFiles = sessions.value.reduce((sum, s) => sum + s.fileCount, 0);
  return { sessions: sessions.value.length, files: totalFiles, versions: totalVersions };
});

async function fetchHistory() {
  loading.value = true;
  try {
    sessions.value = await fileHistoryApi.getHistory();
  } catch (e) {
    console.error('加载文件历史失败', e);
  } finally {
    loading.value = false;
  }
}

async function selectSession(session: FileHistorySession) {
  selectedSession.value = session;
  sessionDetail.value = null;
  selectedVersion.value = null;
  expandedFile.value = null;
  detailLoading.value = true;

  try {
    sessionDetail.value = await fileHistoryApi.getSessionFileHistory(
      session.sessionId,
      session.projectPath
    );
  } catch (e) {
    console.error('加载会话文件历史失败', e);
  } finally {
    detailLoading.value = false;
  }
}

function toggleFile(filePath: string) {
  expandedFile.value = expandedFile.value === filePath ? null : filePath;
  selectedVersion.value = null;
}

async function loadVersion(sessionId: string, backupFileName: string) {
  versionLoading.value = true;
  try {
    selectedVersion.value = await fileHistoryApi.getVersion(sessionId, backupFileName);
  } catch {
    selectedVersion.value = null;
  } finally {
    versionLoading.value = false;
  }
}

function goToConversation(sessionId: string, projectPath?: string) {
  router.push({
    name: 'sessions',
    query: {
      sessionId,
      ...(projectPath ? { project: projectPath } : {}),
    },
  });
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN', {
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

function getProjectName(path?: string): string {
  if (!path) return '未知项目';
  const parts = path.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] || path;
}

function getFileName(filePath: string): string {
  return filePath.split(/[/\\]/).pop() || filePath;
}

function getExtColor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts': case 'tsx': return 'text-blue-500';
    case 'js': case 'jsx': return 'text-yellow-500';
    case 'vue': return 'text-emerald-500';
    case 'json': return 'text-orange-500';
    case 'md': return 'text-purple-500';
    default: return 'text-muted-foreground';
  }
}

function shortId(id: string): string {
  return id.slice(0, 8);
}

onMounted(fetchHistory);
</script>

<template>
  <div class="h-full flex">
    <!-- 左侧：会话列表 -->
    <div class="w-80 flex-shrink-0 border-r border-border flex flex-col">
      <div class="px-4 py-3 border-b border-border">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium">文件变更历史</h3>
          <button
            @click="fetchHistory"
            :disabled="loading"
            class="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          >
            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" />
          </button>
        </div>
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索会话..."
            class="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div class="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span>{{ stats.sessions }} 会话</span>
          <span>{{ stats.files }} 文件</span>
          <span>{{ stats.versions }} 版本</span>
        </div>
      </div>

      <div class="flex-1 overflow-auto">
        <div v-if="loading && sessions.length === 0" class="py-12 text-center">
          <RefreshCw class="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
        </div>

        <div v-else-if="filteredSessions.length === 0" class="py-12 text-center">
          <History class="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
          <p class="text-sm text-muted-foreground">
            {{ searchQuery ? '未找到匹配的会话' : '暂无文件历史' }}
          </p>
        </div>

        <div v-else>
          <button
            v-for="session in filteredSessions"
            :key="session.sessionId"
            @click="selectSession(session)"
            class="w-full px-4 py-3 text-left border-b border-border hover:bg-muted/30 transition-colors"
            :class="{ 'bg-primary/5': selectedSession?.sessionId === session.sessionId }"
          >
            <div class="flex items-start gap-3">
              <MessageSquare class="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium font-mono">{{ shortId(session.sessionId) }}</span>
                </div>
                <div class="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <FolderOpen class="w-3 h-3" />
                  {{ getProjectName(session.projectPath) }}
                </div>
                <div class="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span class="flex items-center gap-1">
                    <FileCode class="w-3 h-3" />
                    {{ session.fileCount }} 文件
                  </span>
                  <span class="flex items-center gap-1">
                    <Layers class="w-3 h-3" />
                    {{ session.totalVersions }} 版本
                  </span>
                  <span class="flex items-center gap-1">
                    <Calendar class="w-3 h-3" />
                    {{ formatDate(session.lastModified).slice(0, 5) }}
                  </span>
                </div>
              </div>
              <ChevronRight class="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- 右侧：详情 -->
    <div class="flex-1 overflow-auto">
      <div v-if="!selectedSession" class="h-full flex items-center justify-center">
        <div class="text-center">
          <History class="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p class="text-sm text-muted-foreground">选择一个会话查看文件变更</p>
        </div>
      </div>

      <div v-else class="h-full flex flex-col">
        <!-- 头部 -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
          <div>
            <div class="flex items-center gap-2">
              <h4 class="text-sm font-medium font-mono">{{ shortId(selectedSession.sessionId) }}</h4>
              <button
                @click="goToConversation(selectedSession.sessionId, selectedSession.projectPath)"
                class="flex items-center gap-1 px-2 py-0.5 text-[10px] text-primary bg-primary/10 rounded hover:bg-primary/20 transition-colors"
              >
                <ExternalLink class="w-3 h-3" />
                查看对话
              </button>
            </div>
            <p v-if="selectedSession.projectPath" class="text-xs text-muted-foreground mt-0.5">
              {{ selectedSession.projectPath }}
            </p>
          </div>
        </div>

        <!-- 加载中 -->
        <div v-if="detailLoading" class="flex-1 flex items-center justify-center">
          <RefreshCw class="w-6 h-6 animate-spin text-muted-foreground" />
        </div>

        <!-- 文件列表 -->
        <div v-else-if="sessionDetail" class="flex-1 overflow-auto p-4">
          <div class="text-xs text-muted-foreground mb-4 flex items-center gap-2">
            <Layers class="w-3.5 h-3.5" />
            {{ sessionDetail.files.length }} 个文件，{{ sessionDetail.totalVersions }} 个版本
          </div>

          <div v-if="sessionDetail.files.length === 0" class="text-center py-8 text-sm text-muted-foreground">
            无法解析此会话的文件路径映射
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="file in sessionDetail.files"
              :key="file.filePath"
              class="border border-border rounded-lg overflow-hidden"
            >
              <!-- 文件头 -->
              <button
                @click="toggleFile(file.filePath)"
                class="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
              >
                <ChevronDown
                  v-if="expandedFile === file.filePath"
                  class="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"
                />
                <ChevronRight v-else class="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <FileCode :class="['w-4 h-4 flex-shrink-0', getExtColor(file.filePath)]" />
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium truncate">{{ getFileName(file.filePath) }}</div>
                  <div class="text-[10px] text-muted-foreground truncate">{{ file.filePath }}</div>
                </div>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0">
                  {{ file.versions.length }} 版本
                </span>
              </button>

              <!-- 版本列表 -->
              <div v-if="expandedFile === file.filePath" class="border-t border-border bg-muted/20">
                <div class="p-3 space-y-1.5">
                  <button
                    v-for="ver in file.versions"
                    :key="ver.backupFileName"
                    @click="loadVersion(selectedSession!.sessionId, ver.backupFileName)"
                    class="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-left text-xs"
                    :class="{
                      'bg-primary/10 text-primary': selectedVersion?.filename === ver.backupFileName
                    }"
                  >
                    <div class="flex items-center gap-2">
                      <Code class="w-3.5 h-3.5" />
                      <span class="font-mono">v{{ ver.version }}</span>
                    </div>
                    <div class="flex items-center gap-3 text-muted-foreground">
                      <span class="flex items-center gap-1">
                        <HardDrive class="w-3 h-3" />
                        {{ formatSize(ver.size) }}
                      </span>
                      <span class="flex items-center gap-1">
                        <Calendar class="w-3 h-3" />
                        {{ formatDate(ver.backupTime) }}
                      </span>
                    </div>
                  </button>
                </div>

                <!-- 版本内容预览 -->
                <div v-if="versionLoading" class="px-3 pb-3">
                  <div class="p-4 bg-card border border-border rounded-md text-center text-sm text-muted-foreground">
                    <RefreshCw class="w-4 h-4 mx-auto animate-spin" />
                  </div>
                </div>
                <div v-else-if="selectedVersion && expandedFile === file.filePath" class="px-3 pb-3">
                  <pre class="p-3 bg-card border border-border rounded-md text-[11px] font-mono text-muted-foreground overflow-x-auto max-h-80 overflow-y-auto"><code>{{ selectedVersion.content }}</code></pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
