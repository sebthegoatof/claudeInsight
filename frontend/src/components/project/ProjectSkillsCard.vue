<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { skillsApi } from '@/api/skills';
import type { SkillTreeNode } from '@/types/skill';
import type { Project } from '@/types/project';
import TreeNode from '@/components/skills/TreeNode.vue';
import {
  Zap,
  RefreshCw,
  FileText,
  FilePlus,
  FolderPlus,
  Save,
  Check,
} from 'lucide-vue-next';

const props = defineProps<{
  project: Project;
}>();

// 状态
const treeData = ref<SkillTreeNode | null>(null);
const loading = ref(true);
const expandedPaths = ref<Set<string>>(new Set());
const selectedPath = ref<string | null>(null);
const fileContent = ref<string>('');
const originalContent = ref<string>('');
const fileLoading = ref(false);
const saving = ref(false);
const saveSuccess = ref(false);
const error = ref<string | null>(null);

// 新建对话框
const showCreateDialog = ref(false);
const createParentPath = ref('');
const createType = ref<'file' | 'directory'>('file');
const createName = ref('');
const creating = ref(false);

// 删除确认
const showDeleteConfirm = ref(false);
const deletePath = ref('');
const deleteName = ref('');
const deleting = ref(false);

// 加载文件树
async function loadTree() {
  loading.value = true;
  error.value = null;
  try {
    const response = await skillsApi.getTree('project', props.project.path);
    treeData.value = response.tree;
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

// 刷新
async function refresh() {
  const currentPath = selectedPath.value;
  await loadTree();
  if (currentPath) {
    await loadFile(currentPath);
  }
}

// 切换文件夹展开状态
function toggleExpand(path: string) {
  if (expandedPaths.value.has(path)) {
    expandedPaths.value.delete(path);
  } else {
    expandedPaths.value.add(path);
  }
}

// 选择文件
async function selectFile(node: SkillTreeNode) {
  if (node.type === 'file') {
    selectedPath.value = node.path;
    await loadFile(node.path);
  } else {
    toggleExpand(node.path);
  }
}

// 加载文件内容
async function loadFile(path: string) {
  fileLoading.value = true;
  try {
    const response = await skillsApi.getFile(path, 'project', props.project.path);
    fileContent.value = response.content;
    originalContent.value = response.content;
  } catch (e) {
    fileContent.value = '';
    originalContent.value = '';
    error.value = e instanceof Error ? e.message : '加载文件失败';
  } finally {
    fileLoading.value = false;
  }
}

// 保存文件
async function saveFile() {
  if (!selectedPath.value) return;

  saving.value = true;
  saveSuccess.value = false;
  try {
    await skillsApi.saveFile({
      path: selectedPath.value,
      content: fileContent.value,
      scope: 'project',
      projectPath: props.project.path,
    });
    originalContent.value = fileContent.value;
    saveSuccess.value = true;
    setTimeout(() => {
      saveSuccess.value = false;
    }, 2000);
  } catch (e) {
    error.value = e instanceof Error ? e.message : '保存失败';
  } finally {
    saving.value = false;
  }
}

// 检查未保存更改
function hasUnsavedChanges(): boolean {
  return fileContent.value !== originalContent.value;
}

// 键盘快捷键
function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    if (hasUnsavedChanges()) {
      saveFile();
    }
  }
}

// 打开新建对话框
function openCreateDialog(parentPath: string, type: 'file' | 'directory') {
  createParentPath.value = parentPath;
  createType.value = type;
  createName.value = '';
  showCreateDialog.value = true;
}

