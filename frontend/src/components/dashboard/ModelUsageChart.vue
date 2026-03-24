<script setup lang="ts">
import { computed } from 'vue';
import type { ModelStat } from '@/api/stats';

const props = defineProps<{
  models: ModelStat[];
}>();

const COLORS = [
  'hsl(199, 89%, 48%)',  // primary cyan
  'hsl(280, 65%, 60%)',  // accent purple
  'hsl(142, 71%, 45%)',  // emerald
  'hsl(38, 92%, 50%)',   // amber
  'hsl(0, 72%, 51%)',    // red
  'hsl(200, 80%, 60%)',  // light blue
];

// 过滤掉 0 token 的模型
const activeModels = computed(() =>
  props.models.filter(m => m.totalTokens > 0)
);

const totalTokens = computed(() =>
  activeModels.value.reduce((sum, m) => sum + m.totalTokens, 0)
);

const chartData = computed(() => {
  if (activeModels.value.length === 0) return [];

  let cumulativePercent = 0;
  return [...activeModels.value]
    .sort((a, b) => b.totalTokens - a.totalTokens)
    .map((m, i) => {
      const percent = totalTokens.value > 0 ? (m.totalTokens / totalTokens.value) * 100 : 0;
      const startPercent = cumulativePercent;
      cumulativePercent += percent;
      return {
        ...m,
        color: COLORS[i % COLORS.length],
        percent,
        startPercent,
        shortName: getShortName(m.model),
      };
    });
});

const conicGradient = computed(() => {
  if (chartData.value.length === 0) return 'conic-gradient(hsl(var(--muted)) 0% 100%)';
  const stops = chartData.value.map(d =>
    `${d.color} ${d.startPercent}% ${d.startPercent + d.percent}%`
  );
  return `conic-gradient(${stops.join(', ')})`;
});

function getShortName(model: string): string {
  const parts = model.split('/');
  const name = parts[parts.length - 1];
  return name
    .replace('claude-', '')
    .replace('opus-4-6', 'Opus 4.6')
    .replace('sonnet-4-5', 'Sonnet 4.5')
    .replace('sonnet-4-6', 'Sonnet 4.6')
    .replace('haiku-4-5', 'Haiku 4.5')
    .replace(/-/g, ' ');
}

function formatTokens(n: number): string {
  if (n >= 1000000000) return `${(n / 1000000000).toFixed(1)}B`;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}
</script>

<template>
  <div class="bg-card border border-border rounded-lg p-4 h-full">
    <div class="text-sm font-medium mb-3">模型用量分布</div>

    <div v-if="chartData.length === 0" class="flex items-center justify-center h-32 text-sm text-muted-foreground">
      暂无数据
    </div>

    <template v-else>
      <!-- Donut Chart -->
      <div class="flex justify-center mb-4">
        <div class="relative w-32 h-32">
          <div
            class="w-full h-full rounded-full"
            :style="{ background: conicGradient }"
          />
          <div class="absolute inset-3 rounded-full bg-card flex items-center justify-center">
            <div class="text-center">
              <div class="text-lg font-semibold">{{ formatTokens(totalTokens) }}</div>
              <div class="text-[10px] text-muted-foreground">总 Token</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="space-y-2.5">
        <div
          v-for="item in chartData"
          :key="item.model"
          class="flex items-center gap-2 text-xs"
        >
          <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ background: item.color }" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <span class="truncate text-foreground">{{ item.shortName }}</span>
              <span class="text-muted-foreground ml-2 flex-shrink-0">{{ formatTokens(item.totalTokens) }}</span>
            </div>
            <div class="flex gap-2 text-[10px] text-muted-foreground mt-0.5">
              <span>入 {{ formatTokens(item.inputTokens) }}</span>
              <span>出 {{ formatTokens(item.outputTokens) }}</span>
              <span v-if="item.cacheReadTokens > 0" class="text-emerald-500">缓存 {{ formatTokens(item.cacheReadTokens) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
