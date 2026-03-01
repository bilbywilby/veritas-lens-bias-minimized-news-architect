import { IndexedEntity } from "./core-utils";
import type { NewsSource, DailyDigest } from "@shared/news-types";
export class NewsSourceEntity extends IndexedEntity<NewsSource> {
  static readonly entityName = "news-source";
  static readonly indexName = "news-sources";
  static readonly initialState: NewsSource = { id: "", name: "", url: "", active: true, weight: 1 };
  static seedData: NewsSource[] = [
    { id: "reuters", name: "Reuters", url: "https://www.reutersagency.com/feed/", active: true, weight: 1 },
    { id: "bbc", name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", active: true, weight: 1 },
    { id: "ap", name: "Associated Press", url: "https://newsatme.com/apnews.xml", active: true, weight: 1 },
    { id: "npr", name: "NPR News", url: "https://feeds.npr.org/1001/rss.xml", active: true, weight: 1 },
    { id: "aljazeera", name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", active: true, weight: 1 }
  ];
}
export class DailyDigestEntity extends IndexedEntity<DailyDigest> {
  static readonly entityName = "daily-digest";
  static readonly indexName = "daily-digests";
  static readonly initialState: DailyDigest = { id: "", generatedAt: 0, articleCount: 0, clusterCount: 0, clusters: [] };
}