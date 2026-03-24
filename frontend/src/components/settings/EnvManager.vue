<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { api } from '@/api/index';
import {
  RefreshCw,
  Save,
  Plus,
  Trash2,
  Key,
  Server,
  Cpu,
  AlertCircle,
  Check,
  Eye,
  EyeOff,
} from 'lucide-vue-next';

interface EnvVar {
  key: string;
  value: string;
  description: string;
  isSecret: boolean;
  category: 'model' | 'auth' | 'server';
}

// 预定义的环境变量
const predefinedVars: EnvVar[] = [
  {
    key: 'ANTHROPIC_DEFAULT_HAIKU_MODEL',
    value: '',
    description: '默认 Haiku 模型',
    isSecret: false,
    category: 'model',
  },
  {
    key: 'ANTHROPIC_DEFAULT_SONNET_MODEL',
    value: '',
    description: '默认 Sonnet 模型',
    isSecret: false,
    category: 'model',
  },
  {
    key: 'ANTHROPIC_DEFAULT_OPUS_MODEL',
    value: '',
    description: '默认 Opus 模型',
    isSecret: false,
    category: 'model',
  },
  {
    key: 'ANTHROPIC_AUTH_TOKEN',
    value: '',
    description: 'API 认证令牌',
    isSecret: true,
    category: 'auth',
  },
  {
    key: 'ANTHROPIC_BASE_URL',
    value: '',
    description: 'API 基础 URL',
    isSecret: false,
    category: 'server',
  },
];

const envVars = ref<EnvVar[]>([]);
const customVars = ref<{ key: string; value: string }[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const success = ref(false);
const showSecrets = ref<Record<string, boolean>>({});

const hasChanges = computed(() => {
  // 检查预定义变量
  for (const v of envVars.value) {
    const original = predefinedVars.find(p => p.key === v.key);
    if (original && original.value !== v.value) return true;
  }
  // 检查自定义变量
  if (customVars.value.length > 0) return true;
  return false;
});

function toggleSecret(key: string) {
  showSecrets.value[key] = !showSecrets.value[key];
}

async function fetchConfig() {
  loading.value = true;
  error.value = null;

  try {
    const config = await api.get<Record<string, string | null>>('/api/config');

    // 更新预定义变量的值
    envVars.value = predefinedVars.map(v => ({
      ...v,
      value: config[v.key] || '',
    }));
  } catch (e) {
    error.value = '加载配置失败';
  } finally {
    loading.value = false;
  }
}

async function saveConfig() {
  saving.value = true;
  error.value = null;
  success.value = false;

  try {
    const payload: Record<string, string> = {};

    for (const v of envVars.value) {
      if (v.value) {
        payload[v.key] = v.value;
      }
    }

    await api.post('/api/config', payload);
    success.value = true;
    setTimeout(() => { success.value = false; }, 2000);
  } catch (e) {
    error.value = '保存配置失败';
  } finally {
    saving.value = false;
  }
}

function addCustomVar() {
  customVars.value.push({ key: '', value: '' });
}

function removeCustomVar(index: number) {
  customVars.value.splice(index, 1);
}

onMounted(fetchConfig);
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
      <div class="flex items-center gap-2">
        <Server class="w-4 h-4 text-primary" />
        <h3 class="text-sm font-medium">环境变量管理</h3>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="fetchConfig"
          :disabled="loading"
          class="flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-md transition-colors"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" />
          <span>刷新</span>
        </button>
        <button
          @click="saveConfig"
          :disabled="saving || !hasChanges"
          class="flex items-center gap-1.5 px-3 py-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50"
        >
          <Save class="w-3.5 h-3.5" />
          <span>保存</span>
        </button>
      </div>
    </div>

    <!-- 成功提示 -->
    <Transition
      enter-active-class="transition-all duration-200"
      leave-active-class="transition-all duration-200"
      enter-from-class="opacity-0 -translate-y-2"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="success"
        class="mx-4 mt-3 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-md flex items-center gap-2 text-emerald-500 text-sm"
      >
        <Check class="w-4 h-4" />
        配置已保存
      </div>
    </Transition>

    <!-- 错误提示 -->
    <div
      v-if="error"
      class="mx-4 mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-md flex items-center gap-2 text-red-500 text-sm"
    >
      <AlertCircle class="w-4 h-4" />
      {{ error }}
    </div>

    <!-- 内容区 -->
    <div class="flex-1 overflow-auto p-4 space-y-4">
      <!-- 模型配置 -->
      <div class="space-y-2">
        <h4 class="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Cpu class="w-3.5 h-3.5" />
          模型配置
        </h4>
        <div class="space-y-2">
          <div
            v-for="v in envVars.filter(e => e.category === 'model')"
            :key="v.key"
            class="flex items-center gap-3 p-3 bg-card border border-border rounded-lg"
          >
            <div class="flex-1">
              <label class="text-sm font-medium">{{ v.key }}</label>
              <p class="text-xs text-muted-foreground">{{ v.description }}</p>
            </div>
            <input
              v-model="v.value"
              type="text"
              :placeholder="`如: claude-3-5-haiku-20241022`"
              class="w-64 px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      <!-- 认证配置 -->
      <div class="space-y-2">
        <h4 class="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Key class="w-3.5 h-3.5" />
          认证配置
        </h4>
        <div class="space-y-2">
          <div
            v-for="v in envVars.filter(e => e.category === 'auth')"
            :key="v.key"
            class="flex items-center gap-3 p-3 bg-card border border-border rounded-lg"
          >
            <div class="flex-1">
              <label class="text-sm font-medium">{{ v.key }}</label>
              <p class="text-xs text-muted-foreground">{{ v.description }}</p>
            </div>
            <div class="relative">
              <input
                v-model="v.value"
                :type="showSecrets[v.key] ? 'text' : 'password'"
                placeholder="sk-ant-..."
                class="w-64 px-3 py-1.5 pr-8 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                @click="toggleSecret(v.key)"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <Eye v-if="!showSecrets[v.key]" class="w-4 h-4" />
                <EyeOff v-else class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 服务器配置 -->
      <div class="space-y-2">
        <h4 class="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Server class="w-3.5 h-3.5" />
          服务器配置
        </h4>
        <div class="space-y-2">
          <div
            v-for="v in envVars.filter(e => e.category === 'server')"
            :key="v.key"
            class="flex items-center gap-3 p-3 bg-card border border-border rounded-lg"
          >
            <div class="flex-1">
              <label class="text-sm font-medium">{{ v.key }}</label>
              <p class="text-xs text-muted-foreground">{{ v.description }}</p>
            </div>
            <input
              v-model="v.value"
              type="text"
              placeholder="https://api.anthropic.com"
              class="w-64 px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      <!-- 自定义变量 -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            自定义变量
          </h4>
          <button
            @click="addCustomVar"
            class="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded-md transition-colors"
          >
            <Plus class="w-3.5 h-3.5" />
            添加
          </button>
        </div>

        <div
          v-if="customVars.length === 0"
          class="py-6 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg"
        >
          暂无自定义变量
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="(v, index) in customVars"
            :key="index"
            class="flex items-center gap-2 p-3 bg-card border border-border rounded-lg"
          >
            <input
              v-model="v.key"
              type="text"
              placeholder="变量名"
              class="flex-1 px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
            />
            <span class="text-muted-foreground">=</span>
            <input
              v-model="v.value"
              type="text"
              placeholder="变量值"
              class="flex-1 px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              @click="removeCustomVar(index)"
              class="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
