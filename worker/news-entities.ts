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
}
export class DailyDigestEntity extends IndexedEntity<DailyDigest> {
  static readonly entityName = "daily-digest";
  static readonly indexName = "daily-digests";
  static readonly initialState: DailyDigest = { id: "", generatedAt: 0, articleCount: 0, clusterCount: 0, clusters: [] };
  static seedData: DailyDigest[] = [
    {
      id: "sample-digest-001",
      generatedAt: Date.now(),
      articleCount: 142,
      clusterCount: 3,
      consensusScore: 9.2,
      clusters: [
        {
          id: "cluster-sample-1",
          representativeTitle: "Global Economic Shift: Central Banks Signal Rate Stability",
          articles: [],
          sourceSpread: ["Reuters", "Associated Press", "BBC World", "Al Jazeera"],
          sourceCount: 4,
          neutralSummary: "Major central banks across the G7 have issued coordinated statements indicating a pause in interest rate adjustments. Analysts note that inflationary pressures have stabilized faster than projected in Q3, leading to a unified consensus on monetary policy for the upcoming fiscal cycle.",
          impactScore: 9.8,
          biasScore: 0.05,
          clusterVariance: 0.1,
          meanSlant: 0.0,
          consensusFactor: 0.95
        },
        {
          id: "cluster-sample-2",
          representativeTitle: "Comprehensive Tech Regulation Framework Proposed in EU",
          articles: [],
          sourceSpread: ["BBC World", "NPR News", "Reuters"],
          sourceCount: 3,
          neutralSummary: "A new legislative framework targeting decentralized AI models has been introduced in the European Parliament. While sources agree on the intent to protect data privacy, reporting varies on the potential economic impact for smaller startups versus established technology conglomerates.",
          impactScore: 7.5,
          biasScore: 0.28,
          clusterVariance: 0.35,
          meanSlant: -0.15,
          consensusFactor: 0.65
        },
        {
          id: "cluster-sample-3",
          representativeTitle: "Environmental Protocol Debate Escalates Ahead of Summit",
          articles: [],
          sourceSpread: ["Al Jazeera", "NPR News", "Associated Press"],
          sourceCount: 3,
          neutralSummary: "Discussions surrounding the upcoming maritime environmental protocols have exposed deep divisions between manufacturing hubs and conservationist groups. Reports diverge significantly on the feasibility of the 2030 targets, with some outlets emphasizing economic costs and others focusing on long-term ecological risks.",
          impactScore: 6.2,
          biasScore: 0.55,
          clusterVariance: 0.6,
          meanSlant: 0.1,
          consensusFactor: 0.4
        }
      ]
    }
  ];
}