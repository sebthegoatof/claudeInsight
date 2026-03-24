<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useSearchStore } from '../../stores/searchStore';
import { useConversationStore } from '../../stores/conversationStore';
import { useLayoutStore } from '../../stores/layoutStore';
import { Search, X, Loader2, FileText, Bot, Terminal, Sparkles } from 'lucide-vue-next';
import { useDebounceFn } from '@vueuse/core';
import type { SearchType } from '../../types/search';

const router = useRouter();
const searchStore = useSearchStore();
const conversationStore = useConversationStore();
const layoutStore = useLayoutStore();
const inputRef = ref<HTMLInputElement | null>(null);
const resultsContainerRef = ref<HTMLElement | null>(null);
const localQuery = ref('');
const selectedIndex = ref(0);

const debouncedSearch = useDebounceFn((query: string) => {
  searchStore.search(query);
  selectedIndex.value = 0;
}, 300);

watch(localQuery, (newQuery) => {
  if (newQuery.trim()) {
    debouncedSearch(newQuery);
  } else {
    searchStore.clearResults();
  }
});

// 滚动到选中项
function scrollToSelected() {
  nextTick(() => {
    if (!resultsContainerRef.value) return;
    const selectedEl = resultsContainerRef.value.querySelector(`[data-index="${selectedIndex.value}"]`);
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });
}

function handleKeydown(e: KeyboardEvent) {
  // 打开/关闭搜索
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    if (searchStore.isOpen) {
      closeSearch();
    } else {
      openSearch();
    }
  }

  // 关闭搜索
  if (e.key === 'Escape' && searchStore.isOpen) {
    closeSearch();
  }

  // 导航搜索结果
  if (searchStore.isOpen && searchStore.results.length > 0) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex.value = Math.min(
        selectedIndex.value + 1,
        searchStore.results.length - 1
      );
      scrollToSelected();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
      scrollToSelected();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const result = searchStore.results[selectedIndex.value];
      if (result) {
        selectResult(result);
      }
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

function openSearch() {
  searchStore.openSearch();
  nextTick(() => {
    inputRef.value?.focus();
  });
}

function closeSearch() {
  searchStore.closeSearch();
  localQuery.value = '';
  selectedIndex.value = 0;
  // 同步关闭外层模态框
  layoutStore.setGlobalSearchOpen(false);
}

async function selectResult(result: typeof searchStore.results[0]) {
  closeSearch();

  // 根据结果类型处理
  if (result.type === 'session' || !result.type) {
    // 会话结果 - 原有逻辑
    const encodedPath = encodeProjectPath(result.project_path);
    layoutStore.setCurrentProject(encodedPath);
    await conversationStore.fetchProjectSessions(encodedPath);
    conversationStore.selectSession(result.session_id, result.project_path);
  } else {
    // 资产结果 - 跳转到资产管理页
    router.push({
      path: '/assets',
      query: {
        type: result.type,
        id: result.assetId,
      },
    });
  }
}

function highlightSnippet(snippet: string) {
  return snippet
    .replace(/<<HIGHLIGHT>>/g, '<mark class="search-highlight">')
    .replace(/<<\/HIGHLIGHT>>/g, '</mark>');
}

