<script setup lang="ts">
import { ref, computed } from 'vue';
import { useConversationStore } from '../../stores/conversationStore';
import { useLayoutStore } from '../../stores/layoutStore';
import { useProjectStore } from '../../stores/projectStore';
import { historyApi } from '../../api/history';
import ConversationItem from './ConversationItem.vue';
import {
  Loader2,
  Inbox,
  ArrowDown,
  Download,
  Upload,
  Square,
  CheckSquare,
  X,
  FileArchive,
} from 'lucide-vue-next';

const conversationStore = useConversationStore();
const layoutStore = useLayoutStore();
const projectStore = useProjectStore();

const listContainer = ref<HTMLElement | null>(null);
const showScrollButton = ref(false);

// 多选状态
const selectionMode = ref(false);
const selectedSessionIds = ref<Set<string>>(new Set());

// 导入导出状态
const importDialogOpen = ref(false);
const importFile = ref<File | null>(null);
const importTargetProject = ref('');
const importLoading = ref(false);
const exportLoading = ref(false);

// 监听滚动
function handleScroll(e: Event) {
  const target = e.target as HTMLElement;
  const { scrollTop, scrollHeight, clientHeight } = target;

  // 显示/隐藏滚动按钮
  showScrollButton.value = scrollTop > 200;

  // 无限滚动加载更多
  if (scrollHeight - scrollTop - clientHeight < 300 && !conversationStore.loading) {
    conversationStore.loadMore();
  }
}

function selectConversation(session: { sessionId: string; projectPath: string }) {
  // 直接使用 session 自身的 projectPath，在"全部会话"模式下也能正确加载
  conversationStore.selectSession(session.sessionId, session.projectPath);
}

function scrollToTop() {
  listContainer.value?.scrollTo({ top: 0, behavior: 'smooth' });
}

// 当前选中的项目
const currentProject = computed(() => {
  if (!layoutStore.currentProjectId) return null;
  return projectStore.projects.find((p) => p.encodedPath === layoutStore.currentProjectId) || null;
});

// 标题
const listTitle = computed(() => {
  if (layoutStore.viewMode === 'all') {
    return '全部会话';
  }
  return currentProject.value?.name || '项目会话';
});

// 是否全选
const isAllSelected = computed(() => {
  return (
    conversationStore.sessions.length > 0 &&
    conversationStore.sessions.every((s) => selectedSessionIds.value.has(s.sessionId))
  );
});

// 是否有选中项
const hasSelection = computed(() => selectedSessionIds.value.size > 0);

// 选中数量
const selectionCount = computed(() => selectedSessionIds.value.size);

// 进入/退出选择模式
function toggleSelectionMode() {
  selectionMode.value = !selectionMode.value;
  if (!selectionMode.value) {
    selectedSessionIds.value.clear();
  }
}

// 切换全选
function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedSessionIds.value.clear();
  } else {
    conversationStore.sessions.forEach((s) => {
      selectedSessionIds.value.add(s.sessionId);
    });
  }
}

// 切换单个选中
function toggleSessionCheck(sessionId: string) {
  if (selectedSessionIds.value.has(sessionId)) {
    selectedSessionIds.value.delete(sessionId);
  } else {
    selectedSessionIds.value.add(sessionId);
  }
}

// 检查会话是否被选中
function isSessionSelected(sessionId: string) {
  return selectedSessionIds.value.has(sessionId);
}

// 导出当前项目全部会话
async function exportAllSessions() {
  if (!currentProject.value) {
    alert('请先选择一个项目');
    return;
  }

  exportLoading.value = true;
  try {
    await historyApi.exportSessions(currentProject.value.path, ['all']);
  } catch (error) {
    console.error('Export failed:', error);
    alert(error instanceof Error ? error.message : '导出失败');
  } finally {
    exportLoading.value = false;
  }
}

// 导出选中会话
async function exportSelectedSessions() {
  if (!currentProject.value) {
    alert('请先选择一个项目');
    return;
  }

  if (!hasSelection.value) {
    alert('请先选择要导出的会话');
    return;
  }

  exportLoading.value = true;
  try {
    await historyApi.exportSessions(currentProject.value.path, Array.from(selectedSessionIds.value));
    // 导出成功后退出选择模式
    selectionMode.value = false;
    selectedSessionIds.value.clear();
  } catch (error) {
    console.error('Export failed:', error);
    alert(error instanceof Error ? error.message : '导出失败');
  } finally {
    exportLoading.value = false;
  }
}

