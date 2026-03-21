export interface SearchResult {
  id: number;
  session_id: string;
  title: string;
  project_path: string;
  snippet: string;
  rank: number;
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
