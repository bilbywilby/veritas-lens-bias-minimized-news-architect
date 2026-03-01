import { Hono } from "hono";
import type { Env } from './core-utils';
import { NewsSourceEntity, DailyDigestEntity, SystemStateEntity, StoryVaultEntity } from "./news-entities";
import { ok, bad, notFound } from './core-utils';
import { fetchAndParseRSS, clusterArticles, summarizeCluster, generateCSV } from "./news-utils";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import type { DailyDigest, NewsCluster } from "@shared/news-types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // Idempotency guard: Hono does not allow duplicate route definitions for the same path/method.
  // Dynamic loading in the worker environment can trigger multiple registration attempts.
  if ((app as any)._veritas_lens_routes_registered) {
    return;
  }
  (app as any)._veritas_lens_routes_registered = true;
  app.use('/api/system/*', async (c, next) => {
    await next();
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');
  });
  app.get('/api/sources', async (c) => {
    try {
      await NewsSourceEntity.ensureSeed(c.env);
      const page = await NewsSourceEntity.list(c.env);
      return ok(c, page);
    } catch (e: any) {
      console.error("[API SOURCES GET] Error:", e.message);
      return bad(c, "Failed to retrieve sources from storage.");
    }
  });
  app.post('/api/sources', async (c) => {
    try {
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
    } catch (e: any) {
      return bad(c, `Registry failure: ${e.message}`);
    }
  });
  app.patch('/api/sources/:id', async (c) => {
    const id = c.req.param('id');
    const entity = new NewsSourceEntity(c.env, id);
    if (!await entity.exists()) return notFound(c);
    await entity.patch(await c.req.json());
    return ok(c, await entity.getState());
  });
  app.delete('/api/sources/:id', async (c) => {
    const id = c.req.param('id');
    const deleted = await NewsSourceEntity.delete(c.env, id);
    return ok(c, { id, deleted });
  });
  app.get('/api/system/stats', async (c) => {
    try {
      await SystemStateEntity.ensureSeed(c.env);
      const state = await new SystemStateEntity(c.env, "global").getState();
      const { items: digests } = await DailyDigestEntity.list(c.env, null, 20);
      const avgConsensus = digests.length > 0
        ? digests.reduce((acc, d) => acc + (d.consensusScore || 0), 0) / digests.length
        : 0;
      return ok(c, { ...state, avgConsensus });
    } catch (e: any) {
      return ok(c, { id: 'global', lastRun: 0, totalArticles: 0, sourceCount: 0, avgConsensus: 0 });
    }
  });
  app.post('/api/system/sync', async (c) => {
    try {
      const { items } = await DailyDigestEntity.list(c.env, null, 1);
      if (items.length === 0) return bad(c, "No current digest available for archival.");
      const latest = items[0];
      if (!latest.clusters || latest.clusters.length === 0) return bad(c, "Digest contains no clusters.");
      await DailyDigestEntity.archiveToVault(c.env, latest);
      return ok(c, { archived: latest.id });
    } catch (e: any) {
      console.error("[SYNC] Fatal:", e.message);
      return bad(c, `Sync failed: ${e.message}`);
    }
  });
  app.get('/api/stories/search', async (c) => {
    try {
      const minSlant = parseFloat(c.req.query('minSlant') || '-1.0');
      const maxSlant = parseFloat(c.req.query('maxSlant') || '1.0');
      const sourceFilter = c.req.query('source')?.toLowerCase();
      const queryFilter = c.req.query('q')?.toLowerCase();
      const { items } = await StoryVaultEntity.list(c.env, null, 40);
      const results = items.filter(s => {
        const slantVal = s.slant ?? 0;
        const matchSlant = slantVal >= minSlant && slantVal <= maxSlant;
        const matchSource = !sourceFilter || (s.sourceName || "").toLowerCase().includes(sourceFilter);
        const matchQuery = !queryFilter || (s.title || "").toLowerCase().includes(queryFilter);
        return matchSlant && matchSource && matchQuery;
      });
      return ok(c, results.sort((a, b) => b.timestamp - a.timestamp));
    } catch (e: any) {
      return bad(c, "Search index unavailable.");
    }
  });
  app.get('/api/digest/list', async (c) => {
    try {
      await DailyDigestEntity.ensureSeed(c.env);
      const dateParam = c.req.query('date');
      const { items } = await DailyDigestEntity.list(c.env, null, 40);
      let filtered = items;
      if (dateParam) {
        const parsedDate = parseISO(dateParam);
        const targetStart = startOfDay(parsedDate).getTime();
        const targetEnd = endOfDay(parsedDate).getTime();
        filtered = items.filter(d => d.generatedAt >= targetStart && d.generatedAt <= targetEnd);
      }
      return ok(c, { items: filtered.sort((a, b) => b.generatedAt - a.generatedAt) });
    } catch (e: any) {
      return ok(c, { items: [] });
    }
  });
  app.get('/api/digest/:id/csv', async (c) => {
    try {
      const id = c.req.param('id');
      const entity = new DailyDigestEntity(c.env, id);
      if (!await entity.exists()) return notFound(c);
      const digest = await entity.getState();
      const csv = generateCSV(digest);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="veritas-lens-${digest.id}.csv"`
        }
      });
    } catch (e: any) {
      return bad(c, "CSV generation failure.");
    }
  });
  app.post('/api/pipeline/run', async (c) => {
    try {
      const sourcesPage = await NewsSourceEntity.list(c.env);
      const activeSources = (sourcesPage.items || []).filter(s => s.active);
      if (activeSources.length === 0) return bad(c, "Operational Error: No active streams registered.");
      const settlements = await Promise.allSettled(activeSources.map(src => fetchAndParseRSS(src.id, src.name, src.url)));
      const allArticles = settlements
        .map((res, i) => (res.status === 'fulfilled' ? res.value : []))
        .flat();
      if (allArticles.length === 0) return bad(c, "Null result from RSS clusters. (0 articles found)");
      const uniqueArticles = allArticles.filter((v, i, a) => a.findIndex(t => t.link === v.link) === i);
      const rawClusters = await clusterArticles(uniqueArticles, c.env);
      const clusters: NewsCluster[] = await Promise.all(rawClusters.map(async (cl, idx) => {
        if (idx >= 10) return cl;
        try {
          const aiResult = await summarizeCluster(cl.articles, c.env);
          return { ...cl, neutralSummary: aiResult.summary, tags: aiResult.tags };
        } catch (e) {
          console.error(`[PIPELINE] AI Summary failed for cluster ${cl.representativeTitle}`);
          return cl;
        }
      }));
      const digest: DailyDigest = {
        id: format(new Date(), 'yyyy-MM-dd-HHmm'),
        generatedAt: Date.now(),
        articleCount: uniqueArticles.length,
        clusterCount: clusters.length,
        clusters,
        consensusScore: 8.5
      };
      await DailyDigestEntity.create(c.env, digest);
      await SystemStateEntity.updateMetrics(c.env, uniqueArticles.length, activeSources.length);
      return ok(c, digest);
    } catch (e: any) {
      console.error("[PIPELINE RUN] Critical Edge Failure:", e.message);
      return bad(c, `Edge Execution Failure: ${e.message}`);
    }
  });
}