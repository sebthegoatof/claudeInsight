<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAssetStore } from '@/stores/assetStore';
import { Palette, Plus, FileText, Trash2, ChevronRight, Save, X } from 'lucide-vue-next';

const assetStore = useAssetStore();

const selectedStyle = ref<string | null>(null);
const editingContent = ref('');
const isNewStyle = ref(false);
const newStyleName = ref('');

onMounted(() => {
  assetStore.fetchStyles();
});

async function selectStyle(style: typeof assetStore.styles[0]) {
  isNewStyle.value = false;
  selectedStyle.value = style.name;
  const detail = await assetStore.getStyle(style.name);
  if (detail) {
    editingContent.value = detail.content;
  }
}

function closeEditor() {
  selectedStyle.value = null;
  editingContent.value = '';
  isNewStyle.value = false;
  newStyleName.value = '';
}

async function saveStyle() {
  if (isNewStyle.value) {
    if (!newStyleName.value.trim()) return;
    const success = await assetStore.saveStyle(newStyleName.value.trim(), editingContent.value);
    if (success) closeEditor();
  } else if (selectedStyle.value) {
    await assetStore.saveStyle(selectedStyle.value, editingContent.value);
  }
}

async function deleteStyle() {
  if (!selectedStyle.value) return;
  const success = await assetStore.deleteStyle(selectedStyle.value);
  if (success) closeEditor();
}

function createNewStyle() {
  isNewStyle.value = true;
  selectedStyle.value = 'new';
  editingContent.value = `---
name: my-style
description: 输出风格描述
---

# 风格名称

描述这个输出风格的特点...

## 语气
- 专业/友好/幽默...

## 格式
- 代码块风格
- 标题层级
- 列表格式
`;
  newStyleName.value = '';
}
</script>

<template>
  <div class="h-full flex">
    <!-- Style List -->
    <div class="w-64 flex-shrink-0 border-r border-border overflow-y-auto bg-card/30">
      <div class="p-3 border-b border-border flex items-center justify-between">
        <span class="text-sm font-medium">输出风格</span>
        <button
          @click="createNewStyle"
          class="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
          title="新建风格"
        >
          <Plus class="w-4 h-4" />
        </button>
      </div>

      <div v-if="assetStore.loading" class="p-4 text-center text-sm text-muted-foreground">
        加载中...
      </div>

      <div v-else-if="assetStore.styles.length === 0" class="p-4 text-center text-sm text-muted-foreground">
        暂无输出风格
      </div>

      <div v-else class="p-2 space-y-1">
        <button
          v-for="style in assetStore.styles"
          :key="style.name"
          @click="selectStyle(style)"
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors"
          :class="[
            selectedStyle === style.name
              ? 'bg-primary/10 text-primary'
              : 'text-foreground hover:bg-muted/50'
          ]"
        >
          <FileText class="w-4 h-4 flex-shrink-0 text-muted-foreground" />
          <span class="truncate flex-1 text-left">{{ style.name }}</span>
          <span class="text-[10px] text-muted-foreground truncate max-w-16">{{ style.description?.slice(0, 20) }}</span>
          <ChevronRight class="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>

    <!-- Style Editor -->
    <div class="flex-1 flex items-center justify-center bg-background">
      <div v-if="!selectedStyle" class="text-center text-muted-foreground">
        <Palette class="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p class="text-sm">选择一个输出风格进行编辑</p>
        <p class="text-xs mt-1">或点击 + 创建新的风格</p>
      </div>

      <div v-else class="w-full h-full flex flex-col">
        <!-- Editor Header -->
        <div class="h-10 flex-shrink-0 border-b border-border flex items-center justify-between px-4">
          <div class="flex items-center gap-2">
            <span v-if="isNewStyle" class="text-sm font-medium">新建风格</span>
            <span v-else class="text-sm font-medium">{{ selectedStyle }}</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="!isNewStyle"
              @click="deleteStyle"
              class="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
              title="删除"
            >
              <Trash2 class="w-4 h-4" />
            </button>
            <button
              @click="saveStyle"
              class="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Save class="w-3.5 h-3.5" />
              <span>保存</span>
            </button>
            <button
              @click="closeEditor"
              class="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- New Style Form -->
        <div v-if="isNewStyle" class="p-4 border-b border-border bg-muted/30">
          <label class="text-xs text-muted-foreground mb-1 block">风格名称</label>
          <input
            v-model="newStyleName"
            type="text"
            placeholder="如: engineer-professional"
            class="w-full max-w-xs px-2.5 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <!-- Editor -->
        <textarea
          v-model="editingContent"
          class="flex-1 w-full p-4 bg-transparent text-sm font-mono resize-none focus:outline-none"
          placeholder="编写输出风格指令..."
          spellcheck="false"
        />
      </div>
    </div>
  </div>
</template>
