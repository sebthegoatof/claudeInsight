<script setup lang="ts">
import { computed } from 'vue';
import { useLinkageStore } from '@/stores/linkageStore';
import { Cpu, Zap, Bot, Plug, ListTodo, ChevronRight, FileCode } from 'lucide-vue-next';

const linkageStore = useLinkageStore();

const hasLinks = computed(() => {
  const links = linkageStore.currentLinks;
  if (!links) return false;
  return (
    links.skills.length > 0 ||
    links.agents.length > 0 ||
    links.mcpServers.length > 0 ||
    links.models.length > 0 ||
    links.tasks.length > 0 ||
    links.todos.length > 0 ||
    (links.fileChanges && links.fileChanges.length > 0)
  );
});

const emit = defineEmits<{
  (e: 'openTasks'): void;
  (e: 'openFileHistory'): void;
}>();
</script>

<template>
  <div
    v-if="hasLinks"
    class="flex items-center gap-3 px-4 py-2 bg-muted/30 border-b border-border text-xs"
  >
    <!-- Models -->
    <div v-if="linkageStore.currentLinks?.models?.length" class="flex items-center gap-1.5">
      <Cpu class="w-3.5 h-3.5 text-muted-foreground" />
      <span class="text-muted-foreground">模型:</span>
      <div class="flex gap-1">
        <span
          v-for="model in linkageStore.currentLinks?.models?.slice(0, 3)"
          :key="model"
          class="px-1.5 py-0.5 bg-primary/10 text-primary rounded"
        >
          {{ model.split('/').pop()?.split('-').slice(-2).join(' ') || model }}
        </span>
        <span
          v-if="linkageStore.currentLinks?.models?.length > 3"
          class="text-muted-foreground"
        >
          +{{ linkageStore.currentLinks?.models?.length - 3 }}
        </span>
      </div>
    </div>

    <div class="w-px h-4 bg-border" />

    <!-- Skills -->
    <div v-if="linkageStore.currentLinks?.skills?.length" class="flex items-center gap-1.5">
      <Zap class="w-3.5 h-3.5 text-primary" />
      <span class="text-muted-foreground">{{ linkageStore.currentLinks?.skills?.length }} Skills</span>
    </div>

    <!-- Agents -->
    <div v-if="linkageStore.currentLinks?.agents?.length" class="flex items-center gap-1.5">
      <Bot class="w-3.5 h-3.5 text-accent" />
      <span class="text-muted-foreground">{{ linkageStore.currentLinks?.agents?.length }} Agents</span>
    </div>

    <!-- MCP -->
    <div v-if="linkageStore.currentLinks?.mcpServers?.length" class="flex items-center gap-1.5">
      <Plug class="w-3.5 h-3.5 text-emerald-500" />
      <span class="text-muted-foreground">{{ linkageStore.currentLinks?.mcpServers?.length }} MCP</span>
    </div>

    <!-- File Changes -->
    <button
      v-if="linkageStore.currentLinks?.fileChanges?.length"
      @click="emit('openFileHistory')"
      class="flex items-center gap-1.5 hover:text-foreground transition-colors"
    >
      <FileCode class="w-3.5 h-3.5 text-orange-500" />
      <span class="text-muted-foreground">{{ linkageStore.currentLinks.fileChanges.length }} 文件变更</span>
    </button>

    <div class="flex-1" />

    <!-- Tasks/Todos button -->
    <button
      v-if="linkageStore.currentLinks?.tasks?.length || linkageStore.currentLinks?.todos?.length"
      @click="emit('openTasks')"
      class="flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors"
    >
      <ListTodo class="w-3.5 h-3.5" />
      <span>
        {{ linkageStore.currentLinks?.tasks?.length || 0 }} 任务
        {{ linkageStore.currentLinks?.todos?.length ? `· ${linkageStore.currentLinks?.todos?.filter(t => t.completed).length}/${linkageStore.currentLinks?.todos?.length} TODO` : '' }}
      </span>
      <ChevronRight class="w-3 h-3" />
    </button>
  </div>
</template>
