import { XMLParser } from "fast-xml-parser";
import { subHours, isAfter, parseISO } from "date-fns";
import type { Article, NewsCluster, DailyDigest } from "@shared/news-types";
export async function fetchAndParseRSS(sourceId: string, sourceName: string, url: string): Promise<Article[]> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "VeritasLens/1.0 (Cloudflare Worker)" },
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) {
      console.warn(`[FETCH FAIL] ${sourceName}: ${response.status}`);
      return [];
    }
    const xml = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const jsonObj = parser.parse(xml);
    const items = jsonObj.rss?.channel?.item || jsonObj.feed?.entry || [];
    const normalizedItems = Array.isArray(items) ? items : [items];
    const cutoff = subHours(new Date(), 48);
    return normalizedItems
      .map((item: any) => {
        const pubDateStr = item.pubDate || item.updated || item['dc:date'] || new Date().toISOString();
        let pubDate;
        try { pubDate = new Date(pubDateStr); } catch { pubDate = new Date(); }
        const title = (item.title?.["#text"] || item.title || "No Title").trim();
        const descRaw = item.description || item.summary?.["#text"] || item.summary || "";
        const description = typeof descRaw === 'string' ? descRaw : "No description available";
        return {
          id: crypto.randomUUID(),
          sourceId,
          sourceName,
          title,
          link: item.link?.['@_href'] || (typeof item.link === 'string' ? item.link : item.link?.link || ""),
          pubDate: pubDate.toISOString(),
          description: description,
          contentSnippet: description.substring(0, 250).replace(/<[^>]*>?/gm, '') || title
        };
      })
      .filter(a => {
        try { return isAfter(parseISO(a.pubDate), cutoff); }
        catch { return true; }
      });
  } catch (e) {
    console.error(`[RSS ERROR] ${sourceName}:`, e);
    return [];
  }
}
function getTokens(text: string): Set<string> {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(t => t.length > 3);
  return new Set(words);
}
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}
export function clusterArticles(articles: Article[]): NewsCluster[] {
  const clusters: NewsCluster[] = [];
  const tokenMap = new Map<string, Set<string>>();
  articles.forEach(article => tokenMap.set(article.id, getTokens(article.title)));
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
    const sourceSpread = Array.from(new Set(currentClusterArticles.map(a => a.sourceName)));
    const sourceCount = sourceSpread.length;
    clusters.push({
      id: crypto.randomUUID(),
      representativeTitle: article.title,
      articles: currentClusterArticles,
      sourceSpread,
      sourceCount,
      neutralSummary: currentClusterArticles[0].contentSnippet,
      impactScore: sourceCount * 10 
    });
  }
  return clusters.sort((a, b) => b.impactScore - a.impactScore);
}
export function generateCSV(digest: DailyDigest): string {
  const headers = ["Rank", "Title", "Summary", "Sources", "Source Count", "Link"];
  const rows = digest.clusters.map((c, idx) => [
    (idx + 1).toString(),
    c.representativeTitle.replace(/"/g, '""'),
    c.neutralSummary.replace(/"/g, '""').replace(/\n/g, ' '),
    c.sourceSpread.join('; '),
    c.sourceCount.toString(),
    c.articles[0]?.link || ""
  ]);
  const csvContent = [headers, ...rows]
    .map(r => r.map(cell => `"${cell}"`).join(","))
    .join("\n");
  return csvContent;
}