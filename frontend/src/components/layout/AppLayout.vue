<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import { useLayoutStore } from '@/stores/layoutStore';
import GlobalRail from './GlobalRail.vue';
import ProjectExplorer from './ProjectExplorer.vue';

const layoutStore = useLayoutStore();

// Resize handling
const isResizing = ref(false);
const resizeStartX = ref(0);
const resizeStartWidth = ref(0);

function startResize(e: MouseEvent) {
  isResizing.value = true;
  resizeStartX.value = e.clientX;
  resizeStartWidth.value = layoutStore.explorerWidth;
  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', stopResize);
}

function handleResize(e: MouseEvent) {
  if (!isResizing.value) return;
  const diff = e.clientX - resizeStartX.value;
  layoutStore.setExplorerWidth(resizeStartWidth.value + diff);
}

function stopResize() {
  isResizing.value = false;
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
}

onUnmounted(() => {
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
});
</script>

<template>
  <div class="flex h-screen bg-background text-foreground overflow-hidden">
    <!-- Global Rail (48px) -->
    <GlobalRail />

    <!-- Project Explorer (240px, collapsible) -->
    <ProjectExplorer @edit-spec="$emit('edit-spec', $event)" />

    <!-- Resize Handle -->
    <div
      v-show="!layoutStore.explorerCollapsed"
      class="w-1 cursor-col-resize hover:bg-primary/20 transition-colors flex-shrink-0"
      :class="{ 'bg-primary/30': isResizing }"
      @mousedown="startResize"
    />

    <!-- Main Content Area -->
    <main class="flex-1 min-w-0 overflow-hidden flex flex-col">
      <slot />
    </main>
  </div>
</template>