// 创建节点
async function createNode() {
  if (!createName.value.trim()) return;

  creating.value = true;
  try {
    const response = await skillsApi.createNode({
      parentPath: createParentPath.value,
      name: createName.value.trim(),
      type: createType.value,
      scope: 'project',
      projectPath: props.project.path,
    });

    if (response.success) {
      showCreateDialog.value = false;
      await loadTree();
      if (createParentPath.value) {
        expandedPaths.value.add(createParentPath.value);
      }
      if (createType.value === 'file' && response.path) {
        selectedPath.value = response.path;
        await loadFile(response.path);
      }
    } else {
      error.value = response.error || '创建失败';
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '创建失败';
  } finally {
    creating.value = false;
  }
}

// 打开删除确认
function openDeleteConfirm(path: string, name: string) {
  deletePath.value = path;
  deleteName.value = name;
  showDeleteConfirm.value = true;
}

// 删除节点
async function deleteNode() {
  deleting.value = true;
  try {
    const response = await skillsApi.deleteNode({
      path: deletePath.value,
      scope: 'project',
      projectPath: props.project.path,
    });

    if (response.success) {
      showDeleteConfirm.value = false;
      if (selectedPath.value === deletePath.value) {
        selectedPath.value = null;
        fileContent.value = '';
        originalContent.value = '';
      }
      await loadTree();
    } else {
      error.value = response.error || '删除失败';
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '删除失败';
  } finally {
    deleting.value = false;
  }
}

// 文件扩展名颜色
function getExtColor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'md': return 'text-blue-400';
    case 'txt': return 'text-gray-400';
    case 'js':
    case 'mjs':
    case 'cjs': return 'text-yellow-400';
    case 'ts': return 'text-blue-500';
    case 'json': return 'text-green-400';
    case 'html': return 'text-orange-400';
    case 'css': return 'text-purple-400';
    default: return 'text-gray-400';
  }
}

// 计算选中文件名
const selectedFileName = computed(() => {
  if (!selectedPath.value) return '';
  return selectedPath.value.split('/').pop() || '';
});

// 计算文件数量
const fileCount = computed(() => {
  function countFiles(nodes: SkillTreeNode[]): number {
    let count = 0;
    for (const node of nodes) {
      if (node.type === 'file') count++;
      if (node.children) count += countFiles(node.children);
    }
    return count;
  }
  return treeData.value?.children ? countFiles(treeData.value.children) : 0;
});

// 监听项目变化
watch(
  () => props.project.path,
  () => {
    // 重置编辑器状态
    selectedPath.value = null;
    fileContent.value = '';
    originalContent.value = '';
    expandedPaths.value = new Set();
    // 重新加载文件树
    loadTree();
  },
  { immediate: true }
);
</script>

