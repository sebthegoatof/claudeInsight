<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { api } from '@/api';
import { useLinkageStore } from '@/stores/linkageStore';
import {
  Zap,
  Copy,
  Check,
  Loader2,
  FolderOpen,
} from 'lucide-vue-next';

const props = defineProps<{
  skillName?: string;
}>();

const linkageStore = useLinkageStore();

const skills = computed(() => linkageStore.currentLinks?.skills || []);
const selectedSkill = ref(props.skillName || '');
const skillContent = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const copied = ref(false);

// 自动选择第一个 skill
watch(skills, (newSkills) => {
  if (newSkills.length > 0 && !selectedSkill.value) {
    selectedSkill.value = props.skillName || newSkills[0].name;
  }
}, { immediate: true });

// 加载 skill 内容
watch(selectedSkill, async (name) => {
  if (!name) {
    skillContent.value = '';
    return;
  }

  loading.value = true;
  error.value = null;
  try {
    const response = await api.get<{ content: string; path: string }>(
      `/api/assets/skills/${encodeURIComponent(name)}`
    );
    skillContent.value = response.content || '';
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load skill';
    skillContent.value = '';
  } finally {
    loading.value = false;
  }
}, { immediate: true });

async function copyContent() {
  if (!skillContent.value) return;
  try {
    await navigator.clipboard.writeText(skillContent.value);
    copied.value = true;
    setTimeout(() => copied.value = false, 2000);
  } catch {
    // ignore
  }
}

onMounted(() => {
  if (props.skillName) {
    selectedSkill.value = props.skillName;
  }
});
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Skill 列表 -->
    <div v-if="skills.length > 1" class="border-b border-border p-3">
      <div class="text-xs text-muted-foreground mb-2">选择 Skill</div>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="skill in skills"
          :key="skill.name"
          @click="selectedSkill = skill.name"
          class="px-2 py-1 text-xs rounded-md transition-colors"
          :class="selectedSkill === skill.name
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'"
        >
          {{ skill.name }}
        </button>
      </div>
    </div>

    <!-- Skill 内容 -->
    <div class="flex-1 overflow-hidden flex flex-col">
      <!-- 头部 -->
      <div v-if="selectedSkill" class="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <div class="flex items-center gap-2">
          <Zap class="w-4 h-4 text-primary" />
          <span class="text-sm font-medium">{{ selectedSkill }}</span>
        </div>
        <div class="flex items-center gap-1">
          <button
            @click="copyContent"
            class="p-1.5 rounded hover:bg-muted transition-colors"
            title="复制内容"
          >
            <Check v-if="copied" class="w-4 h-4 text-green-500" />
            <Copy v-else class="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="flex-1 flex items-center justify-center">
        <Loader2 class="w-6 h-6 animate-spin text-muted-foreground" />
      </div>

      <!-- 错误 -->
      <div v-else-if="error" class="flex-1 flex items-center justify-center p-4">
        <div class="text-center">
          <p class="text-sm text-red-500">{{ error }}</p>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="skills.length === 0" class="flex-1 flex items-center justify-center p-4">
        <div class="text-center">
          <div class="w-12 h-12 mx-auto rounded-xl bg-muted/50 flex items-center justify-center mb-3">
            <FolderOpen class="w-6 h-6 text-muted-foreground" />
          </div>
          <p class="text-sm text-muted-foreground">该会话没有关联的 Skill</p>
        </div>
      </div>

      <!-- 内容 -->
      <div v-else-if="skillContent" class="flex-1 overflow-y-auto p-4">
        <pre class="text-xs font-mono whitespace-pre-wrap break-words bg-muted/30 p-3 rounded-lg border border-border/50">{{ skillContent }}</pre>
      </div>

      <!-- 无内容 -->
      <div v-else-if="selectedSkill" class="flex-1 flex items-center justify-center p-4">
        <p class="text-sm text-muted-foreground">无法加载 Skill 内容</p>
      </div>
    </div>
  </div>
</template>
