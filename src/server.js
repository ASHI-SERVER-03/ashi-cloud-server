import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import path from 'path';
import { fileURLToPath } from 'url';
import { config, isAllowedOrigin } from './config.js';
import { ensureBootstrapAdmin } from './auth.js';
import { publicRouter } from './routes/public.js';
import { adminRouter } from './routes/admin.js';

const log = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin(origin, cb) {
    if (isAllowedOrigin(origin)) return cb(null, true);
    return cb(new Error('CORS origin denied'));
  }
}));
app.use(rateLimit({
  windowMs: config.rateLimitWindowMs,
  limit: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false
}));
app.use(express.json({ limit: '2mb' }));
app.use('/admin', express.static(path.join(__dirname, '..', 'public', 'admin')));

app.use(publicRouter);
app.use(adminRouter);

app.use((err, req, res, _next) => {
  log.error({ err, path: req.path }, 'request_failed');
  if (err.name === 'ZodError') return res.status(400).json({ ok: false, error: 'validation_failed', details: err.issues });
  if (err.message === 'CORS origin denied') return res.status(403).json({ ok: false, error: 'cors_denied' });
  return res.status(500).json({ ok: false, error: 'server_error' });
});

await ensureBootstrapAdmin();

app.listen(config.port, () => {
  log.info({ port: config.port, env: config.env }, 'ASHI Cloud Server ready');
});
