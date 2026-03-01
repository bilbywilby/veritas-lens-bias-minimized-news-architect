import { Hono } from "hono";
import type { Env } from './core-utils';
import { NewsSourceEntity, DailyDigestEntity, SystemStateEntity, StoryVaultEntity } from "./news-entities";
import { ok, bad, notFound } from './core-utils';
import { fetchAndParseRSS, clusterArticles, generateCSV } from "./news-utils";
import { format, parseISO, startOfDay, endOfDay, subDays } from "date-fns";
import type { DailyDigest } from "@shared/news-types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  app.use('/api/digest/*', async (c, next) => {
    await next();
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');
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
  app.get('/api/system/health', async (c) => {
    await SystemStateEntity.ensureSeed(c.env);
    const state = await new SystemStateEntity(c.env, "global").getState();
    return ok(c, state);
  });
  app.post('/api/system/sync', async (c) => {
    const { items } = await DailyDigestEntity.list(c.env, null, 1);
    if (items.length === 0) return bad(c, "No digest to archive");
    await DailyDigestEntity.archiveToVault(c.env, items[0]);
    return ok(c, { archived: items[0].id });
  });
  app.get('/api/stories/search', async (c) => {
    const { items } = await StoryVaultEntity.list(c.env, null, 100);
    const query = c.req.query('q')?.toLowerCase();
    const results = query ? items.filter(s => s.title.toLowerCase().includes(query) || s.sourceName.toLowerCase().includes(query)) : items;
    return ok(c, results);
  });
  app.get('/api/digest/latest', async (c) => {
    await DailyDigestEntity.ensureSeed(c.env);
    const { items } = await DailyDigestEntity.list(c.env, null, 100);
    const sorted = items.sort((a, b) => b.generatedAt - a.generatedAt);
    return ok(c, sorted[0] || null);
  });
  app.get('/api/analytics/consensus', async (c) => {
    await DailyDigestEntity.ensureSeed(c.env);
    const { items } = await DailyDigestEntity.list(c.env, null, 1000);
    const fourteenDaysAgo = subDays(new Date(), 14).getTime();
    const series = items
      .filter(d => d.generatedAt >= fourteenDaysAgo)
      .sort((a, b) => a.generatedAt - b.generatedAt)
      .map(d => ({
        date: format(new Date(d.generatedAt), 'MMM dd'),
        score: d.consensusScore || 0,
        articles: d.articleCount,
        clusters: d.clusterCount
      }));
    return ok(c, series);
  });
  app.get('/api/digest/list', async (c) => {
    try {
      await DailyDigestEntity.ensureSeed(c.env);
      const dateParam = c.req.query('date');
      const limit = parseInt(c.req.query('limit') || '50');
      const { items } = await DailyDigestEntity.list(c.env, null, 1000);
      let filtered = items;
      if (dateParam) {
        const parsedDate = parseISO(dateParam);
        const targetStart = startOfDay(parsedDate).getTime();
        const targetEnd = endOfDay(parsedDate).getTime();
        filtered = items.filter(d => d.generatedAt >= targetStart && d.generatedAt <= targetEnd);
      }
      const sorted = filtered.sort((a, b) => b.generatedAt - a.generatedAt).slice(0, limit);
      return ok(c, { items: sorted });
    } catch (e) {
      return ok(c, { items: [] });
    }
  });
  app.get('/api/digest/:id/csv', async (c) => {
    const entity = new DailyDigestEntity(c.env, c.req.param('id'));
    if (!await entity.exists()) return notFound(c);
    const digest = await entity.getState();
    const csv = generateCSV(digest);
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="veritas-lens-${digest.id}.csv"`,
        'Cache-Control': 'no-store'
      }
    });
  });
  app.post('/api/pipeline/run', async (c) => {
    const sourcesPage = await NewsSourceEntity.list(c.env);
    const activeSources = sourcesPage.items.filter(s => s.active);
    if (activeSources.length === 0) return bad(c, "No active sources configured");
    const fetchResults = await Promise.all(activeSources.map(async (src) => {
      try {
        return await fetchAndParseRSS(src.id, src.name, src.url);
      } catch (e) {
        console.error(`[PIPELINE] Failed to fetch from ${src.name}:`, e);
        return [];
      }
    }));
    const allArticles = fetchResults.flat();
    if (allArticles.length === 0) return bad(c, "No articles found in feeds");
    const uniqueArticles = allArticles.filter((v, i, a) => a.findIndex(t => (t.link === v.link)) === i);
    const clusters = await clusterArticles(uniqueArticles, c.env);
    const slants = clusters.map(cl => cl.meanSlant);
    const mean = slants.reduce((a, b) => a + b, 0) / (slants.length || 1);
    const variance = slants.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (slants.length || 1);
    const stdDev = Math.sqrt(variance);
    const consensusScore = Math.max(0, Math.min(10, 10 - (stdDev * 10)));
    const digest: DailyDigest = {
      id: format(new Date(), 'yyyy-MM-dd-HHmm'),
      generatedAt: Date.now(),
      articleCount: uniqueArticles.length,
      clusterCount: clusters.length,
      clusters,
      consensusScore
    };
    await DailyDigestEntity.create(c.env, digest);
    await SystemStateEntity.updateMetrics(c.env, uniqueArticles.length, activeSources.length);
    return ok(c, digest);
  });
}