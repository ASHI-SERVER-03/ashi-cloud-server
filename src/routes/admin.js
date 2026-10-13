import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import { login, requireAdmin } from '../auth.js';
import { query, transaction } from '../db.js';
import { config } from '../config.js';
import { parseTemplate, publicTemplateRow, templatePatchSchema } from '../validators.js';
import { putAsset, safeObjectKey } from '../storage.js';

export const adminRouter = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024 }
});

async function upsertTemplate(template, admin, ip) {
  return transaction(async (client) => {
    const existing = await client.query('select * from templates where template_id=$1 and deleted_at is null', [template.id]);
    const version = existing.rowCount ? existing.rows[0].revision + 1 : 1;
    if (existing.rowCount) {
      await client.query(
        `update templates set name=$2,type=$3,category=$4,description=$5,risk=$6,version=$7,min_ae_version=$8,tags=$9,preview_url=$10,asset_url=$11,asset_sha256=$12,data=$13,revision=$14,updated_at=now() where template_id=$1`,
        [template.id, template.name, template.type, template.category, template.description, template.risk, template.version, template.minAeVersion, template.tags, template.preview, template.assetUrl, template.assetSha256, template, version]
      );
    } else {
      await client.query(
        `insert into templates(template_id,name,type,category,description,risk,version,min_ae_version,tags,preview_url,asset_url,asset_sha256,data,revision) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [template.id, template.name, template.type, template.category, template.description, template.risk, template.version, template.minAeVersion, template.tags, template.preview, template.assetUrl, template.assetSha256, template, version]
      );
    }
    await client.query('insert into template_versions(template_id, revision, data, admin_email) values($1,$2,$3,$4)', [template.id, version, template, admin.email]);
    await client.query('insert into audit_logs(actor, action, ip, meta) values($1,$2,$3,$4)', [admin.email, 'template.upsert', ip, { id: template.id, revision: version }]);
    return { revision: version };
  });
}

adminRouter.post('/api/v1/admin/login', async (req, res) => {
  const body = z.object({ email: z.string().email(), password: z.string().min(8) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ ok: false, error: 'invalid_login' });
  const token = await login(body.data.email, body.data.password);
  if (!token) return res.status(401).json({ ok: false, error: 'invalid_credentials' });
  res.json({ ok: true, token });
});

adminRouter.get('/api/v1/admin/templates', requireAdmin, async (_req, res) => {
  const rows = await query('select * from templates where deleted_at is null order by updated_at desc limit 500');
  res.json({ ok: true, templates: rows.rows.map(publicTemplateRow) });
});

adminRouter.post('/api/v1/admin/templates', requireAdmin, async (req, res) => {
  const template = parseTemplate(req.body);
  const saved = await upsertTemplate(template, req.admin, req.ip);
  res.json({ ok: true, id: template.id, revision: saved.revision });
});

adminRouter.patch('/api/v1/admin/templates/:id', requireAdmin, async (req, res) => {
  const patch = templatePatchSchema.parse({ ...req.body, id: req.params.id });
  const current = await query('select * from templates where template_id=$1 and deleted_at is null', [req.params.id]);
  if (!current.rowCount) return res.status(404).json({ ok: false, error: 'not_found' });
  const merged = parseTemplate({ ...current.rows[0].data, ...patch, id: req.params.id });
  const saved = await upsertTemplate(merged, req.admin, req.ip);
  return res.json({ ok: true, id: merged.id, revision: saved.revision });
});

adminRouter.post('/api/v1/admin/templates/:id/publish', requireAdmin, async (req, res) => {
  const publish = req.body.publish !== false;
  const result = await query('update templates set published_at=$2, updated_at=now() where template_id=$1 and deleted_at is null returning template_id', [
    req.params.id,
    publish ? new Date() : null
  ]);
  if (!result.rowCount) return res.status(404).json({ ok: false, error: 'not_found' });
  await query('insert into audit_logs(actor, action, ip, meta) values($1,$2,$3,$4)', [req.admin.email, publish ? 'template.publish' : 'template.unpublish', req.ip, { id: req.params.id }]);
  res.json({ ok: true, id: req.params.id, published: publish });
});

adminRouter.delete('/api/v1/admin/templates/:id', requireAdmin, async (req, res) => {
  await query('update templates set deleted_at=now(), updated_at=now() where template_id=$1', [req.params.id]);
  await query('insert into audit_logs(actor, action, ip, meta) values($1,$2,$3,$4)', [req.admin.email, 'template.delete', req.ip, { id: req.params.id }]);
  res.json({ ok: true });
});

adminRouter.post('/api/v1/admin/templates/:id/assets', requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'file_required' });
  const allowed = /\.(ffx|aep|jsx|jpg|jpeg|png|webp|mp4|mov)$/i.test(req.file.originalname);
  if (!allowed) return res.status(400).json({ ok: false, error: 'file_type_not_allowed' });
  const key = safeObjectKey(`templates/${req.params.id}`, req.file.originalname);
  const asset = await putAsset({ key, body: req.file.buffer, contentType: req.file.mimetype });
  await query('update templates set asset_key=$2, asset_url=$3, asset_sha256=$4, updated_at=now() where template_id=$1', [req.params.id, key, asset.url, asset.sha256]);
  await query('insert into audit_logs(actor, action, ip, meta) values($1,$2,$3,$4)', [req.admin.email, 'template.asset.upload', req.ip, { id: req.params.id, key, sha256: asset.sha256 }]);
  res.json({ ok: true, asset });
});

adminRouter.get('/api/v1/admin/stats', requireAdmin, async (_req, res) => {
  const downloads = await query('select t.template_id,t.name,count(d.id)::int downloads from templates t left join template_downloads d on d.template_id=t.id group by t.id order by downloads desc limit 50');
  res.json({ ok: true, downloads: downloads.rows });
});
