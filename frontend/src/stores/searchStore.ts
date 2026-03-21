import { defineStore } from 'pinia';
import { ref } from 'vue';
import { historyApi } from '../api/history';
import type { SearchResult } from '../types/search';

export const useSearchStore = defineStore('search', () => {
  const query = ref('');
  const results = ref<SearchResult[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isOpen = ref(false);
  const pagination = ref({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  async function search(searchQuery: string, page = 1) {
    if (!searchQuery.trim()) {
      results.value = [];
      return;
    }

    query.value = searchQuery;
    loading.value = true;
    error.value = null;

    try {
      const response = await historyApi.search(searchQuery, page, pagination.value.pageSize);
      results.value = response.data;
      pagination.value = response.pagination;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Search failed';
    } finally {
      loading.value = false;
    }
  }

  function openSearch() {
    isOpen.value = true;
  }

  function closeSearch() {
    isOpen.value = false;
  }

  function clearResults() {
    results.value = [];
    query.value = '';
    pagination.value = {
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    };
  }

  return {
    query,
    results,
    loading,
    error,
    isOpen,
    pagination,
    search,
    openSearch,
    closeSearch,
    clearResults,
  };
});
