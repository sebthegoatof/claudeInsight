import { api } from './index';
import type { LocalConfig, CodingPlanInput } from '../types/modelProfile';

export const modelProfilesApi = {
  // Get current config from local file
  getConfig: () => api.get<LocalConfig>('/api/config'),

  // Update config in local file (partial overwrite)
  updateConfig: (data: Partial<LocalConfig>) => api.post<LocalConfig>('/api/config', data),

  // For backward compatibility - these are now handled by localStorage
  // The following methods are kept for potential future use or migration
  getProfiles: () => Promise.resolve([]),
  getActiveProfile: () => Promise.resolve(null),
  getProfile: () => Promise.resolve(null),
  createProfile: (data: CodingPlanInput) => Promise.resolve(data),
  updateProfile: () => Promise.resolve(null),
  deleteProfile: () => Promise.resolve(undefined),
  activateProfile: () => Promise.resolve({ success: true, message: '' }),
  duplicateProfile: () => Promise.resolve(null),
  syncConfig: () => Promise.resolve({ synced: false, createdNew: false, message: '' }),
};
