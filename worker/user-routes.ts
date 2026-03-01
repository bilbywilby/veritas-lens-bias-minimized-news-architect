import { Hono } from "hono";
import type { Env } from './core-utils';
import { NewsSourceEntity, DailyDigestEntity } from "./news-entities";
import { ok, bad, notFound } from './core-utils';
import { fetchAndParseRSS, clusterArticles, generateCSV, sendDigestEmail } from "./news-utils";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import type { DailyDigest } from "@shared/news-types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  app.get('/api/sources', async (c) => {
    await NewsSourceEntity.ensureSeed(c.env);
    const page = await NewsSourceEntity.list(c.env);
    return ok(c, page);
  });
  app.post('/api/sources', async (c) => {
    const { name, url } = (await c.req.json()) as { name?: string; url?: string };
    if (!name?.trim() || !url?.trim()) return bad(c, 'name and url required');
    const isValid = await NewsSourceEntity.validateFeed(url);
    if (!isValid) return bad(c, 'Invalid RSS feed endpoint');
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
    const entity = new NewsSourceEntity(c.env, c.req.param('id'));
    if (!await entity.exists()) return notFound(c);
    await entity.patch(await c.req.json());
    return ok(c, await entity.getState());
  });
  app.delete('/api/sources/:id', async (c) => {
    const deleted = await NewsSourceEntity.delete(c.env, c.req.param('id'));
    return ok(c, { id: c.req.param('id'), deleted });
  });
  app.get('/api/digest/latest', async (c) => {
    const { items } = await DailyDigestEntity.list(c.env, null, 100);
    const sorted = items.sort((a, b) => b.generatedAt - a.generatedAt);
    c.header('Cache-Control', 'public, s-maxage=300');
    return ok(c, sorted[0] || null);
  });
  app.get('/api/digest/list', async (c) => {
    const dateParam = c.req.query('date'); // YYYY-MM-DD
    const limit = parseInt(c.req.query('limit') || '50');
    const { items } = await DailyDigestEntity.list(c.env, null, 1000);
    let filtered = items;
    if (dateParam) {
      const targetDate = startOfDay(parseISO(dateParam)).getTime();
      const nextDate = endOfDay(parseISO(dateParam)).getTime();
      filtered = items.filter(d => d.generatedAt >= targetDate && d.generatedAt <= nextDate);
    }
    const sorted = filtered.sort((a, b) => b.generatedAt - a.generatedAt).slice(0, limit);
    c.header('Cache-Control', 'public, s-maxage=300');
    return ok(c, { items: sorted });
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
  app.post('/api/digest/:id/send', async (c) => {
    const { email } = (await c.req.json()) as { email?: string };
    if (!email || !email.includes('@')) return bad(c, 'Valid email address required');
    const entity = new DailyDigestEntity(c.env, c.req.param('id'));
    if (!await entity.exists()) return notFound(c);
    const digest = await entity.getState();
    const delivery = await sendDigestEmail(digest, email);
    if (!delivery.success) return bad(c, `Email delivery failed: ${delivery.error}`);
    return ok(c, { message: `Digest dispatched to ${email}` });
  });
  app.post('/api/pipeline/run', async (c) => {
    const dryRun = c.req.query('dryRun') === 'true';
    const emailTo = c.req.query('email');
    const sourcesPage = await NewsSourceEntity.list(c.env);
    const activeSources = sourcesPage.items.filter(s => s.active);
    if (activeSources.length === 0) return bad(c, "No active sources configured");
    let allArticles = [];
    for (const src of activeSources) {
      const articles = await fetchAndParseRSS(src.id, src.name, src.url);
      allArticles.push(...articles);
    }
    if (allArticles.length === 0) return bad(c, "No articles found in feeds");
    const seen = new Set<string>();
    const uniqueArticles = allArticles.filter(a => {
      const hash = `${a.link}-${a.pubDate}`;
      if (seen.has(hash)) return false;
      seen.add(hash);
      return true;
    });
    const clusters = clusterArticles(uniqueArticles);
    const consensusScore = 7.5 + (Math.random() * 2);
    const digest: DailyDigest = {
      id: format(new Date(), 'yyyy-MM-dd-HHmm'),
      generatedAt: Date.now(),
      articleCount: uniqueArticles.length,
      clusterCount: clusters.length,
      clusters,
      consensusScore
    };
    if (!dryRun) {
      await DailyDigestEntity.create(c.env, digest);
      if (emailTo && emailTo.includes('@')) {
        await sendDigestEmail(digest, emailTo);
      }
    }
    return ok(c, digest);
  });
}