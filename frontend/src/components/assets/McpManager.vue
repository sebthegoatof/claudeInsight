<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { statsApi } from '@/api/stats';
import { Plug, RefreshCw, Server } from 'lucide-vue-next';
import type { McpServerInfo } from '@/api/stats';

const servers = ref<McpServerInfo[]>([]);
const loading = ref(false);

const serverTypes = computed(() => {
  const types: Record<string, number> = {};
  for (const s of servers.value) {
    types[s.type] = (types[s.type] || 0) + 1;
  }
  return types;
});

onMounted(async () => {
  await fetchServers();
});

async function fetchServers() {
  loading.value = true;
  try {
    servers.value = await statsApi.getMcpServers();
  } catch (e) {
    console.error('Failed to fetch MCP servers:', e);
  } finally {
    loading.value = false;
  }
}

function getServerIcon(type: string) {
  switch (type) {
    case 'npx': return '📦';
    case 'node': return '🟢';
    default: return '⚙️';
  }
}

function getServerStatus(name: string): 'active' | 'inactive' {
  // 简单判断：有 command 就视为已配置
  const server = servers.value.find(s => s.name === name);
  return server?.command ? 'active' : 'inactive';
}
</script>

<template>
  <div class="h-full overflow-y-auto bg-background">
    <div class="max-w-3xl mx-auto p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-lg font-semibold flex items-center gap-2">
            <Plug class="w-5 h-5 text-primary" />
            MCP 服务器
          </h2>
          <p class="text-sm text-muted-foreground mt-1">
            Model Context Protocol 外部数据源连接
          </p>
        </div>
        <button
          @click="fetchServers"
          :disabled="loading"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-md transition-colors disabled:opacity-50"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" />
          <span>刷新</span>
        </button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="bg-card border border-border rounded-lg p-4">
          <div class="text-2xl font-semibold">{{ servers.length }}</div>
          <div class="text-xs text-muted-foreground mt-1">已配置服务器</div>
        </div>
        <div class="bg-card border border-border rounded-lg p-4">
          <div class="text-2xl font-semibold text-emerald-500">{{ Object.keys(serverTypes).length }}</div>
          <div class="text-xs text-muted-foreground mt-1">类型数量</div>
        </div>
        <div class="bg-card border border-border rounded-lg p-4">
          <div class="text-2xl font-semibold text-primary">{{ servers.filter(s => s.type === 'npx').length }}</div>
          <div class="text-xs text-muted-foreground mt-1">NPX 包</div>
        </div>
      </div>

      <!-- Server List -->
      <div v-if="servers.length === 0" class="text-center py-12 text-muted-foreground">
        <Server class="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p class="text-sm">暂无 MCP 服务器配置</p>
        <p class="text-xs mt-1">在 settings.json 中添加 mcpServers 配置</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="server in servers"
          :key="server.name"
          class="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg">
                {{ getServerIcon(server.type) }}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ server.name }}</span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {{ server.type }}
                  </span>
                  <span
                    class="text-[10px] px-1.5 py-0.5 rounded"
                    :class="getServerStatus(server.name) === 'active'
                      ? 'bg-emerald-500/20 text-emerald-500'
                      : 'bg-muted text-muted-foreground'"
                  >
                    {{ getServerStatus(server.name) === 'active' ? '已配置' : '未配置' }}
                  </span>
                </div>
                <div class="text-xs text-muted-foreground mt-1 font-mono">
                  {{ server.command }} {{ server.args.slice(0, 2).join(' ') }}
                  <span v-if="server.args.length > 2" class="text-muted-foreground/50">
                    +{{ server.args.length - 2 }} more
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Args -->
          <div v-if="server.args.length > 0" class="mt-3 pt-3 border-t border-border">
            <div class="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">参数</div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="(arg, i) in server.args"
                :key="i"
                class="text-[10px] px-1.5 py-0.5 bg-muted/50 rounded font-mono"
              >
                {{ arg }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Help -->
      <div class="mt-8 p-4 bg-muted/30 rounded-lg border border-border">
        <div class="text-sm font-medium mb-2">如何添加 MCP 服务器</div>
        <div class="text-xs text-muted-foreground space-y-1">
          <p>1. 打开 <code class="px-1 py-0.5 bg-muted rounded">~/.claude/settings.json</code></p>
          <p>2. 在 <code class="px-1 py-0.5 bg-muted rounded">mcpServers</code> 对象中添加配置</p>
          <p>3. 重启 Claude Code 以加载新配置</p>
        </div>
      </div>
    </div>
  </div>
</template>
