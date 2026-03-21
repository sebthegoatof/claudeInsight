<script setup lang="ts">
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogClose } from 'radix-vue';
import { X } from 'lucide-vue-next';
import { ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    open?: boolean;
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  }>(),
  {
    open: false,
    title: '',
    size: 'md',
  }
);

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
}>();

const isOpen = ref(props.open);

watch(
  () => props.open,
  (val) => {
    isOpen.value = val;
  }
);

watch(isOpen, (val) => {
  emit('update:open', val);
});


const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[90vw] max-h-[90vh]',
};
</script>

<template>
  <DialogRoot v-model:open="isOpen">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      />
      <DialogContent
        :class="[
          'fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg shadow-lg duration-200',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          sizeClasses[size],
        ]"
      >
        <!-- Header -->
        <div v-if="title || $slots.header" class="flex items-center justify-between px-6 py-4 border-b border-border">
          <DialogTitle class="text-lg font-semibold">
            <slot name="header">{{ title }}</slot>
          </DialogTitle>
          <DialogClose
            class="p-1.5 rounded-md hover:bg-muted transition-colors"
            aria-label="关闭"
          >
            <X class="w-4 h-4 text-muted-foreground" />
          </DialogClose>
        </div>

        <!-- Body -->
        <div class="px-6 py-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          <slot />
        </div>

        <!-- Footer -->
        <div v-if="$slots.footer" class="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <slot name="footer" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
