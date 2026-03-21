// Coding Plan profile stored in localStorage
export interface CodingPlan {
  id: string;
  name: string;
  haiku_model: string;
  sonnet_model: string;
  opus_model: string;
  auth_token: string;
  base_url: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Input for creating/updating a plan
export interface CodingPlanInput {
  name: string;
  haiku_model?: string;
  sonnet_model?: string;
  opus_model?: string;
  auth_token?: string;
  base_url?: string;
}

// Config from local file (settings.json.env)
export interface LocalConfig {
  ANTHROPIC_DEFAULT_HAIKU_MODEL: string | null;
  ANTHROPIC_DEFAULT_SONNET_MODEL: string | null;
  ANTHROPIC_DEFAULT_OPUS_MODEL: string | null;
  ANTHROPIC_AUTH_TOKEN: string | null;
  ANTHROPIC_BASE_URL: string | null;
}

// For backward compatibility, keep legacy types as aliases
export type ModelProfile = CodingPlan;
export type ModelProfileInput = CodingPlanInput;
export type ActivateResult = { success: boolean; message: string };
