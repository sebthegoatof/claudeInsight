<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAssetStore } from '@/stores/assetStore';
import AgentManager from '@/components/assets/AgentManager.vue';
import CommandManager from '@/components/assets/CommandManager.vue';
import StyleManager from '@/components/assets/StyleManager.vue';
import McpManager from '@/components/assets/McpManager.vue';
import PluginManager from '@/components/assets/PluginManager.vue';
import PlanManager from '@/components/assets/PlanManager.vue';
import DebugViewer from '@/components/assets/DebugViewer.vue';
import EnvManager from '@/components/settings/EnvManager.vue';
import ConfigDiff from '@/components/settings/ConfigDiff.vue';
import {
  Bot,
  Terminal,
  Palette,
  Plug,
  Puzzle,
  FileText,
  Bug,
  Server,
  GitCompare,
  RefreshCw,
} from 'lucide-vue-next';

const assetStore = useAssetStore();

type TabId = 'agents' | 'commands' | 'styles' | 'mcp' | 'plugins' | 'plans' | 'debug' | 'env' | 'config-diff';

const activeTab = ref<TabId>('agents');

const tabs: { id: TabId; label: string; icon: typeof Bot; count?: number }[] = [
  { id: 'agents', label: 'Agent 模板', icon: Bot },
  { id: 'commands', label: '自定义命令', icon: Terminal },
  { id: 'styles', label: '输出风格', icon: Palette },
  { id: 'mcp', label: 'MCP 服务器', icon: Plug },
  { id: 'plugins', label: '插件市场', icon: Puzzle },
  { id: 'plans', label: '计划文件', icon: FileText },
  { id: 'debug', label: '调试日志', icon: Bug },
  { id: 'env', label: '环境变量', icon: Server },
  { id: 'config-diff', label: '配置对比', icon: GitCompare },
];

const tabCounts = computed(() => ({
  agents: assetStore.agents.length,
  commands: assetStore.commands.length,
  styles: assetStore.styles.length,
  mcp: 0, // MCP count from stats API
  plugins: assetStore.plugins.length,
  plans: 0,
  debug: 0,
  env: 0,
  'config-diff': 0,
}));

onMounted(() => {
  assetStore.fetchAll();
});
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <header class="h-12 flex-shrink-0 border-b border-border bg-card/50 flex items-center justify-between px-4">
      <div class="flex items-center gap-2">
        <h1 class="text-sm font-medium">资产管理</h1>
        <span class="text-xs text-muted-foreground">~/.claude/ 资产目录</span>
      </div>
      <button
        @click="assetStore.fetchAll()"
        :disabled="assetStore.loading"
        class="flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-md transition-colors disabled:opacity-50"
      >
        <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': assetStore.loading }" />
        <span>刷新</span>
      </button>
    </header>

    <!-- Main Content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Sidebar Tabs -->
      <aside class="w-48 flex-shrink-0 border-r border-border bg-card/30 overflow-y-auto">
        <nav class="p-2 space-y-1">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors"
            :class="[
              activeTab === tab.id
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            ]"
          >
            <component :is="tab.icon" class="w-4 h-4 flex-shrink-0" />
            <span class="flex-1 text-left truncate">{{ tab.label }}</span>
            <span
              v-if="tabCounts[tab.id] > 0"
              class="text-[10px] px-1.5 py-0.5 rounded-full bg-muted"
            >
              {{ tabCounts[tab.id] }}
            </span>
          </button>
        </nav>
      </aside>

      <!-- Content Area -->
      <main class="flex-1 overflow-hidden">
        <AgentManager v-if="activeTab === 'agents'" />
        <CommandManager v-else-if="activeTab === 'commands'" />
        <StyleManager v-else-if="activeTab === 'styles'" />
        <McpManager v-else-if="activeTab === 'mcp'" />
        <PluginManager v-else-if="activeTab === 'plugins'" />
        <PlanManager v-else-if="activeTab === 'plans'" />
        <DebugViewer v-else-if="activeTab === 'debug'" />
        <EnvManager v-else-if="activeTab === 'env'" />
        <ConfigDiff v-else-if="activeTab === 'config-diff'" />
      </main>
    </div>
  </div>
</template>
