<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { planApi, type PlanItem, type PlanDetail } from '@/api/backup';
import {
  RefreshCw,
  FileText,
  ChevronRight,
  Calendar,
  HardDrive,
  Search,
  X,
} from 'lucide-vue-next';

const plans = ref<PlanItem[]>([]);
const selectedPlan = ref<PlanDetail | null>(null);
const loading = ref(false);
const searchQuery = ref('');

const filteredPlans = computed(() => {
  if (!searchQuery.value) return plans.value;
  const query = searchQuery.value.toLowerCase();
  return plans.value.filter(p =>
    p.title.toLowerCase().includes(query) ||
    p.filename.toLowerCase().includes(query)
  );
});

async function fetchPlans() {
  loading.value = true;
  try {
    plans.value = await planApi.getPlans();
  } catch (e) {
    console.error('加载计划失败', e);
  } finally {
    loading.value = false;
  }
}

async function selectPlan(plan: PlanItem) {
  try {
    selectedPlan.value = await planApi.getPlan(plan.id);
  } catch (e) {
    console.error('加载计划详情失败', e);
  }
}

function closeDetail() {
  selectedPlan.value = null;
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

// Markdown 渲染（简单处理）
function renderMarkdown(content: string) {
  return content
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-6 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mb-4">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 bg-muted rounded text-sm">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    .replace(/\n/g, '<br>');
}

onMounted(fetchPlans);
</script>

<template>
  <div class="h-full flex">
    <!-- 列表 -->
    <div class="w-80 flex-shrink-0 border-r border-border flex flex-col">
      <!-- 头部 -->
      <div class="px-4 py-3 border-b border-border">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium">计划文件</h3>
          <button
            @click="fetchPlans"
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
            placeholder="搜索计划..."
            class="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      <!-- 计划列表 -->
      <div class="flex-1 overflow-auto">
        <div v-if="loading && plans.length === 0" class="py-12 text-center">
          <RefreshCw class="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
        </div>

        <div v-else-if="filteredPlans.length === 0" class="py-12 text-center">
          <FileText class="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
          <p class="text-sm text-muted-foreground">
            {{ searchQuery ? '未找到匹配的计划' : '暂无计划文件' }}
          </p>
        </div>

        <div v-else>
          <button
            v-for="plan in filteredPlans"
            :key="plan.id"
            @click="selectPlan(plan)"
            class="w-full px-4 py-3 text-left border-b border-border hover:bg-muted/30 transition-colors"
            :class="{ 'bg-primary/5': selectedPlan?.id === plan.id }"
          >
            <div class="flex items-start gap-3">
              <FileText class="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ plan.title }}</p>
                <div class="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span class="flex items-center gap-1">
                    <Calendar class="w-3 h-3" />
                    {{ formatDate(plan.modifiedAt) }}
                  </span>
                  <span class="flex items-center gap-1">
                    <HardDrive class="w-3 h-3" />
                    {{ formatSize(plan.size) }}
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
      <div v-if="!selectedPlan" class="h-full flex items-center justify-center">
        <div class="text-center">
          <FileText class="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p class="text-sm text-muted-foreground">选择一个计划查看详情</p>
        </div>
      </div>

      <!-- 详情内容 -->
      <div v-else class="p-6">
        <div class="max-w-3xl mx-auto">
          <!-- 头部 -->
          <div class="flex items-start justify-between mb-6">
            <div>
              <h2 class="text-lg font-semibold">{{ selectedPlan.title }}</h2>
              <div class="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span class="flex items-center gap-1">
                  <Calendar class="w-3.5 h-3.5" />
                  {{ formatDate(selectedPlan.modifiedAt) }}
                </span>
                <span class="flex items-center gap-1">
                  <HardDrive class="w-3.5 h-3.5" />
                  {{ formatSize(selectedPlan.size) }}
                </span>
              </div>
            </div>
            <button
              @click="closeDetail"
              class="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Markdown 内容 -->
          <div
            class="prose prose-sm prose-invert max-w-none"
            v-html="renderMarkdown(selectedPlan.content)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prose :deep(h1) {
  @apply text-xl font-bold mb-4 text-foreground;
}
.prose :deep(h2) {
  @apply text-lg font-semibold mt-6 mb-3 text-foreground;
}
.prose :deep(h3) {
  @apply text-base font-semibold mt-4 mb-2 text-foreground;
}
.prose :deep(p) {
  @apply text-sm text-muted-foreground mb-2;
}
.prose :deep(li) {
  @apply text-sm text-muted-foreground;
}
.prose :deep(code) {
  @apply px-1.5 py-0.5 bg-muted rounded text-xs font-mono;
}
.prose :deep(pre) {
  @apply p-4 bg-card border border-border rounded-lg overflow-x-auto;
}
.prose :deep(pre code) {
  @apply bg-transparent p-0;
}
</style>
