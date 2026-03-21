<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAppStore } from '@/stores/appStore';
import {
  FolderOpen,
  RefreshCw,
  Check,
  AlertCircle,
  Info,
  Terminal,
  Database,
  Zap,
  Save,
} from 'lucide-vue-next';

const appStore = useAppStore();

// 设置状态
const settings = ref<Record<string, string>>({});
const pathInfo = ref({
  currentPath: '',
  defaultPath: '',
  isCustom: false,
  exists: false,
  platform: 'macos' as 'windows' | 'macos' | 'linux' | 'other',
});
const loading = ref(false);
const saving = ref(false);
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null);

// 编辑状态
const editingPath = ref(false);
const newPath = ref('');

// 加载设置
onMounted(async () => {
  await loadSettings();
});

async function loadSettings() {
  loading.value = true;
  try {
    // 加载所有设置
    const settingsRes = await fetch('/api/settings');
    const settingsData = await settingsRes.json();
    settings.value = {};
    for (const s of settingsData) {
      settings.value[s.key] = s.value || '';
    }

    // 加载路径信息
    const pathRes = await fetch('/api/history/path-info');
    pathInfo.value = await pathRes.json();
    newPath.value = pathInfo.value.currentPath;
  } catch (error) {
    showError('加载设置失败');
  } finally {
    loading.value = false;
  }
}

async function saveClaudePath() {
  if (!newPath.value.trim()) {
    showError('路径不能为空');
    return;
  }

  saving.value = true;
  try {
    const res = await fetch('/api/settings/claude-path', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: newPath.value }),
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.error || '保存失败');
      return;
    }

    showSuccess('路径已更新');
    editingPath.value = false;
    await loadSettings();

    // 触发重新扫描
    await appStore.scanHistory();
  } catch (error) {
    showError('保存路径失败');
  } finally {
    saving.value = false;
  }
}

async function resetClaudePath() {
  saving.value = true;
  try {
    const res = await fetch('/api/settings/claude-path', {
      method: 'DELETE',
    });

    await res.json();
    showSuccess('已恢复默认路径');
    await loadSettings();
    await appStore.scanHistory();
  } catch (error) {
    showError('重置失败');
  } finally {
    saving.value = false;
  }
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

const platformLabel = computed(() => {
  const labels = {
    windows: 'Windows',
    macos: 'macOS',
    linux: 'Linux',
    other: '未知',
  };
  return labels[pathInfo.value.platform];
});

// 格式化数字
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}
</script>

