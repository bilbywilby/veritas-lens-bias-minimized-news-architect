import { XMLParser } from "fast-xml-parser";
import { subHours, isAfter, parseISO, differenceInHours } from "date-fns";
import type { Article, NewsCluster } from "@shared/news-types";
import { NewsSourceEntity } from "./news-entities";
import type { Env } from "./core-utils";
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
];
const STOP_WORDS = new Set(['this', 'that', 'with', 'from', 'about', 'would', 'could', 'their', 'there', 'which', 'after', 'before', 'where', 'while', 'under', 'during', 'against', 'said', 'says', 'also', 'more', 'they', 'them']);
function cleanText(text: string): string {
  if (!text) return "";
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
function tokenize(text: string): Set<string> {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 3 && !STOP_WORDS.has(t));
  return new Set(words);
}
function extractProperNouns(text: string): Set<string> {
  const propers = new Set<string>();
  // Match words starting with uppercase (excluding sentence starts broadly)
  const regex = /\b[A-Z][a-z]{1,}\b/g;
  const matches = text.match(regex) || [];
  const COMMON_STARTERS = new Set(['The', 'This', 'That', 'A', 'An', 'In', 'On', 'With', 'From']);
  for (const match of matches) {
    if (!COMMON_STARTERS.has(match)) {
      propers.add(match.toLowerCase());
    }
  }
  return propers;
}
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}
function intersectionSize(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const item of a) {
    if (b.has(item)) count++;
  }
  return count;
}
async function fetchWithRetry(url: string, attempts: number = 2): Promise<Response | null> {
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
      const res = await fetch(url, {
        headers: { "User-Agent": ua },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) return res;
    } catch (e: any) {
      clearTimeout(timeoutId);
      console.warn(`[FETCH] Attempt ${i + 1} failed for ${url}`);
    }
    if (i < attempts - 1) await new Promise(r => setTimeout(r, 1000));
  }
  return null;
}
export async function fetchAndParseRSS(sourceId: string, sourceName: string, url: string): Promise<Article[]> {
  const response = await fetchWithRetry(url);
  if (!response) return [];
  try {
    const xml = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const jsonObj = parser.parse(xml);
    const items = jsonObj.rss?.channel?.item || jsonObj.feed?.entry || [];
    const normalizedItems = Array.isArray(items) ? items : [items];
    const cutoff = subHours(new Date(), 72);
    return normalizedItems
      .map((item: any) => {
        const pubDateStr = item.pubDate || item.updated || item.published || item['dc:date'] || new Date().toISOString();
        let pubDate;
        try { pubDate = new Date(pubDateStr); } catch { pubDate = new Date(); }
        const rawTitle = item.title?.["#text"] || item.title || "No Title";
        const title = cleanText(typeof rawTitle === 'string' ? rawTitle : "No Title");
        const descRaw = item.description || item.summary || "";
        const description = cleanText(typeof descRaw === 'string' ? descRaw : "");
        const link = item.link?.['@_href'] || (typeof item.link === 'string' ? item.link : item.link?.link || "");
        return {
          id: crypto.randomUUID(),
          sourceId,
          sourceName,
          title,
          link,
          pubDate: pubDate.toISOString(),
          description,
          contentSnippet: description.substring(0, 400) || title
        };
      })
      .filter(a => isAfter(parseISO(a.pubDate), cutoff));
  } catch (e) {
    console.error(`[RSS] Parse error for ${sourceName}:`, e);
    return [];
  }
}
export async function clusterArticles(articles: Article[], env: Env): Promise<NewsCluster[]> {
  const { items: sources } = await NewsSourceEntity.list(env);
  const sourceMap = new Map(sources.map(s => [s.id, s]));
  // High-fidelity deduplication: Newest-first processing
  const sortedArticles = [...articles].sort((a, b) => 
    new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );
  if (sortedArticles.length === 0) return [];
  const articleFeatures = new Map<string, { tokens: Set<string>, propers: Set<string> }>();
  sortedArticles.forEach(a => {
    articleFeatures.set(a.id, {
      tokens: tokenize(a.title),
      propers: extractProperNouns(a.title)
    });
  });
  const clusterGroups: Article[][] = [];
  const now = new Date();
  for (const article of sortedArticles) {
    const features = articleFeatures.get(article.id)!;
    let found = false;
    for (const group of clusterGroups) {
      const representative = group[0];
      const repFeatures = articleFeatures.get(representative.id)!;
      const jaccard = jaccardSimilarity(features.tokens, repFeatures.tokens);
      const commonPropers = intersectionSize(features.propers, repFeatures.propers);
      // Match logic: Jaccard threshold OR Proper Noun overlap
      if (jaccard >= 0.25 || commonPropers >= 1) {
        group.push(article);
        found = true;
        break;
      }
    }
    if (!found) {
      clusterGroups.push([article]);
    }
  }
  return clusterGroups.map(group => {
    const representative = group[0];
    const uniqueSources = Array.from(new Set(group.map(a => a.sourceId)));
    const sourceNames = uniqueSources.map(id => sourceMap.get(id)?.name || "Unknown");
    let totalSlant = 0;
    uniqueSources.forEach(id => { totalSlant += sourceMap.get(id)?.slant || 0; });
    const meanSlant = totalSlant / (uniqueSources.length || 1);
    const newestDate = group.reduce((max, a) => {
      const d = parseISO(a.pubDate);
      return d > max ? d : max;
    }, new Date(0));
    const hoursOld = Math.max(0, differenceInHours(now, newestDate));
    const recencyScore = Math.exp(-hoursOld / 48);
    const sourceCount = sourceNames.length;
    // Consensus Factor calculation
    let avgSim = 1.0;
    if (group.length > 1) {
      let totalSim = 0;
      let pairs = 0;
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          totalSim += jaccardSimilarity(articleFeatures.get(group[i].id)!.tokens, articleFeatures.get(group[j].id)!.tokens);
          pairs++;
        }
      }
      avgSim = totalSim / (pairs || 1);
    }
    const sourceDiversityWeight = Math.min(2.0, 1 + (sourceCount * 0.2));
    const consensusFactor = Math.min(1, avgSim * sourceDiversityWeight);
    const impactScore = (sourceCount * 0.8) + (recencyScore * 4.0) + (consensusFactor * 3.0);
    return {
      id: crypto.randomUUID(),
      representativeTitle: representative.title,
      articles: group,
      sourceSpread: sourceNames,
      sourceCount,
      neutralSummary: representative.contentSnippet || representative.title,
      impactScore,
      biasScore: Math.max(0, 1 - avgSim),
      clusterVariance: Math.max(0, 1 - consensusFactor),
      meanSlant,
      consensusFactor
    };
  }).sort((a, b) => b.impactScore - a.impactScore).slice(0, 15);
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