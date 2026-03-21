<script setup lang="ts">
import { ref, computed } from 'vue';
import { historyApi } from '@/api/history';
import type { Project, ProjectSpec } from '@/types/project';
import Dialog from '@/components/ui/Dialog.vue';
import {
  FileText,
  Edit3,
  RefreshCw,
  Check,
  ExternalLink,
  Maximize2,
  Eye,
  Code,
  AlertCircle,
} from 'lucide-vue-next';

const props = defineProps<{
  project: Project;
  spec: ProjectSpec | null;
}>();

const emit = defineEmits<{
  (e: 'refresh', spec?: ProjectSpec): void;
}>();

// Dialog state
const showDialog = ref(false);
const dialogMode = ref<'view' | 'edit'>('view');

// Edit state
const editContent = ref('');
const saving = ref(false);
const errorMessage = ref('');

// Preview toggle
const showPreview = ref(true);

// Computed - 优先使用 spec.content，否则使用 project.instructions
const specContent = computed(() => props.spec?.content || props.project.instructions || '');
const hasSpec = computed(() => !!specContent.value);
const specSummary = computed(() => {
  if (props.spec?.summary) {
    return props.spec.summary;
  }
  // Generate a simple summary from content
  const content = specContent.value;
  if (!content) return null;
  const lines = content.split('\n').filter((l) => l.trim());
  return lines.slice(0, 3).join('\n').slice(0, 200) + (content.length > 200 ? '...' : '');
});

function openViewDialog() {
  dialogMode.value = 'view';
  showDialog.value = true;
}

function openEditDialog() {
  editContent.value = specContent.value;
  errorMessage.value = '';
  dialogMode.value = 'edit';
  showDialog.value = true;
}

function closeDialog() {
  showDialog.value = false;
  dialogMode.value = 'view';
}

async function saveEdit() {
  if (!props.project.encodedPath) return;

  // 清除之前的错误
  errorMessage.value = '';

  // 验证内容不为空
  if (!editContent.value.trim()) {
    errorMessage.value = '请输入规范内容';
    return;
  }

  saving.value = true;
  try {
    const result = await historyApi.updateProjectSpec(props.project.encodedPath, editContent.value);

    // 检查返回结果
    if (result && result.success) {
      closeDialog();
      // 传递返回的 spec 数据，避免再次请求
      emit('refresh', result.spec);
    } else {
      errorMessage.value = '保存失败，请重试';
    }
  } catch (error) {
    console.error('Failed to save spec:', error);
    errorMessage.value = error instanceof Error ? error.message : '保存失败，请检查文件权限';
  } finally {
    saving.value = false;
  }
}

async function refreshSpec() {
  if (!props.project.encodedPath) return;

  try {
    const result = await historyApi.refreshProjectSpec(props.project.encodedPath);
    // 传递返回的 spec 数据
    emit('refresh', result.spec);
  } catch (error) {
    console.error('Failed to refresh spec:', error);
  }
}

function openInEditor() {
  // Open CLAUDE.md in system editor
  const specPath = `${props.project.path}/CLAUDE.md`;
  // This would need backend support to open file
  console.log('Open in editor:', specPath);
}

