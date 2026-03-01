import { XMLParser } from "fast-xml-parser";
import { subHours, isAfter, parseISO, differenceInHours } from "date-fns";
import type { Article, NewsCluster } from "@shared/news-types";
import { NewsSourceEntity } from "./news-entities";
import type { Env } from "./core-utils";
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
];
const STOP_WORDS = new Set(['this', 'that', 'with', 'from', 'about', 'would', 'could', 'their', 'there', 'which', 'after', 'before', 'where', 'while', 'under', 'during', 'against']);
function cleanText(text: string): string {
  if (!text) return "";
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') // Extract CDATA
    .replace(/<[^>]*>?/gm, '') // Strip HTML
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
async function fetchWithRetry(url: string, attempts: number = 2): Promise<Response | null> {
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s hard timeout
    try {
      const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
      const res = await fetch(url, {
        headers: { "User-Agent": ua },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) return res;
      if (res.status >= 500) throw new Error(`Server Error ${res.status}`);
    } catch (e: any) {
      clearTimeout(timeoutId);
      const msg = e.name === 'AbortError' ? 'Timeout (12s)' : (e.message || String(e));
      console.warn(`[FETCH] Attempt ${i + 1} failed for ${url}:`, msg);
    }
    if (i < attempts - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return null;
}
export async function fetchAndParseRSS(sourceId: string, sourceName: string, url: string): Promise<Article[]> {
  const response = await fetchWithRetry(url);
  if (!response) return [];
  try {
    const xml = await response.text();
    const parser = new XMLParser({ 
      ignoreAttributes: false, 
      attributeNamePrefix: "@_",
      cdataPropName: "__cdata",
      processEntities: true
    });
    const jsonObj = parser.parse(xml);
    // Handle both RSS 2.0 <item> and Atom <entry>
    const items = jsonObj.rss?.channel?.item || jsonObj.feed?.entry || [];
    const normalizedItems = Array.isArray(items) ? items : [items];
    const cutoff = subHours(new Date(), 72);
    return normalizedItems
      .map((item: any) => {
        const pubDateStr = item.pubDate || item.updated || item.published || item['dc:date'] || new Date().toISOString();
        let pubDate;
        try { pubDate = new Date(pubDateStr); } catch { pubDate = new Date(); }
        const rawTitle = item.title?.["__cdata"] || item.title?.["#text"] || item.title || "No Title";
        const title = cleanText(typeof rawTitle === 'string' ? rawTitle : "No Title");
        const descRaw = item.description?.["__cdata"] || item.description || item.summary?.["__cdata"] || item.summary?.["#text"] || item.summary || "";
        const description = cleanText(typeof descRaw === 'string' ? descRaw : "");
        const link = item.link?.['@_href'] || (typeof item.link === 'string' ? item.link : item.link?.link || "");
        return {
          id: crypto.randomUUID(),
          sourceId,
          sourceName,
          title,
          link,
          pubDate: pubDate.toISOString(),
          description: description,
          contentSnippet: description.substring(0, 400) || title
        };
      })
      .filter(a => {
        try { return isAfter(parseISO(a.pubDate), cutoff); }
        catch { return true; }
      });
  } catch (e) {
    console.error(`[RSS] Parse error for ${sourceName}:`, e);
    return [];
  }
}
function getTokens(text: string): Set<string> {
  return new Set(text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(t => t.length > 3 && !STOP_WORDS.has(t)));
}
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}
export async function clusterArticles(articles: Article[], env: Env): Promise<NewsCluster[]> {
  const { items: sources } = await NewsSourceEntity.list(env);
  const sourceMap = new Map(sources.map(s => [s.id, s]));
  const clusters: NewsCluster[] = [];
  const tokenMap = new Map<string, Set<string>>();
  articles.forEach(article => {
    tokenMap.set(article.id, getTokens(article.title + " " + article.contentSnippet.substring(0, 150)));
  });
  const processedIds = new Set<string>();
  const now = new Date();
  for (const article of articles) {
    if (processedIds.has(article.id)) continue;
    const clusterItems = [article];
    processedIds.add(article.id);
    const tokensA = tokenMap.get(article.id)!;
    for (const other of articles) {
      if (processedIds.has(other.id)) continue;
      const tokensB = tokenMap.get(other.id)!;
      if (jaccardSimilarity(tokensA, tokensB) > 0.22) {
        clusterItems.push(other);
        processedIds.add(other.id);
      }
    }
    const uniqueSources = Array.from(new Set(clusterItems.map(a => a.sourceId)));
    const sourceNames = uniqueSources.map(id => sourceMap.get(id)?.name || "Unknown");
    const sourceCount = sourceNames.length;
    let centroidArticle = clusterItems[0];
    if (clusterItems.length > 2) {
      let maxTotalSim = -1;
      for (const candidate of clusterItems) {
        let totalSim = 0;
        const candTokens = tokenMap.get(candidate.id)!;
        for (const peer of clusterItems) {
          if (peer.id === candidate.id) continue;
          totalSim += jaccardSimilarity(candTokens, tokenMap.get(peer.id)!);
        }
        if (totalSim > maxTotalSim) {
          maxTotalSim = totalSim;
          centroidArticle = candidate;
        }
      }
    }
    let totalSlant = 0;
    uniqueSources.forEach(id => { totalSlant += sourceMap.get(id)?.slant || 0; });
    const meanSlant = totalSlant / (uniqueSources.length || 1);
    let avgSim = 1.0;
    if (clusterItems.length > 1) {
      let totalSim = 0;
      let pairs = 0;
      for (let i = 0; i < clusterItems.length; i++) {
        for (let j = i + 1; j < clusterItems.length; j++) {
          totalSim += jaccardSimilarity(tokenMap.get(clusterItems[i].id)!, tokenMap.get(clusterItems[j].id)!);
          pairs++;
        }
      }
      avgSim = totalSim / (pairs || 1);
    }
    const sourceDiversityWeight = Math.min(2.0, 1 + (sourceCount * 0.2));
    const consensusFactor = Math.min(1, avgSim * sourceDiversityWeight);
    const newestDate = clusterItems.reduce((max, a) => {
      const d = parseISO(a.pubDate);
      return d > max ? d : max;
    }, new Date(0));
    const hoursOld = Math.max(0, differenceInHours(now, newestDate));
    const recencyScore = Math.exp(-hoursOld / 36);
    const impactScore = (sourceCount * 0.8) + (recencyScore * 4.0) + (consensusFactor * 3.0);
    clusters.push({
      id: crypto.randomUUID(),
      representativeTitle: centroidArticle.title,
      articles: clusterItems,
      sourceSpread: sourceNames,
      sourceCount,
      neutralSummary: centroidArticle.contentSnippet,
      impactScore,
      biasScore: Math.max(0, 1 - avgSim),
      clusterVariance: Math.max(0, 1 - consensusFactor),
      meanSlant,
      consensusFactor
    });
  }
  return clusters.sort((a, b) => b.impactScore - a.impactScore).slice(0, 12);
}
export function generateCSV(digest: any): string {
  const headers = ["Rank", "Title", "Mean Slant", "Consensus", "Source Count", "Link"];
  const rows = digest.clusters.map((c: any, idx: number) => [
    (idx + 1).toString(),
    c.representativeTitle.replace(/"/g, '""'),
    c.meanSlant.toFixed(3),
    (c.consensusFactor * 100).toFixed(0) + "%",
    c.sourceCount.toString(),
    c.articles[0]?.link || ""
  ]);
  return [headers, ...rows].map(r => r.map((cell: string) => `"${cell}"`).join(",")).join("\n");
}