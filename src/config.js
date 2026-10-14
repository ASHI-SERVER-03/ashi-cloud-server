import 'dotenv/config';

function required(name, fallback = '') {
  const value = process.env[name] || fallback;
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 8080),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || '',
  databaseUrl: required('DATABASE_URL', 'postgres://postgres:postgres@127.0.0.1:5432/ashi_cloud'),
  jwtSecret: required('JWT_SECRET', 'dev-only-change-me'),
  adminEmail: process.env.ADMIN_EMAIL || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  corsOrigins: (process.env.CORS_ORIGINS || 'cep://*,http://localhost:*').split(',').map((x) => x.trim()).filter(Boolean),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 120),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 250),
  s3: {
    endpoint: process.env.S3_ENDPOINT || '',
    region: process.env.S3_REGION || 'auto',
    bucket: process.env.S3_BUCKET || '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    signedUrlTtlSeconds: Number(process.env.SIGNED_URL_TTL_SECONDS || 900)
  }
};

export function isAllowedOrigin(origin) {
  if (!origin) return true;
  try {
    if (config.publicBaseUrl && new URL(config.publicBaseUrl).origin === origin) return true;
  } catch { /* An invalid configured URL cannot grant access. */ }
  return config.corsOrigins.some((rule) => {
    if (rule === '*') return true;
    if (rule.endsWith('*')) return origin.startsWith(rule.slice(0, -1));
    return origin === rule;
  });
}
