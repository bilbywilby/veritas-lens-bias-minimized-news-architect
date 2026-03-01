import { Hono } from "hono";
import type { Env } from './core-utils';
import { NewsSourceEntity, DailyDigestEntity } from "./news-entities";
import { ok, bad, notFound } from './core-utils';
import { fetchAndParseRSS, clusterArticles, generateCSV } from "./news-utils";
import { format } from "date-fns";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // --- SOURCES MANAGEMENT ---
  app.get('/api/sources', async (c) => {
    await NewsSourceEntity.ensureSeed(c.env);
    const page = await NewsSourceEntity.list(c.env);
    return ok(c, page);
  });
  app.post('/api/sources', async (c) => {
    const { name, url } = (await c.req.json()) as { name?: string; url?: string };
    if (!name?.trim() || !url?.trim()) return bad(c, 'name and url required');
    const source = await NewsSourceEntity.create(c.env, {
      id: crypto.randomUUID(),
      name: name.trim(),
      url: url.trim(),
      active: true,
      weight: 3
    });
    return ok(c, source);
  });
  app.patch('/api/sources/:id', async (c) => {
    const id = c.req.param('id');
    const updates = (await c.req.json()) as { active?: boolean; weight?: number };
    const entity = new NewsSourceEntity(c.env, id);
    if (!await entity.exists()) return notFound(c);
    await entity.patch(updates);
    return ok(c, await entity.getState());
  });
  app.delete('/api/sources/:id', async (c) => {
    const deleted = await NewsSourceEntity.delete(c.env, c.req.param('id'));
    return ok(c, { id: c.req.param('id'), deleted });
  });
  // --- DIGEST & ARCHIVE ---
  app.get('/api/digest/latest', async (c) => {
    const { items } = await DailyDigestEntity.list(c.env, null, 100);
    const sorted = items.sort((a, b) => b.generatedAt - a.generatedAt);
    return ok(c, sorted[0] || null);
  });
  app.get('/api/digest/list', async (c) => {
    const limitStr = c.req.query('limit');
    const limit = limitStr ? parseInt(limitStr) : 50;
    const page = await DailyDigestEntity.list(c.env, null, limit);
    const sorted = page.items.sort((a, b) => b.generatedAt - a.generatedAt);
    return ok(c, { items: sorted });
  });
  app.get('/api/digest/:id/csv', async (c) => {
    const id = c.req.param('id');
    const entity = new DailyDigestEntity(c.env, id);
    if (!await entity.exists()) return notFound(c);
    const digest = await entity.getState();
    const csv = generateCSV(digest);
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="veritas-lens-${id}.csv"`
      }
    });
  });
  // --- INTELLIGENCE PIPELINE ---
  app.post('/api/pipeline/run', async (c) => {
    const sourcesPage = await NewsSourceEntity.list(c.env);
    const activeSources = sourcesPage.items.filter(s => s.active);
    if (activeSources.length === 0) return bad(c, "No active sources configured");
    let allArticles = [];
    for (const src of activeSources) {
      try {
        const articles = await fetchAndParseRSS(src.id, src.name, src.url);
        allArticles.push(...articles);
      } catch (e) {
        console.error(`[PIPELINE] Failed source ${src.name}:`, e);
      }
    }
    if (allArticles.length === 0) return bad(c, "No articles found in feeds");
    const clusters = clusterArticles(allArticles);
    const topClusters = clusters.slice(0, 15);
    const digestId = format(new Date(), 'yyyy-MM-dd-HHmm');
    const digest = await DailyDigestEntity.create(c.env, {
      id: digestId,
      generatedAt: Date.now(),
      articleCount: allArticles.length,
      clusterCount: topClusters.length,
      clusters: topClusters
    });
    const sendEmail = c.req.query('sendEmail') === 'true';
    if (sendEmail) {
       // Mock integration
       console.log(`[PIPELINE] Email notification triggered for ${digestId}`);
    }
    return ok(c, digest);
  });
}