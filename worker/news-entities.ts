import { IndexedEntity } from "./core-utils";
import type { Env } from "./core-utils";
import { XMLParser } from "fast-xml-parser";
import type { NewsSource, DailyDigest, SystemState, VaultStory } from "@shared/news-types";
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
      return !!(jsonObj.rss?.channel?.item || jsonObj.feed?.entry);
    } catch (e) {
      console.error("[VALIDATE FEED] Error:", e);
      return false;
    }
  }
  static async ensureSeed(env: Env): Promise<void> {
    const { items } = await this.list(env);
    if (items.length === 0) {
      for (const data of this.seedData) {
        await this.create(env, data);
      }
    }
  }
}
export class SystemStateEntity extends IndexedEntity<SystemState> {
  static readonly entityName = "system-state";
  static readonly indexName = "system-states";
  static readonly initialState: SystemState = { id: "global", lastRun: 0, totalArticles: 0, sourceCount: 0 };
  static async updateMetrics(env: Env, articlesCount: number, sourceCount: number): Promise<void> {
    const entity = new SystemStateEntity(env, "global");
    await entity.mutate(s => ({
      ...s,
      lastRun: Date.now(),
      totalArticles: s.totalArticles + articlesCount,
      sourceCount
    }));
  }
  static async ensureSeed(env: Env): Promise<void> {
    const entity = new SystemStateEntity(env, "global");
    if (!await entity.exists()) {
      await SystemStateEntity.create(env, { id: "global", lastRun: 0, totalArticles: 0, sourceCount: 0 });
    }
  }
}
export class StoryVaultEntity extends IndexedEntity<VaultStory> {
  static readonly entityName = "story-vault";
  static readonly indexName = "story-vault-index";
  static readonly initialState: VaultStory = { id: "", clusterId: "", sourceName: "", title: "", link: "", slant: 0, bias: 0, timestamp: 0 };
}
export class DailyDigestEntity extends IndexedEntity<DailyDigest> {
  static readonly entityName = "daily-digest";
  static readonly indexName = "daily-digests";
  static readonly initialState: DailyDigest = { id: "", generatedAt: 0, articleCount: 0, clusterCount: 0, clusters: [] };
  static async archiveToVault(env: Env, digest: DailyDigest): Promise<void> {
    if (!digest.clusters || digest.clusters.length === 0) return;
    // Efficiency Optimization: Only store the primary representative article per cluster
    // to stay within Cloudflare Worker sub-request limits (O(clusters) vs O(articles)).
    const stories: VaultStory[] = digest.clusters.map(cluster => {
      const primary = cluster.articles[0];
      return {
        id: crypto.randomUUID(),
        clusterId: cluster.id,
        sourceName: primary?.sourceName || "Unknown",
        title: cluster.representativeTitle,
        link: primary?.link || "",
        slant: cluster.meanSlant,
        bias: cluster.biasScore,
        timestamp: digest.generatedAt
      };
    });
    // Batch creation in groups if needed, though usually clusters < 50
    await Promise.all(stories.map(s => StoryVaultEntity.create(env, s)));
  }
  static seedData: DailyDigest[] = [
    {
      id: "sample-digest-001",
      generatedAt: Date.now() - 86400000,
      articleCount: 142,
      clusterCount: 1,
      consensusScore: 9.2,
      clusters: [
        {
          id: "cluster-sample-1",
          representativeTitle: "Global Economic Shift: Central Banks Signal Rate Stability",
          articles: [],
          sourceSpread: ["Reuters", "Associated Press", "BBC World", "Al Jazeera"],
          sourceCount: 4,
          neutralSummary: "Major central banks across the G7 have issued coordinated statements indicating a pause in interest rate adjustments.",
          impactScore: 9.8,
          biasScore: 0.05,
          clusterVariance: 0.1,
          meanSlant: 0.0,
          consensusFactor: 0.95
        }
      ]
    }
  ];
  static async ensureSeed(env: Env): Promise<void> {
    const { items } = await this.list(env);
    if (items.length === 0) {
      for (const data of this.seedData) {
        await this.create(env, data);
      }
    }
  }
}