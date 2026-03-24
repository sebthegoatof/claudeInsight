<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useAssetStore } from '@/stores/assetStore';
import { X, Save, Zap } from 'lucide-vue-next';

const props = defineProps<{
  skillName: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const assetStore = useAssetStore();
const content = ref('');
const loading = ref(true);
const saving = ref(false);

async function loadSkill() {
  loading.value = true;
  // 尝试从不同分类加载
  const categories = ['zcf', 'custom', 'global'];
  for (const category of categories) {
    const detail = await assetStore.getAgent(category, props.skillName);
    if (detail) {
      content.value = detail.content;
      loading.value = false;
      return;
    }
  }
  content.value = `# ${props.skillName}\n\n未找到 Skill 定义文件。`;
  loading.value = false;
}

async function saveSkill() {
  saving.value = true;
  // 保存到 custom 分类
  await assetStore.saveAgent('custom', props.skillName, content.value);
  saving.value = false;
}

onMounted(() => {
  loadSkill();
});

watch(() => props.skillName, () => {
  loadSkill();
});
</script>

<template>
  <div class="h-full flex flex-col bg-card">
    <!-- Header -->
    <div class="h-10 flex-shrink-0 border-b border-border flex items-center justify-between px-4">
      <div class="flex items-center gap-2">
        <Zap class="w-4 h-4 text-primary" />
        <span class="text-sm font-medium">{{ skillName }}</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="saveSkill"
          :disabled="saving"
          class="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
        >
          <Save class="w-3 h-3" />
          保存
        </button>
        <button
          @click="emit('close')"
          class="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto p-4">
      <div v-if="loading" class="flex items-center justify-center h-full text-muted-foreground text-sm">
        加载中...
      </div>
      <div v-else class="prose prose-invert prose-sm max-w-none">
        <pre class="whitespace-pre-wrap font-mono text-xs bg-muted/50 p-4 rounded-lg">{{ content }}</pre>
      </div>
    </div>
  </div>
</template>
