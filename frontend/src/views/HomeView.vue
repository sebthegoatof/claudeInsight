<script setup lang="ts">
import { ref, onMounted } from 'vue';

const apiStatus = ref<string>('checking');

onMounted(async () => {
  try {
    const response = await fetch('/api/health');
    if (response.ok) {
      apiStatus.value = 'connected';
    } else {
      apiStatus.value = 'error';
    }
  } catch {
    apiStatus.value = 'error';
  }
});
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16">
    <h1 class="text-4xl font-bold mb-4">欢迎使用 Claude Insight</h1>
    <p class="text-muted-foreground text-lg mb-8">
      一个强大的 Claude 助手管理工具
    </p>

    <div class="flex items-center gap-2 mb-8">
      <span class="text-muted-foreground">API 状态:</span>
      <span
        :class="[
          'px-3 py-1 rounded-full text-sm',
          apiStatus === 'connected'
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : apiStatus === 'error'
              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
        ]"
      >
        {{ apiStatus === 'checking' ? '检查中...' : apiStatus === 'connected' ? '已连接' : '连接失败' }}
      </span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
      <div class="border rounded-lg p-6 hover:shadow-lg transition-shadow">
        <h3 class="text-lg font-semibold mb-2">工作区管理</h3>
        <p class="text-muted-foreground">
          管理多个项目工作区，快速切换不同的开发环境
        </p>
      </div>

      <div class="border rounded-lg p-6 hover:shadow-lg transition-shadow">
        <h3 class="text-lg font-semibold mb-2">会话记录</h3>
        <p class="text-muted-foreground">
          保存和管理 Claude 会话历史，方便回顾和继续对话
        </p>
      </div>

      <div class="border rounded-lg p-6 hover:shadow-lg transition-shadow">
        <h3 class="text-lg font-semibold mb-2">插件系统</h3>
        <p class="text-muted-foreground">
          扩展功能插件和自定义命令，提升开发效率
        </p>
      </div>
    </div>
  </div>
</template>
