<script setup lang="ts">
import { computed } from 'vue';
import { Zap, Bot, Plug, Wrench } from 'lucide-vue-next';

interface Props {
  type: 'skill' | 'agent' | 'mcp' | 'tool';
  name: string;
  clickable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  clickable: true,
});

const emit = defineEmits<{
  (e: 'click'): void;
}>();

const badgeConfig = computed(() => {
  switch (props.type) {
    case 'skill':
      return {
        icon: Zap,
        bgClass: 'bg-primary/20 text-primary hover:bg-primary/30',
        label: 'Skill',
      };
    case 'agent':
      return {
        icon: Bot,
        bgClass: 'bg-accent/20 text-accent hover:bg-accent/30',
        label: 'Agent',
      };
    case 'mcp':
      return {
        icon: Plug,
        bgClass: 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30',
        label: 'MCP',
      };
    case 'tool':
    default:
      return {
        icon: Wrench,
        bgClass: 'bg-blue-500/20 text-blue-500 hover:bg-blue-500/30',
        label: 'Tool',
      };
  }
});

function handleClick() {
  if (props.clickable) {
    emit('click');
  }
}
</script>

<template>
  <button
    v-if="clickable"
    @click="handleClick"
    class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors"
    :class="badgeConfig.bgClass"
  >
    <component :is="badgeConfig.icon" class="w-3 h-3" />
    <span>{{ badgeConfig.label }}:</span>
    <span class="truncate max-w-[100px]">{{ name }}</span>
  </button>
  <span
    v-else
    class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded"
    :class="badgeConfig.bgClass"
  >
    <component :is="badgeConfig.icon" class="w-3 h-3" />
    <span>{{ badgeConfig.label }}:</span>
    <span class="truncate max-w-[100px]">{{ name }}</span>
  </span>
</template>
