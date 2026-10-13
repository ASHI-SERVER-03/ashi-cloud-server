import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, pool } from '../src/db.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'migrations');
const files = fs.readdirSync(dir).filter((x) => x.endsWith('.sql')).sort();

await query('create table if not exists schema_migrations(name text primary key, applied_at timestamptz not null default now())');

for (const file of files) {
  const done = await query('select name from schema_migrations where name=$1', [file]);
  if (done.rowCount) continue;
  const sql = fs.readFileSync(path.join(dir, file), 'utf8');
  await query(sql);
  await query('insert into schema_migrations(name) values($1)', [file]);
  console.log(`applied ${file}`);
}

await pool.end();
