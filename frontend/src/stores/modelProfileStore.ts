import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { modelProfilesApi } from '../api/modelProfiles';
import type { CodingPlan, CodingPlanInput, LocalConfig } from '../types/modelProfile';

const STORAGE_KEY = 'claude-coding-plans';

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Format date as YYYYMMDD_HHMM
function formatDateForName(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}_${hour}${minute}`;
}

// Compare two configs for equality
function configsEqual(
  a: { haiku_model: string; sonnet_model: string; opus_model: string; auth_token: string; base_url: string },
  b: LocalConfig
): boolean {
  return (
    a.haiku_model === (b.ANTHROPIC_DEFAULT_HAIKU_MODEL || '') &&
    a.sonnet_model === (b.ANTHROPIC_DEFAULT_SONNET_MODEL || '') &&
    a.opus_model === (b.ANTHROPIC_DEFAULT_OPUS_MODEL || '') &&
    a.auth_token === (b.ANTHROPIC_AUTH_TOKEN || '') &&
    a.base_url === (b.ANTHROPIC_BASE_URL || '')
  );
}

// Convert LocalConfig to CodingPlanInput format
export function localConfigToPlanInput(config: LocalConfig): CodingPlanInput {
  return {
    name: '',
    haiku_model: config.ANTHROPIC_DEFAULT_HAIKU_MODEL || '',
    sonnet_model: config.ANTHROPIC_DEFAULT_SONNET_MODEL || '',
    opus_model: config.ANTHROPIC_DEFAULT_OPUS_MODEL || '',
    auth_token: config.ANTHROPIC_AUTH_TOKEN || '',
    base_url: config.ANTHROPIC_BASE_URL || '',
  };
}

export const useModelProfileStore = defineStore('modelProfile', () => {
  const profiles = ref<CodingPlan[]>([]);
  const localConfig = ref<LocalConfig | null>(null);
  const loading = ref(false);
  const activating = ref(false);

  // Computed
  const hasProfiles = computed(() => profiles.value.length > 0);
  const activeProfile = computed(() => profiles.value.find(p => p.isActive) || null);
  const activeProfileName = computed(() => activeProfile.value?.name || '未设置');

  // Load profiles from localStorage
  function loadProfilesFromStorage(): CodingPlan[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load profiles from localStorage:', e);
    }
    return [];
  }

  // Save profiles to localStorage
  function saveProfilesToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles.value));
    } catch (e) {
      console.error('Failed to save profiles to localStorage:', e);
    }
  }

  // Initialize: fetch local config and sync with localStorage
  async function initialize(): Promise<void> {
    loading.value = true;
    try {
      // 1. Get local real config from file
      const config = await modelProfilesApi.getConfig();
      localConfig.value = config;

      // 2. Load profiles from localStorage
      profiles.value = loadProfilesFromStorage();

      // 3. Deactivate all profiles first
      profiles.value.forEach(p => (p.isActive = false));

      // 4. Compare with each profile to find matching one
      let matched = false;
      const configForCompare = {
        haiku_model: config.ANTHROPIC_DEFAULT_HAIKU_MODEL || '',
        sonnet_model: config.ANTHROPIC_DEFAULT_SONNET_MODEL || '',
        opus_model: config.ANTHROPIC_DEFAULT_OPUS_MODEL || '',
        auth_token: config.ANTHROPIC_AUTH_TOKEN || '',
        base_url: config.ANTHROPIC_BASE_URL || '',
      };

      for (const profile of profiles.value) {
        if (configsEqual(profile, config)) {
          profile.isActive = true;
          matched = true;
          break;
        }
      }

      // 5. If no match, create new profile
      if (!matched && (configForCompare.haiku_model || configForCompare.sonnet_model ||
          configForCompare.opus_model || configForCompare.auth_token || configForCompare.base_url)) {
        const newProfile: CodingPlan = {
          id: generateId(),
          name: `自动捕获配置_${formatDateForName()}`,
          ...configForCompare,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        profiles.value.unshift(newProfile);
      }

      // Save updated profiles
      saveProfilesToStorage();
    } catch (e) {
      console.error('Failed to initialize:', e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  // Create new profile
  function createProfile(data: CodingPlanInput): CodingPlan {
    const now = new Date().toISOString();
    const newProfile: CodingPlan = {
      id: generateId(),
      name: data.name,
      haiku_model: data.haiku_model || '',
      sonnet_model: data.sonnet_model || '',
      opus_model: data.opus_model || '',
      auth_token: data.auth_token || '',
      base_url: data.base_url || '',
      isActive: false,
      createdAt: now,
      updatedAt: now,
    };
    profiles.value.push(newProfile);
    saveProfilesToStorage();
    return newProfile;
  }

  // Update profile
  function updateProfile(id: string, data: Partial<CodingPlanInput>): CodingPlan | null {
    const index = profiles.value.findIndex(p => p.id === id);
    if (index === -1) return null;

    const profile = profiles.value[index];
    profiles.value[index] = {
      ...profile,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    saveProfilesToStorage();
    return profiles.value[index];
  }

  // Delete profile
  function deleteProfile(id: string): void {
    const index = profiles.value.findIndex(p => p.id === id);
    if (index !== -1) {
      profiles.value.splice(index, 1);
      saveProfilesToStorage();
    }
  }

  // Activate profile (switch config)
  async function activateProfile(id: string): Promise<{ success: boolean; message: string }> {
    const profile = profiles.value.find(p => p.id === id);
    if (!profile) {
      return { success: false, message: 'Profile not found' };
    }

    activating.value = true;
    try {
      // Write to local file
      await modelProfilesApi.updateConfig({
        ANTHROPIC_DEFAULT_HAIKU_MODEL: profile.haiku_model || null,
        ANTHROPIC_DEFAULT_SONNET_MODEL: profile.sonnet_model || null,
        ANTHROPIC_DEFAULT_OPUS_MODEL: profile.opus_model || null,
        ANTHROPIC_AUTH_TOKEN: profile.auth_token || null,
        ANTHROPIC_BASE_URL: profile.base_url || null,
      });

      // Update local state
      profiles.value.forEach(p => (p.isActive = false));
      profile.isActive = true;
      saveProfilesToStorage();

      return { success: true, message: '配置已切换，请在终端重启 Claude Code 以生效' };
    } catch (e) {
      console.error('Failed to activate profile:', e);
      return { success: false, message: '切换失败' };
    } finally {
      activating.value = false;
    }
  }

  // Duplicate profile
  function duplicateProfile(id: string): CodingPlan | null {
    const profile = profiles.value.find(p => p.id === id);
    if (!profile) return null;

    const now = new Date().toISOString();
    const newProfile: CodingPlan = {
      ...profile,
      id: generateId(),
      name: `${profile.name} (Copy)`,
      isActive: false,
      createdAt: now,
      updatedAt: now,
    };
    profiles.value.push(newProfile);
    saveProfilesToStorage();
    return newProfile;
  }

  // Export profiles to JSON file
  function exportProfiles(): string {
    return JSON.stringify(profiles.value, null, 2);
  }

  // Import profiles from JSON
  function importProfiles(jsonData: string, merge: boolean = true): { success: boolean; count: number; message: string } {
    try {
      const imported = JSON.parse(jsonData) as CodingPlan[];

      if (!Array.isArray(imported)) {
        return { success: false, count: 0, message: 'Invalid format: expected an array' };
      }

      if (merge) {
        // Merge: add new profiles, skip duplicates by name
        const existingNames = new Set(profiles.value.map(p => p.name));
        let addedCount = 0;

        for (const profile of imported) {
          if (!existingNames.has(profile.name)) {
            const newProfile: CodingPlan = {
              ...profile,
              id: generateId(), // Generate new ID to avoid conflicts
              isActive: false, // Don't activate imported profiles
              createdAt: profile.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            profiles.value.push(newProfile);
            addedCount++;
          }
        }

        saveProfilesToStorage();
        return { success: true, count: addedCount, message: `成功导入 ${addedCount} 个配置方案` };
      } else {
        // Replace all profiles
        profiles.value = imported.map(p => ({
          ...p,
          id: generateId(),
          isActive: false,
        }));
        saveProfilesToStorage();
        return { success: true, count: imported.length, message: `已替换为 ${imported.length} 个配置方案` };
      }
    } catch (e) {
      console.error('Failed to import profiles:', e);
      return { success: false, count: 0, message: '导入失败：JSON 格式错误' };
    }
  }

  // Save current active profile to file (for editing)
  async function saveActiveProfile(profile: CodingPlan): Promise<{ success: boolean; message: string }> {
    try {
      await modelProfilesApi.updateConfig({
        ANTHROPIC_DEFAULT_HAIKU_MODEL: profile.haiku_model || null,
        ANTHROPIC_DEFAULT_SONNET_MODEL: profile.sonnet_model || null,
        ANTHROPIC_DEFAULT_OPUS_MODEL: profile.opus_model || null,
        ANTHROPIC_AUTH_TOKEN: profile.auth_token || null,
        ANTHROPIC_BASE_URL: profile.base_url || null,
      });

      // Update localStorage
      const index = profiles.value.findIndex(p => p.id === profile.id);
      if (index !== -1) {
        profiles.value[index] = {
          ...profile,
          updatedAt: new Date().toISOString(),
        };
        saveProfilesToStorage();
      }

      return { success: true, message: '配置已保存' };
    } catch (e) {
      console.error('Failed to save profile:', e);
      return { success: false, message: '保存失败' };
    }
  }

  return {
    profiles,
    localConfig,
    loading,
    activating,
    hasProfiles,
    activeProfile,
    activeProfileName,
    initialize,
    createProfile,
    updateProfile,
    deleteProfile,
    activateProfile,
    duplicateProfile,
    exportProfiles,
    importProfiles,
    saveActiveProfile,
    // Legacy aliases for backward compatibility
    fetchProfiles: initialize,
    fetchActiveProfile: async () => { await initialize(); },
  };
});
