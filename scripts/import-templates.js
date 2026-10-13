import fs from 'fs';
import { transaction, pool } from '../src/db.js';
import { parseTemplate } from '../src/validators.js';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/import-templates.js ../ASHI_TEMPLATE_SERVER/templates.json');
  process.exit(1);
}

const json = JSON.parse(fs.readFileSync(file, 'utf8'));
const templates = (json.templates || []).map(parseTemplate);

await transaction(async (client) => {
  for (const template of templates) {
    await client.query(
      `insert into templates(template_id,name,type,category,description,risk,version,min_ae_version,tags,preview_url,asset_url,asset_sha256,data,published_at)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now())
       on conflict(template_id) do update set
       name=excluded.name,type=excluded.type,category=excluded.category,description=excluded.description,risk=excluded.risk,
       version=excluded.version,min_ae_version=excluded.min_ae_version,tags=excluded.tags,preview_url=excluded.preview_url,
       asset_url=excluded.asset_url,asset_sha256=excluded.asset_sha256,data=excluded.data,updated_at=now()`,
      [template.id, template.name, template.type, template.category, template.description, template.risk, template.version, template.minAeVersion, template.tags, template.preview, template.assetUrl, template.assetSha256, template]
    );
  }
});

console.log(`imported ${templates.length} templates`);
await pool.end();
