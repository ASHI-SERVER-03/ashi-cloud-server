create table if not exists asset_blobs (
  id uuid primary key default gen_random_uuid(),
  object_key text not null unique,
  file_name text not null,
  content_type text not null default 'application/octet-stream',
  sha256 text not null,
  size_bytes integer not null,
  body bytea not null,
  created_at timestamptz not null default now()
);

create index if not exists asset_blobs_sha_idx on asset_blobs(sha256);
