<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useDashboardStore } from '@/stores/dashboardStore';
import { useProjectStore } from '@/stores/projectStore';
import { CheckCircle, Circle, Clock, ExternalLink, ListTodo, Filter } from 'lucide-vue-next';
import { ref } from 'vue';

const router = useRouter();
const dashboardStore = useDashboardStore();
const projectStore = useProjectStore();

const activeTab = ref<'tasks' | 'todos'>('tasks');
const statusFilter = ref<string>('all');

onMounted(async () => {
  await Promise.all([
    dashboardStore.fetchTasks(),
    dashboardStore.fetchTodos(),
    projectStore.fetchProjects(),
  ]);
});

// 过滤后的任务
const filteredTasks = computed(() => {
  let tasks = dashboardStore.tasks;
  if (statusFilter.value !== 'all') {
    tasks = tasks.filter(t => t.status === statusFilter.value);
  }
  return tasks;
});

// 过滤后的 Todos
const filteredTodos = computed(() => {
  let todos = dashboardStore.todos;
  if (statusFilter.value === 'completed') {
    todos = todos.filter(t => t.completed);
  } else if (statusFilter.value === 'pending') {
    todos = todos.filter(t => !t.completed);
  }
  return todos;
});

// 统计
const taskStats = computed(() => {
  const tasks = dashboardStore.tasks;
  return {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    pending: tasks.filter(t => t.status === 'pending').length,
  };
});

const todoStats = computed(() => {
  const todos = dashboardStore.todos;
  return {
    total: todos.length,
    completed: todos.filter(t => t.completed).length,
    pending: todos.filter(t => !t.completed).length,
  };
});

// 跳转到会话
function goToSession(sessionId: string) {
  // 查找该会话对应的项目
  const task = dashboardStore.tasks.find(t => t.sessionId === sessionId);
  const todo = dashboardStore.todos.find(t => t.sessionId === sessionId);
  const projectPath = task?.sessionId || todo?.sessionId;

  router.push({
    path: '/sessions',
    query: { sessionId, project: projectPath },
  });
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString('zh-CN');
}
</script>

<template>
  <div class="h-full flex flex-col bg-background">
    <!-- Header -->
    <div class="flex-shrink-0 border-b border-border px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold">任务 & TODO</h1>
          <p class="text-sm text-muted-foreground mt-1">
            跨会话任务追踪与待办管理
          </p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex items-center gap-4 mt-4">
        <button
          @click="activeTab = 'tasks'"
          class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="activeTab === 'tasks' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
        >
          <Clock class="w-4 h-4" />
          任务
          <span class="px-1.5 py-0.5 rounded text-xs bg-white/20">
            {{ taskStats.total }}
          </span>
        </button>
        <button
          @click="activeTab = 'todos'"
          class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="activeTab === 'todos' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
        >
          <ListTodo class="w-4 h-4" />
          TODO
          <span class="px-1.5 py-0.5 rounded text-xs bg-white/20">
            {{ todoStats.total }}
          </span>
        </button>

        <div class="flex-1" />

        <!-- Filter -->
        <div class="flex items-center gap-2">
          <Filter class="w-4 h-4 text-muted-foreground" />
          <select
            v-model="statusFilter"
            class="px-3 py-1.5 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">全部</option>
            <option value="pending">待处理</option>
            <option value="in_progress">进行中</option>
            <option value="completed">已完成</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Stats Bar -->
    <div class="flex-shrink-0 px-6 py-3 bg-muted/30 border-b border-border">
      <div class="flex items-center gap-6 text-sm">
        <template v-if="activeTab === 'tasks'">
          <span class="text-muted-foreground">
            已完成: <span class="text-emerald-500 font-medium">{{ taskStats.completed }}</span>
          </span>
          <span class="text-muted-foreground">
            进行中: <span class="text-amber-500 font-medium">{{ taskStats.inProgress }}</span>
          </span>
          <span class="text-muted-foreground">
            待处理: <span class="text-muted-foreground font-medium">{{ taskStats.pending }}</span>
          </span>
        </template>
        <template v-else>
          <span class="text-muted-foreground">
            已完成: <span class="text-emerald-500 font-medium">{{ todoStats.completed }}</span>
          </span>
          <span class="text-muted-foreground">
            待处理: <span class="text-muted-foreground font-medium">{{ todoStats.pending }}</span>
          </span>
        </template>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto p-6">
      <!-- Tasks List -->
      <div v-if="activeTab === 'tasks'" class="space-y-3">
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          class="p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors group"
        >
          <div class="flex items-start gap-3">
            <Clock
              class="w-5 h-5 mt-0.5 flex-shrink-0"
              :class="{
                'text-emerald-500': task.status === 'completed',
                'text-amber-500': task.status === 'in_progress',
                'text-muted-foreground': task.status === 'pending',
              }"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="font-medium">{{ task.subject }}</h3>
                <span
                  class="px-2 py-0.5 text-[10px] rounded-full"
                  :class="{
                    'bg-emerald-500/20 text-emerald-500': task.status === 'completed',
                    'bg-amber-500/20 text-amber-500': task.status === 'in_progress',
                    'bg-muted text-muted-foreground': task.status === 'pending',
                  }"
                >
                  {{ task.status }}
                </span>
              </div>
              <p v-if="task.description" class="text-sm text-muted-foreground mt-1 line-clamp-2">
                {{ task.description }}
              </p>
              <div class="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>{{ formatDate(task.updatedAt) }}</span>
                <span class="truncate max-w-48">{{ task.sessionId.slice(0, 8) }}...</span>
              </div>
            </div>
            <button
              @click="goToSession(task.sessionId)"
              class="opacity-0 group-hover:opacity-100 p-2 hover:bg-muted rounded transition-all"
              title="查看会话"
            >
              <ExternalLink class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          v-if="filteredTasks.length === 0"
          class="flex flex-col items-center justify-center py-16 text-muted-foreground"
        >
          <Clock class="w-12 h-12 mb-4 opacity-30" />
          <p class="text-sm">没有找到任务</p>
        </div>
      </div>

      <!-- Todos List -->
      <div v-else class="space-y-2">
        <div
          v-for="todo in filteredTodos"
          :key="todo.id"
          class="p-3 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors group flex items-center gap-3"
        >
          <CheckCircle
            v-if="todo.completed"
            class="w-5 h-5 text-emerald-500 flex-shrink-0"
          />
          <Circle
            v-else
            class="w-5 h-5 text-muted-foreground flex-shrink-0"
          />
          <div class="flex-1 min-w-0">
            <p
              class="text-sm"
              :class="todo.completed ? 'text-muted-foreground line-through' : ''"
            >
              {{ todo.content }}
            </p>
            <span class="text-xs text-muted-foreground">
              {{ formatDate(todo.updatedAt) }}
            </span>
          </div>
          <button
            @click="goToSession(todo.sessionId)"
            class="opacity-0 group-hover:opacity-100 p-2 hover:bg-muted rounded transition-all"
            title="查看会话"
          >
            <ExternalLink class="w-4 h-4" />
          </button>
        </div>

        <div
          v-if="filteredTodos.length === 0"
          class="flex flex-col items-center justify-center py-16 text-muted-foreground"
        >
          <ListTodo class="w-12 h-12 mb-4 opacity-30" />
          <p class="text-sm">没有找到 TODO</p>
        </div>
      </div>
    </div>
  </div>
</template>
