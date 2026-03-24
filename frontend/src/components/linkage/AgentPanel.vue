<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useAssetStore } from '@/stores/assetStore';
import { X, Bot } from 'lucide-vue-next';

const props = defineProps<{
  agentType: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const assetStore = useAssetStore();
const content = ref('');
const description = ref('');
const loading = ref(true);

async function loadAgent() {
  loading.value = true;
  // 尝试从不同分类加载
  const categories = ['zcf/common', 'zcf/plan', 'custom'];
  for (const category of categories) {
    const detail = await assetStore.getAgent(category, props.agentType);
    if (detail) {
      content.value = detail.content;
      description.value = detail.description || '';
      loading.value = false;
      return;
    }
  }
  content.value = `# ${props.agentType}\n\n未找到 Agent 定义文件。`;
  loading.value = false;
}

onMounted(() => {
  loadAgent();
});

watch(() => props.agentType, () => {
  loadAgent();
});
</script>

<template>
  <div class="h-full flex flex-col bg-card">
    <!-- Header -->
    <div class="h-10 flex-shrink-0 border-b border-border flex items-center justify-between px-4">
      <div class="flex items-center gap-2">
        <Bot class="w-4 h-4 text-accent" />
        <span class="text-sm font-medium">{{ agentType }}</span>
      </div>
      <button
        @click="emit('close')"
        class="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto p-4">
      <div v-if="loading" class="flex items-center justify-center h-full text-muted-foreground text-sm">
        加载中...
      </div>
      <div v-else>
        <div v-if="description" class="mb-4 text-sm text-muted-foreground border-b border-border pb-3">
          {{ description }}
        </div>
        <pre class="whitespace-pre-wrap font-mono text-xs bg-muted/50 p-4 rounded-lg overflow-auto">{{ content }}</pre>
      </div>
    </div>
  </div>
</template>
