export type SearchType = 'session' | 'skill' | 'agent' | 'command' | 'plan';

export interface SearchResult {
  id: number;
  session_id: string;
  title: string;
  project_path: string;
  snippet: string;
  rank: number;
  // 新增字段
  type?: SearchType;
  assetId?: string;
  assetCategory?: string;
}

export interface AssetSearchResult {
  id: string;
  type: SearchType;
  title: string;
  description: string;
  content?: string;
  category?: string;
  path: string;
}

export interface SearchResponse {
  data: SearchResult[];
  query: string;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
