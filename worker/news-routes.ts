import { Hono } from "hono";
import type { Env } from './core-utils';
import { NewsSourceEntity, DailyDigestEntity } from "./news-entities";
import { ok, bad, notFound } from './core-utils';
import { fetchAndParseRSS, clusterArticles } from "./news-utils";
export function newsRoutes(app: Hono<{ Bindings: Env }>) {
  app.get('/api/sources', async (c) => {
    await NewsSourceEntity.ensureSeed(c.env);
    return ok(c, await NewsSourceEntity.list(c.env));
  });
  app.post('/api/sources', async (c) => {
    const body = await c.req.json();
    const source = await NewsSourceEntity.create(c.env, { 
      ...body, 
      id: crypto.randomUUID(), 
      active: true, 
      weight: 1 
    });
    return ok(c, source);
  });
  app.delete('/api/sources/:id', async (c) => {
    return ok(c, await NewsSourceEntity.delete(c.env, c.req.param('id')));
  });
  app.get('/api/digest/latest', async (c) => {
    const list = await DailyDigestEntity.list(c.env, null, 1);
    return ok(c, list.items[0] || null);
  });
  app.post('/api/pipeline/run', async (c) => {
    const sourcesRes = await NewsSourceEntity.list(c.env);
    const activeSources = sourcesRes.items.filter(s => s.active);
    let allArticles = [];
    for (const source of activeSources) {
      const articles = await fetchAndParseRSS(source.id, source.name, source.url);
      allArticles.push(...articles);
    }
    const clusters = clusterArticles(allArticles);
    const today = new Date().toISOString().split('T')[0];
    const digest = await DailyDigestEntity.create(c.env, {
      id: `${today}-${Date.now()}`,
      generatedAt: Date.now(),
      articleCount: allArticles.length,
      clusterCount: clusters.length,
      clusters: clusters.slice(0, 15) // Keep top 15 clusters
    });
    return ok(c, digest);
  });
}