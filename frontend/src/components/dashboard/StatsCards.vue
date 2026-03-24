<script setup lang="ts">
import type { DashboardOverview } from '@/api/stats';
import {
  MessageSquare,
  MessagesSquare,
  CalendarDays,
  Timer,
  TrendingUp,
  Zap,
} from 'lucide-vue-next';

const props = defineProps<{
  overview: DashboardOverview;
}>();

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

interface StatCard {
  icon: typeof MessageSquare;
  label: string;
  value: string;
  sub?: string;
  color: string;
}

function getCards(): StatCard[] {
  const o = props.overview;
  const cards: StatCard[] = [
    {
      icon: MessageSquare,
      label: '总会话',
      value: formatNumber(o.totalSessions),
      sub: `近 7 天 ${o.recentActivityCount} 次活跃`,
      color: 'text-primary',
    },
    {
      icon: MessagesSquare,
      label: '总消息',
      value: formatNumber(o.totalMessages),
      color: 'text-emerald-500',
    },
    {
      icon: CalendarDays,
      label: '活跃天数',
      value: o.activeDays.toString(),
      sub: o.firstUsedDate ? `始于 ${o.firstUsedDate.split('T')[0]}` : undefined,
      color: 'text-amber-500',
    },
    {
      icon: Timer,
      label: '最长会话',
      value: o.longestSession ? formatDuration(o.longestSession.durationSeconds) : '-',
      sub: o.longestSession ? `${o.longestSession.messageCount} 条消息` : undefined,
      color: 'text-violet-500',
    },
    {
      icon: TrendingUp,
      label: '高峰时段',
      value: o.peakHour ? `${o.peakHour.hour}:00` : '-',
      sub: o.peakHour ? `${o.peakHour.count} 次会话启动` : undefined,
      color: 'text-rose-500',
    },
    {
      icon: Zap,
      label: '模型数',
      value: o.modelStats.length.toString(),
      sub: o.modelStats.length > 0 ? o.modelStats[0].model.split('/').pop() : undefined,
      color: 'text-cyan-500',
    },
  ];
  return cards;
}
</script>

<template>
  <div class="grid grid-cols-6 gap-4">
    <div
      v-for="(card, i) in getCards()"
      :key="i"
      class="bg-card border border-border rounded-lg p-4 hover:border-glow transition-shadow"
    >
      <div class="flex items-center gap-2 mb-2">
        <div class="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
          <component :is="card.icon" class="w-4 h-4" :class="card.color" />
        </div>
        <span class="text-xs text-muted-foreground">{{ card.label }}</span>
      </div>
      <div class="text-2xl font-semibold">{{ card.value }}</div>
      <div v-if="card.sub" class="text-xs text-muted-foreground mt-1 truncate">{{ card.sub }}</div>
    </div>
  </div>
</template>
