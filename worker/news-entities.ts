import { IndexedEntity } from "./core-utils";
import { XMLParser } from "fast-xml-parser";
import type { NewsSource, DailyDigest } from "@shared/news-types";
export class NewsSourceEntity extends IndexedEntity<NewsSource> {
  static readonly entityName = "news-source";
  static readonly indexName = "news-sources";
  static readonly initialState: NewsSource = { id: "", name: "", url: "", active: true, weight: 1, slant: 0 };
  static seedData: NewsSource[] = [
    { id: "reuters", name: "Reuters", url: "https://www.reutersagency.com/feed/", active: true, weight: 5, slant: 0.0 },
    { id: "bbc", name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", active: true, weight: 4, slant: -0.1 },
    { id: "ap", name: "Associated Press", url: "https://newsatme.com/apnews.xml", active: true, weight: 5, slant: 0.0 },
    { id: "npr", name: "NPR News", url: "https://feeds.npr.org/1001/rss.xml", active: true, weight: 4, slant: -0.2 },
    { id: "aljazeera", name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", active: true, weight: 3, slant: 0.0 }
  ];
  /**
   * Dry-fetch and basic XML validation for new sources
   */
  static async validateFeed(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "VeritasLens-Validator/1.0" },
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) return false;
      const xml = await response.text();
      const parser = new XMLParser();
      const jsonObj = parser.parse(xml);
      // Basic check for RSS 2.0 or Atom
      return !!(jsonObj.rss?.channel?.item || jsonObj.feed?.entry);
    } catch (e) {
      console.error("[VALIDATE FEED] Error:", e);
      return false;
    }
  }
}
export class DailyDigestEntity extends IndexedEntity<DailyDigest> {
  static readonly entityName = "daily-digest";
  static readonly indexName = "daily-digests";
  static readonly initialState: DailyDigest = { id: "", generatedAt: 0, articleCount: 0, clusterCount: 0, clusters: [] };
}