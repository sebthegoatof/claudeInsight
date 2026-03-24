import { defineStore } from 'pinia';
import { ref } from 'vue';
import { statsApi } from '../api/stats';
import type { DashboardOverview, RecentSession, McpServerInfo, GlobalTaskInfo, GlobalTodoInfo } from '../api/stats';

export const useDashboardStore = defineStore('dashboard', () => {
  const overview = ref<DashboardOverview | null>(null);
  const recentSessions = ref<RecentSession[]>([]);
  const mcpServers = ref<McpServerInfo[]>([]);
  const tasks = ref<GlobalTaskInfo[]>([]);
  const todos = ref<GlobalTodoInfo[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchOverview() {
    loading.value = true;
    error.value = null;
    try {
      const [overviewData, sessionsData, mcpData] = await Promise.all([
        statsApi.getOverview(),
        statsApi.getRecentSessions(10),
        statsApi.getMcpServers(),
      ]);
      overview.value = overviewData;
      recentSessions.value = sessionsData;
      mcpServers.value = mcpData;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load dashboard';
      console.error('Failed to fetch dashboard:', e);
    } finally {
      loading.value = false;
    }
  }

  async function fetchTasks() {
    try {
      tasks.value = await statsApi.getTasks();
    } catch (e) {
      console.error('Failed to fetch tasks:', e);
    }
  }

  async function fetchTodos() {
    try {
      todos.value = await statsApi.getTodos();
    } catch (e) {
      console.error('Failed to fetch todos:', e);
    }
  }

  return {
    overview,
    recentSessions,
    mcpServers,
    tasks,
    todos,
    loading,
    error,
    fetchOverview,
    fetchTasks,
    fetchTodos,
  };
});
