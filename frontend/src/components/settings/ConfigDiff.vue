<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { backupApi, type BackupItem, type BackupDiff, type DiffLine } from '@/api/backup';
import {
  RefreshCw,
  GitCompare,
  FileJson,
  Check,
  X,
} from 'lucide-vue-next';

const backups = ref<BackupItem[]>([]);
const selectedBackup1 = ref<string>('');
const selectedBackup2 = ref<string>('current');
const diffResult = ref<BackupDiff | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

// 统计差异
const stats = computed(() => {
  if (!diffResult.value) return { added: 0, removed: 0, unchanged: 0 };

  const lines = diffResult.value.diff;
  return {
    added: lines.filter(l => l.type === 'add').length,
    removed: lines.filter(l => l.type === 'remove').length,
    unchanged: lines.filter(l => l.type === 'unchanged').length,
  };
});

// 过滤只显示有变化的行
const showOnlyChanges = ref(true);
const filteredDiff = computed(() => {
  if (!diffResult.value) return [];
  if (!showOnlyChanges.value) return diffResult.value.diff;

  const result: DiffLine[] = [];
  const lines = diffResult.value.diff;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.type !== 'unchanged') {
      // 添加上下文
      if (i > 0 && lines[i - 1].type === 'unchanged') {
        result.push({ ...lines[i - 1], content: '...' });
      }
      result.push(line);
      if (i < lines.length - 1 && lines[i + 1].type === 'unchanged') {
        result.push({ ...lines[i + 1], content: '...' });
      }
    }
  }

  return result;
});

async function fetchBackups() {
  loading.value = true;
  try {
    backups.value = await backupApi.getBackups();
  } catch (e) {
    error.value = '加载备份列表失败';
  } finally {
    loading.value = false;
  }
}

async function compare() {
  if (!selectedBackup1.value) return;

  loading.value = true;
  error.value = null;
  diffResult.value = null;

  try {
    if (selectedBackup2.value === 'current') {
      diffResult.value = await backupApi.compareWithCurrent(selectedBackup1.value);
    } else {
      diffResult.value = await backupApi.compareBackups(selectedBackup1.value, selectedBackup2.value);
    }
  } catch (e) {
    error.value = '比较失败';
  } finally {
    loading.value = false;
  }
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

onMounted(fetchBackups);

// 自动比较
watch([selectedBackup1, selectedBackup2], () => {
  if (selectedBackup1.value && selectedBackup2.value) {
    compare();
  }
});
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
      <div class="flex items-center gap-2">
        <GitCompare class="w-4 h-4 text-primary" />
        <h3 class="text-sm font-medium">配置版本对比</h3>
      </div>
      <button
        @click="fetchBackups"
        :disabled="loading"
        class="flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-md transition-colors"
      >
        <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" />
        <span>刷新</span>
      </button>
    </div>

    <!-- 选择器 -->
    <div class="px-4 py-3 border-b border-border bg-muted/20">
      <div class="flex items-center gap-4">
        <!-- 备份1 -->
        <div class="flex-1">
          <label class="text-xs text-muted-foreground mb-1 block">备份版本</label>
          <select
            v-model="selectedBackup1"
            class="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">选择备份...</option>
            <option v-for="backup in backups" :key="backup.id" :value="backup.id">
              {{ formatDate(backup.modifiedAt) }} ({{ formatSize(backup.size) }})
            </option>
          </select>
        </div>

        <div class="pt-5 text-muted-foreground">
          <GitCompare class="w-5 h-5" />
        </div>

        <!-- 备份2 -->
        <div class="flex-1">
          <label class="text-xs text-muted-foreground mb-1 block">比较目标</label>
          <select
            v-model="selectedBackup2"
            class="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="current">当前配置</option>
            <option v-for="backup in backups" :key="backup.id" :value="backup.id">
              {{ formatDate(backup.modifiedAt) }} ({{ formatSize(backup.size) }})
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- 统计栏 -->
    <div v-if="diffResult" class="px-4 py-2 border-b border-border bg-muted/10 flex items-center justify-between">
      <div class="flex items-center gap-4 text-xs">
        <span class="flex items-center gap-1">
          <span class="w-3 h-3 rounded bg-emerald-500/30"></span>
          新增 {{ stats.added }}
        </span>
        <span class="flex items-center gap-1">
          <span class="w-3 h-3 rounded bg-red-500/30"></span>
          删除 {{ stats.removed }}
        </span>
        <span class="flex items-center gap-1">
          <span class="w-3 h-3 rounded bg-muted"></span>
          未变 {{ stats.unchanged }}
        </span>
      </div>
      <label class="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          v-model="showOnlyChanges"
          type="checkbox"
          class="rounded border-border"
        />
        只显示变化
      </label>
    </div>

    <!-- Diff 内容 -->
    <div class="flex-1 overflow-auto">
      <!-- 空状态 -->
      <div v-if="!selectedBackup1" class="h-full flex items-center justify-center">
        <div class="text-center">
          <FileJson class="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p class="text-sm text-muted-foreground">选择备份版本进行比较</p>
        </div>
      </div>

      <!-- 加载中 -->
      <div v-else-if="loading" class="h-full flex items-center justify-center">
        <RefreshCw class="w-6 h-6 animate-spin text-muted-foreground" />
      </div>

      <!-- 错误 -->
      <div v-else-if="error" class="h-full flex items-center justify-center">
        <div class="text-center">
          <X class="w-12 h-12 mx-auto text-red-500/50 mb-3" />
          <p class="text-sm text-muted-foreground">{{ error }}</p>
        </div>
      </div>

      <!-- 相同 -->
      <div v-else-if="diffResult && stats.added === 0 && stats.removed === 0" class="h-full flex items-center justify-center">
        <div class="text-center">
          <Check class="w-12 h-12 mx-auto text-emerald-500/50 mb-3" />
          <p class="text-sm text-muted-foreground">配置完全相同</p>
        </div>
      </div>

      <!-- Diff 表格 -->
      <table v-else-if="diffResult" class="w-full text-xs font-mono">
        <tbody>
          <tr
            v-for="(line, index) in filteredDiff"
            :key="index"
            :class="[
              line.type === 'add' && 'bg-emerald-500/10',
              line.type === 'remove' && 'bg-red-500/10',
            ]"
          >
            <td class="w-10 px-2 py-0.5 text-right text-muted-foreground border-r border-border select-none">
              {{ line.content === '...' ? '' : line.lineNumber }}
            </td>
            <td class="px-2 py-0.5 whitespace-pre">
              <span
                v-if="line.type === 'add'"
                class="text-emerald-500"
              >+ </span>
              <span
                v-else-if="line.type === 'remove'"
                class="text-red-500"
              >- </span>
              <span v-else class="text-muted-foreground">  </span>
              <span :class="{ 'text-muted-foreground italic': line.content === '...' }">
                {{ line.content }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
