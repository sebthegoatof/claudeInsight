<script setup lang="ts">
import { computed } from 'vue';
import { useLinkageStore } from '@/stores/linkageStore';
import { X, CheckCircle, Circle, Clock, ListTodo } from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const linkageStore = useLinkageStore();

const tasks = computed(() => linkageStore.currentLinks?.tasks || []);
const todos = computed(() => linkageStore.currentLinks?.todos || []);

const completedTodos = computed(() => todos.value.filter(t => t.completed).length);
const totalTodos = computed(() => todos.value.length);
</script>

<template>
  <div class="h-full flex flex-col bg-card">
    <!-- Header -->
    <div class="h-10 flex-shrink-0 border-b border-border flex items-center justify-between px-4">
      <div class="flex items-center gap-2">
        <ListTodo class="w-4 h-4 text-primary" />
        <span class="text-sm font-medium">任务 & TODO</span>
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
      <!-- Tasks Section -->
      <div v-if="tasks.length > 0" class="mb-6">
        <h3 class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          任务列表 ({{ tasks.length }})
        </h3>
        <div class="space-y-2">
          <div
            v-for="task in tasks"
            :key="task.id"
            class="p-3 bg-muted/30 rounded-lg"
          >
            <div class="flex items-start gap-2">
              <Clock
                class="w-4 h-4 mt-0.5 flex-shrink-0"
                :class="task.status === 'completed' ? 'text-emerald-500' : 'text-amber-500'"
              />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium">{{ task.subject }}</div>
                <div v-if="task.description" class="text-xs text-muted-foreground mt-1">
                  {{ task.description }}
                </div>
                <div class="text-[10px] text-muted-foreground mt-1">
                  状态: {{ task.status }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Todos Section -->
      <div v-if="todos.length > 0">
        <h3 class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          TODO ({{ completedTodos }}/{{ totalTodos }})
        </h3>
        <div class="space-y-1.5">
          <div
            v-for="todo in todos"
            :key="todo.id"
            class="flex items-center gap-2 p-2 rounded hover:bg-muted/30"
          >
            <CheckCircle
              v-if="todo.completed"
              class="w-4 h-4 text-emerald-500 flex-shrink-0"
            />
            <Circle
              v-else
              class="w-4 h-4 text-muted-foreground flex-shrink-0"
            />
            <span
              class="text-sm"
              :class="todo.completed ? 'text-muted-foreground line-through' : ''"
            >
              {{ todo.content }}
            </span>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="tasks.length === 0 && todos.length === 0"
        class="flex flex-col items-center justify-center h-32 text-muted-foreground"
      >
        <ListTodo class="w-8 h-8 mb-2 opacity-50" />
        <span class="text-sm">该会话没有任务或 TODO</span>
      </div>
    </div>
  </div>
</template>
