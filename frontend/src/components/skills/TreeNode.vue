<script setup lang="ts">
import { computed } from 'vue';
import type { SkillTreeNode } from '@/types/skill';
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  FilePlus,
  FolderPlus,
  Trash2,
} from 'lucide-vue-next';

const props = defineProps<{
  node: SkillTreeNode;
  level: number;
  expandedPaths: Set<string>;
  selectedPath: string | null;
}>();

const emit = defineEmits<{
  select: [node: SkillTreeNode];
  toggle: [path: string];
  create: [path: string, type: 'file' | 'directory'];
  delete: [path: string, name: string];
}>();

const isExpanded = computed(() => props.expandedPaths.has(props.node.path));
const isSelected = computed(() => props.selectedPath === props.node.path);

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

function handleSelect() {
  emit('select', props.node);
}

function handleToggle() {
  emit('toggle', props.node.path);
}

function handleCreate(type: 'file' | 'directory') {
  emit('create', props.node.path, type);
}

function handleDelete() {
  emit('delete', props.node.path, props.node.name);
}
</script>

<template>
  <div class="tree-node group" :class="{ 'bg-primary/10': isSelected }">
    <div
      class="flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer select-none hover:bg-muted/50 transition-colors"
      :style="{ paddingLeft: level * 12 + 8 + 'px' }"
      @click="handleSelect"
    >
      <!-- 展开/折叠图标 -->
      <ChevronRight
        v-if="node.type === 'directory' && !isExpanded"
        class="w-4 h-4 text-muted-foreground flex-shrink-0"
        @click.stop="handleToggle"
      />
      <ChevronDown
        v-else-if="node.type === 'directory'"
        class="w-4 h-4 text-muted-foreground flex-shrink-0"
        @click.stop="handleToggle"
      />
      <span v-else class="w-4 flex-shrink-0" />

      <!-- 文件夹图标 -->
      <FolderOpen
        v-if="node.type === 'directory' && isExpanded"
        class="w-4 h-4 text-amber-500 flex-shrink-0"
      />
      <Folder
        v-else-if="node.type === 'directory'"
        class="w-4 h-4 text-amber-500 flex-shrink-0"
      />

      <!-- 文件图标 -->
      <FileText
        v-else
        :class="['w-4 h-4 flex-shrink-0', getExtColor(node.name)]"
      />

      <!-- 名称 -->
      <span class="text-sm truncate flex-1">{{ node.name }}</span>

      <!-- 操作按钮 -->
      <div class="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
        <button
          v-if="node.type === 'directory'"
          @click.stop="handleCreate('file')"
          class="p-0.5 rounded hover:bg-muted"
          title="新建文件"
        >
          <FilePlus class="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button
          v-if="node.type === 'directory'"
          @click.stop="handleCreate('directory')"
          class="p-0.5 rounded hover:bg-muted"
          title="新建文件夹"
        >
          <FolderPlus class="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button
          @click.stop="handleDelete"
          class="p-0.5 rounded hover:bg-destructive/20"
          title="删除"
        >
          <Trash2 class="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
        </button>
      </div>
    </div>

    <!-- 子节点（递归） -->
    <div v-if="node.type === 'directory' && isExpanded && node.children">
      <TreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :level="level + 1"
        :expanded-paths="expandedPaths"
        :selected-path="selectedPath"
        @select="(n) => emit('select', n)"
        @toggle="(p) => emit('toggle', p)"
        @create="(p, t) => emit('create', p, t)"
        @delete="(p, n) => emit('delete', p, n)"
      />
    </div>
  </div>
</template>
