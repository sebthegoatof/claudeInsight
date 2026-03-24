<script setup lang="ts">
import { onMounted } from 'vue';
import { useDashboardStore } from '@/stores/dashboardStore';
import StatsCards from '@/components/dashboard/StatsCards.vue';
import ActivityHeatmap from '@/components/dashboard/ActivityHeatmap.vue';
import ModelUsageChart from '@/components/dashboard/ModelUsageChart.vue';
import RecentTimeline from '@/components/dashboard/RecentTimeline.vue';
import McpStatusPanel from '@/components/dashboard/McpStatusPanel.vue';
import HourlyChart from '@/components/dashboard/HourlyChart.vue';
import { RefreshCw } from 'lucide-vue-next';

const dashboardStore = useDashboardStore();

onMounted(() => {
  dashboardStore.fetchOverview();
});
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="max-w-[1400px] mx-auto p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-semibold text-gradient">Dashboard</h1>
          <p class="text-sm text-muted-foreground mt-1">Claude Code 使用概览与数据洞察</p>
        </div>
        <button
          @click="dashboardStore.fetchOverview()"
          :disabled="dashboardStore.loading"
          class="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': dashboardStore.loading }" />
          <span>刷新</span>
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="dashboardStore.loading && !dashboardStore.overview" class="flex items-center justify-center h-64">
        <div class="text-muted-foreground text-sm">加载中...</div>
      </div>

      <!-- Error State -->
      <div v-else-if="dashboardStore.error" class="flex items-center justify-center h-64">
        <div class="text-center">
          <div class="text-destructive text-sm mb-2">{{ dashboardStore.error }}</div>
          <button
            @click="dashboardStore.fetchOverview()"
            class="text-sm text-primary hover:underline"
          >
            重试
          </button>
        </div>
      </div>

      <!-- Dashboard Content -->
      <template v-else-if="dashboardStore.overview">
        <!-- Stats Cards Row -->
        <StatsCards :overview="dashboardStore.overview" class="mb-6" />

        <!-- Charts Row: Heatmap + Model Usage -->
        <div class="grid grid-cols-3 gap-6 mb-6">
          <div class="col-span-2">
            <ActivityHeatmap :data="dashboardStore.overview.heatmapData" />
          </div>
          <div>
            <ModelUsageChart :models="dashboardStore.overview.modelStats" />
          </div>
        </div>

        <!-- Bottom Row: Recent Timeline + Hourly + MCP -->
        <div class="grid grid-cols-3 gap-6">
          <div class="col-span-1">
            <RecentTimeline :sessions="dashboardStore.recentSessions" />
          </div>
          <div class="col-span-1">
            <HourlyChart :distribution="dashboardStore.overview.hourlyDistribution" />
          </div>
          <div class="col-span-1">
            <McpStatusPanel :servers="dashboardStore.mcpServers" />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
