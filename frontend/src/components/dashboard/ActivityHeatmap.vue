<script setup lang="ts">
import { computed, ref } from 'vue';
import type { HeatmapEntry } from '@/api/stats';

const props = defineProps<{
  data: HeatmapEntry[];
}>();

const hoveredCell = ref<{ date: string; count: number; x: number; y: number } | null>(null);

// 单元格尺寸
const CELL_SIZE = 11;
const CELL_GAP = 3;
const WEEK_COUNT = 20;
const DAY_LABELS = ['', '一', '', '三', '', '五', '日'];

// 构建完整的热力图网格
const gridData = computed(() => {
  const countMap = new Map<string, number>();
  for (const entry of props.data) {
    countMap.set(entry.date, entry.count);
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // 找到本周日（作为最后一列）
  const dayOfWeek = today.getDay();
  const thisSunday = new Date(today);
  thisSunday.setDate(today.getDate() + (7 - dayOfWeek) % 7);
  if (dayOfWeek === 0) {
    // 如果今天是周日，thisSunday 就是今天
  }

  // 回溯 totalWeeks-1 周的周一
  const startMonday = new Date(thisSunday);
  startMonday.setDate(thisSunday.getDate() - (WEEK_COUNT - 1) * 7 - 6);

  // 生成完整的网格 (WEEK_COUNT 周 x 7 天)
  const weeks: { date: string; count: number; dayOfWeek: number; future: boolean; month: number }[][] = [];
  const current = new Date(startMonday);

  for (let w = 0; w < WEEK_COUNT; w++) {
    const week: { date: string; count: number; dayOfWeek: number; future: boolean; month: number }[] = [];

    for (let d = 0; d < 7; d++) {
      const dateStr = current.toISOString().split('T')[0];
      const dow = current.getDay();
      const adjustedDow = dow === 0 ? 6 : dow - 1; // 周一=0, 周日=6
      const isFuture = current > today;

      week.push({
        date: dateStr,
        count: countMap.get(dateStr) || 0,
        dayOfWeek: adjustedDow,
        future: isFuture,
        month: current.getMonth(),
      });

      current.setDate(current.getDate() + 1);
    }

    weeks.push(week);
  }

  return weeks;
});

const maxCount = computed(() => {
  let max = 0;
  for (const entry of props.data) {
    if (entry.count > max) max = entry.count;
  }
  return max || 1;
});

function getColorClass(count: number, future: boolean): string {
  if (future) return 'bg-muted/20';
  if (count === 0) return 'bg-muted/40';
  const ratio = count / maxCount.value;
  if (ratio <= 0.25) return 'bg-primary/25';
  if (ratio <= 0.5) return 'bg-primary/45';
  if (ratio <= 0.75) return 'bg-primary/65';
  return 'bg-primary';
}

function showTooltip(event: MouseEvent, date: string, count: number) {
  hoveredCell.value = { date, count, x: event.clientX, y: event.clientY };
}

function hideTooltip() {
  hoveredCell.value = null;
}

// 月份标签 - 计算每个标签应该在的位置
const monthLabels = computed(() => {
  const labels: { label: string; left: number }[] = [];
  let lastMonth = -1;
  const colWidth = CELL_SIZE + CELL_GAP;

  for (let i = 0; i < gridData.value.length; i++) {
    const week = gridData.value[i];
    if (week.length === 0) continue;

    // 使用周一的日期来判断月份
    const firstDay = week[0];
    const month = firstDay.month;

    if (month !== lastMonth) {
      labels.push({
        label: new Date(firstDay.date).toLocaleDateString('zh-CN', { month: 'short' }),
        left: i * colWidth,
      });
      lastMonth = month;
    }
  }
  return labels;
});

// 总活跃数
const totalActivity = computed(() =>
  props.data.reduce((sum, e) => sum + e.count, 0)
);

// 计算热力图宽度
const heatmapWidth = computed(() => {
  return WEEK_COUNT * (CELL_SIZE + CELL_GAP) - CELL_GAP;
});

// 计算月份标签行宽度
const monthRowWidth = computed(() => {
  return heatmapWidth.value + CELL_SIZE; // 加上一个单元格宽度作为缓冲
});
</script>

<template>
  <div class="bg-card border border-border rounded-lg p-4">
    <div class="flex items-center justify-between mb-3">
      <div class="text-sm font-medium">活跃热力图</div>
      <div class="text-xs text-muted-foreground">
        近 20 周共 {{ totalActivity }} 次输入
      </div>
    </div>

    <div class="overflow-x-auto">
      <div class="inline-block">
        <!-- Month labels row -->
        <div
          class="relative mb-1 ml-7"
          :style="{ width: `${monthRowWidth}px`, height: '16px' }"
        >
          <div
            v-for="(label, idx) in monthLabels"
            :key="idx"
            class="absolute text-[10px] text-muted-foreground whitespace-nowrap"
            :style="{ left: `${label.left}px` }"
          >
            {{ label.label }}
          </div>
        </div>

        <!-- Main grid container -->
        <div class="flex">
          <!-- Day labels column -->
          <div class="flex flex-col mr-0.5 flex-shrink-0" :style="{ gap: `${CELL_GAP}px` }">
            <div
              v-for="(label, idx) in DAY_LABELS"
              :key="idx"
              class="text-[10px] text-muted-foreground text-right pr-1"
              :style="{ height: `${CELL_SIZE}px`, lineHeight: `${CELL_SIZE}px` }"
            >
              {{ label }}
            </div>
          </div>

          <!-- Heatmap grid -->
          <div class="flex" :style="{ gap: `${CELL_GAP}px` }">
            <div
              v-for="(week, wi) in gridData"
              :key="wi"
              class="flex flex-col"
              :style="{ gap: `${CELL_GAP}px` }"
            >
              <div
                v-for="(day, di) in week"
                :key="di"
                class="rounded-sm cursor-pointer transition-all hover:ring-1 hover:ring-foreground/30"
                :class="getColorClass(day.count, day.future)"
                :style="{ width: `${CELL_SIZE}px`, height: `${CELL_SIZE}px` }"
                @mouseenter="showTooltip($event, day.date, day.count)"
                @mouseleave="hideTooltip"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex items-center gap-1.5 mt-3 justify-end text-[10px] text-muted-foreground">
      <span>少</span>
      <div class="w-[10px] h-[10px] rounded-sm bg-muted/40" />
      <div class="w-[10px] h-[10px] rounded-sm bg-primary/25" />
      <div class="w-[10px] h-[10px] rounded-sm bg-primary/45" />
      <div class="w-[10px] h-[10px] rounded-sm bg-primary/65" />
      <div class="w-[10px] h-[10px] rounded-sm bg-primary" />
      <span>多</span>
    </div>

    <!-- Tooltip -->
    <Teleport to="body">
      <div
        v-if="hoveredCell"
        class="fixed z-50 px-2.5 py-1.5 text-xs bg-popover text-popover-foreground border border-border rounded-md shadow-lg pointer-events-none"
        :style="{ left: `${hoveredCell.x + 12}px`, top: `${hoveredCell.y - 36}px` }"
      >
        <div class="font-medium">{{ hoveredCell.date }}</div>
        <div class="text-muted-foreground">{{ hoveredCell.count }} 次活跃</div>
      </div>
    </Teleport>
  </div>
</template>
