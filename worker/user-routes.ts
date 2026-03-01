import { Hono } from "hono";
import type { Env } from './core-utils';
import { NewsSourceEntity, DailyDigestEntity, SystemStateEntity, StoryVaultEntity } from "./news-entities";
import { ok, bad, notFound } from './core-utils';
import { fetchAndParseRSS, clusterArticles, generateCSV } from "./news-utils";
import { format, parseISO, startOfDay, endOfDay, subDays } from "date-fns";
import type { DailyDigest } from "@shared/news-types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // Set explicit Edge cache control for high-volatility endpoints
  app.use('/api/system/*', async (c, next) => {
    await next();
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate');
  });
  app.get('/api/sources', async (c) => {
    await NewsSourceEntity.ensureSeed(c.env);
    const page = await NewsSourceEntity.list(c.env);
    return ok(c, page);
  });
  app.post('/api/sources', async (c) => {
    const { name, url, slant } = (await c.req.json()) as { name?: string; url?: string; slant?: number };
    if (!name?.trim() || !url?.trim()) return bad(c, 'name and url required');
    const isValid = await NewsSourceEntity.validateFeed(url);
    if (!isValid) return bad(c, 'Invalid RSS feed endpoint');
    const source = await NewsSourceEntity.create(c.env, {
      id: crypto.randomUUID(),
      name: name.trim(),
      url: url.trim(),
      active: true,
      weight: 3,
      slant: slant ?? 0.0
    });
    return ok(c, source);
  });
  app.patch('/api/sources/:id', async (c) => {
    const entity = new NewsSourceEntity(c.env, c.req.param('id'));
    if (!await entity.exists()) return notFound(c);
    await entity.patch(await c.req.json());
    return ok(c, await entity.getState());
  });
  app.delete('/api/sources/:id', async (c) => {
    const deleted = await NewsSourceEntity.delete(c.env, c.req.param('id'));
    return ok(c, { id: c.req.param('id'), deleted });
  });
  app.get('/api/system/stats', async (c) => {
    await SystemStateEntity.ensureSeed(c.env);
    const state = await new SystemStateEntity(c.env, "global").getState();
    const { items: digests } = await DailyDigestEntity.list(c.env, null, 100);
    const avgConsensus = digests.reduce((acc, d) => acc + (d.consensusScore || 0), 0) / (digests.length || 1);
    return ok(c, { ...state, avgConsensus });
  });
  app.post('/api/system/sync', async (c) => {
    const { items } = await DailyDigestEntity.list(c.env, null, 1);
    if (items.length === 0) return bad(c, "No digest to archive");
    await DailyDigestEntity.archiveToVault(c.env, items[0]);
    return ok(c, { archived: items[0].id });
  });
  app.get('/api/stories/search', async (c) => {
    const minSlant = parseFloat(c.req.query('minSlant') || '-1.0');
    const maxSlant = parseFloat(c.req.query('maxSlant') || '1.0');
    const source = c.req.query('source')?.toLowerCase();
    const query = c.req.query('q')?.toLowerCase();
    const { items } = await StoryVaultEntity.list(c.env, null, 500);
    const results = items.filter(s => {
      const matchSlant = s.slant >= minSlant && s.slant <= maxSlant;
      const matchSource = !source || s.sourceName.toLowerCase().includes(source);
      const matchQuery = !query || s.title.toLowerCase().includes(query);
      return matchSlant && matchSource && matchQuery;
    });
    return ok(c, results.sort((a, b) => b.timestamp - a.timestamp));
  });
  app.get('/api/digest/list', async (c) => {
    await DailyDigestEntity.ensureSeed(c.env);
    const dateParam = c.req.query('date');
    const { items } = await DailyDigestEntity.list(c.env, null, 1000);
    let filtered = items;
    if (dateParam) {
      const parsedDate = parseISO(dateParam);
      const targetStart = startOfDay(parsedDate).getTime();
      const targetEnd = endOfDay(parsedDate).getTime();
      filtered = items.filter(d => d.generatedAt >= targetStart && d.generatedAt <= targetEnd);
    }
    return ok(c, { items: filtered.sort((a, b) => b.generatedAt - a.generatedAt) });
  });
  app.get('/api/digest/:id/csv', async (c) => {
    const entity = new DailyDigestEntity(c.env, c.req.param('id'));
    if (!await entity.exists()) return notFound(c);
    const digest = await entity.getState();
    const csv = generateCSV(digest);
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="veritas-lens-${digest.id}.csv"`
      }
    });
  });
  app.post('/api/pipeline/run', async (c) => {
    const sourcesPage = await NewsSourceEntity.list(c.env);
    const activeSources = sourcesPage.items.filter(s => s.active);
    if (activeSources.length === 0) return bad(c, "No active sources configured");
    const fetchResults = await Promise.all(activeSources.map(async (src) => {
      try { return await fetchAndParseRSS(src.id, src.name, src.url); }
      catch (e) { return []; }
    }));
    const allArticles = fetchResults.flat();
    if (allArticles.length === 0) return bad(c, "No articles found in feeds");
    const uniqueArticles = allArticles.filter((v, i, a) => a.findIndex(t => (t.link === v.link)) === i);
    const clusters = await clusterArticles(uniqueArticles, c.env);
    const digest: DailyDigest = {
      id: format(new Date(), 'yyyy-MM-dd-HHmm'),
      generatedAt: Date.now(),
      articleCount: uniqueArticles.length,
      clusterCount: clusters.length,
      clusters,
      consensusScore: 8.5 // Simplified for now
    };
    await DailyDigestEntity.create(c.env, digest);
    await SystemStateEntity.updateMetrics(c.env, uniqueArticles.length, activeSources.length);
    return ok(c, digest);
  });
}