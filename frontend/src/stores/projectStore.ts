import { defineStore } from 'pinia';
import { ref } from 'vue';
import { historyApi } from '../api/history';
import type { Project } from '../types/project';

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([]);
  const currentProject = ref<Project | null>(null);
  const projectEncodedPath = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchProjects() {
    loading.value = true;
    error.value = null;
    try {
    projects.value = await historyApi.getProjects();
    } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to fetch projects';
    } finally {
    loading.value = false;
  }
  }

  function setCurrentProject(project: Project | null) {
    currentProject.value = project;
    projectEncodedPath.value = project?.encodedPath || null;
  }

  return {
    projects,
    currentProject,
    projectEncodedPath,
    loading,
    error,
    fetchProjects,
    setCurrentProject,
  };
});
