import { defineStore } from 'pinia';
import { ref } from 'vue';
import { historyApi } from '../api/history';
import { useLinkageStore } from './linkageStore';
import type { SessionInfo, SessionDetail, PaginatedResponse } from '../types/conversation';

export const useConversationStore = defineStore('conversation', () => {
  const sessions = ref<SessionInfo[]>([]);
  const currentSession = ref<SessionDetail | null>(null);
  const selectedSessionId = ref<string | null>(null);
  const pagination = ref<PaginatedResponse<SessionInfo>['pagination']>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const loading = ref(false);
  const detailLoading = ref(false);
  const error = ref<string | null>(null);

  // 视图模式: 'all' | 'project'
  const viewMode = ref<'all' | 'project'>('all');
  const currentProjectPath = ref<string | null>(null);

  // Project sessions (for sidebar)
  const projectSessions = ref<SessionInfo[]>([]);

  // 用于解决竞态条件的请求序列号
  let fetchRequestId = 0;
  let detailRequestId = 0;

  async function fetchTimeline(page = 1) {
    const requestId = ++fetchRequestId;
    loading.value = true;
    error.value = null;
    try {
      const response = await historyApi.getTimeline(page, pagination.value.pageSize, true);
      // 忽略过期响应
      if (requestId !== fetchRequestId) return;
      sessions.value = response.data;
      pagination.value = response.pagination;
      viewMode.value = 'all';
    } catch (e) {
      // 忽略过期响应的错误
      if (requestId !== fetchRequestId) return;
      error.value = e instanceof Error ? e.message : 'Failed to fetch timeline';
    } finally {
      // 只有最新请求才更新 loading 状态
      if (requestId === fetchRequestId) {
        loading.value = false;
      }
    }
  }

  async function fetchProjectSessions(encodedPath: string, page = 1) {
    const requestId = ++fetchRequestId;
    loading.value = true;
    error.value = null;
    try {
      const response = await historyApi.getProjectSessions(encodedPath, page, 100, true);
      // 忽略过期响应
      if (requestId !== fetchRequestId) return;
      projectSessions.value = response.data;
      sessions.value = response.data;
      pagination.value = response.pagination;
      currentProjectPath.value = encodedPath;
      viewMode.value = 'project';
    } catch (e) {
      // 忽略过期响应的错误
      if (requestId !== fetchRequestId) return;
      error.value = e instanceof Error ? e.message : 'Failed to fetch project sessions';
    } finally {
      // 只有最新请求才更新 loading 状态
      if (requestId === fetchRequestId) {
        loading.value = false;
      }
    }
  }

  async function fetchSession(sessionId: string, projectPath: string) {
    const requestId = ++detailRequestId;
    detailLoading.value = true;
    error.value = null;
    try {
      const response = await historyApi.getSession(sessionId, projectPath);
      // 忽略过期响应
      if (requestId !== detailRequestId) return;
      // 防御性解析：兼容旧版后端可能的双重序列化
      if (typeof response.messages === 'string') {
        response.messages = JSON.parse(response.messages);
      }
      currentSession.value = response;
      selectedSessionId.value = sessionId;

      // 同时获取联动信息和文件历史
      const linkageStore = useLinkageStore();
      linkageStore.fetchSessionLinks(sessionId, projectPath);
      linkageStore.fetchSessionFileHistory(sessionId, projectPath);
    } catch (e) {
      // 忽略过期响应的错误
      if (requestId !== detailRequestId) return;
      error.value = e instanceof Error ? e.message : 'Failed to fetch session';
    } finally {
      // 只有最新请求才更新 loading 状态
      if (requestId === detailRequestId) {
        detailLoading.value = false;
      }
    }
  }

  function selectSession(sessionId: string | null, projectPath?: string) {
    selectedSessionId.value = sessionId;
    if (sessionId && projectPath) {
      fetchSession(sessionId, projectPath);
    } else {
      currentSession.value = null;
    }
  }

  function clearCurrentSession() {
    currentSession.value = null;
    selectedSessionId.value = null;
    // 清除联动信息
    const linkageStore = useLinkageStore();
    linkageStore.clearLinks();
  }

  async function loadMore() {
    if (pagination.value.page >= pagination.value.totalPages) return;

    const requestId = ++fetchRequestId;
    const nextPage = pagination.value.page + 1;
    loading.value = true;
    error.value = null;

    try {
      let response;
      if (viewMode.value === 'project' && currentProjectPath.value) {
        response = await historyApi.getProjectSessions(currentProjectPath.value, nextPage, pagination.value.pageSize, true);
      } else {
        response = await historyApi.getTimeline(nextPage, pagination.value.pageSize, true);
      }
      // 忽略过期响应
      if (requestId !== fetchRequestId) return;
      sessions.value = [...sessions.value, ...response.data];
      pagination.value = response.pagination;
    } catch (e) {
      // 忽略过期响应的错误
      if (requestId !== fetchRequestId) return;
      error.value = e instanceof Error ? e.message : 'Failed to load more';
    } finally {
      // 只有最新请求才更新 loading 状态
      if (requestId === fetchRequestId) {
        loading.value = false;
      }
    }
  }

  /**
   * 按需加载完整的 tool-result 文件内容
   */
  async function fetchToolResult(filePath: string): Promise<string | null> {
    if (!currentSession.value) return null;
    try {
      const response = await historyApi.getToolResult(
        currentSession.value.sessionId,
        currentSession.value.projectPath,
        filePath
      );
      return response.content;
    } catch (e) {
      console.error('Failed to fetch tool result:', e);
      return null;
    }
  }

  return {
    sessions,
    currentSession,
    selectedSessionId,
    pagination,
    loading,
    detailLoading,
    error,
    viewMode,
    currentProjectPath,
    projectSessions,
    fetchTimeline,
    fetchProjectSessions,
    fetchSession,
    selectSession,
    clearCurrentSession,
    loadMore,
    fetchToolResult,
  };
});
