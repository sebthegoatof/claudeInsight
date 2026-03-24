<script setup lang="ts">
import { watch } from 'vue';
import { X } from 'lucide-vue-next';

const props = withDefaults(defineProps<{
  open: boolean;
  title?: string;
  width?: string;
}>(), {
  width: '400px',
});

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'close'): void;
}>();

function close() {
  emit('update:open', false);
  emit('close');
}

// ESC 键关闭
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }
});
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-40 bg-black/50"
        @click="close"
      />
    </Transition>

    <!-- Panel -->
    <Transition
      enter-active-class="transition-transform duration-200 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-150 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div
        v-if="open"
        class="fixed inset-y-0 right-0 z-50 flex flex-col bg-card border-l border-border shadow-xl"
        :style="{ width }"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-4 h-12 border-b border-border flex-shrink-0">
          <h3 v-if="title" class="text-sm font-medium truncate">{{ title }}</h3>
          <slot name="header" />
          <button
            @click="close"
            class="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto">
          <slot />
        </div>

        <!-- Footer -->
        <div v-if="$slots.footer" class="border-t border-border px-4 py-3 flex-shrink-0">
          <slot name="footer" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
