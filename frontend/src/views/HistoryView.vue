<script setup lang="ts">
import { onMounted, computed, watch } from 'vue';
import { useAppStore } from '@/stores/appStore';
import { useProjectStore } from '@/stores/projectStore';
import { useConversationStore } from '@/stores/conversationStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { useSkillStore } from '@/stores/skillStore';
import ConversationList from '@/components/conversation/ConversationList.vue';
import ConversationDetail from '@/components/conversation/ConversationDetail.vue';
import ProjectOverview from '@/components/project/ProjectOverview.vue';
import { History, FolderOpen } from 'lucide-vue-next';

const appStore = useAppStore();
const projectStore = useProjectStore();
const conversationStore = useConversationStore();
const layoutStore = useLayoutStore();
const skillStore = useSkillStore();

// Current view mode
const viewMode = computed(() => layoutStore.viewMode);
const currentProject = computed(() => {
  if (!layoutStore.currentProjectId) return null;
  // 使用 encodedPath 查找项目
  return projectStore.projects.find((p) => p.encodedPath === layoutStore.currentProjectId) || null;
});

onMounted(async () => {
  await Promise.all([
    appStore.fetchStats(),
    projectStore.fetchProjects(),
    conversationStore.fetchTimeline(),
  ]);
});
// Watch for project selection changes
watch(
  () => layoutStore.currentProjectId,
  async (projectEncodedPath) => {
    if (projectEncodedPath) {
      await Promise.all([
        conversationStore.fetchProjectSessions(projectEncodedPath),
        skillStore.fetchProjectSkills(projectEncodedPath),
      ]);
    } else {
      await conversationStore.fetchTimeline();
      skillStore.clearSkills();
    }
  }
);

function selectProject(project: typeof projectStore.projects[0] | null) {
  layoutStore.setCurrentProject(project?.encodedPath ?? null);
  conversationStore.clearCurrentSession();
}

function formatDate(dateStr: string | null) {
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
</script>

<template>
  <div class="flex h-full">
    <!-- Project List Sidebar -->
    <aside class="w-56 flex-shrink-0 border-r border-border bg-card/30 flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-3 border-b border-border">
        <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          项目
        </span>
      </div>

      <!-- All Conversations -->
      <button
        @click="selectProject(null)"
        class="flex items-center gap-2 px-3 py-2 border-b border-border transition-colors text-sm"
        :class="[
          viewMode === 'all'
            ? 'bg-primary/10 text-primary'
            : 'hover:bg-muted',
        ]"
      >
        <History class="w-4 h-4" />
        <span>全部会话</span>
        <span class="ml-auto text-xs text-muted-foreground">
          {{ appStore.stats.totalConversations }}
        </span>
      </button>

      <!-- Project List -->
      <div class="flex-1 overflow-y-auto">
        <div class="p-2 space-y-0.5">
          <button
            v-for="project in projectStore.projects"
            :key="project.encodedPath"
            @click="selectProject(project)"
            class="w-full flex items-start gap-2 px-2 py-1.5 rounded-md transition-colors text-left group"
            :class="{
              'bg-primary/10 text-primary':
                viewMode === 'project' && layoutStore.currentProjectId === project.encodedPath,
              'hover:bg-muted':
                !(viewMode === 'project' && layoutStore.currentProjectId === project.encodedPath),
            }"
          >
            <FolderOpen class="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
            <div class="min-w-0 flex-1">
              <div class="text-xs font-medium truncate">{{ project.name }}</div>
              <div class="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                <span>{{ project.sessionCount }} 会话</span>
                <span>·</span>
                <span>{{ formatDate(project.lastActivityAt) }}</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="px-3 py-2 border-t border-border">
        <div class="flex items-center gap-4 text-[10px] text-muted-foreground">
          <span>{{ projectStore.projects.length }} 项目</span>
          <span>{{ appStore.stats.totalMessages }} 消息</span>
        </div>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="flex-1 flex min-w-0">
      <!-- Conversation List -->
      <div class="w-80 flex-shrink-0 border-r border-border flex flex-col bg-background">
        <ConversationList />
      </div>

      <!-- Detail View -->
      <div class="flex-1 min-w-0 bg-background">
        <!-- Project Overview or Conversation Detail -->
        <template v-if="viewMode === 'project' && currentProject">
          <ProjectOverview
            v-if="!conversationStore.selectedSessionId"
            :project="currentProject"
          />
          <ConversationDetail v-else />
        </template>
        <template v-else>
          <ConversationDetail />
        </template>
      </div>
    </div>
  </div>
</template>