<template>
  <div class="bg-card border border-border rounded-lg overflow-hidden h-[500px] flex flex-col" @keydown="handleKeydown" tabindex="0">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
      <div class="flex items-center gap-2">
        <Zap class="w-4 h-4 text-amber-500" />
        <span class="text-sm font-medium">项目技能</span>
        <span class="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {{ fileCount }} 文件
        </span>
      </div>
      <div class="flex items-center gap-1">
        <button
          @click="openCreateDialog('', 'directory')"
          class="p-1 rounded hover:bg-muted transition-colors"
          title="新建文件夹"
        >
          <FolderPlus class="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          @click="openCreateDialog('', 'file')"
          class="p-1 rounded hover:bg-muted transition-colors"
          title="新建文件"
        >
          <FilePlus class="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          @click="refresh"
          :disabled="loading"
          class="p-1 rounded hover:bg-muted transition-colors"
          title="刷新"
        >
          <RefreshCw
            :class="[
              'w-4 h-4 text-muted-foreground',
              { 'animate-spin': loading },
            ]"
          />
        </button>
      </div>
    </div>

    <!-- Content: 左右分栏 -->
    <div class="flex-1 flex overflow-hidden">
      <!-- 左侧：文件树 -->
      <div class="w-48 flex-shrink-0 border-r border-border flex flex-col bg-muted/30">
        <div class="flex-1 overflow-y-auto p-1">
          <!-- 加载中 -->
          <div v-if="loading" class="flex items-center justify-center py-8">
            <RefreshCw class="w-4 h-4 text-muted-foreground animate-spin" />
          </div>

          <!-- 空状态 -->
          <div v-else-if="!treeData?.children?.length" class="p-4 text-center text-xs text-muted-foreground">
            <Zap class="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p>暂无技能文件</p>
            <button
              @click="openCreateDialog('', 'file')"
              class="mt-2 text-primary hover:underline"
            >
              创建第一个
            </button>
          </div>

          <!-- 文件树 -->
          <template v-else>
            <TreeNode
              v-for="node in treeData?.children || []"
              :key="node.path"
              :node="node"
              :level="0"
              :expanded-paths="expandedPaths"
              :selected-path="selectedPath"
              @select="selectFile"
              @toggle="toggleExpand"
              @create="openCreateDialog"
              @delete="openDeleteConfirm"
            />
          </template>
        </div>
      </div>

      <!-- 右侧：编辑器 -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- 工具栏 -->
        <div v-if="selectedPath" class="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30 flex-shrink-0">
          <div class="flex items-center gap-2 min-w-0">
            <FileText :class="['w-3.5 h-3.5 flex-shrink-0', getExtColor(selectedFileName)]" />
            <span class="text-xs font-medium truncate">{{ selectedFileName }}</span>
            <span v-if="hasUnsavedChanges()" class="text-[10px] text-amber-500 flex-shrink-0">未保存</span>
          </div>
          <div class="flex items-center gap-1 flex-shrink-0">
            <span v-if="saveSuccess" class="flex items-center gap-1 text-[10px] text-green-500">
              <Check class="w-3 h-3" />
              已保存
            </span>
            <button
              @click="saveFile"
              :disabled="saving || !hasUnsavedChanges()"
              class="flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Save class="w-3 h-3" />
              保存
            </button>
          </div>
        </div>

        <!-- 编辑器 -->
        <div v-if="selectedPath" class="flex-1 overflow-hidden">
          <div v-if="fileLoading" class="h-full flex items-center justify-center">
            <RefreshCw class="w-4 h-4 text-muted-foreground animate-spin" />
          </div>
          <textarea
            v-else
            v-model="fileContent"
            class="w-full h-full p-3 bg-background text-xs font-mono resize-none focus:outline-none"
            placeholder="文件内容..."
            spellcheck="false"
          />
        </div>

        <!-- 空状态 -->
        <div v-else class="flex-1 flex items-center justify-center">
          <div class="text-center">
            <FileText class="w-8 h-8 mx-auto text-muted-foreground mb-2 opacity-50" />
            <p class="text-xs text-muted-foreground">选择文件进行编辑</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 新建对话框 -->
    <Teleport to="body">
      <div
        v-if="showCreateDialog"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="showCreateDialog = false"
      >
        <div class="bg-card border border-border rounded-lg shadow-lg w-72 p-4">
          <h3 class="text-sm font-semibold mb-3">
            新建{{ createType === 'directory' ? '文件夹' : '文件' }}
          </h3>
          <div>
            <input
              v-model="createName"
              type="text"
              :placeholder="createType === 'directory' ? '文件夹名称' : '文件名.md'"
              class="w-full px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              @keydown.enter="createNode"
              autofocus
            />
          </div>
          <div class="flex justify-end gap-2 mt-3">
            <button
              @click="showCreateDialog = false"
              class="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors"
            >
              取消
            </button>
            <button
              @click="createNode"
              :disabled="!createName.trim() || creating"
              class="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {{ creating ? '创建中...' : '创建' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 删除确认 -->
    <Teleport to="body">
      <div
        v-if="showDeleteConfirm"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="showDeleteConfirm = false"
      >
        <div class="bg-card border border-border rounded-lg shadow-lg w-72 p-4">
          <h3 class="text-sm font-semibold mb-2">确认删除</h3>
          <p class="text-xs text-muted-foreground mb-3">
            确定删除 <strong class="text-foreground">{{ deleteName }}</strong>？
          </p>
          <div class="flex justify-end gap-2">
            <button
              @click="showDeleteConfirm = false"
              class="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors"
            >
              取消
            </button>
            <button
              @click="deleteNode"
              :disabled="deleting"
              class="px-3 py-1.5 text-xs rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              {{ deleting ? '删除中...' : '删除' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
