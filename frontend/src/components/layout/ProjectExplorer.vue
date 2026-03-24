<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useLayoutStore } from '@/stores/layoutStore';
import { useProjectStore } from '@/stores/projectStore';
import { useConversationStore } from '@/stores/conversationStore';
import { useSkillStore } from '@/stores/skillStore';
import {
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  MessageSquare,
  FileText,
  Zap,
  FolderOpen,
  RefreshCw,
} from 'lucide-vue-next';
import type { Skill } from '@/types/skill';

const layoutStore = useLayoutStore();
const projectStore = useProjectStore();
const conversationStore = useConversationStore();
const skillStore = useSkillStore();

// Expanded sections state
const expandedSections = ref({
  conversations: true,
  spec: true,
  skills: true,
});

// Current project
const currentProject = computed(() => {
  if (!layoutStore.currentProjectId) return null;
  return projectStore.projects.find((p) => p.encodedPath === layoutStore.currentProjectId) || null;
});

// Project sessions
const projectSessions = computed(() => {
  return conversationStore.projectSessions;
});

// Project skills
const projectSkills = computed(() => {
  return skillStore.projectSkills;
});

// Loading states
const loadingConversations = computed(() => conversationStore.loading);
const loadingSkills = computed(() => skillStore.loading);

// Watch project changes
watch(
  () => layoutStore.currentProjectId,
  async (encodedPath) => {
    if (encodedPath) {
      await conversationStore.fetchProjectSessions(encodedPath);
      await skillStore.fetchProjectSkills(encodedPath);
    }
  },
  { immediate: true }
);

function toggleSection(section: keyof typeof expandedSections.value) {
  expandedSections.value[section] = !expandedSections.value[section];
}

function selectSession(sessionId: string) {
  const projectPath = currentProject.value?.path;  // 使用原始路径而不是 encodedPath
  if (projectPath) {
    conversationStore.selectSession(sessionId, projectPath);
  }
}

function selectSkill(skill: Skill) {
  skillStore.selectSkill(skill);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return '今天';
  } else if (diffDays === 1) {
    return '昨天';
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }
}

async function refreshProject() {
  if (layoutStore.currentProjectId) {
    await Promise.all([
      conversationStore.fetchProjectSessions(layoutStore.currentProjectId),
      skillStore.fetchProjectSkills(layoutStore.currentProjectId),
    ]);
  }
}
</script>

