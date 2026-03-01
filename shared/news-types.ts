export interface NewsSource {
  id: string;
  name: string;
  url: string;
  active: boolean;
  weight: number; // 1-5 reliability scale
  slant: number; // -1 (Left) to +1 (Right)
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
  biasScore: number; // 0-1 scale of divergence
  clusterVariance: number; // variance in reporting length/detail
  meanSlant: number; // Weighted average of source slants
  consensusFactor: number; // 0-1, inverse of dispersion
}
export interface DailyDigest {
  id: string; // Typically YYYY-MM-DD-HHmm
  generatedAt: number;
  articleCount: number;
  clusterCount: number;
  clusters: NewsCluster[];
  consensusScore?: number;
}
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}