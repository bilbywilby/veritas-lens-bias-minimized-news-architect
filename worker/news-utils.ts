import { XMLParser } from "fast-xml-parser";
import { subHours, isAfter, parseISO, differenceInHours } from "date-fns";
import type { Article, NewsCluster, DailyDigest } from "@shared/news-types";
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15"
];
async function fetchWithRetry(url: string, attempts: number = 3): Promise<Response | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
      const res = await fetch(url, {
        headers: { "User-Agent": ua },
        signal: AbortSignal.timeout(8000)
      });
      if (res.ok) return res;
      console.warn(`[FETCH] Attempt ${i + 1} failed for ${url}: ${res.status}`);
    } catch (e) {
      console.warn(`[FETCH] Attempt ${i + 1} error for ${url}:`, e);
    }
    if (i < attempts - 1) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
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
          contentSnippet: description.substring(0, 300).replace(/<[^>]*>?/gm, '') || title
        };
      })
      .filter(a => {
        try { return isAfter(parseISO(a.pubDate), cutoff); }
        catch { return true; }
      });
  } catch (e) {
    console.error(`[PARSE ERROR] ${sourceName}:`, e);
    return [];
  }
}
function getTokens(text: string): Set<string> {
  return new Set(text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(t => t.length > 3));
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
    const sourceSpread = Array.from(new Set(clusterItems.map(a => a.sourceName)));
    const sourceCount = sourceSpread.length;
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
      avgSim = totalSim / pairs;
    }
    const biasScore = Math.max(0, 1 - avgSim);
    const newestDate = clusterItems.reduce((max, a) => {
      const d = parseISO(a.pubDate);
      return d > max ? d : max;
    }, new Date(0));
    const hoursOld = Math.max(0, differenceInHours(now, newestDate));
    const recencyScore = Math.exp(-hoursOld / 72);
    const impactScore = (sourceCount * 0.4) + (recencyScore * 3.0) + (article.title.length / 100 * 0.2);
    clusters.push({
      id: crypto.randomUUID(),
      representativeTitle: article.title,
      articles: clusterItems,
      sourceSpread,
      sourceCount,
      neutralSummary: clusterItems[0].contentSnippet,
      impactScore,
      biasScore,
      clusterVariance: Math.random() * 0.3
    });
  }
  return clusters
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 10);
}
export function generateCSV(digest: DailyDigest): string {
  const headers = ["Rank", "Title", "Summary", "Sources", "Source Count", "Bias Score", "Link"];
  const rows = digest.clusters.map((c, idx) => [
    (idx + 1).toString(),
    c.representativeTitle.replace(/"/g, '""'),
    c.neutralSummary.replace(/"/g, '""').replace(/\n/g, ' '),
    c.sourceSpread.join('; '),
    c.sourceCount.toString(),
    (c.biasScore || 0).toFixed(2),
    c.articles[0]?.link || ""
  ]);
  return [headers, ...rows]
    .map(r => r.map(cell => `"${cell}"`).join(","))
    .join("\n");
}
export async function sendDigestEmail(digest: DailyDigest, recipient: string): Promise<{ success: boolean; error?: string }> {
  try {
    const csvContent = generateCSV(digest);
    const encoder = new TextEncoder();
    const data = encoder.encode(csvContent);
    const base64Csv = btoa(String.fromCharCode(...new Uint8Array(data)));
    const summary = digest.clusters.map((c, i) => `${i + 1}. ${c.representativeTitle}`).join("\n");
    const body = `Verification Report Architected by Veritas Lens.\n\nToday's Key Intelligence Clusters:\n${summary}\n\nA detailed CSV report is attached for your verification.`;
    const payload = {
      personalizations: [{ to: [{ email: recipient }] }],
      from: { email: "no-reply@veritas-lens.ai", name: "Veritas Lens Architect" },
      subject: `Truth-First Digest: ${digest.clusterCount} Intelligence Clusters Found`,
      content: [
        { type: "text/plain", value: body }
      ],
      attachments: [
        {
          content: base64Csv,
          filename: `veritas-report-${digest.id}.csv`,
          type: "text/csv",
          disposition: "attachment"
        }
      ]
    };
    const response = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.ok) return { success: true };
    const errText = await response.text();
    console.error("[EMAIL DELIVERY] MailChannels failed:", errText);
    return { success: false, error: errText };
  } catch (e: any) {
    console.error("[EMAIL DELIVERY] Error:", e);
    return { success: false, error: e.message };
  }
}