// 打开导入对话框
function openImportDialog() {
  importFile.value = null;
  importTargetProject.value = currentProject.value?.encodedPath || '';
  importDialogOpen.value = true;
}

// 处理文件选择
function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    importFile.value = target.files[0];
  }
}

// 执行导入
async function doImport() {
  if (!importFile.value) {
    alert('请选择要导入的 ZIP 文件');
    return;
  }

  if (!importTargetProject.value) {
    alert('请选择目标项目');
    return;
  }

  importLoading.value = true;
  try {
    const result = await historyApi.importSessions(importFile.value, importTargetProject.value);
    alert(result.message);
    importDialogOpen.value = false;
    // 刷新会话列表
    if (layoutStore.viewMode === 'project') {
      await conversationStore.fetchProjectSessions(importTargetProject.value);
    } else {
      await conversationStore.fetchTimeline();
    }
    // 刷新项目列表
    await projectStore.fetchProjects();
  } catch (error) {
    console.error('Import failed:', error);
    alert(error instanceof Error ? error.message : '导入失败');
  } finally {
    importLoading.value = false;
  }
}

// 可导入的项目列表
const availableProjects = computed(() => {
  return projectStore.projects;
});
</script>

<template>
  <div class="flex flex-col h-full relative">
    <!-- 头部 -->
    <div class="px-4 py-3 border-b border-border bg-muted/20">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-sm font-semibold">
            {{ listTitle }}
          </h2>
          <p class="text-xs text-muted-foreground mt-0.5">
            共 {{ conversationStore.pagination.total }} 个会话
          </p>
        </div>

        <!-- 导入导出按钮组 -->
        <div class="flex items-center gap-1">
          <!-- 选择模式切换 -->
          <button
            v-if="layoutStore.viewMode === 'project' && currentProject"
            @click="toggleSelectionMode"
            :class="[
              'p-1.5 rounded-md transition-colors',
              selectionMode
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-muted-foreground hover:text-foreground',
            ]"
            :title="selectionMode ? '退出选择' : '多选'"
          >
            <CheckSquare v-if="selectionMode" class="w-4 h-4" />
            <Square v-else class="w-4 h-4" />
          </button>

          <!-- 导出按钮 -->
          <button
            v-if="layoutStore.viewMode === 'project' && currentProject"
            @click="selectionMode ? exportSelectedSessions() : exportAllSessions()"
            :disabled="exportLoading || (selectionMode && !hasSelection)"
            :class="[
              'p-1.5 rounded-md transition-colors',
              exportLoading || (selectionMode && !hasSelection)
                ? 'opacity-50 cursor-not-allowed text-muted-foreground'
                : 'hover:bg-muted text-muted-foreground hover:text-foreground',
            ]"
            :title="selectionMode ? `导出选中 (${selectionCount})` : '导出全部'"
          >
            <Download v-if="!exportLoading" class="w-4 h-4" />
            <Loader2 v-else class="w-4 h-4 animate-spin" />
          </button>

          <!-- 导入按钮 -->
          <button
            @click="openImportDialog"
            class="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="导入会话"
          >
            <Upload class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- 选择模式下的操作栏 -->
      <div
        v-if="selectionMode"
        class="flex items-center justify-between mt-2 pt-2 border-t border-border"
      >
        <button
          @click="toggleSelectAll"
          class="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <CheckSquare class="w-3 h-3" />
          {{ isAllSelected ? '取消全选' : '全选' }}
        </button>
        <span class="text-xs text-muted-foreground">
          已选 {{ selectionCount }} 项
        </span>
      </div>
    </div>

    <!-- 列表 -->
    <div
      ref="listContainer"
      class="flex-1 overflow-y-auto"
      @scroll="handleScroll"
    >
      <!-- 空状态 -->
      <div
        v-if="conversationStore.sessions.length === 0 && !conversationStore.loading"
        class="py-16 px-4 text-center"
      >
        <div class="w-16 h-16 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <Inbox class="w-8 h-8 text-muted-foreground" />
        </div>
        <p class="text-sm text-muted-foreground">暂无会话记录</p>
        <p class="text-xs text-muted-foreground mt-1">点击左侧"扫描历史"开始</p>
      </div>

      <!-- 会话列表 -->
      <div v-else class="divide-y divide-border">
        <ConversationItem
          v-for="session in conversationStore.sessions"
          :key="session.sessionId"
          :conversation="session"
          :is-active="conversationStore.selectedSessionId === session.sessionId"
          :show-checkbox="selectionMode"
          :checked="isSessionSelected(session.sessionId)"
          @click="selectionMode ? toggleSessionCheck(session.sessionId) : selectConversation(session)"
          @toggle-check="toggleSessionCheck(session.sessionId)"
        />
      </div>

      <!-- 加载更多指示器 -->
      <div
        v-if="conversationStore.loading && conversationStore.sessions.length > 0"
        class="py-4 flex justify-center"
      >
        <Loader2 class="w-5 h-5 animate-spin text-muted-foreground" />
      </div>

      <!-- 加载更多触发区域 -->
      <div
        v-if="conversationStore.pagination.page < conversationStore.pagination.totalPages"
        class="h-20"
      />
    </div>

    <!-- 初始加载 -->
    <div
      v-if="conversationStore.loading && conversationStore.sessions.length === 0"
      class="absolute inset-0 flex items-center justify-center bg-background/80"
    >
      <div class="flex flex-col items-center gap-3">
        <Loader2 class="w-6 h-6 animate-spin text-primary" />
        <span class="text-sm text-muted-foreground">加载中...</span>
      </div>
    </div>

    <!-- 滚动到顶部按钮 -->
    <Transition
      enter-active-class="transition-all duration-200"
      leave-active-class="transition-all duration-200"
      enter-from-class="opacity-0 translate-y-2"
      leave-to-class="opacity-0 translate-y-2"
    >
      <button
        v-if="showScrollButton"
        @click="scrollToTop"
        class="absolute bottom-4 right-4 p-2 rounded-full bg-card border border-border shadow-lg hover:bg-muted transition-colors"
      >
        <ArrowDown class="w-4 h-4 rotate-180" />
      </button>
    </Transition>

    <!-- 导入对话框 -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="importDialogOpen"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          @click.self="importDialogOpen = false"
        >
          <div
            class="bg-card border border-border rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
          >
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold flex items-center gap-2">
                <FileArchive class="w-5 h-5" />
                导入会话
              </h3>
              <button
                @click="importDialogOpen = false"
                class="p-1 rounded hover:bg-muted transition-colors"
              >
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="space-y-4">
              <!-- 文件选择 -->
              <div>
                <label class="block text-sm font-medium mb-2">
                  选择 ZIP 文件
                </label>
                <input
                  type="file"
                  accept=".zip"
                  @change="handleFileSelect"
                  class="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                />
                <p v-if="importFile" class="text-xs text-muted-foreground mt-1">
                  已选择: {{ importFile.name }}
                </p>
              </div>

              <!-- 目标项目选择 -->
              <div>
                <label class="block text-sm font-medium mb-2">
                  目标项目
                </label>
                <select
                  v-model="importTargetProject"
                  class="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="" disabled>请选择目标项目</option>
                  <option
                    v-for="project in availableProjects"
                    :key="project.encodedPath"
                    :value="project.encodedPath"
                  >
                    {{ project.name }}
                  </option>
                </select>
              </div>

              <!-- 提示信息 -->
              <p class="text-xs text-muted-foreground">
                注意：导入时如果存在同名文件将会被覆盖
              </p>
            </div>

            <!-- 操作按钮 -->
            <div class="flex justify-end gap-3 mt-6">
              <button
                @click="importDialogOpen = false"
                class="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted transition-colors"
              >
                取消
              </button>
              <button
                @click="doImport"
                :disabled="!importFile || !importTargetProject || importLoading"
                :class="[
                  'px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground transition-colors',
                  !importFile || !importTargetProject || importLoading
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-primary/90',
                ]"
              >
                <span v-if="importLoading" class="flex items-center gap-2">
                  <Loader2 class="w-4 h-4 animate-spin" />
                  导入中...
                </span>
                <span v-else>确认导入</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
