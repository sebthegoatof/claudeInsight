<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { useAppStore } from '@/stores/appStore';
import { useSearchStore } from '@/stores/searchStore';
import ProfileSelector from '@/components/model/ProfileSelector.vue';
import {
  LayoutDashboard,
  History,
  Search,
  Settings,
  Terminal,
  FolderOpen,
  ListTodo,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const searchStore = useSearchStore();

interface NavItem {
  id: string;
  icon: typeof History;
  label: string;
  route?: string;
  action?: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: '概览', route: '/' },
  { id: 'all', icon: History, label: '全部会话', route: '/sessions' },
  { id: 'tasks', icon: ListTodo, label: '任务', route: '/tasks' },
  { id: 'assets', icon: FolderOpen, label: '资产管理', route: '/assets' },
  { id: 'search', icon: Search, label: '全局搜索', action: 'openSearch' },
  { id: 'settings', icon: Settings, label: '设置', route: '/settings' },
];

function handleNavClick(item: NavItem) {
  if (item.action === 'openSearch') {
    searchStore.openSearch();
  } else if (item.route) {
    router.push(item.route);
  }
}

function isActive(item: NavItem): boolean {
  if (!item.route) return false;
  if (item.route === '/') {
    return route.path === '/';
  }
  return route.path.startsWith(item.route);
}
</script>

<template>
  <aside
    class="w-12 flex flex-col items-center py-3 border-r border-border bg-card/50"
  >
    <!-- Logo -->
    <div
      class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-6 cursor-pointer"
      @click="router.push('/')"
      title="Claude Insight"
    >
      <Terminal class="w-4 h-4 text-primary" />
    </div>

    <!-- Navigation Items -->
    <nav class="flex-1 flex flex-col items-center gap-1">
      <button
        v-for="item in navItems"
        :key="item.id"
        @click="handleNavClick(item)"
        class="w-9 h-9 flex items-center justify-center rounded-md transition-colors"
        :class="[
          isActive(item)
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        ]"
        :title="item.label"
      >
        <component :is="item.icon" class="w-4 h-4" />
      </button>
    </nav>

    <!-- Profile Selector (at bottom) -->
    <div class="w-full px-1 mb-2">
      <ProfileSelector />
    </div>

    <!-- Stats Badge -->
    <div
      class="mt-auto text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded"
      :title="`${appStore.stats.totalConversations} 会话`"
    >
      {{ appStore.stats.totalConversations }}
    </div>
  </aside>
</template>
