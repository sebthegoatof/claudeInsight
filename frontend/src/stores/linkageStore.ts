import { defineStore } from 'pinia';
import { ref } from 'vue';
import { linkageApi } from '../api/linkage';
import { fileHistoryApi } from '../api/backup';
import type { SessionLinks } from '../api/linkage';
import type { SessionFileHistory } from '../api/backup';

export const useLinkageStore = defineStore('linkage', () => {
  const currentLinks = ref<SessionLinks | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 文件历史数据（session 级别的完整版本信息）
  const sessionFileHistory = ref<SessionFileHistory | null>(null);

  // 当前打开的侧边栏面板
  const activePanel = ref<'skill' | 'agent' | 'mcp' | 'tasks' | null>(null);
  const activeItem = ref<string | null>(null);

  async function fetchSessionLinks(sessionId: string, projectPath: string) {
    loading.value = true;
    error.value = null;
    try {
      currentLinks.value = await linkageApi.getSessionLinks(sessionId, projectPath);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch links';
      currentLinks.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchSessionFileHistory(sessionId: string, projectPath: string) {
    try {
      sessionFileHistory.value = await fileHistoryApi.getSessionFileHistory(sessionId, projectPath);
    } catch {
      sessionFileHistory.value = null;
    }
  }

  function clearLinks() {
    currentLinks.value = null;
    sessionFileHistory.value = null;
    activePanel.value = null;
    activeItem.value = null;
  }

  function openPanel(panel: 'skill' | 'agent' | 'mcp' | 'tasks', item?: string) {
    activePanel.value = panel;
    activeItem.value = item || null;
  }

  function closePanel() {
    activePanel.value = null;
    activeItem.value = null;
  }

  return {
    currentLinks,
    loading,
    error,
    activePanel,
    activeItem,
    sessionFileHistory,
    fetchSessionLinks,
    fetchSessionFileHistory,
    clearLinks,
    openPanel,
    closePanel,
  };
});
