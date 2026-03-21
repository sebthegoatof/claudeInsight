<script setup lang="ts">
import { watch } from 'vue';
import { useMarkdown } from '../../composables/useMarkdown';

interface Props {
  content: string;
}

const props = defineProps<Props>();
const { rendered, render } = useMarkdown();

watch(
  () => props.content,
  (newContent) => {
    if (newContent) {
      render(newContent);
    }
  },
  { immediate: true }
);
</script>

<template>
  <div
    class="message-content prose prose-sm dark:prose-invert max-w-none"
    v-html="rendered"
  />
</template>

<style>
.message-content {
  @apply text-sm leading-relaxed;
}

/* 段落 */
.message-content p {
  @apply my-2;
}

/* 标题 */
.message-content h1,
.message-content h2,
.message-content h3,
.message-content h4 {
  @apply my-3 font-semibold text-foreground;
}

.message-content h1 {
  @apply text-lg;
}

.message-content h2 {
  @apply text-base;
}

.message-content h3,
.message-content h4 {
  @apply text-sm;
}

/* 列表 */
.message-content ul,
.message-content ol {
  @apply my-2 pl-6;
}

.message-content li {
  @apply my-1;
}

.message-content ul li {
  @apply list-disc;
}

.message-content ol li {
  @apply list-decimal;
}

/* 引用 */
.message-content blockquote {
  @apply my-3 pl-4 border-l-4 border-primary/50 bg-muted/30 py-2 pr-4 rounded-r;
}

.message-content blockquote p {
  @apply my-0 text-muted-foreground;
}

/* 链接 */
.message-content a {
  @apply text-primary hover:underline underline-offset-2;
}

/* 内联代码 */
.message-content code:not(pre code) {
  @apply px-1.5 py-0.5 rounded bg-muted font-mono text-sm;
  @apply before:content-none after:content-none;
}

/* 代码块包装器 */
.message-content .code-block-wrapper {
  @apply my-3 rounded-lg overflow-hidden border border-border;
}

/* 代码块头部 */
.message-content .code-block-header {
  @apply flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border text-xs;
}

.message-content .code-block-lang {
  @apply text-muted-foreground font-mono;
}

.message-content .code-block-copy {
  @apply px-2 py-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors;
}

/* Shiki 代码高亮 */
.message-content .shiki {
  @apply p-4 text-sm overflow-x-auto;
}

.message-content .shiki,
.message-content .shiki span {
  @apply bg-transparent;
}

/* 普通代码块 */
.message-content pre:not(.diff-block pre) {
  @apply my-3 rounded-lg overflow-hidden;
}

.message-content pre code {
  @apply block p-4 text-sm overflow-x-auto font-mono;
  @apply bg-muted/50;
}

/* Diff 代码块 */
.message-content .diff-block {
  @apply my-3 rounded-lg overflow-hidden border border-border bg-muted/30;
}

.message-content .diff-block pre {
  @apply p-0 m-0;
}

.message-content .diff-block code {
  @apply block p-4 text-sm overflow-x-auto font-mono leading-relaxed;
}

.message-content .diff-line {
  @apply flex leading-relaxed;
}

.message-content .diff-line-num {
  @apply w-8 flex-shrink-0 text-right pr-3 select-none text-muted-foreground/50;
}

.message-content .diff-content {
  @apply flex-1 whitespace-pre;
}

.message-content .diff-add {
  @apply bg-green-500/10;
}

.message-content .diff-add .diff-content {
  @apply text-green-600 dark:text-green-400;
}

.message-content .diff-remove {
  @apply bg-red-500/10;
}

.message-content .diff-remove .diff-content {
  @apply text-red-600 dark:text-red-400;
}

.message-content .diff-header {
  @apply bg-primary/10 text-primary;
}

.message-content .diff-context .diff-content {
  @apply text-muted-foreground;
}

/* 表格 */
.message-content table {
  @apply my-3 w-full border-collapse;
}

.message-content th,
.message-content td {
  @apply border border-border px-3 py-2 text-left;
}

.message-content th {
  @apply bg-muted/50 font-semibold;
}

/* 分割线 */
.message-content hr {
  @apply my-4 border-border;
}

/* 图片 */
.message-content img {
  @apply my-2 rounded-lg max-w-full;
}

/* 强调 */
.message-content strong {
  @apply font-semibold;
}

.message-content em {
  @apply italic;
}

/* 键盘按键 */
.message-content kbd {
  @apply px-1.5 py-0.5 text-xs font-mono bg-muted border border-border rounded;
}

/* 脚注 */
.message-content .footnotes {
  @apply mt-6 pt-4 border-t border-border text-xs text-muted-foreground;
}
</style>
