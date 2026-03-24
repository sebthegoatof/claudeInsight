import { defineStore } from 'pinia';
import { ref } from 'vue';
import { assetsApi } from '../api/assets';
import type { AssetItem, AssetDetail, InstalledPlugin, Marketplace } from '../api/assets';

export const useAssetStore = defineStore('assets', () => {
  // State
  const agents = ref<AssetItem[]>([]);
  const commands = ref<AssetItem[]>([]);
  const styles = ref<AssetItem[]>([]);
  const plugins = ref<InstalledPlugin[]>([]);
  const marketplaces = ref<Marketplace[]>([]);
  const blocklist = ref<string[]>([]);
  const enabledPlugins = ref<Record<string, boolean>>({});

  const currentAsset = ref<AssetDetail | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Actions
  async function fetchAgents() {
    try {
      loading.value = true;
      agents.value = await assetsApi.getAgents();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch agents';
    } finally {
      loading.value = false;
    }
  }

  async function fetchCommands() {
    try {
      loading.value = true;
      commands.value = await assetsApi.getCommands();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch commands';
    } finally {
      loading.value = false;
    }
  }

  async function fetchStyles() {
    try {
      loading.value = true;
      styles.value = await assetsApi.getStyles();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch styles';
    } finally {
      loading.value = false;
    }
  }

  async function fetchPlugins() {
    try {
      const [pluginsData, marketsData, blocklistData, enabledData] = await Promise.all([
        assetsApi.getPlugins(),
        assetsApi.getMarketplaces(),
        assetsApi.getBlocklist(),
        assetsApi.getEnabledPlugins(),
      ]);
      plugins.value = pluginsData;
      marketplaces.value = marketsData;
      blocklist.value = blocklistData;
      enabledPlugins.value = enabledData;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch plugins';
    }
  }

  async function fetchAll() {
    loading.value = true;
    error.value = null;
    try {
      await Promise.all([
        fetchAgents(),
        fetchCommands(),
        fetchStyles(),
        fetchPlugins(),
      ]);
    } finally {
      loading.value = false;
    }
  }

  async function getAgent(category: string, name: string) {
    try {
      currentAsset.value = await assetsApi.getAgent(category, name);
      return currentAsset.value;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch agent';
      return null;
    }
  }

  async function saveAgent(category: string, name: string, content: string) {
    try {
      await assetsApi.saveAgent(category, name, content);
      await fetchAgents();
      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to save agent';
      return false;
    }
  }

  async function deleteAgent(category: string, name: string) {
    try {
      await assetsApi.deleteAgent(category, name);
      await fetchAgents();
      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete agent';
      return false;
    }
  }

  async function getCommand(category: string, name: string) {
    try {
      currentAsset.value = await assetsApi.getCommand(category, name);
      return currentAsset.value;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch command';
      return null;
    }
  }

  async function saveCommand(category: string, name: string, content: string) {
    try {
      await assetsApi.saveCommand(category, name, content);
      await fetchCommands();
      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to save command';
      return false;
    }
  }

  async function deleteCommand(category: string, name: string) {
    try {
      await assetsApi.deleteCommand(category, name);
      await fetchCommands();
      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete command';
      return false;
    }
  }

  async function getStyle(name: string) {
    try {
      currentAsset.value = await assetsApi.getStyle(name);
      return currentAsset.value;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch style';
      return null;
    }
  }

  async function saveStyle(name: string, content: string) {
    try {
      await assetsApi.saveStyle(name, content);
      await fetchStyles();
      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to save style';
      return false;
    }
  }

  async function deleteStyle(name: string) {
    try {
      await assetsApi.deleteStyle(name);
      await fetchStyles();
      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete style';
      return false;
    }
  }

  return {
    // State
    agents,
    commands,
    styles,
    plugins,
    marketplaces,
    blocklist,
    enabledPlugins,
    currentAsset,
    loading,
    error,
    // Actions
    fetchAgents,
    fetchCommands,
    fetchStyles,
    fetchPlugins,
    fetchAll,
    getAgent,
    saveAgent,
    deleteAgent,
    getCommand,
    saveCommand,
    deleteCommand,
    getStyle,
    saveStyle,
    deleteStyle,
  };
});
