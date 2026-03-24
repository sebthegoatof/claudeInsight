<script setup lang="ts">
import { computed } from 'vue';
import { Zap, Bot, Plug, Terminal } from 'lucide-vue-next';

const props = defineProps<{
  type: 'skill' | 'agent' | 'mcp' | 'command';
  name: string;
}>();

const emit = defineEmits<{
  (e: 'click'): void;
}>();

const config = computed(() => {
  switch (props.type) {
    case 'skill':
      return {
        icon: Zap,
        bgClass: 'bg-primary/15 hover:bg-primary/25',
        textClass: 'text-primary',
        label: 'Skill',
      };
    case 'agent':
      return {
        icon: Bot,
        bgClass: 'bg-accent/15 hover:bg-accent/25',
        textClass: 'text-accent',
        label: 'Agent',
      };
    case 'mcp':
      return {
        icon: Plug,
        bgClass: 'bg-emerald-500/15 hover:bg-emerald-500/25',
        textClass: 'text-emerald-500',
        label: 'MCP',
      };
    case 'command':
      return {
        icon: Terminal,
        bgClass: 'bg-amber-500/15 hover:bg-amber-500/25',
        textClass: 'text-amber-500',
        label: 'Command',
      };
    default:
      return {
        icon: Zap,
        bgClass: 'bg-muted',
        textClass: 'text-muted-foreground',
        label: 'Unknown',
      };
  }
});
</script>

<template>
  <button
    @click="emit('click')"
    class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors"
    :class="[config.bgClass, config.textClass]"
  >
    <component :is="config.icon" class="w-3 h-3" />
    <span class="max-w-24 truncate">{{ name }}</span>
  </button>
</template>
