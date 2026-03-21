import { ref, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { useSearchStore } from '../stores/searchStore';

export function useSearch(debounceMs = 300) {
  const searchStore = useSearchStore();
  const localQuery = ref('');

  const debouncedSearch = useDebounceFn((query: string) => {
    searchStore.search(query);
  }, debounceMs);

  watch(localQuery, (newQuery) => {
    if (newQuery.trim()) {
      debouncedSearch(newQuery);
    } else {
      searchStore.clearResults();
    }
  });

  return {
    query: localQuery,
    results: searchStore.results,
    loading: searchStore.loading,
    error: searchStore.error,
  };
}
