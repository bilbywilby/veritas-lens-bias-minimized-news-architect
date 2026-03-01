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
    const cutoff = subHours(new Date(), 48); // Tighter cutoff for broadsheet relevance
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
    return [];
  }
}
export async function summarizeCluster(articles: Article[], env: any): Promise<{ summary: string; tags: string[] }> {
  const snippets = articles.slice(0, 5).map(a => `[${a.sourceName}]: ${a.title} - ${a.contentSnippet}`).join("\n---\n");
  const fallback = { summary: articles[0]?.contentSnippet || articles[0]?.title || "Summary unavailable.", tags: ["General"] };
  const ANTHROPIC_KEY = env.ANTHROPIC_API_KEY || env.ANTHROPIC_KEY;
  const OPENAI_KEY = env.OPENAI_API_KEY || env.OPENAI_KEY;
  if (!ANTHROPIC_KEY && !OPENAI_KEY) return fallback;
  const systemPrompt = "You are a neutral news synthesizer for a digital broadsheet. Summarize snippets into a professional report. No bias. Output JSON: { \"summary\": \"string\", \"tags\": [\"string\"] }.";
  try {
    if (ANTHROPIC_KEY) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20240620",
          max_tokens: 500,
          system: systemPrompt,
          messages: [{ role: "user", content: snippets }]
        })
      });
      if (response.ok) {
        const data: any = await response.json();
        return JSON.parse(data.content[0].text);
      }
    } else if (OPENAI_KEY) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: snippets }],
          response_format: { type: "json_object" }
        })
      });
      if (response.ok) {
        const data: any = await response.json();
        return JSON.parse(data.choices[0].message.content);
      }
    }
  } catch (e) {}
  return fallback;
}
export async function clusterArticles(articles: Article[], env: Env): Promise<NewsCluster[]> {
  const { items: sources } = await NewsSourceEntity.list(env);
  const sourceMap = new Map(sources.map(s => [s.id, s]));
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
  for (const article of sortedArticles) {
    const features = articleFeatures.get(article.id)!;
    let found = false;
    for (const group of clusterGroups) {
      const representative = group[0];
      const repFeatures = articleFeatures.get(representative.id)!;
      const jaccard = jaccardSimilarity(features.tokens, repFeatures.tokens);
      const commonPropers = intersectionSize(features.propers, repFeatures.propers);
      if (jaccard >= 0.25 || commonPropers >= 1) {
        group.push(article);
        found = true;
        break;
      }
    }
    if (!found) clusterGroups.push([article]);
  }
  const now = new Date();
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
    const recencyScore = Math.exp(-hoursOld / 24); // More aggressive decay for broadsheet freshness
    const sourceCount = sourceNames.length;
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
    // Diverse sources are heavily prioritized in Broadsheet logic
    const sourceDiversityWeight = sourceCount > 1 ? Math.min(2.5, 1 + (sourceCount * 0.4)) : 0.6;
    const consensusFactor = Math.min(1, avgSim * (sourceCount / (sourceCount + 1)));
    const impactScore = (sourceCount * 1.5) + (recencyScore * 5.0) + (consensusFactor * 2.0);
    return {
      id: crypto.randomUUID(),
      representativeTitle: representative.title,
      articles: group,
      sourceSpread: sourceNames,
      sourceCount,
      neutralSummary: representative.contentSnippet || representative.title,
      tags: [],
      impactScore,
      biasScore: Math.max(0, 1 - avgSim),
      clusterVariance: Math.max(0, 1 - consensusFactor),
      meanSlant,
      consensusFactor
    };
  }).sort((a, b) => b.impactScore - a.impactScore).slice(0, 20); // Top 20 for expanded UI
}
export function generateCSV(digest: any): string {
  const headers = ["Rank", "Title", "Mean Slant", "Consensus", "Source Count", "Tags", "Neutral Summary", "Link"];
  const rows = digest.clusters.map((c: any, idx: number) => [
    (idx + 1).toString(),
    c.representativeTitle.replace(/"/g, '""'),
    c.meanSlant.toFixed(3),
    (c.consensusFactor * 100).toFixed(0) + "%",
    c.sourceCount.toString(),
    (c.tags || []).join("; ").replace(/"/g, '""'),
    c.neutralSummary.replace(/"/g, '""').replace(/\n/g, ' '),
    c.articles[0]?.link || ""
  ]);
  return [headers, ...rows].map(r => r.map((cell: string) => `"${cell}"`).join(",")).join("\n");
}