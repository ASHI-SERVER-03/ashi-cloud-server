import crypto from 'crypto';
import { PutObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from './config.js';

export const s3 = new S3Client({
  endpoint: config.s3.endpoint || undefined,
  region: config.s3.region,
  credentials: config.s3.accessKeyId ? {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey
  } : undefined,
  forcePathStyle: !!config.s3.endpoint
});

export function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function safeObjectKey(prefix, name) {
  const clean = String(name || 'asset.bin')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'asset.bin';
  return `${prefix}/${Date.now()}-${crypto.randomUUID()}-${clean}`;
}

export async function putAsset({ key, body, contentType }) {
  await s3.send(new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
    Body: body,
    ContentType: contentType || 'application/octet-stream',
    Metadata: { sha256: sha256(body) }
  }));
  return {
    key,
    sha256: sha256(body),
    url: `${config.publicBaseUrl.replace(/\/+$/, '')}/api/v1/assets/${encodeURIComponent(key)}`
  };
}

export async function signedAssetUrl(key) {
  return getSignedUrl(s3, new GetObjectCommand({
    Bucket: config.s3.bucket,
    Key: key
  }), { expiresIn: config.s3.signedUrlTtlSeconds });
}
