import { defineStore } from 'pinia';
import { ref } from 'vue';
import { historyApi } from '@/api/history';
import type { Skill } from '@/types/skill';

export const useSkillStore = defineStore('skill', () => {
  const projectSkills = ref<Skill[]>([]);
  const globalSkills = ref<Skill[]>([]);
  const selectedSkill = ref<Skill | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchProjectSkills(encodedPath: string) {
    loading.value = true;
    error.value = null;
    try {
      projectSkills.value = await historyApi.getProjectSkills(encodedPath);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch skills';
      projectSkills.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchGlobalSkills() {
    loading.value = true;
    error.value = null;
    try {
      globalSkills.value = await historyApi.getGlobalSkills();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch global skills';
      globalSkills.value = [];
    } finally {
      loading.value = false;
    }
  }

  function selectSkill(skill: Skill | null) {
    selectedSkill.value = skill;
  }

  function clearSkills() {
    projectSkills.value = [];
    selectedSkill.value = null;
  }

  return {
    projectSkills,
    globalSkills,
    selectedSkill,
    loading,
    error,
    fetchProjectSkills,
    fetchGlobalSkills,
    selectSkill,
    clearSkills,
  };
});
