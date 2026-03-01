import { XMLParser } from "fast-xml-parser";
import type { Article, NewsCluster } from "@shared/news-types";
export async function fetchAndParseRSS(sourceId: string, sourceName: string, url: string): Promise<Article[]> {
  try {
    const response = await fetch(url, { headers: { "User-Agent": "VeritasLens/1.0" } });
    if (!response.ok) return [];
    const xml = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const jsonObj = parser.parse(xml);
    const items = jsonObj.rss?.channel?.item || jsonObj.feed?.entry || [];
    const normalizedItems = Array.isArray(items) ? items : [items];
    return normalizedItems.map((item: any) => ({
      id: crypto.randomUUID(),
      sourceId,
      sourceName,
      title: item.title || "No Title",
      link: item.link?.['@_href'] || item.link || "",
      pubDate: item.pubDate || item.updated || new Date().toISOString(),
      description: item.description || item.summary || "",
      contentSnippet: (item.description || item.summary || "").substring(0, 200).replace(/<[^>]*>?/gm, '')
    }));
  } catch (e) {
    console.error(`Error fetching RSS from ${url}:`, e);
    return [];
  }
}
function getTokens(text: string): Set<string> {
  return new Set(text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(t => t.length > 3));
}
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}
export function clusterArticles(articles: Article[]): NewsCluster[] {
  const clusters: NewsCluster[] = [];
  const tokenMap = new Map<string, Set<string>>();
  articles.forEach(article => {
    tokenMap.set(article.id, getTokens(article.title));
  });
  const processedIds = new Set<string>();
  for (const article of articles) {
    if (processedIds.has(article.id)) continue;
    const currentClusterArticles = [article];
    processedIds.add(article.id);
    const tokensA = tokenMap.get(article.id)!;
    for (const other of articles) {
      if (processedIds.has(other.id)) continue;
      const tokensB = tokenMap.get(other.id)!;
      if (jaccardSimilarity(tokensA, tokensB) > 0.25) {
        currentClusterArticles.push(other);
        processedIds.add(other.id);
      }
    }
    clusters.push({
      id: crypto.randomUUID(),
      representativeTitle: article.title,
      articles: currentClusterArticles,
      sourceSpread: Array.from(new Set(currentClusterArticles.map(a => a.sourceName))),
      neutralSummary: article.description.substring(0, 300),
      impactScore: currentClusterArticles.length
    });
  }
  return clusters.sort((a, b) => b.impactScore - a.impactScore);
}