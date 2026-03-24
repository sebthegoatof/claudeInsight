<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { api } from '@/api';
import { useLinkageStore } from '@/stores/linkageStore';
import {
  Bot,
  Copy,
  Check,
  Loader2,
  FolderOpen,
} from 'lucide-vue-next';

const props = defineProps<{
  agentType?: string;
}>();

const linkageStore = useLinkageStore();

const agents = computed(() => linkageStore.currentLinks?.agents || []);
const selectedAgent = ref(props.agentType || '');
const agentContent = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const copied = ref(false);

// 自动选择第一个 agent
watch(agents, (newAgents) => {
  if (newAgents.length > 0 && !selectedAgent.value) {
    selectedAgent.value = props.agentType || newAgents[0].type;
  }
}, { immediate: true });

// Claude 内建 Agent 类型（没有用户自定义文件）
const BUILTIN_AGENTS: Record<string, string> = {
  'Explore': '快速探索代码库的专用 Agent，擅长文件搜索、关键词搜索和代码理解。',
  'Plan': '软件架构 Agent，用于设计实施计划、识别关键文件、权衡架构方案。',
  'general-purpose': '通用 Agent，可执行研究、搜索代码、处理多步骤任务。',
};

// 加载 agent 内容
watch(selectedAgent, async (type) => {
  if (!type) {
    agentContent.value = '';
    return;
  }

  // 先检查是否为内建 agent
  if (BUILTIN_AGENTS[type]) {
    agentContent.value = '';
    error.value = null;
    loading.value = false;
    return;
  }

  loading.value = true;
  error.value = null;
  try {
    const pathParts = type.split('/');
    let response: { content: string; path?: string };

    if (pathParts.length >= 2) {
      response = await api.get<{ content: string; path: string }>(
        `/api/assets/agents/${encodeURIComponent(pathParts[0])}/${encodeURIComponent(pathParts.slice(1).join('/'))}`
      );
    } else {
      const fileName = type.endsWith('.md') ? type : `${type}.md`;
      response = await api.get<{ content: string; path: string }>(
        `/api/assets/agents/file?path=${encodeURIComponent(fileName)}`
      );
    }
    agentContent.value = response.content || '';
  } catch {
    // 加载失败，可能是内建 agent 或文件不存在
    error.value = null;
    agentContent.value = '';
  } finally {
    loading.value = false;
  }
}, { immediate: true });

// 是否为内建 agent
function isBuiltinAgent(type: string): boolean {
  return !!BUILTIN_AGENTS[type];
}

function getBuiltinDescription(type: string): string {
  return BUILTIN_AGENTS[type] || '';
}

async function copyContent() {
  if (!agentContent.value) return;
  try {
    await navigator.clipboard.writeText(agentContent.value);
    copied.value = true;
    setTimeout(() => copied.value = false, 2000);
  } catch {
    // ignore
  }
}

function getAgentDisplayName(type: string): string {
  // 从路径中提取友好名称
  const parts = type.split('/');
  return parts[parts.length - 1] || type;
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Agent 列表 -->
    <div v-if="agents.length > 1" class="border-b border-border p-3">
      <div class="text-xs text-muted-foreground mb-2">选择 Agent</div>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="agent in agents"
          :key="agent.type"
          @click="selectedAgent = agent.type"
          class="px-2 py-1 text-xs rounded-md transition-colors"
          :class="selectedAgent === agent.type
            ? 'bg-accent text-accent-foreground'
            : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'"
        >
          {{ getAgentDisplayName(agent.type) }}
        </button>
      </div>
    </div>

    <!-- Agent 内容 -->
    <div class="flex-1 overflow-hidden flex flex-col">
      <!-- 头部 -->
      <div v-if="selectedAgent" class="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <div class="flex items-center gap-2">
          <Bot class="w-4 h-4 text-accent" />
          <span class="text-sm font-medium">{{ getAgentDisplayName(selectedAgent) }}</span>
        </div>
        <div class="flex items-center gap-1">
          <button
            @click="copyContent"
            class="p-1.5 rounded hover:bg-muted transition-colors"
            title="复制内容"
          >
            <Check v-if="copied" class="w-4 h-4 text-green-500" />
            <Copy v-else class="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="flex-1 flex items-center justify-center">
        <Loader2 class="w-6 h-6 animate-spin text-muted-foreground" />
      </div>

      <!-- 错误 -->
      <div v-else-if="error" class="flex-1 flex items-center justify-center p-4">
        <div class="text-center">
          <p class="text-sm text-red-500">{{ error }}</p>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="agents.length === 0" class="flex-1 flex items-center justify-center p-4">
        <div class="text-center">
          <div class="w-12 h-12 mx-auto rounded-xl bg-muted/50 flex items-center justify-center mb-3">
            <FolderOpen class="w-6 h-6 text-muted-foreground" />
          </div>
          <p class="text-sm text-muted-foreground">该会话没有关联的 Agent</p>
        </div>
      </div>

      <!-- 内建 Agent 信息 -->
      <div v-else-if="isBuiltinAgent(selectedAgent)" class="flex-1 overflow-y-auto p-4">
        <div class="rounded-lg border border-border/50 bg-muted/20 p-4">
          <div class="flex items-center gap-2 mb-3">
            <Bot class="w-5 h-5 text-accent" />
            <span class="text-sm font-semibold">{{ getAgentDisplayName(selectedAgent) }}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent">内建</span>
          </div>
          <p class="text-sm text-muted-foreground leading-relaxed">
            {{ getBuiltinDescription(selectedAgent) }}
          </p>
          <p class="text-xs text-muted-foreground/60 mt-3">
            此为 Claude Code 内建的 Agent 类型，无自定义定义文件。
          </p>
        </div>
      </div>

      <!-- 自定义 Agent 内容 -->
      <div v-else-if="agentContent" class="flex-1 overflow-y-auto p-4">
        <pre class="text-xs font-mono whitespace-pre-wrap break-words bg-muted/30 p-3 rounded-lg border border-border/50">{{ agentContent }}</pre>
      </div>

      <!-- 无内容 -->
      <div v-else-if="selectedAgent" class="flex-1 flex items-center justify-center p-4">
        <div class="text-center">
          <Bot class="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p class="text-sm text-muted-foreground">{{ getAgentDisplayName(selectedAgent) }}</p>
          <p class="text-xs text-muted-foreground/60 mt-1">未找到 Agent 定义文件</p>
        </div>
      </div>
    </div>
  </div>
</template>
