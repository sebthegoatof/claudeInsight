<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useSkillStore } from '@/stores/skillStore';
import { historyApi } from '@/api/history';
import type { Project, ProjectSpec } from '@/types/project';
import type { ProjectMetrics } from '@/types/conversation';
import ProjectSpecCard from './ProjectSpecCard.vue';
import ProjectSkillsCard from './ProjectSkillsCard.vue';
import {
  FolderOpen,
  MessageSquare,
  FileText,
  Zap,
  Clock,
  Cpu,
} from 'lucide-vue-next';

const props = defineProps<{
  project: Project;
}>();

const skillStore = useSkillStore();

// Dashboard data
const loading = ref(false);
const spec = ref<ProjectSpec | null>(null);
const metrics = ref<ProjectMetrics | null>(null);

// Computed - 优先使用 spec.content，否则使用 project.instructions
const hasSpec = computed(() => !!(spec.value?.content || props.project.instructions));
const skillsCount = computed(() => skillStore.projectSkills.length);

// Load dashboard data
async function loadDashboard(newSpec?: ProjectSpec) {
  if (!props.project.encodedPath) return;

  // 如果传递了新的 spec 数据，直接使用
  if (newSpec !== undefined) {
    spec.value = newSpec;
    return;
  }

  loading.value = true;
  try {
    const [specData, projectData] = await Promise.all([
      historyApi.getProjectSpec(props.project.encodedPath),
      historyApi.getProject(props.project.encodedPath),
    ]);
    spec.value = specData;
    metrics.value = projectData.metrics || null;
  } catch (error) {
    console.error('Failed to load dashboard:', error);
  } finally {
    loading.value = false;
  }
}

// Watch project changes
watch(
  () => props.project.encodedPath,
  () => {
    loadDashboard();
  },
  { immediate: true }
);

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '从未';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
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
  // claude-3-5-sonnet -> Sonnet 3.5
  // claude-sonnet-4-6 -> Sonnet 4.6
  const match = model.match(/claude[-_](\d+[-_]?\d*)[-_](\w+)/i);
  if (match) {
    const version = match[1].replace('-', '.');
    const name = match[2].charAt(0).toUpperCase() + match[2].slice(1);
    return `${name} ${version}`;
  }
  return model.split('/').pop() || model;
}
</script>

<template>
  <div class="h-full overflow-y-auto p-6">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <FolderOpen class="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 class="text-xl font-semibold">{{ project.name }}</h1>
          <p class="text-sm text-muted-foreground">{{ project.path }}</p>
        </div>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="bg-card border border-border rounded-lg p-4">
        <div class="flex items-center gap-2 text-muted-foreground mb-1">
          <MessageSquare class="w-4 h-4" />
          <span class="text-xs">会话数</span>
        </div>
        <div class="text-2xl font-semibold">{{ project.sessionCount }}</div>
      </div>

      <div class="bg-card border border-border rounded-lg p-4">
        <div class="flex items-center gap-2 text-muted-foreground mb-1">
          <Cpu class="w-4 h-4" />
          <span class="text-xs">总 Token</span>
        </div>
        <div class="text-2xl font-semibold">
          {{ metrics ? formatTokens(metrics.totalTokens) : '-' }}
        </div>
        <div v-if="metrics?.cacheHitTokens" class="text-xs text-green-500 mt-0.5">
          ⚡ 命中 {{ formatTokens(metrics.cacheHitTokens) }}
        </div>
      </div>

      <div class="bg-card border border-border rounded-lg p-4">
        <div class="flex items-center gap-2 text-muted-foreground mb-1">
          <FileText class="w-4 h-4" />
          <span class="text-xs">规范状态</span>
        </div>
        <div class="text-sm font-medium" :class="hasSpec ? 'text-green-500' : 'text-muted-foreground'">
          {{ hasSpec ? '已配置' : '未配置' }}
        </div>
      </div>

      <div class="bg-card border border-border rounded-lg p-4">
        <div class="flex items-center gap-2 text-muted-foreground mb-1">
          <Zap class="w-4 h-4" />
          <span class="text-xs">本地技能</span>
        </div>
        <div class="text-2xl font-semibold">{{ skillsCount }}</div>
      </div>
    </div>

    <!-- Models Used -->
    <div v-if="metrics?.modelsUsed && metrics.modelsUsed.length > 0" class="mb-6">
      <div class="text-xs text-muted-foreground mb-2">使用的模型</div>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="model in metrics.modelsUsed"
          :key="model"
          class="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary"
        >
          {{ getModelShortName(model) }}
        </span>
      </div>
    </div>

    <!-- Last Activity -->
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-6">
      <Clock class="w-4 h-4" />
      <span>最后活动: {{ formatDate(project.lastActivityAt) }}</span>
    </div>

    <!-- Spec and Skills Cards -->
    <div class="grid grid-cols-2 gap-6">
      <ProjectSpecCard
        :project="project"
        :spec="spec"
        @refresh="loadDashboard"
      />
      <ProjectSkillsCard :project="project" />
    </div>
  </div>
</template>
