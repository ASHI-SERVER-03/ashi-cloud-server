create extension if not exists pgcrypto;

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  role text not null default 'owner',
  disabled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  template_id text not null unique,
  name text not null,
  type text not null check (type in ('highlighted_subtitle','text_animation','caption_style','curve_pack','transition_pack')),
  category text not null,
  description text not null default '',
  risk text not null check (risk in ('low','medium')),
  version text not null default '1.0.0',
  min_ae_version text not null default '',
  tags text[] not null default '{}',
  preview_url text not null default '',
  asset_key text not null default '',
  asset_url text not null default '',
  asset_sha256 text not null default '',
  data jsonb not null,
  revision integer not null default 1,
  download_count integer not null default 0,
  published_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists templates_public_idx on templates(category, name) where published_at is not null and deleted_at is null;
create index if not exists templates_type_idx on templates(type);
create index if not exists templates_tags_idx on templates using gin(tags);

create table if not exists template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id text not null,
  revision integer not null,
  data jsonb not null,
  admin_email text not null,
  created_at timestamptz not null default now(),
  unique(template_id, revision)
);

create table if not exists template_downloads (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references templates(id) on delete cascade,
  ip inet,
  user_agent text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  ip inet,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