function getProjectName(path: string) {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

// 编码项目路径（与后端 Claude CLI 编码规则一致）
function encodeProjectPath(path: string): string {
  return path.replace(/[^a-zA-Z0-9]/g, '-');
}

// 获取显示标题：优先使用 snippet（用户输入内容），其次才是 title
function getDisplayTitle(result: typeof searchStore.results[0]) {
  // 从 snippet 中提取纯文本（去除高亮标记）
  const cleanSnippet = result.snippet
    .replace(/<<HIGHLIGHT>>/g, '')
    .replace(/<<\/HIGHLIGHT>>/g, '')
    .trim();

  // 如果 snippet 有内容，使用它作为标题
  if (cleanSnippet) {
    // 截取前100个字符作为标题
    return cleanSnippet.length > 100 ? cleanSnippet.slice(0, 100) + '...' : cleanSnippet;
  }

  // 否则使用 title
  return result.title || '无标题会话';
}

// 获取类型图标
function getTypeIcon(type?: SearchType) {
  switch (type) {
    case 'agent':
      return Bot;
    case 'command':
      return Terminal;
    case 'skill':
      return Sparkles;
    default:
      return FileText;
  }
}

// 获取类型标签
function getTypeLabel(type?: SearchType) {
  switch (type) {
    case 'agent':
      return 'Agent';
    case 'command':
      return '命令';
    case 'skill':
      return '技能';
    case 'session':
      return '会话';
    default:
      return '会话';
  }
}

// 获取类型颜色
function getTypeColor(type?: SearchType) {
  switch (type) {
    case 'agent':
      return 'text-purple-500 bg-purple-500/10';
    case 'command':
      return 'text-emerald-500 bg-emerald-500/10';
    case 'skill':
      return 'text-primary bg-primary/10';
    default:
      return 'text-muted-foreground bg-muted';
  }
}

// 计算结果数量文本
const resultText = computed(() => {
  const total = searchStore.pagination?.total || 0;
  if (total === 0) return '无结果';
  if (total === 1) return '1 个结果';
  return `${total} 个结果`;
});

// 暴露 openSearch 方法供外部调用
defineExpose({
  openSearch,
  closeSearch
});
</script>

<template>
  <!-- 搜索模态框 -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-200"
      leave-active-class="transition-all duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="searchStore.isOpen"
        class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      >
        <!-- 背景遮罩 -->
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="closeSearch"
        />

        <!-- 搜索面板 -->
        <Transition
          enter-active-class="transition-all duration-200"
          leave-active-class="transition-all duration-150"
          enter-from-class="opacity-0 scale-95 -translate-y-4"
          leave-to-class="opacity-0 scale-95 -translate-y-4"
        >
          <div
            v-if="searchStore.isOpen"
            class="relative w-full max-w-xl bg-card rounded-xl border border-border shadow-2xl overflow-hidden"
          >
            <!-- 输入框 -->
            <div class="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search class="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <input
                ref="inputRef"
                v-model="localQuery"
                type="text"
                placeholder="搜索会话、技能、Agent、命令..."
                class="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
              <Loader2
                v-if="searchStore.loading"
                class="w-4 h-4 animate-spin text-muted-foreground"
              />
              <button
                v-if="localQuery"
                @click="localQuery = ''; searchStore.clearResults()"
                class="p-1 rounded hover:bg-muted transition-colors"
              >
                <X class="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <!-- 搜索结果 -->
            <div class="max-h-[60vh] overflow-y-auto">
              <!-- 无结果 -->
              <div
                v-if="searchStore.results.length === 0 && localQuery && !searchStore.loading"
                class="py-12 text-center"
              >
                <div class="w-12 h-12 mx-auto rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                  <Search class="w-6 h-6 text-muted-foreground" />
                </div>
                <p class="text-sm text-muted-foreground">未找到相关内容</p>
                <p class="text-xs text-muted-foreground mt-1">尝试其他关键词</p>
              </div>

              <!-- 初始提示 -->
              <div
                v-else-if="searchStore.results.length === 0"
                class="py-12 text-center"
              >
                <div class="w-12 h-12 mx-auto rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                  <FileText class="w-6 h-6 text-muted-foreground" />
                </div>
                <p class="text-sm text-muted-foreground">输入关键词搜索</p>
                <p class="text-xs text-muted-foreground mt-1">支持会话、技能、Agent、命令</p>
              </div>

              <!-- 结果列表 -->
              <div v-else>
                <div class="px-4 py-2 border-b border-border bg-muted/30">
                  <span class="text-xs text-muted-foreground">{{ resultText }}</span>
                </div>
                <div ref="resultsContainerRef" class="py-1">
                  <button
                    v-for="(result, index) in searchStore.results"
                    :key="`${result.type}-${result.id}`"
                    :data-index="index"
                    @click="selectResult(result)"
                    @mouseenter="selectedIndex = index"
                    :class="[
                      'w-full px-4 py-3 text-left transition-colors',
                      index === selectedIndex ? 'bg-primary/10' : 'hover:bg-muted',
                    ]"
                  >
                    <div class="flex items-start gap-3">
                      <component
                        :is="getTypeIcon(result.type)"
                        class="w-4 h-4 mt-0.5 flex-shrink-0"
                        :class="result.type ? getTypeColor(result.type).split(' ')[0] : 'text-muted-foreground'"
                      />
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                          <span class="text-sm font-medium truncate">
                            {{ getDisplayTitle(result) }}
                          </span>
                          <span
                            v-if="result.type && result.type !== 'session'"
                            class="text-[10px] px-1.5 py-0.5 rounded"
                            :class="getTypeColor(result.type)"
                          >
                            {{ getTypeLabel(result.type) }}
                          </span>
                        </div>
                        <div
                          v-if="result.title && getDisplayTitle(result) !== result.title"
                          class="text-xs text-muted-foreground mt-1 line-clamp-2"
                          v-html="highlightSnippet(result.snippet)"
                        />
                        <div class="text-xs text-muted-foreground/60 mt-1">
                          <template v-if="result.type === 'session' || !result.type">
                            {{ getProjectName(result.project_path) }}
                          </template>
                          <template v-else-if="result.assetCategory">
                            {{ result.assetCategory }}
                          </template>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <!-- 底部提示 -->
            <div
              v-if="searchStore.results.length > 0"
              class="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground"
            >
              <div class="flex items-center gap-3">
                <span class="flex items-center gap-1">
                  <kbd class="px-1 py-0.5 bg-muted rounded">↑</kbd>
                  <kbd class="px-1 py-0.5 bg-muted rounded">↓</kbd>
                  导航
                </span>
                <span class="flex items-center gap-1">
                  <kbd class="px-1 py-0.5 bg-muted rounded">↵</kbd>
                  选择
                </span>
              </div>
              <span class="flex items-center gap-1">
                <kbd class="px-1 py-0.5 bg-muted rounded">Esc</kbd>
                关闭
              </span>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.search-highlight {
  @apply bg-primary/30 text-primary px-0.5 rounded;
}
</style>
