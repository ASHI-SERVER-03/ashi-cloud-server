import express from 'express';
import { query } from '../db.js';
import { publicTemplateRow } from '../validators.js';
import { signedAssetUrl } from '../storage.js';

export const publicRouter = express.Router();

publicRouter.get('/health', async (_req, res) => {
  const db = await query('select 1 as ok');
  res.json({ ok: true, name: 'ASHI Cloud Server', db: db.rows[0].ok === 1 });
});

publicRouter.get('/api/v1/templates', async (req, res) => {
  const category = String(req.query.category || '').trim();
  const search = String(req.query.q || '').trim();
  const params = [];
  const where = ['published_at is not null', 'deleted_at is null'];
  if (category) {
    params.push(category);
    where.push(`category=$${params.length}`);
  }
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    where.push(`(lower(name) like $${params.length} or lower(category) like $${params.length} or lower(array_to_string(tags,' ')) like $${params.length})`);
  }
  const rows = await query(
    `select * from templates where ${where.join(' and ')} order by category asc, name asc limit 300`,
    params
  );
  await query('insert into audit_logs(actor, action, ip, meta) values($1,$2,$3,$4)', [
    'public',
    'templates.list',
    req.ip,
    { count: rows.rowCount }
  ]);
  res.json({ ok: true, templates: rows.rows.map(publicTemplateRow), serverTime: new Date().toISOString() });
});

publicRouter.get('/api/v1/templates/:id/download', async (req, res) => {
  const row = await query('select * from templates where template_id=$1 and published_at is not null and deleted_at is null', [req.params.id]);
  const template = row.rows[0];
  if (!template || !template.asset_key) return res.status(404).json({ ok: false, error: 'asset_not_found' });
  await query('update templates set download_count=download_count+1 where id=$1', [template.id]);
  await query('insert into template_downloads(template_id, ip, user_agent) values($1,$2,$3)', [
    template.id,
    req.ip,
    req.headers['user-agent'] || ''
  ]);
  res.json({
    ok: true,
    id: template.template_id,
    sha256: template.asset_sha256,
    url: await signedAssetUrl(template.asset_key),
    expiresInSeconds: 900
  });
});

publicRouter.get('/api/v1/assets/:key', async (req, res) => {
  const key = decodeURIComponent(req.params.key || '');
  if (!key || key.includes('..') || key.includes('\\')) return res.status(400).json({ ok: false, error: 'bad_key' });
  res.redirect(await signedAssetUrl(key));
});
