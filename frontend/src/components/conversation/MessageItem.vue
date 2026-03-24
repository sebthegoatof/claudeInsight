<script setup lang="ts">
import { computed, ref } from 'vue';
import MessageContent from './MessageContent.vue';
import FileVersionBadges from './FileVersionBadges.vue';
import type { Message } from '../../types/conversation';
import type { SessionFileHistory } from '../../api/backup';
import {
  User,
  Sparkles,
  Settings,
  Info,
  ChevronDown,
  ChevronRight,
  XCircle,
  AlertTriangle,
  X,
  Cpu,
  Zap,
  FileCode,
} from 'lucide-vue-next';

interface Props {
  message: Message;
  index: number;
  fileHistory?: SessionFileHistory | null;
  sessionId?: string;
  nextMessageTime?: string | null;  // 下一条消息的时间戳，用于确定文件变更的时间范围
}

const props = defineProps<Props>();

// 是否为噪音消息（system_event / interrupt / error 被 showSystemMessages 打开后显示）
const isNoise = computed(() => props.message.is_system_noise === true);

// 是否为用户消息
const isUser = computed(() => props.message.role === 'user');

// 折叠状态（用于噪音消息展开）
const isExpanded = ref(false);

// 图片预览
const showImagePreview = ref(false);
const previewImageUrl = ref('');

// 噪音消息图标
const noiseIcon = computed(() => {
  switch (props.message.message_type) {
    case 'interrupt':
      return XCircle;
    case 'system_event':
      return Settings;
    case 'error':
      return AlertTriangle;
    default:
      return Info;
  }
});

// 噪音消息标签
const noiseLabel = computed(() => props.message.sub_type || '系统信息');

// 噪音消息颜色
const noiseColor = computed(() => {
  switch (props.message.message_type) {
    case 'interrupt':
      return 'text-orange-500';
    case 'error':
      return 'text-red-500';
    case 'system_event':
      return 'text-purple-500';
    default:
      return 'text-muted-foreground';
  }
});

// 是否可展开
const canExpand = computed(() => {
  return props.message.content && props.message.content.length > 200;
});

// 预览内容（噪音消息用）
const noisePreview = computed(() => {
  if (!props.message.content) return '';
  if (!canExpand.value || isExpanded.value) return props.message.content;
  return props.message.content.slice(0, 200) + '...';
});

// 是否有图片
const hasImages = computed(() => {
  return props.message.images && props.message.images.length > 0;
});

// 是否有 Token 使用信息
const hasTokenUsage = computed(() => {
  return props.message.tokenUsage && (
    props.message.tokenUsage.input_tokens > 0 ||
    props.message.tokenUsage.output_tokens > 0
  );
});

// 获取该用户消息后发生的文件变更（直到下一条用户消息）
const userFileChanges = computed(() => {
  if (!isUser.value || !props.fileHistory?.files?.length || !props.message.timestamp) return [];

  const messageTime = new Date(props.message.timestamp);
  // 结束时间：下一条消息时间，或者当前时间 + 5 分钟
  const endTime = props.nextMessageTime ? new Date(props.nextMessageTime) : new Date(messageTime.getTime() + 5 * 60 * 1000);

  // 扩展时间范围：向前 2 秒，向后直到下一条消息
  const searchStart = new Date(messageTime.getTime() - 2000);

  // 筛选在该时间范围内创建的文件版本
  const changes: Array<{
    filePath: string;
    versions: Array<{ backupFileName: string; version: number; size: number; backupTime: string }>;
  }> = [];

  for (const file of props.fileHistory.files) {
    const matchingVersions = file.versions.filter(v => {
      const backupTime = new Date(v.backupTime);
      return backupTime >= searchStart && backupTime <= endTime;
    });

    if (matchingVersions.length > 0) {
      changes.push({
        filePath: file.filePath,
        versions: matchingVersions,
      });
    }
  }

  return changes;
});

function formatTime(timestamp?: string) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toggleExpand() {
  isExpanded.value = !isExpanded.value;
}

function openImagePreview(url: string) {
  previewImageUrl.value = url;
  showImagePreview.value = true;
}

function closeImagePreview() {
  showImagePreview.value = false;
  previewImageUrl.value = '';
}

