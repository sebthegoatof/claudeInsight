<script setup lang="ts">
import { computed } from 'vue';
import { useLinkageStore } from '@/stores/linkageStore';
import {
  Plug,
  Server,
  Settings,
  FolderOpen,
} from 'lucide-vue-next';

const linkageStore = useLinkageStore();

const mcpServers = computed(() => linkageStore.currentLinks?.mcpServers || []);

// MCP 服务器配置信息（从 settings.json 获取）
const mcpConfigs = computed(() => {
  // 这里可以扩展从后端获取 MCP 配置详情
  return mcpServers.value.map(server => ({
    name: server.name,
    type: 'stdio', // 默认类型
    status: 'unknown',
  }));
});

function getServerStatusColor(status: string): string {
  switch (status) {
    case 'running':
      return 'text-green-500';
    case 'stopped':
      return 'text-red-500';
    case 'error':
      return 'text-orange-500';
    default:
      return 'text-muted-foreground';
  }
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 标题 -->
    <div class="px-4 py-3 border-b border-border">
      <div class="flex items-center gap-2">
        <Plug class="w-4 h-4 text-emerald-500" />
        <span class="text-sm font-medium">MCP 服务器</span>
        <span class="text-xs text-muted-foreground">({{ mcpServers.length }})</span>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="mcpServers.length === 0" class="flex-1 flex items-center justify-center p-4">
      <div class="text-center">
        <div class="w-12 h-12 mx-auto rounded-xl bg-muted/50 flex items-center justify-center mb-3">
          <FolderOpen class="w-6 h-6 text-muted-foreground" />
        </div>
        <p class="text-sm text-muted-foreground">该会话没有使用 MCP 服务器</p>
      </div>
    </div>

    <!-- MCP 列表 -->
    <div v-else class="flex-1 overflow-y-auto p-4">
      <div class="space-y-3">
        <div
          v-for="server in mcpConfigs"
          :key="server.name"
          class="p-3 rounded-lg bg-muted/30 border border-border/50"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Server class="w-4 h-4 text-muted-foreground" />
              <span class="text-sm font-medium">{{ server.name }}</span>
            </div>
            <span
              class="text-[10px] px-1.5 py-0.5 rounded bg-muted"
              :class="getServerStatusColor(server.status)"
            >
              {{ server.type }}
            </span>
          </div>

          <div class="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Settings class="w-3 h-3" />
            <span>在 settings.json 中配置</span>
          </div>
        </div>
      </div>

      <!-- 说明 -->
      <div class="mt-6 p-3 rounded-lg bg-muted/20 border border-border/30">
        <p class="text-xs text-muted-foreground">
          MCP (Model Context Protocol) 服务器为 Claude 提供外部工具和数据源访问能力。
          会话中使用的 MCP 工具调用会显示在这里。
        </p>
      </div>
    </div>
  </div>
</template>
