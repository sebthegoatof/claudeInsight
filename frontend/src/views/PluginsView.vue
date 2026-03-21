<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { skillsApi } from '@/api/skills';
import type { SkillTreeNode } from '@/types/skill';
import TreeNode from '@/components/skills/TreeNode.vue';
import {
  Zap,
  RefreshCw,
  FileText,
  FilePlus,
  FolderPlus,
  Save,
  AlertCircle,
  Check,
} from 'lucide-vue-next';

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

onMounted(async () => {
  await loadTree();
});

// 加载文件树
async function loadTree() {
  loading.value = true;
  error.value = null;
  try {
    const response = await skillsApi.getTree('global');
    treeData.value = response.tree;
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

// 刷新（重新加载文件树和当前文件）
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

// 选择文件并加载内容
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
    const response = await skillsApi.getFile(path, 'global');
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
      scope: 'global',
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

// 检查是否有未保存的更改
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
      scope: 'global',
    });

    if (response.success) {
      showCreateDialog.value = false;
      await loadTree();
      // 展开父目录
      if (createParentPath.value) {
        expandedPaths.value.add(createParentPath.value);
      }
      // 如果创建的是文件，自动选中
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
      scope: 'global',
    });

    if (response.success) {
      showDeleteConfirm.value = false;
      // 如果删除的是当前选中的文件，清空编辑器
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

// 计算文件扩展名颜色
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

// 计算选中文件的名称
const selectedFileName = computed(() => {
  if (!selectedPath.value) return '';
  return selectedPath.value.split('/').pop() || '';
});
</script>

<template>
  <div class="h-full flex overflow-hidden" @keydown="handleKeydown" tabindex="0">
    <!-- 左侧：文件树 -->
    <div class="w-72 flex-shrink-0 border-r border-border flex flex-col bg-muted/30">
      <!-- 头部 -->
      <div class="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div class="flex items-center gap-2">
          <Zap class="w-4 h-4 text-amber-500" />
          <span class="text-sm font-medium">全局技能</span>
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
            title="刷新列表"
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

      <!-- 文件树 -->
      <div class="flex-1 overflow-y-auto p-1">
        <!-- 加载中 -->
        <div v-if="loading" class="flex items-center justify-center py-8">
          <RefreshCw class="w-5 h-5 text-muted-foreground animate-spin" />
        </div>

        <!-- 错误 -->
        <div v-else-if="error && !treeData" class="p-4 text-center text-sm text-destructive">
          <AlertCircle class="w-5 h-5 mx-auto mb-2" />
          {{ error }}
        </div>

        <!-- 空状态 -->
        <div v-else-if="!treeData?.children?.length" class="p-4 text-center text-sm text-muted-foreground">
          <Zap class="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>暂无技能文件</p>
          <button
            @click="openCreateDialog('', 'file')"
            class="mt-2 text-primary hover:underline text-xs"
          >
            创建第一个技能
          </button>
        </div>

        <!-- 文件树节点（递归） -->
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
      <div v-if="selectedPath" class="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div class="flex items-center gap-2 min-w-0">
          <FileText :class="['w-4 h-4 flex-shrink-0', getExtColor(selectedFileName)]" />
          <span class="text-sm font-medium truncate">{{ selectedFileName }}</span>
          <span class="text-xs text-muted-foreground truncate">{{ selectedPath }}</span>
          <span v-if="hasUnsavedChanges()" class="text-xs text-amber-500 flex-shrink-0">未保存</span>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <span v-if="saveSuccess" class="flex items-center gap-1 text-xs text-green-500">
            <Check class="w-3.5 h-3.5" />
            已保存
          </span>
          <button
            @click="saveFile"
            :disabled="saving || !hasUnsavedChanges()"
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save class="w-4 h-4" />
            {{ saving ? '保存中...' : '保存 (⌘S)' }}
          </button>
        </div>
      </div>

      <!-- 编辑器内容 -->
      <div v-if="selectedPath" class="flex-1 overflow-hidden">
        <div v-if="fileLoading" class="h-full flex items-center justify-center">
          <RefreshCw class="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
        <textarea
          v-else
          v-model="fileContent"
          class="w-full h-full p-4 bg-background text-sm font-mono resize-none focus:outline-none"
          placeholder="文件内容..."
          spellcheck="false"
        />
      </div>

      <!-- 空状态 -->
      <div v-else class="flex-1 flex items-center justify-center">
        <div class="text-center">
          <div class="w-16 h-16 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <FileText class="w-8 h-8 text-muted-foreground" />
          </div>
          <p class="text-sm text-muted-foreground">选择一个文件进行编辑</p>
          <p class="text-xs text-muted-foreground mt-1">支持 .md, .txt, .js, .ts, .html 等文件格式</p>
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
        <div class="bg-card border border-border rounded-lg shadow-lg w-80 p-4">
          <h3 class="text-base font-semibold mb-4">
            新建{{ createType === 'directory' ? '文件夹' : '文件' }}
          </h3>
          <div class="space-y-3">
            <div>
              <label class="text-xs text-muted-foreground mb-1 block">名称</label>
              <input
                v-model="createName"
                type="text"
                :placeholder="createType === 'directory' ? '文件夹名称' : '文件名.md'"
                class="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                @keydown.enter="createNode"
                autofocus
              />
            </div>
            <div v-if="createParentPath" class="text-xs text-muted-foreground">
              位置: {{ createParentPath }}
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button
              @click="showCreateDialog = false"
              class="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-muted transition-colors"
            >
              取消
            </button>
            <button
              @click="createNode"
              :disabled="!createName.trim() || creating"
              class="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {{ creating ? '创建中...' : '创建' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 删除确认对话框 -->
    <Teleport to="body">
      <div
        v-if="showDeleteConfirm"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="showDeleteConfirm = false"
      >
        <div class="bg-card border border-border rounded-lg shadow-lg w-80 p-4">
          <h3 class="text-base font-semibold mb-2">确认删除</h3>
          <p class="text-sm text-muted-foreground mb-4">
            确定要删除 <strong class="text-foreground">{{ deleteName }}</strong> 吗？此操作不可撤销。
          </p>
          <div class="flex justify-end gap-2">
            <button
              @click="showDeleteConfirm = false"
              class="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-muted transition-colors"
            >
              取消
            </button>
            <button
              @click="deleteNode"
              :disabled="deleting"
              class="px-3 py-1.5 text-sm rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              {{ deleting ? '删除中...' : '删除' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