// 格式化 Token 数量
function formatTokens(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

// 获取模型简短名称
function getModelShortName(model: string): string {
  if (!model) return '';
  const match = model.match(/claude[-_](\d+[-_]?\d*)[-_](\w+)/i);
  if (match) {
    const version = match[1].replace('-', '.');
    const name = match[2].charAt(0).toUpperCase() + match[2].slice(1);
    return `${name} ${version}`;
  }
  return model.split('/').pop() || model;
}

// 计算单步总 Token
const stepTotalTokens = computed(() => {
  if (!props.message.tokenUsage) return 0;
  return (props.message.tokenUsage.input_tokens || 0) +
         (props.message.tokenUsage.output_tokens || 0) +
         (props.message.tokenUsage.cache_read_input_tokens || 0);
});
</script>

<template>
  <!-- 噪音消息 (system_event / interrupt / error) -->
  <div
    v-if="isNoise"
    class="px-4 py-2 group border-b border-border/30 bg-muted/5"
  >
    <div class="flex gap-2 items-start">
      <div
        class="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center bg-muted/50"
        :class="noiseColor"
      >
        <component :is="noiseIcon" class="w-3 h-3" />
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-[11px] font-medium text-muted-foreground">
            {{ noiseLabel }}
          </span>

          <button
            v-if="canExpand"
            @click="toggleExpand"
            class="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
          >
            <ChevronDown v-if="isExpanded" class="w-3 h-3" />
            <ChevronRight v-else class="w-3 h-3" />
            <span>{{ isExpanded ? '收起' : '展开' }}</span>
          </button>
        </div>

        <div
          v-if="isExpanded"
          class="text-xs text-muted-foreground/70 bg-muted/30 rounded p-2 max-h-60 overflow-y-auto"
        >
          <pre class="whitespace-pre-wrap font-sans break-words">{{ message.content }}</pre>
        </div>
        <div v-else class="text-xs text-muted-foreground/60 line-clamp-1">
          {{ noisePreview }}
        </div>
      </div>
    </div>
  </div>

  <!-- 正常消息 - 聊天气泡风格 -->
  <div
    v-else
    :class="[
      'px-4 md:px-6 py-4 group',
      isUser ? 'bg-muted/30' : 'bg-background',
    ]"
  >
    <div class="flex gap-4 w-full">
      <!-- 头像 -->
      <div
        :class="[
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white',
        ]"
      >
        <User v-if="isUser" class="w-4 h-4" />
        <Sparkles v-else class="w-4 h-4" />
      </div>

      <!-- 内容 -->
      <div class="flex-1 min-w-0">
        <!-- 头部 -->
        <div class="flex items-center gap-2 mb-1">
          <span class="text-sm font-semibold">
            {{ isUser ? '你' : 'Claude' }}
          </span>
          <span
            v-if="message.timestamp"
            class="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {{ formatTime(message.timestamp) }}
          </span>
        </div>

        <!-- 图片 -->
        <div v-if="hasImages" class="flex flex-wrap gap-2 mb-2">
          <img
            v-for="(img, imgIndex) in message.images"
            :key="imgIndex"
            :src="img.source"
            alt="图片"
            class="max-w-[200px] max-h-[200px] rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity object-cover"
            @click="openImagePreview(img.source)"
          />
        </div>

        <!-- Markdown 渲染内容 -->
        <MessageContent v-if="message.content" :content="message.content" />

        <!-- 文件变更（用户消息后发生的变更） -->
        <div
          v-if="isUser && userFileChanges.length > 0"
          class="mt-3 pt-2 border-t border-border/30"
        >
          <div class="flex items-center gap-1.5 mb-1.5">
            <FileCode class="w-3 h-3 text-orange-400" />
            <span class="text-[10px] text-muted-foreground">本轮变更文件</span>
          </div>
          <div class="space-y-1">
            <div
              v-for="file in userFileChanges"
              :key="file.filePath"
              class="flex items-center gap-1.5 flex-wrap"
            >
              <FileVersionBadges
                :file-path="file.filePath"
                :versions="file.versions"
                :session-id="sessionId!"
                show-file-name
              />
            </div>
          </div>
        </div>

        <!-- Token 使用信息 -->
        <div
          v-if="hasTokenUsage"
          class="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-border/30"
        >
          <span class="text-[10px] text-muted-foreground/70 flex items-center gap-1">
            <Cpu class="w-3 h-3" />
            {{ formatTokens(stepTotalTokens) }} tokens
          </span>
          <span
            v-if="message.model"
            class="text-[10px] text-muted-foreground/70"
          >
            [{{ getModelShortName(message.model) }}]
          </span>
          <span
            v-if="message.tokenUsage?.cache_read_input_tokens"
            class="text-[10px] text-green-500/80 flex items-center gap-0.5"
          >
            <Zap class="w-2.5 h-2.5" />
            命中 {{ formatTokens(message.tokenUsage.cache_read_input_tokens) }}
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- 图片预览 -->
  <Teleport to="body">
    <div
      v-if="showImagePreview"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      @click="closeImagePreview"
    >
      <button
        class="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
        @click="closeImagePreview"
      >
        <X class="w-6 h-6" />
      </button>
      <img
        :src="previewImageUrl"
        alt="预览图片"
        class="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
        @click.stop
      />
    </div>
  </Teleport>
</template>
