export interface NewsSource {
  id: string;
  name: string;
  url: string;
  active: boolean;
  weight: number;
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
  sourceSpread: string[]; // List of source names
  neutralSummary: string;
  impactScore: number;
}
export interface DailyDigest {
  id: string; // YYYY-MM-DD
  generatedAt: number;
  articleCount: number;
  clusterCount: number;
  clusters: NewsCluster[];
}