<template>
  <div class="h-full overflow-y-auto p-6">
    <div class="max-w-2xl mx-auto space-y-6">
      <!-- Header -->
      <div>
        <h1 class="text-xl font-semibold">系统设置</h1>
        <p class="text-sm text-muted-foreground mt-1">
          配置 Claude Insight 的运行参数
        </p>
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

      <template v-else>
        <!-- 数据库统计 -->
        <div class="border border-border rounded-lg overflow-hidden">
          <div class="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
            <Database class="w-4 h-4 text-primary" />
            <span class="font-medium">数据库统计</span>
          </div>
          <div class="p-4">
            <!-- 基础统计 -->
            <div class="grid grid-cols-3 gap-4 mb-4">
              <div class="text-center p-3 bg-muted/30 rounded-lg">
                <div class="text-2xl font-semibold text-primary">
                  {{ appStore.stats.totalProjects }}
                </div>
                <div class="text-xs text-muted-foreground mt-1">项目</div>
              </div>
              <div class="text-center p-3 bg-muted/30 rounded-lg">
                <div class="text-2xl font-semibold text-primary">
                  {{ appStore.stats.totalConversations }}
                </div>
                <div class="text-xs text-muted-foreground mt-1">会话</div>
              </div>
              <div class="text-center p-3 bg-muted/30 rounded-lg">
                <div class="text-2xl font-semibold text-primary">
                  {{ appStore.stats.totalMessages }}
                </div>
                <div class="text-xs text-muted-foreground mt-1">消息</div>
              </div>
            </div>
            <!-- Token 统计 -->
            <div class="border-t border-border pt-4">
              <div class="flex items-center gap-2 mb-3">
                <Zap class="w-4 h-4 text-yellow-500" />
                <span class="text-sm font-medium">Token 统计</span>
              </div>
              <div class="grid grid-cols-5 gap-3">
                <div class="text-center p-3 bg-blue-500/10 rounded-lg">
                  <div class="text-lg font-semibold text-blue-600 dark:text-blue-400">
                    {{ formatNumber(appStore.stats.totalTokens) }}
                  </div>
                  <div class="text-xs text-muted-foreground mt-1">总计</div>
                </div>
                <div class="text-center p-3 bg-green-500/10 rounded-lg">
                  <div class="text-lg font-semibold text-green-600 dark:text-green-400">
                    {{ formatNumber(appStore.stats.inputTokens) }}
                  </div>
                  <div class="text-xs text-muted-foreground mt-1">输入</div>
                </div>
                <div class="text-center p-3 bg-purple-500/10 rounded-lg">
                  <div class="text-lg font-semibold text-purple-600 dark:text-purple-400">
                    {{ formatNumber(appStore.stats.outputTokens) }}
                  </div>
                  <div class="text-xs text-muted-foreground mt-1">输出</div>
                </div>
                <div class="text-center p-3 bg-orange-500/10 rounded-lg">
                  <div class="text-lg font-semibold text-orange-600 dark:text-orange-400">
                    {{ formatNumber(appStore.stats.cacheHitTokens) }}
                  </div>
                  <div class="text-xs text-muted-foreground mt-1">缓存命中</div>
                </div>
                <div class="text-center p-3 bg-cyan-500/10 rounded-lg">
                  <div class="text-lg font-semibold text-cyan-600 dark:text-cyan-400">
                    {{ formatNumber(appStore.stats.cacheCreationTokens) }}
                  </div>
                  <div class="text-xs text-muted-foreground mt-1">缓存写入</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Claude 路径设置 -->
        <div class="border border-border rounded-lg overflow-hidden">
          <div class="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
            <FolderOpen class="w-4 h-4 text-primary" />
            <span class="font-medium">Claude 数据路径</span>
          </div>
          <div class="p-4 space-y-4">
            <!-- 当前路径显示 -->
            <div v-if="!editingPath">
              <label class="block text-xs text-muted-foreground mb-1">当前路径</label>
              <div class="flex items-center gap-2">
                <code class="flex-1 bg-muted px-3 py-2 rounded-lg text-sm truncate">
                  {{ pathInfo.currentPath }}
                </code>
                <button
                  @click="editingPath = true"
                  class="px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  编辑
                </button>
                <button
                  v-if="pathInfo.isCustom"
                  @click="resetClaudePath"
                  :disabled="saving"
                  class="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  恢复默认
                </button>
              </div>
            </div>

            <!-- 编辑路径 -->
            <div v-else class="space-y-3">
              <div>
                <label class="block text-xs text-muted-foreground mb-1">新路径</label>
                <input
                  v-model="newPath"
                  type="text"
                  class="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="输入自定义 Claude 数据路径"
                />
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="saveClaudePath"
                  :disabled="saving"
                  class="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity"
                >
                  <Save class="w-4 h-4" />
                  保存
                </button>
                <button
                  @click="editingPath = false; newPath = pathInfo.currentPath"
                  class="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  取消
                </button>
              </div>
            </div>

            <!-- 提示信息 -->
            <div class="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
              <Info class="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p>默认路径: <code class="bg-muted px-1 rounded">{{ pathInfo.defaultPath }}</code></p>
                <p class="mt-1">检测到平台: {{ platformLabel }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 关于 -->
        <div class="border border-border rounded-lg overflow-hidden">
          <div class="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
            <Terminal class="w-4 h-4 text-primary" />
            <span class="font-medium">关于</span>
          </div>
          <div class="p-4 text-sm text-muted-foreground">
            <p><strong class="text-foreground">Claude Insight</strong> - Claude Code 历史分析工具</p>
            <p class="mt-2">版本: 1.0.0</p>
            <p class="mt-1">用于浏览、搜索和分析 Claude Code 的对话历史记录。</p>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
