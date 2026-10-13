import { z } from 'zod';

export const templateTypes = [
  'highlighted_subtitle',
  'text_animation',
  'caption_style',
  'curve_pack',
  'transition_pack'
];

export const allowedMethods = [
  'execute',
  'applyTextEditor',
  'generateCaptions',
  'applySubtitleStyle'
];

export const allowedActions = [
  'ANIMAR TEXTO',
  'CREAR TEXTO ANIMADO',
  'CAMBIAR COLOR',
  'CREAR SHAPES',
  'TRANSFERIR CURVAS',
  'CLONAR FOTOGRAMAS',
  'CREAR TEXTO',
  'APLICAR TRANSICION',
  'CREAR TRANSICION'
];

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/).transform((x) => x.toUpperCase());

export const safeActionSchema = z.object({
  method: z.enum(allowedMethods),
  data: z.object({
    action: z.enum(allowedActions).optional(),
    variant: z.string().max(40).optional(),
    duration: z.number().min(0.05).max(20).optional(),
    color: hex.optional(),
    prompt: z.string().max(400).optional()
  }).passthrough()
}).strict();

export const templateSchema = z.object({
  id: z.string().regex(/^[a-z0-9._-]{3,90}$/),
  name: z.string().min(1).max(100),
  type: z.enum(templateTypes),
  category: z.string().min(1).max(70),
  description: z.string().max(1000).optional().default(''),
  risk: z.enum(['low', 'medium']).default('medium'),
  version: z.string().max(30).default('1.0.0'),
  minAeVersion: z.string().max(30).optional().default(''),
  tags: z.array(z.string().max(32)).max(16).default([]),
  preview: z.string().url().optional().or(z.literal('')).default(''),
  assetUrl: z.string().url().optional().or(z.literal('')).default(''),
  assetSha256: z.string().regex(/^[a-f0-9]{64}$/).optional().or(z.literal('')).default(''),
  style: z.object({
    font: z.string().max(100).optional().default(''),
    fill: hex.default('#FFFFFF'),
    highlight: hex.default('#FFE16A'),
    stroke: hex.default('#000000')
  }).default({}),
  animation: z.object({
    variant: z.string().max(50).default('pop'),
    duration: z.number().min(0.05).max(20).default(0.45),
    ease: z.string().max(40).default('smooth'),
    unit: z.string().max(30).default('words')
  }).default({}),
  safeAction: safeActionSchema.nullable().optional().default(null),
  prompt: z.string().max(500).optional().default('')
}).strict();

export const templatePatchSchema = templateSchema.partial().extend({
  id: z.string().regex(/^[a-z0-9._-]{3,90}$/)
});

export function parseTemplate(input) {
  return templateSchema.parse(input);
}

export function publicTemplateRow(row) {
  const data = row.data || {};
  return {
    id: row.template_id,
    name: row.name,
    type: row.type,
    category: row.category,
    description: row.description || '',
    risk: row.risk,
    version: row.version,
    minAeVersion: row.min_ae_version || '',
    tags: row.tags || [],
    preview: row.preview_url || '',
    assetUrl: row.asset_url || '',
    assetSha256: row.asset_sha256 || '',
    style: data.style || {},
    animation: data.animation || {},
    safeAction: data.safeAction || null,
    prompt: data.prompt || ''
  };
}