// Simple markdown to HTML for preview
function renderMarkdown(text: string): string {
  if (!text) return '';

  // Basic markdown rendering
  let html = text
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mt-4 mb-3">$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-muted p-3 rounded-md my-2 overflow-x-auto text-sm"><code>$2</code></pre>')
    // Inline code
    .replace(/`(.*?)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm">$1</code>')
    // Lists
    .replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/^\* (.*$)/gim, '<li class="ml-4">$1</li>')
    // Line breaks
    .replace(/\n/g, '<br>');

  return html;
}
</script>

<template>
  <div class="bg-card border border-border rounded-lg overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-border">
      <div class="flex items-center gap-2">
        <FileText class="w-4 h-4 text-muted-foreground" />
        <span class="text-sm font-medium">项目规范 (CLAUDE.md)</span>
      </div>
      <div class="flex items-center gap-1">
        <button
          @click="refreshSpec"
          class="p-1.5 rounded hover:bg-muted transition-colors"
          title="刷新"
        >
          <RefreshCw class="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button
          v-if="hasSpec"
          @click="openInEditor"
          class="p-1.5 rounded hover:bg-muted transition-colors"
          title="在外部编辑器打开"
        >
          <ExternalLink class="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button
          v-if="hasSpec"
          @click="openViewDialog"
          class="p-1.5 rounded hover:bg-muted transition-colors"
          title="查看全文"
        >
          <Maximize2 class="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button
          @click="openEditDialog"
          class="p-1.5 rounded hover:bg-muted transition-colors"
          title="编辑"
        >
          <Edit3 class="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="p-4">
      <div v-if="hasSpec" class="space-y-3">
        <!-- Summary -->
        <div v-if="specSummary" class="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
          <pre class="whitespace-pre-wrap font-sans">{{ specSummary }}</pre>
        </div>

        <!-- Sections -->
        <div v-if="spec?.sections && spec.sections.length > 0" class="space-y-2">
          <div
            v-for="section in spec.sections.slice(0, 5)"
            :key="section.title"
            class="text-sm"
          >
            <div class="font-medium" :style="{ paddingLeft: `${(section.level - 1) * 12}px` }">
              {{ section.title }}
            </div>
          </div>
          <div v-if="spec.sections.length > 5" class="text-xs text-muted-foreground">
            还有 {{ spec.sections.length - 5 }} 个章节...
          </div>
        </div>

        <!-- View full content button -->
        <button
          v-if="specContent.length > 200"
          @click="openViewDialog"
          class="w-full py-2 text-sm text-primary hover:bg-primary/10 rounded-md transition-colors"
        >
          查看完整内容
        </button>
      </div>

      <div v-else class="text-sm text-muted-foreground text-center py-8">
        <FileText class="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>尚未配置项目规范</p>
        <button
          @click="openEditDialog"
          class="mt-2 text-primary hover:underline"
        >
          添加 CLAUDE.md
        </button>
      </div>
    </div>

    <!-- Dialog -->
    <Dialog
      v-model:open="showDialog"
      :title="dialogMode === 'view' ? '项目规范' : '编辑项目规范'"
      size="xl"
    >
      <!-- View Mode -->
      <div v-if="dialogMode === 'view'" class="space-y-4">
        <div class="flex items-center justify-between">
          <div class="text-sm text-muted-foreground">
            {{ project.path }}/CLAUDE.md
          </div>
          <button
            @click="dialogMode = 'edit'; editContent = specContent"
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-border hover:bg-muted transition-colors"
          >
            <Edit3 class="w-3.5 h-3.5" />
            编辑
          </button>
        </div>

        <!-- Markdown Content -->
        <div
          class="prose prose-sm dark:prose-invert max-w-none"
          v-html="renderMarkdown(specContent)"
        />
      </div>

      <!-- Edit Mode -->
      <div v-else class="space-y-4">
        <!-- Error Message -->
        <div v-if="errorMessage" class="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
          <AlertCircle class="w-4 h-4 flex-shrink-0" />
          <span>{{ errorMessage }}</span>
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <button
              @click="showPreview = false"
              :class="[
                'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
                !showPreview ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'
              ]"
            >
              <Code class="w-3.5 h-3.5" />
              编辑
            </button>
            <button
              @click="showPreview = true"
              :class="[
                'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
                showPreview ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'
              ]"
            >
              <Eye class="w-3.5 h-3.5" />
              预览
            </button>
          </div>
          <button
            @click="dialogMode = 'view'"
            class="text-sm text-muted-foreground hover:text-foreground"
          >
            取消编辑
          </button>
        </div>

        <!-- Editor / Preview -->
        <div class="grid grid-cols-2 gap-4" :class="{ 'grid-cols-1': !showPreview }">
          <!-- Editor -->
          <div :class="{ 'col-span-2': !showPreview }">
            <textarea
              v-model="editContent"
              class="w-full h-96 p-4 bg-background border border-border rounded-md text-sm font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="在此输入 CLAUDE.md 内容..."
            />
          </div>

          <!-- Preview -->
          <div v-if="showPreview" class="h-96 overflow-y-auto border border-border rounded-md p-4">
            <div
              class="prose prose-sm dark:prose-invert max-w-none"
              v-html="renderMarkdown(editContent)"
            />
          </div>
        </div>
      </div>

      <!-- Footer -->
      <template #footer>
        <template v-if="dialogMode === 'view'">
          <button
            @click="closeDialog"
            class="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted transition-colors"
          >
            关闭
          </button>
        </template>
        <template v-else>
          <button
            @click="dialogMode = 'view'"
            class="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted transition-colors"
          >
            取消
          </button>
          <button
            @click="saveEdit"
            :disabled="saving"
            class="flex items-center gap-1.5 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Check class="w-4 h-4" />
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </template>
      </template>
    </Dialog>
  </div>
</template>
