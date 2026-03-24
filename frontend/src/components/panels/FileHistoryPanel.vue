<script setup lang="ts">
import { ref, computed } from 'vue';
import { useLinkageStore } from '@/stores/linkageStore';
import { useConversationStore } from '@/stores/conversationStore';
import { fileHistoryApi, type FileVersionDetail } from '@/api/backup';
import {
  FileCode,
  ChevronRight,
  ChevronDown,
  Calendar,
  HardDrive,
  Layers,
} from 'lucide-vue-next';

const linkageStore = useLinkageStore();
const conversationStore = useConversationStore();

const fileChanges = computed(() => linkageStore.currentLinks?.fileChanges || []);
const sessionId = computed(() => conversationStore.currentSession?.sessionId || '');

// 展开的文件
const expandedFile = ref<string | null>(null);
// 加载中的版本
const loadingVersion = ref(false);
// 当前查看的版本内容
const selectedVersion = ref<FileVersionDetail | null>(null);

function toggleFile(filePath: string) {
  expandedFile.value = expandedFile.value === filePath ? null : filePath;
  selectedVersion.value = null;
}

async function loadVersion(backupFileName: string) {
  if (!sessionId.value) return;
  loadingVersion.value = true;
  try {
    selectedVersion.value = await fileHistoryApi.getVersion(sessionId.value, backupFileName);
  } catch {
    selectedVersion.value = null;
  } finally {
    loadingVersion.value = false;
  }
}

function getFileName(filePath: string): string {
  return filePath.split('/').pop() || filePath;
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

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
</script>

<template>
  <div class="p-4">
    <div v-if="fileChanges.length === 0" class="text-center py-8 text-sm text-muted-foreground">
      <FileCode class="w-8 h-8 mx-auto mb-2 opacity-50" />
      <p>此会话没有文件变更记录</p>
    </div>

    <div v-else class="space-y-1">
      <div class="text-xs text-muted-foreground mb-3 flex items-center gap-2">
        <Layers class="w-3.5 h-3.5" />
        共 {{ fileChanges.length }} 个文件被修改
      </div>

      <div
        v-for="change in fileChanges"
        :key="change.filePath"
        class="border border-border rounded-lg overflow-hidden"
      >
        <!-- 文件头 -->
        <button
          @click="toggleFile(change.filePath)"
          class="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
        >
          <ChevronDown
            v-if="expandedFile === change.filePath"
            class="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"
          />
          <ChevronRight v-else class="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <FileCode :class="['w-4 h-4 flex-shrink-0', getExtColor(change.filePath)]" />
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate">{{ getFileName(change.filePath) }}</div>
            <div class="text-[10px] text-muted-foreground truncate">{{ change.filePath }}</div>
          </div>
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0">
            v{{ change.latestVersion }}
          </span>
        </button>

        <!-- 展开的版本信息 -->
        <div v-if="expandedFile === change.filePath" class="border-t border-border bg-muted/20 px-3 py-2">
          <div class="text-xs text-muted-foreground mb-2 flex items-center gap-2">
            <Calendar class="w-3 h-3" />
            最后备份: {{ formatDate(change.backupTime) }}
          </div>

          <!-- 查看最新版本按钮 -->
          <button
            @click="loadVersion(change.backupFileName)"
            :disabled="loadingVersion"
            class="text-xs px-2.5 py-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            {{ loadingVersion ? '加载中...' : '查看最新版本内容' }}
          </button>

          <!-- 版本内容预览 -->
          <div v-if="selectedVersion && expandedFile === change.filePath" class="mt-3">
            <div class="flex items-center gap-3 text-[10px] text-muted-foreground mb-2">
              <span class="flex items-center gap-1">
                <HardDrive class="w-3 h-3" />
                {{ formatSize(selectedVersion.size) }}
              </span>
            </div>
            <pre class="p-3 bg-card border border-border rounded-md text-[11px] font-mono text-muted-foreground overflow-x-auto max-h-64 overflow-y-auto"><code>{{ selectedVersion.content }}</code></pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
