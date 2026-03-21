import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useLayoutStore = defineStore('layout', () => {
  // Project Explorer state
  const explorerCollapsed = ref(false);
  const explorerWidth = ref(240);

  // Global search modal
  const globalSearchOpen = ref(false);

  // Current view context (使用 encodedPath 作为标识)
  const currentProjectId = ref<string | null>(null);
  const viewMode = ref<'all' | 'project'>('all');

  // Computed
  const isProjectView = computed(() => viewMode.value === 'project' && currentProjectId.value !== null);

  // Actions
  function toggleExplorer() {
    explorerCollapsed.value = !explorerCollapsed.value;
  }

  function setExplorerWidth(width: number) {
    explorerWidth.value = Math.max(180, Math.min(400, width));
  }

  function toggleGlobalSearch() {
    globalSearchOpen.value = !globalSearchOpen.value;
  }

  function setGlobalSearchOpen(open: boolean) {
    globalSearchOpen.value = open;
  }

  function setCurrentProject(projectId: string | null) {
    currentProjectId.value = projectId;
    viewMode.value = projectId !== null ? 'project' : 'all';
  }

  function resetView() {
    currentProjectId.value = null;
    viewMode.value = 'all';
  }

  return {
    // State
    explorerCollapsed,
    explorerWidth,
    globalSearchOpen,
    currentProjectId,
    viewMode,

    // Computed
    isProjectView,

    // Actions
    toggleExplorer,
    setExplorerWidth,
    toggleGlobalSearch,
    setGlobalSearchOpen,
    setCurrentProject,
    resetView,
  };
});
