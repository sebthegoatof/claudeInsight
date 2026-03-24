<script setup lang="ts">
import { computed } from 'vue';
import { useLinkageStore } from '@/stores/linkageStore';
import {
  ListTodo,
  CheckCircle2,
  Circle,
  Loader2,
  Clock,
  ChevronRight,
} from 'lucide-vue-next';

const linkageStore = useLinkageStore();

const tasks = computed(() => linkageStore.currentLinks?.tasks || []);
const todos = computed(() => linkageStore.currentLinks?.todos || []);

const hasContent = computed(() => tasks.value.length > 0 || todos.value.length > 0);

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed':
      return CheckCircle2;
    case 'in_progress':
      return Loader2;
    case 'pending':
      return Clock;
    default:
      return Circle;
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case 'completed':
      return 'text-green-500';
    case 'in_progress':
      return 'text-blue-500';
    case 'pending':
      return 'text-muted-foreground';
    default:
      return 'text-muted-foreground';
  }
}

const completedTodos = computed(() => todos.value.filter(t => t.completed).length);
const todoProgress = computed(() => {
  if (todos.value.length === 0) return 0;
  return Math.round((completedTodos.value / todos.value.length) * 100);
});
</script>

<template>
  <div class="p-4">
    <!-- 空状态 -->
    <div v-if="!hasContent" class="text-center py-8">
      <div class="w-12 h-12 mx-auto rounded-xl bg-muted/50 flex items-center justify-center mb-3">
        <ListTodo class="w-6 h-6 text-muted-foreground" />
      </div>
      <p class="text-sm text-muted-foreground">该会话没有关联的任务或待办</p>
    </div>

    <!-- Tasks -->
    <div v-if="tasks.length > 0" class="mb-6">
      <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
        <ChevronRight class="w-3 h-3" />
        任务列表
      </h4>
      <div class="space-y-2">
        <div
          v-for="task in tasks"
          :key="task.id"
          class="p-3 rounded-lg bg-muted/30 border border-border/50"
        >
          <div class="flex items-start gap-2">
            <component
              :is="getStatusIcon(task.status)"
              class="w-4 h-4 mt-0.5 flex-shrink-0"
              :class="[getStatusClass(task.status), task.status === 'in_progress' ? 'animate-spin' : '']"
            />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium">{{ task.subject }}</div>
              <div v-if="task.description" class="text-xs text-muted-foreground mt-1 line-clamp-2">
                {{ task.description }}
              </div>
              <div class="flex items-center gap-2 mt-2">
                <span
                  class="text-[10px] px-1.5 py-0.5 rounded"
                  :class="task.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                          task.status === 'in_progress' ? 'bg-blue-500/10 text-blue-500' :
                          'bg-muted text-muted-foreground'"
                >
                  {{ task.status }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Todos -->
    <div v-if="todos.length > 0">
      <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
        <ChevronRight class="w-3 h-3" />
        待办事项
        <span class="ml-auto text-[10px] font-normal">
          {{ completedTodos }}/{{ todos.length }} 完成 ({{ todoProgress }}%)
        </span>
      </h4>

      <!-- 进度条 -->
      <div class="h-1.5 bg-muted rounded-full mb-3 overflow-hidden">
        <div
          class="h-full bg-green-500 transition-all duration-300"
          :style="{ width: `${todoProgress}%` }"
        />
      </div>

      <div class="space-y-1.5">
        <div
          v-for="(todo, idx) in todos"
          :key="idx"
          class="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/30 transition-colors"
        >
          <CheckCircle2
            v-if="todo.completed"
            class="w-4 h-4 text-green-500 flex-shrink-0"
          />
          <Circle v-else class="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span
            class="text-sm flex-1"
            :class="todo.completed ? 'text-muted-foreground line-through' : ''"
          >
            {{ todo.content }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
