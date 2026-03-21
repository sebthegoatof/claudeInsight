<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useModelProfileStore } from '@/stores/modelProfileStore';
import {
  ChevronDown,
  Check,
  Settings,
  Loader2,
  Cpu,
} from 'lucide-vue-next';

const router = useRouter();
const store = useModelProfileStore();

const isOpen = ref(false);

onMounted(() => {
  store.initialize();
});

const activeProfileName = computed(() => store.activeProfileName);

async function selectProfile(profileId: string) {
  try {
    await store.activateProfile(profileId);
    isOpen.value = false;
  } catch (e) {
    console.error('Failed to activate profile:', e);
  }
}

function goToManage() {
  isOpen.value = false;
  router.push('/model-profiles');
}
</script>

<template>
  <div class="relative">
    <!-- Trigger Button -->
    <button
      @click="isOpen = !isOpen"
      class="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-muted"
      :class="{ 'justify-center': false }"
    >
      <Cpu class="w-4 h-4 text-muted-foreground" />
      <span class="truncate flex-1 text-left">{{ activeProfileName }}</span>
      <ChevronDown
        :class="[
          'w-4 h-4 text-muted-foreground transition-transform',
          { 'rotate-180': isOpen },
        ]"
      />
    </button>

    <!-- Dropdown Menu -->
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden"
      >
        <!-- Loading -->
        <div
          v-if="store.loading"
          class="flex items-center justify-center py-4 text-muted-foreground"
        >
          <Loader2 class="w-4 h-4 animate-spin" />
        </div>

        <!-- Profile List -->
        <template v-else>
          <div class="max-h-48 overflow-y-auto">
            <button
              v-for="profile in store.profiles"
              :key="profile.id"
              @click="selectProfile(profile.id)"
              :disabled="store.activating"
              class="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted transition-colors disabled:opacity-50"
              :class="{
                'bg-primary/5': profile.isActive,
              }"
            >
              <div class="w-4 h-4 flex items-center justify-center">
                <Check
                  v-if="profile.isActive"
                  class="w-3.5 h-3.5 text-primary"
                />
                <Loader2
                  v-else-if="store.activating"
                  class="w-3.5 h-3.5 animate-spin"
                />
              </div>
              <span class="truncate flex-1">{{ profile.name }}</span>
            </button>
          </div>

          <!-- No profiles -->
          <div
            v-if="!store.hasProfiles"
            class="px-3 py-4 text-center text-sm text-muted-foreground"
          >
            暂无配置方案
          </div>

          <!-- Footer Actions -->
          <div class="border-t border-border">
            <button
              @click="goToManage"
              class="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              <Settings class="w-4 h-4" />
              <span>管理配置方案</span>
            </button>
          </div>
        </template>
      </div>
    </Transition>

    <!-- Backdrop -->
    <div
      v-if="isOpen"
      class="fixed inset-0 z-40"
      @click="isOpen = false"
    />
  </div>
</template>