<template>
  <aside
    v-show="!layoutStore.explorerCollapsed"
    class="flex flex-col border-r border-border bg-card/30 overflow-hidden"
    :style="{ width: `${layoutStore.explorerWidth}px` }"
  >
    <!-- Header -->
    <div class="flex items-center justify-between p-3 border-b border-border">
      <div class="flex items-center gap-2 min-w-0">
        <FolderOpen class="w-4 h-4 text-primary flex-shrink-0" />
        <span class="text-sm font-medium truncate">
          {{ currentProject?.name || '选择项目' }}
        </span>
      </div>
      <div class="flex items-center gap-1">
        <button
          @click="refreshProject"
          class="p-1.5 rounded-md hover:bg-muted transition-colors"
          title="刷新"
        >
          <RefreshCw class="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button
          @click="layoutStore.toggleExplorer"
          class="p-1.5 rounded-md hover:bg-muted transition-colors"
          title="收起面板"
        >
          <PanelLeftClose class="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto">
      <template v-if="currentProject">
        <!-- Conversations Section -->
        <div class="border-b border-border">
          <button
            @click="toggleSection('conversations')"
            class="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors"
          >
            <ChevronDown
              v-if="expandedSections.conversations"
              class="w-4 h-4 text-muted-foreground"
            />
            <ChevronRight v-else class="w-4 h-4 text-muted-foreground" />
            <MessageSquare class="w-4 h-4 text-muted-foreground" />
            <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              会话记录
            </span>
            <span class="ml-auto text-xs text-muted-foreground">
              {{ projectSessions.length }}
            </span>
          </button>

          <div v-if="expandedSections.conversations" class="pb-2">
            <div v-if="loadingConversations" class="px-3 py-2 text-xs text-muted-foreground">
              加载中...
            </div>
            <div v-else-if="projectSessions.length === 0" class="px-3 py-2 text-xs text-muted-foreground">
              暂无会话
            </div>
            <div v-else class="space-y-0.5">
              <button
                v-for="session in projectSessions.slice(0, 10)"
                :key="session.sessionId"
                @click="selectSession(session.sessionId)"
                class="w-full flex items-start gap-2 px-3 py-1.5 hover:bg-muted/50 transition-colors text-left group"
                :class="{
                  'bg-primary/10': conversationStore.selectedSessionId === session.sessionId,
                }"
              >
                <MessageSquare class="w-3.5 h-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div class="min-w-0 flex-1">
                  <div class="text-xs truncate">{{ session.title }}</div>
                  <div class="text-[10px] text-muted-foreground mt-0.5">
                    {{ formatDate(session.lastModified) }}
                  </div>
                </div>
              </button>
              <div
                v-if="projectSessions.length > 10"
                class="px-3 py-1.5 text-xs text-muted-foreground text-center"
              >
                还有 {{ projectSessions.length - 10 }} 条会话...
              </div>
            </div>
          </div>
        </div>

        <!-- Spec Section -->
        <div class="border-b border-border">
          <button
            @click="toggleSection('spec')"
            class="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors"
          >
            <ChevronDown
              v-if="expandedSections.spec"
              class="w-4 h-4 text-muted-foreground"
            />
            <ChevronRight v-else class="w-4 h-4 text-muted-foreground" />
            <FileText class="w-4 h-4 text-muted-foreground" />
            <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              项目规范
            </span>
          </button>

          <div v-if="expandedSections.spec" class="pb-2">
            <button
              @click="$emit('edit-spec')"
              class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 transition-colors text-left group"
            >
              <FileText class="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <div class="min-w-0 flex-1">
                <div class="text-xs">CLAUDE.md</div>
                <div class="text-[10px] text-muted-foreground mt-0.5">
                  {{ currentProject.instructions ? '已配置' : '未配置' }}
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- Skills Section -->
        <div>
          <button
            @click="toggleSection('skills')"
            class="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors"
          >
            <ChevronDown
              v-if="expandedSections.skills"
              class="w-4 h-4 text-muted-foreground"
            />
            <ChevronRight v-else class="w-4 h-4 text-muted-foreground" />
            <Zap class="w-4 h-4 text-muted-foreground" />
            <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              本地技能
            </span>
            <span class="ml-auto text-xs text-muted-foreground">
              {{ projectSkills.length }}
            </span>
          </button>

          <div v-if="expandedSections.skills" class="pb-2">
            <div v-if="loadingSkills" class="px-3 py-2 text-xs text-muted-foreground">
              加载中...
            </div>
            <div v-else-if="projectSkills.length === 0" class="px-3 py-2 text-xs text-muted-foreground">
              暂无技能
            </div>
            <div v-else class="space-y-0.5">
              <button
                v-for="skill in projectSkills"
                :key="skill.id"
                @click="selectSkill(skill)"
                class="w-full flex items-start gap-2 px-3 py-1.5 hover:bg-muted/50 transition-colors text-left group"
              >
                <Zap class="w-3.5 h-3.5 mt-0.5 text-amber-500 flex-shrink-0" />
                <div class="min-w-0 flex-1">
                  <div class="text-xs truncate">{{ skill.name }}</div>
                  <div v-if="skill.description" class="text-[10px] text-muted-foreground mt-0.5 truncate">
                    {{ skill.description }}
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- No project selected -->
      <div v-else class="p-4 text-center">
        <div class="text-xs text-muted-foreground">
          从左侧项目列表中选择一个项目
        </div>
      </div>
    </div>
  </aside>

  <!-- Collapsed toggle button -->
  <button
    v-if="layoutStore.explorerCollapsed"
    @click="layoutStore.toggleExplorer"
    class="w-8 h-8 flex items-center justify-center border-r border-b border-border bg-card/50 rounded-br-md hover:bg-muted transition-colors"
    title="展开面板"
  >
    <PanelLeft class="w-4 h-4 text-muted-foreground" />
  </button>
</template>
