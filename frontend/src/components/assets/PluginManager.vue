<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAssetStore } from '@/stores/assetStore';
import { assetsApi } from '@/api/assets';
import { Puzzle, RefreshCw, Store, Package, Ban, Clock, ToggleLeft, ToggleRight } from 'lucide-vue-next';

const assetStore = useAssetStore();
const toggling = ref<string | null>(null);

onMounted(() => {
  assetStore.fetchPlugins();
});

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 判断插件是否启用
 * settings.json 的 enabledPlugins: { "pluginId": true/false }
 * 如果插件不在 enabledPlugins 中，默认视为启用（已安装即启用）
 */
function isPluginEnabled(plugin: { id: string }): boolean {
  const enabled = assetStore.enabledPlugins[plugin.id];
  return enabled !== false; // undefined 或 true 都视为启用
}

async function togglePlugin(plugin: { id: string }) {
  const currentEnabled = isPluginEnabled(plugin);
  toggling.value = plugin.id;
  try {
    await assetsApi.togglePluginEnabled(plugin.id, !currentEnabled);
    await assetStore.fetchPlugins();
  } catch {
    // ignore
  } finally {
    toggling.value = null;
  }
}
</script>

<template>
  <div class="h-full overflow-y-auto bg-background">
    <div class="max-w-4xl mx-auto p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-lg font-semibold flex items-center gap-2">
            <Puzzle class="w-5 h-5 text-primary" />
            插件市场
          </h2>
          <p class="text-sm text-muted-foreground mt-1">
            已安装的插件与市场源
          </p>
        </div>
        <button
          @click="assetStore.fetchPlugins()"
          :disabled="assetStore.loading"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-md transition-colors disabled:opacity-50"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': assetStore.loading }" />
          <span>刷新</span>
        </button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="bg-card border border-border rounded-lg p-4">
          <div class="text-2xl font-semibold">{{ assetStore.plugins.length }}</div>
          <div class="text-xs text-muted-foreground mt-1">已安装插件</div>
        </div>
        <div class="bg-card border border-border rounded-lg p-4">
          <div class="text-2xl font-semibold text-primary">{{ assetStore.marketplaces.length }}</div>
          <div class="text-xs text-muted-foreground mt-1">市场源</div>
        </div>
        <div class="bg-card border border-border rounded-lg p-4">
          <div class="text-2xl font-semibold text-destructive">{{ assetStore.blocklist.length }}</div>
          <div class="text-xs text-muted-foreground mt-1">黑名单</div>
        </div>
      </div>

      <!-- Installed Plugins -->
      <div class="mb-8">
        <h3 class="text-sm font-medium mb-3 flex items-center gap-2">
          <Package class="w-4 h-4 text-muted-foreground" />
          已安装插件
        </h3>

        <div v-if="assetStore.plugins.length === 0" class="text-center py-8 text-muted-foreground text-sm">
          暂无已安装插件
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="plugin in assetStore.plugins"
            :key="plugin.id"
            class="bg-card border border-border rounded-lg p-4 transition-colors"
            :class="isPluginEnabled(plugin) ? 'hover:border-primary/30' : 'opacity-60 border-muted'"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ plugin.name }}</span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    v{{ plugin.version }}
                  </span>
                  <span
                    v-if="!isPluginEnabled(plugin)"
                    class="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                  >
                    已禁用
                  </span>
                </div>
                <div class="text-xs text-muted-foreground mt-1">
                  来源: {{ plugin.source }}
                </div>
              </div>
              <div class="flex items-center gap-3 flex-shrink-0">
                <div class="text-right">
                  <div class="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock class="w-3 h-3" />
                    {{ formatDate(plugin.lastUpdated) }}
                  </div>
                </div>
                <!-- 启用/禁用切换 -->
                <button
                  @click="togglePlugin(plugin)"
                  :disabled="toggling === plugin.id"
                  class="flex-shrink-0 transition-colors"
                  :title="isPluginEnabled(plugin) ? '点击禁用' : '点击启用'"
                >
                  <ToggleRight
                    v-if="isPluginEnabled(plugin)"
                    class="w-8 h-8 text-primary hover:text-primary/80 transition-colors"
                  />
                  <ToggleLeft
                    v-else
                    class="w-8 h-8 text-muted-foreground hover:text-foreground transition-colors"
                  />
                </button>
              </div>
            </div>
            <div class="mt-2 text-[10px] font-mono text-muted-foreground truncate">
              {{ plugin.installPath }}
            </div>
          </div>
        </div>
      </div>

      <!-- Marketplaces -->
      <div class="mb-8">
        <h3 class="text-sm font-medium mb-3 flex items-center gap-2">
          <Store class="w-4 h-4 text-muted-foreground" />
          市场源
        </h3>

        <div v-if="assetStore.marketplaces.length === 0" class="text-center py-8 text-muted-foreground text-sm">
          暂无市场源
        </div>

        <div v-else class="grid grid-cols-2 gap-3">
          <div
            v-for="market in assetStore.marketplaces"
            :key="market.id"
            class="bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-colors"
          >
            <div class="flex items-center justify-between">
              <span class="font-medium text-sm">{{ market.name }}</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {{ market.type }}
              </span>
            </div>
            <div v-if="market.url" class="text-xs text-muted-foreground mt-1 truncate">
              {{ market.url }}
            </div>
            <div v-if="market.path" class="text-[10px] font-mono text-muted-foreground mt-1 truncate">
              {{ market.path }}
            </div>
          </div>
        </div>
      </div>

      <!-- Blocklist -->
      <div v-if="assetStore.blocklist.length > 0">
        <h3 class="text-sm font-medium mb-3 flex items-center gap-2">
          <Ban class="w-4 h-4 text-destructive" />
          黑名单
        </h3>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="item in assetStore.blocklist"
            :key="item"
            class="text-xs px-2 py-1 bg-destructive/10 text-destructive rounded-md"
          >
            {{ item }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
