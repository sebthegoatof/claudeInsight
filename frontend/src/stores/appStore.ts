import { defineStore } from 'pinia';
import { ref } from 'vue';
import { historyApi } from '../api/history';
import { api } from '../api/index';

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false);
  const stats = ref({
    totalConversations: 0,
    totalProjects: 0,
    totalMessages: 0,
    // Token 统计
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheHitTokens: 0,
    cacheCreationTokens: 0,
  });

  const scanning = ref(false);

  async function fetchStats() {
    try {
      const data = await historyApi.getStats();
      stats.value = {
        totalConversations: data.totalConversations,
        totalProjects: data.totalProjects,
        totalMessages: data.totalMessages || 0,
        // Token 统计
        totalTokens: data.totalTokens || 0,
        inputTokens: data.inputTokens || 0,
        outputTokens: data.outputTokens || 0,
        cacheHitTokens: data.cacheHitTokens || 0,
        cacheCreationTokens: data.cacheCreationTokens || 0,
      };
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    }
  }

  async function scanHistory() {
    scanning.value = true;
    try {
      await api.post('/api/history/scan');
      await fetchStats();
    } catch (e) {
      console.error('Failed to scan history:', e);
    } finally {
      scanning.value = false;
    }
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }

  return {
    sidebarCollapsed,
    stats,
    fetchStats,
    scanHistory,
    toggleSidebar,
    scanning,
  };
});
