<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useModelProfileStore } from '@/stores/modelProfileStore';
import type { CodingPlan, CodingPlanInput } from '@/types/modelProfile';
import {
  Plus,
  Check,
  Copy,
  Pencil,
  Trash2,
  RefreshCw,
  Loader2,
  AlertCircle,
  Cpu,
  X,
  Download,
  Upload,
  Eye,
  EyeOff,
} from 'lucide-vue-next';

const store = useModelProfileStore();

// UI state
const loading = ref(false);
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null);
const showEditor = ref(false);
const editingProfile = ref<CodingPlan | null>(null);
const isCopyMode = ref(false);
const showToken = ref(false);

// Form data
const formData = ref<CodingPlanInput>({
  name: '',
  haiku_model: '',
  sonnet_model: '',
  opus_model: '',
  auth_token: '',
  base_url: '',
});

// File input ref
const fileInput = ref<HTMLInputElement | null>(null);

// Computed
const editorTitle = computed(() => {
  if (isCopyMode.value) return '复制配置方案';
  if (editingProfile.value) return '编辑配置方案';
  return '新建配置方案';
});

onMounted(async () => {
  await loadProfiles();
});

async function loadProfiles() {
  loading.value = true;
  try {
    await store.initialize();
  } catch (e) {
    showError('加载配置方案失败');
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  editingProfile.value = null;
  isCopyMode.value = false;
  formData.value = {
    name: '',
    haiku_model: '',
    sonnet_model: '',
    opus_model: '',
    auth_token: '',
    base_url: '',
  };
  showEditor.value = true;
}

function openEditDialog(profile: CodingPlan) {
  editingProfile.value = profile;
  isCopyMode.value = false;
  formData.value = {
    name: profile.name,
    haiku_model: profile.haiku_model,
    sonnet_model: profile.sonnet_model,
    opus_model: profile.opus_model,
    auth_token: profile.auth_token,
    base_url: profile.base_url,
  };
  showEditor.value = true;
}

function openCopyDialog(profile: CodingPlan) {
  editingProfile.value = null; // null 表示新建模式
  isCopyMode.value = true;

  // Generate unique name
  let newName = `${profile.name} (Copy)`;
  let counter = 1;
  while (isNameDuplicate(newName)) {
    counter++;
    newName = `${profile.name} (Copy ${counter})`;
  }

  formData.value = {
    name: newName,
    haiku_model: profile.haiku_model,
    sonnet_model: profile.sonnet_model,
    opus_model: profile.opus_model,
    auth_token: profile.auth_token,
    base_url: profile.base_url,
  };
  showEditor.value = true;
}

// Check if name already exists
function isNameDuplicate(name: string, excludeId?: string): boolean {
  return store.profiles.some(
    p => p.name.trim().toLowerCase() === name.trim().toLowerCase() && p.id !== excludeId
  );
}

// Check if config already exists
function isConfigDuplicate(config: CodingPlanInput, excludeId?: string): { duplicate: boolean; name?: string } {
  const targetHaiku = config.haiku_model || '';
  const targetSonnet = config.sonnet_model || '';
  const targetOpus = config.opus_model || '';
  const targetToken = config.auth_token || '';
  const targetUrl = config.base_url || '';

  const existing = store.profiles.find(p => {
    if (p.id === excludeId) return false;
    return (
      (p.haiku_model || '') === targetHaiku &&
      (p.sonnet_model || '') === targetSonnet &&
      (p.opus_model || '') === targetOpus &&
      (p.auth_token || '') === targetToken &&
      (p.base_url || '') === targetUrl
    );
  });

  if (existing) {
    return { duplicate: true, name: existing.name };
  }
  return { duplicate: false };
}

async function saveProfile() {
  if (!formData.value.name.trim()) {
    showError('方案名称不能为空');
    return;
  }

  // Check for duplicate name
  if (isNameDuplicate(formData.value.name, editingProfile.value?.id)) {
    showError('方案名称已存在，请使用其他名称');
    return;
  }

  // Check for duplicate config
  const configCheck = isConfigDuplicate(formData.value, editingProfile.value?.id);
  if (configCheck.duplicate && configCheck.name) {
    showError(`配置已存在：与「${configCheck.name}」的五项配置完全相同`);
    return;
  }

  try {
    if (editingProfile.value) {
      // Update existing profile
      const updated = store.updateProfile(editingProfile.value.id, formData.value);

      // If this is the active profile, also update the local file
      if (updated && updated.isActive) {
        const result = await store.saveActiveProfile(updated);
        if (result.success) {
          showSuccess('配置方案已更新并同步到本地文件');
        } else {
          showError(result.message);
          return;
        }
      } else {
        showSuccess('配置方案已更新');
      }
    } else {
      store.createProfile(formData.value);
      showSuccess('配置方案已创建');
    }
    showEditor.value = false;
  } catch (e: unknown) {
    const error = e as { message?: string };
    showError(error.message || '保存失败');
  }
}

async function activateProfile(profile: CodingPlan) {
  try {
    const result = await store.activateProfile(profile.id);
    if (result.success) {
      showSuccess(result.message);
    } else {
      showError(result.message);
    }
  } catch (e) {
    showError('切换失败');
  }
}

async function deleteProfile(profile: CodingPlan) {
  if (!confirm(`确定要删除 "${profile.name}" 吗？`)) {
    return;
  }

  store.deleteProfile(profile.id);
  showSuccess('配置方案已删除');
}

// Export profiles
function exportProfiles() {
  const jsonData = store.exportProfiles();
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'claude-profiles-backup.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showSuccess('配置方案已导出');
}

// Trigger file input click
function triggerImport() {
  fileInput.value?.click();
}

// Import profiles
async function importProfiles(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const result = store.importProfiles(text, true);
    if (result.success) {
      showSuccess(result.message);
      // Re-run comparison logic
      await store.initialize();
    } else {
      showError(result.message);
    }
  } catch (e) {
    showError('导入失败：无法读取文件');
  }

  // Reset file input
  input.value = '';
}

