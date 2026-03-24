<script setup lang="ts">
import type { McpServerInfo } from '@/api/stats';
import { Plug, Server, Globe, FileSearch } from 'lucide-vue-next';

defineProps<{
  servers: McpServerInfo[];
}>();

function getIcon(server: McpServerInfo) {
  const name = server.name.toLowerCase();
  if (name.includes('puppeteer') || name.includes('browser')) return Globe;
  if (name.includes('file') || name.includes('fs')) return FileSearch;
  if (name.includes('fetch') || name.includes('web')) return Globe;
  return Server;
}

function getStatusColor(server: McpServerInfo): string {
  // MCP 服务器存在配置即视为已配置
  return server.command ? 'bg-emerald-500' : 'bg-muted-foreground';
}
</script>

<template>
  <div class="bg-card border border-border rounded-lg p-4 h-full">
    <div class="flex items-center gap-2 mb-3">
      <Plug class="w-4 h-4 text-primary" />
      <span class="text-sm font-medium">MCP 服务器</span>
    </div>

    <div v-if="servers.length === 0" class="flex items-center justify-center h-32 text-sm text-muted-foreground">
      未配置 MCP 服务器
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="server in servers"
        :key="server.name"
        class="flex items-center gap-3 p-2 rounded-md bg-muted/30"
      >
        <div class="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <component :is="getIcon(server)" class="w-4 h-4 text-muted-foreground" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full" :class="getStatusColor(server)" />
            <span class="text-sm font-medium">{{ server.name }}</span>
          </div>
          <div class="text-[10px] text-muted-foreground truncate mt-0.5">
            {{ server.command }} {{ server.args.slice(0, 2).join(' ') }}
          </div>
        </div>
        <span class="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
          {{ server.type }}
        </span>
      </div>
    </div>
  </div>
</template>
