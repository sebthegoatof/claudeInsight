<script setup lang="ts">
import { ref } from 'vue';
import { fileHistoryApi } from '../../api/backup';
import { History, Loader2, X } from 'lucide-vue-next';

interface VersionInfo {
  backupFileName: string;
  version: number;
  size: number;
  backupTime: string;
}

interface Props {
  filePath: string;
  versions: VersionInfo[];
  sessionId: string;
  showFileName?: boolean;  // 是否显示文件名（点击可查看最新版本）
}

const props = withDefaults(defineProps<Props>(), {
  showFileName: false,
});

// 查看最新版本
function viewLatest() {
  if (props.versions.length > 0) {
    viewVersion(props.versions[props.versions.length - 1]);
  }
}

// 获取文件名
function getFileName(fp: string): string {
  return fp.split('/').pop() || fp;
}

const showPreview = ref(false);
const previewVersion = ref<VersionInfo | null>(null);
const previewContent = ref<string | null>(null);
const previewLoading = ref(false);

async function viewVersion(ver: VersionInfo) {
  previewVersion.value = ver;
  previewLoading.value = true;
  showPreview.value = true;

  try {
    const result = await fileHistoryApi.getVersion(props.sessionId, ver.backupFileName);
    previewContent.value = result.content;
  } catch {
    previewContent.value = '加载失败';
  } finally {
    previewLoading.value = false;
  }
}

function closePreview() {
  showPreview.value = false;
  previewVersion.value = null;
  previewContent.value = null;
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// 获取文件扩展名颜色
function getExtColor(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts': case 'tsx': return 'text-blue-400';
    case 'js': case 'jsx': return 'text-yellow-400';
    case 'vue': return 'text-green-400';
    case 'json': return 'text-orange-400';
    case 'md': return 'text-purple-400';
    case 'css': case 'scss': return 'text-pink-400';
    default: return 'text-gray-400';
  }
}
</script>

<template>
  <div class="inline-flex items-center gap-1.5 mt-1">
    <button
      v-if="showFileName"
      @click.stop="viewLatest"
      class="inline-flex items-center gap-1 text-[11px] font-medium hover:underline cursor-pointer transition-colors"
      :class="getExtColor(filePath)"
      :title="filePath"
    >
      <History class="w-3 h-3 text-orange-400" />
      {{ getFileName(filePath) }}
    </button>
    <History v-else class="w-3 h-3 text-orange-400" />
    <button
      v-for="ver in versions"
      :key="ver.backupFileName"
      @click.stop="viewVersion(ver)"
      class="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-mono rounded
             bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors cursor-pointer"
      :title="`版本 ${ver.version} · ${formatSize(ver.size)} · ${formatTime(ver.backupTime)}`"
    >
      v{{ ver.version }}
    </button>
  </div>

  <!-- 版本内容预览弹窗 -->
  <Teleport to="body">
    <div
      v-if="showPreview"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      @click="closePreview"
    >
      <div
        class="bg-background border border-border rounded-xl shadow-2xl w-[90vw] max-w-3xl max-h-[80vh] flex flex-col"
        @click.stop
      >
        <!-- 头部 -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-border">
          <div class="flex items-center gap-2 min-w-0">
            <History class="w-4 h-4 text-orange-400 flex-shrink-0" />
            <span class="text-sm font-semibold truncate" :class="getExtColor(filePath)">
              {{ filePath.split('/').pop() }}
            </span>
            <span
              v-if="previewVersion"
              class="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 flex-shrink-0"
            >
              v{{ previewVersion.version }}
            </span>
          </div>
          <button
            @click="closePreview"
            class="p-1 rounded hover:bg-muted transition-colors"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- 元信息 -->
        <div v-if="previewVersion" class="px-4 py-2 text-[11px] text-muted-foreground border-b border-border/50 flex items-center gap-4">
          <span>{{ filePath }}</span>
          <span>{{ formatSize(previewVersion.size) }}</span>
          <span>{{ formatTime(previewVersion.backupTime) }}</span>
        </div>

        <!-- 内容 -->
        <div class="flex-1 overflow-auto p-4">
          <div v-if="previewLoading" class="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 class="w-5 h-5 animate-spin mr-2" />
            加载中...
          </div>
          <pre v-else class="text-xs font-mono whitespace-pre-wrap break-words text-foreground">{{ previewContent }}</pre>
        </div>
      </div>
    </div>
  </Teleport>
</template>
