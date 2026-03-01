export interface NewsSource {
  id: string;
  name: string;
  url: string;
  active: boolean;
  weight: number; // 1-5 reliability scale
}
export interface Article {
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  link: string;
  pubDate: string;
  description: string;
  contentSnippet: string;
}
export interface NewsCluster {
  id: string;
  representativeTitle: string;
  articles: Article[];
  sourceSpread: string[]; // List of unique source names
  sourceCount: number;
  neutralSummary: string;
  impactScore: number; // Algorithmic priority score
}
export interface DailyDigest {
  id: string; // Typically YYYY-MM-DD-HHmm
  generatedAt: number;
  articleCount: number;
  clusterCount: number;
  clusters: NewsCluster[];
}
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}