function showSuccess(text: string) {
  message.value = { type: 'success', text };
  setTimeout(() => {
    message.value = null;
  }, 3000);
}

function showError(text: string) {
  message.value = { type: 'error', text };
  setTimeout(() => {
    message.value = null;
  }, 5000);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<template>
  <div class="h-full overflow-y-auto p-6">
    <div class="max-w-4xl mx-auto space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold">Coding Plans 配置管理</h1>
          <p class="text-sm text-muted-foreground mt-1">
            管理多套模型配置方案，一键切换 Claude 模型设置
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="exportProfiles"
            class="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
          >
            <Download class="w-4 h-4" />
            导出
          </button>
          <button
            @click="triggerImport"
            class="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
          >
            <Upload class="w-4 h-4" />
            导入
          </button>
          <input
            ref="fileInput"
            type="file"
            accept=".json"
            class="hidden"
            @change="importProfiles"
          />
          <button
            @click="openCreateDialog"
            class="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity"
          >
            <Plus class="w-4 h-4" />
            新建方案
          </button>
        </div>
      </div>

      <!-- Message -->
      <Transition
        enter-active-class="transition-all duration-200"
        leave-active-class="transition-all duration-200"
        enter-from-class="opacity-0 -translate-y-2"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div
          v-if="message"
          :class="[
            'flex items-center gap-2 px-4 py-3 rounded-lg',
            message.type === 'success'
              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
              : 'bg-red-500/10 text-red-600 dark:text-red-400',
          ]"
        >
          <Check v-if="message.type === 'success'" class="w-4 h-4" />
          <AlertCircle v-else class="w-4 h-4" />
          <span class="text-sm">{{ message.text }}</span>
        </div>
      </Transition>

      <!-- Loading -->
      <div v-if="loading" class="py-8 text-center text-muted-foreground">
        <RefreshCw class="w-5 h-5 animate-spin mx-auto mb-2" />
        <span class="text-sm">加载中...</span>
      </div>

      <!-- Profile Cards -->
      <div v-else class="space-y-4">
        <div
          v-for="profile in store.profiles"
          :key="profile.id"
          class="border border-border rounded-lg overflow-hidden transition-all"
          :class="{
            'ring-2 ring-primary': profile.isActive,
          }"
        >
          <!-- Card Header -->
          <div
            class="px-4 py-3 flex items-center justify-between"
            :class="profile.isActive ? 'bg-primary/5' : 'bg-muted/30'"
          >
            <div class="flex items-center gap-3">
              <Cpu class="w-5 h-5 text-primary" />
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ profile.name }}</span>
                  <span
                    v-if="profile.isActive"
                    class="px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded"
                  >
                    当前
                  </span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button
                v-if="!profile.isActive"
                @click.stop="activateProfile(profile)"
                :disabled="store.activating"
                class="p-2 rounded-md hover:bg-muted transition-colors text-primary"
                title="切换到此方案"
              >
                <Loader2 v-if="store.activating" class="w-4 h-4 animate-spin" />
                <Check v-else class="w-4 h-4" />
              </button>
              <button
                @click.stop="openEditDialog(profile)"
                class="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="编辑"
              >
                <Pencil class="w-4 h-4" />
              </button>
              <button
                @click.stop="openCopyDialog(profile)"
                class="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="复制"
              >
                <Copy class="w-4 h-4" />
              </button>
              <button
                @click.stop="deleteProfile(profile)"
                class="p-2 rounded-md hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                title="删除"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Card Body -->
          <div class="px-4 py-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-muted-foreground">Haiku:</span>
              <span class="ml-2 font-mono">{{ profile.haiku_model || '-' }}</span>
            </div>
            <div>
              <span class="text-muted-foreground">Sonnet:</span>
              <span class="ml-2 font-mono">{{ profile.sonnet_model || '-' }}</span>
            </div>
            <div>
              <span class="text-muted-foreground">Opus:</span>
              <span class="ml-2 font-mono">{{ profile.opus_model || '-' }}</span>
            </div>
            <div>
              <span class="text-muted-foreground">Base URL:</span>
              <span class="ml-2 font-mono truncate">{{ profile.base_url || '-' }}</span>
            </div>
          </div>

          <!-- Card Footer -->
          <div class="px-4 py-2 bg-muted/20 text-xs text-muted-foreground">
            更新于 {{ formatDate(profile.updatedAt) }}
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-if="!store.hasProfiles"
          class="text-center py-12 text-muted-foreground"
        >
          <Cpu class="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p class="text-sm">暂无配置方案</p>
          <p class="text-xs mt-1">点击"新建方案"创建您的第一个模型配置</p>
        </div>
      </div>
    </div>

    <!-- Editor Dialog -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showEditor"
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        @click.self="showEditor = false"
      >
        <Transition
          enter-active-class="transition ease-out duration-200"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition ease-in duration-150"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="showEditor"
            class="bg-card border border-border rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden"
          >
            <!-- Dialog Header -->
            <div class="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 class="font-semibold">{{ editorTitle }}</h2>
              <button
                @click="showEditor = false"
                class="p-1 rounded hover:bg-muted transition-colors"
              >
                <X class="w-4 h-4" />
              </button>
            </div>

            <!-- Dialog Body -->
            <div class="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
              <!-- Name -->
              <div>
                <label class="block text-sm font-medium mb-1">
                  方案名称 <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="formData.name"
                  type="text"
                  class="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="例如：Anthropic 官方"
                />
              </div>

              <!-- Models -->
              <div class="space-y-3">
                <h3 class="text-sm font-medium text-muted-foreground">模型配置</h3>

                <div>
                  <label class="block text-xs text-muted-foreground mb-1">Haiku Model</label>
                  <input
                    v-model="formData.haiku_model"
                    type="text"
                    class="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="claude-3-5-haiku-20241022"
                  />
                </div>

                <div>
                  <label class="block text-xs text-muted-foreground mb-1">Sonnet Model</label>
                  <input
                    v-model="formData.sonnet_model"
                    type="text"
                    class="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="claude-sonnet-4-20250514"
                  />
                </div>

                <div>
                  <label class="block text-xs text-muted-foreground mb-1">Opus Model</label>
                  <input
                    v-model="formData.opus_model"
                    type="text"
                    class="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="claude-opus-4-20250514"
                  />
                </div>
              </div>

              <!-- API Config -->
              <div class="space-y-3">
                <h3 class="text-sm font-medium text-muted-foreground">API 配置</h3>

                <div>
                  <label class="block text-xs text-muted-foreground mb-1">Auth Token</label>
                  <div class="relative">
                    <input
                      v-model="formData.auth_token"
                      :type="showToken ? 'text' : 'password'"
                      class="w-full px-3 py-2 pr-10 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="API 认证令牌"
                    />
                    <button
                      type="button"
                      @click="showToken = !showToken"
                      class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                    >
                      <Eye v-if="!showToken" class="w-4 h-4" />
                      <EyeOff v-else class="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label class="block text-xs text-muted-foreground mb-1">Base URL</label>
                  <input
                    v-model="formData.base_url"
                    type="text"
                    class="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="https://api.anthropic.com"
                  />
                </div>
              </div>
            </div>

            <!-- Dialog Footer -->
            <div class="px-4 py-3 border-t border-border flex items-center justify-end gap-2">
              <button
                @click="showEditor = false"
                class="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                取消
              </button>
              <button
                @click="saveProfile"
                class="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity"
              >
                保存
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </div>
</template>
