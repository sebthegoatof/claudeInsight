<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  distribution: number[];
}>();

const maxVal = computed(() => Math.max(...props.distribution, 1));
const totalCount = computed(() => props.distribution.reduce((a, b) => a + b, 0));

const bars = computed(() => {
  return props.distribution.map((count, hour) => ({
    hour,
    count,
    heightPercent: (count / maxVal.value) * 100,
    label: `${String(hour).padStart(2, '0')}:00`,
  }));
});

// 找到高峰时段
const peakHour = computed(() => {
  let max = 0;
  let peak = 0;
  props.distribution.forEach((count, hour) => {
    if (count > max) { max = count; peak = hour; }
  });
  return { hour: peak, count: max };
});
</script>

<template>
  <div class="bg-card border border-border rounded-lg p-4 h-full">
    <div class="flex items-center justify-between mb-1">
      <div class="text-sm font-medium">会话启动时段</div>
      <div class="text-xs text-muted-foreground">共 {{ totalCount }} 次</div>
    </div>
    <div class="text-xs text-muted-foreground mb-3">
      每小时启动的会话数量 · 高峰 <span class="text-primary font-medium">{{ peakHour.hour }}:00</span> ({{ peakHour.count }} 次)
    </div>

    <div class="flex items-end gap-[3px] h-28">
      <div
        v-for="bar in bars"
        :key="bar.hour"
        class="flex-1 rounded-t-sm transition-all cursor-pointer group relative"
        :class="[
          bar.count === 0
            ? 'bg-muted/20'
            : bar.hour === peakHour.hour
              ? 'bg-primary hover:bg-primary/80'
              : 'bg-primary/40 hover:bg-primary/60'
        ]"
        :style="{ height: `${Math.max(bar.heightPercent, bar.count > 0 ? 4 : 1)}%` }"
      >
        <!-- Tooltip -->
        <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
          <div class="px-2 py-1 text-[10px] bg-popover text-popover-foreground border border-border rounded-md shadow-sm whitespace-nowrap">
            <div class="font-medium">{{ bar.label }}</div>
            <div>{{ bar.count }} 次会话</div>
          </div>
        </div>
      </div>
    </div>

    <!-- X-axis labels -->
    <div class="flex mt-1.5">
      <div
        v-for="h in [0, 3, 6, 9, 12, 15, 18, 21]"
        :key="h"
        class="text-[10px] text-muted-foreground"
        :style="{ position: 'absolute', left: `calc(${(h / 24) * 100}% + 28px)` }"
      >
        {{ h }}
      </div>
    </div>
    <div class="flex justify-between mt-1">
      <span class="text-[10px] text-muted-foreground">0:00</span>
      <span class="text-[10px] text-muted-foreground">6:00</span>
      <span class="text-[10px] text-muted-foreground">12:00</span>
      <span class="text-[10px] text-muted-foreground">18:00</span>
      <span class="text-[10px] text-muted-foreground">23:00</span>
    </div>
  </div>
</template>
