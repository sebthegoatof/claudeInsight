<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAppStore } from '../../stores/appStore';
import { useProjectStore } from '../../stores/projectStore';
import { useConversationStore } from '../../stores/conversationStore';
import { useLayoutStore } from '../../stores/layoutStore';
import ProfileSelector from '../model/ProfileSelector.vue';
import {
  PanelLeftClose,
  PanelLeft,
  RefreshCw,
  FolderOpen,
  History,
  Settings,
  Terminal,
  Database,
  Zap,
  Puzzle,
  Cpu,
} from 'lucide-vue-next';

const route = useRoute();
const appStore = useAppStore();
const projectStore = useProjectStore();
const conversationStore = useConversationStore();
const layoutStore = useLayoutStore();

const sidebarWidth = computed(() => (appStore.sidebarCollapsed ? 'w-16' : 'w-60'));

onMounted(() => {
  projectStore.fetchProjects();
});

async function handleScan() {
  await appStore.scanHistory();
  await projectStore.fetchProjects();
  await conversationStore.fetchTimeline();
}

function selectProject(project: typeof projectStore.projects[0] | null) {
  layoutStore.setCurrentProject(project?.encodedPath ?? null);
  if (project) {
    conversationStore.fetchProjectSessions(project.encodedPath);
  } else {
    conversationStore.fetchTimeline();
  }
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

const currentPath = computed(() => route.path);
</script>

<template>
  <aside
    :class="[
      sidebarWidth,
      'flex flex-col border-r border-border bg-card/50 transition-all duration-300 h-full',
    ]"
  >
    <!-- 头部 -->
    <div class="flex items-center justify-between p-3 border-b border-border">
      <div v-if="!appStore.sidebarCollapsed" class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Terminal class="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 class="text-sm font-semibold">Claude Insight</h1>
          <p class="text-[10px] text-muted-foreground">History Analyzer</p>
        </div>
      </div>
      <button
        @click="appStore.toggleSidebar"
        class="p-2 rounded-md hover:bg-muted transition-colors"
        :title="appStore.sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
      >
        <PanelLeftClose v-if="!appStore.sidebarCollapsed" class="w-4 h-4" />
        <PanelLeft v-else class="w-4 h-4" />
      </button>
    </div>

    <!-- 操作按钮 -->
    <div class="p-2 border-b border-border space-y-1">
      <!-- 扫描按钮 -->
      <button
        @click="handleScan"
        :disabled="appStore.scanning"
        class="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm group"
        :class="{ 'justify-center': appStore.sidebarCollapsed }"
      >
        <RefreshCw
          :class="[
            'w-4 h-4',
            { 'animate-spin': appStore.scanning },
            { 'group-hover:rotate-180 transition-transform duration-500': !appStore.scanning },
          ]"
        />
        <span v-if="!appStore.sidebarCollapsed">扫描历史</span>
      </button>

      <!-- 全部会话 -->
      <RouterLink
        to="/"
        class="w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm"
        :class="[
          { 'justify-center': appStore.sidebarCollapsed },
          currentPath === '/'
            ? 'bg-primary/10 text-primary'
            : 'hover:bg-muted',
        ]"
      >
        <History class="w-4 h-4" />
        <span v-if="!appStore.sidebarCollapsed">全部会话</span>
        <span
          v-if="!appStore.sidebarCollapsed && currentPath === '/'"
          class="ml-auto text-xs text-muted-foreground"
        >
          {{ appStore.stats.totalConversations }}
        </span>
      </RouterLink>
    </div>

    <!-- 统计信息 -->
    <div v-if="!appStore.sidebarCollapsed" class="px-3 py-2 border-b border-border">
      <div class="flex items-center gap-4 text-xs text-muted-foreground">
        <div class="flex items-center gap-1">
          <Database class="w-3 h-3" />
          <span>{{ appStore.stats.totalProjects }} 项目</span>
        </div>
        <div class="flex items-center gap-1">
          <Zap class="w-3 h-3" />
          <span>{{ appStore.stats.totalMessages }} 消息</span>
        </div>
      </div>
    </div>

    <!-- Model Profile Selector -->
    <div v-if="!appStore.sidebarCollapsed" class="px-2 py-2 border-b border-border">
      <ProfileSelector />
    </div>

    <!-- 项目列表 -->
    <div v-if="!appStore.sidebarCollapsed" class="flex-1 overflow-y-auto p-2">
      <div class="flex items-center justify-between px-3 py-2">
        <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          项目
        </span>
        <span class="text-xs text-muted-foreground">
          {{ projectStore.projects.length }}
        </span>
      </div>
      <div class="space-y-0.5">
        <button
          v-for="project in projectStore.projects"
          :key="project.encodedPath"
          @click="selectProject(project)"
          class="w-full flex items-start gap-2 px-3 py-2 rounded-md transition-colors text-left group"
          :class="{
            'bg-primary/10 text-primary':
              layoutStore.viewMode === 'project' &&
              layoutStore.currentProjectId === project.encodedPath,
            'hover:bg-muted':
              !(
                layoutStore.viewMode === 'project' &&
                layoutStore.currentProjectId === project.encodedPath
              ),
          }"
        >
          <FolderOpen class="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium truncate">{{ project.name }}</div>
            <div class="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span>{{ project.sessionCount }} 会话</span>
              <span>·</span>
              <span>{{ formatDate(project.lastActivityAt) }}</span>
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- 底部导航 -->
    <div v-if="!appStore.sidebarCollapsed" class="p-3 border-t border-border space-y-1">
      <RouterLink
        to="/model-profiles"
        class="flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors"
        :class="[
          currentPath === '/model-profiles'
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        ]"
      >
        <Cpu class="w-4 h-4" />
        <span>模型配置</span>
      </RouterLink>
      <RouterLink
        to="/plugins"
        class="flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors"
        :class="[
          currentPath === '/plugins'
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        ]"
      >
        <Puzzle class="w-4 h-4" />
        <span>插件管理</span>
      </RouterLink>
      <RouterLink
        to="/settings"
        class="flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors"
        :class="[
          currentPath === '/settings'
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        ]"
      >
        <Settings class="w-4 h-4" />
        <span>设置</span>
      </RouterLink>
    </div>

    <!-- 收起状态的底部图标 -->
    <div v-else class="p-2 border-t border-border space-y-1">
      <RouterLink
        to="/model-profiles"
        class="flex items-center justify-center p-2 rounded-md transition-colors"
        :class="[
          currentPath === '/model-profiles'
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        ]"
        title="模型配置"
      >
        <Cpu class="w-4 h-4" />
      </RouterLink>
      <RouterLink
        to="/plugins"
        class="flex items-center justify-center p-2 rounded-md transition-colors"
        :class="[
          currentPath === '/plugins'
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        ]"
        title="插件管理"
      >
        <Puzzle class="w-4 h-4" />
      </RouterLink>
      <RouterLink
        to="/settings"
        class="flex items-center justify-center p-2 rounded-md transition-colors"
        :class="[
          currentPath === '/settings'
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        ]"
        title="设置"
      >
        <Settings class="w-4 h-4" />
      </RouterLink>
    </div>
  </aside>
</template>
