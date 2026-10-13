# ASHI Cloud Server

Backend publico para que ASHI AFTER descargue plantillas desde Internet sin que los usuarios instalen Node.js, abran CMD o configuren `localhost`.

## Estado importante

Este paquete deja el servidor preparado para produccion, pero no declara que ya este publicado. Solo considera el servicio como publicado cuando exista una URL HTTPS real, por ejemplo `https://api.tu-dominio.com/health`, y responda desde una computadora externa.

## Arquitectura recomendada

- Backend Node.js: Railway, Render, Fly.io o VPS.
- Base de datos: PostgreSQL administrado, por ejemplo Supabase, Railway Postgres o Neon.
- Almacenamiento: Cloudflare R2 o S3 compatible.
- HTTPS: dominio propio + TLS del proveedor cloud.
- Admin web: `/admin`.
- API publica: `/api/v1/templates`.
- API privada: `/api/v1/admin/*`.

## Costos orientativos

Revisa siempre las paginas oficiales antes de contratar. Como guia de decision:

- Railway/Render/Fly.io: adecuados para alojar el backend Node.js con reinicio automatico.
- Supabase/Neon/Railway Postgres: adecuados para PostgreSQL administrado.
- Cloudflare R2: adecuado para previews, `.ffx`, `.aep`, `.jsx`, imagenes y videos.

Empieza pequeno: 1 backend + 1 Postgres + 1 bucket. Escala solo cuando haya descargas reales.

## Variables de entorno

Copia `.env.example` y configura:

```bash
DATABASE_URL=postgres://...
JWT_SECRET=clave-larga-aleatoria
ADMIN_EMAIL=tu@email.com
ADMIN_PASSWORD=contrasena-inicial-fuerte
PUBLIC_BASE_URL=https://api.tu-dominio.com
S3_ENDPOINT=https://...
S3_BUCKET=ashi-templates
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
```

No pongas estas claves dentro del plugin CEP distribuido.

## Instalacion local de desarrollo

```bash
npm install
npm run migrate
npm run import:templates
npm start
```

Abre:

```text
http://127.0.0.1:8080/admin
```

## Endpoints publicos

- `GET /health`
- `GET /api/v1/templates`
- `GET /api/v1/templates/:id/download`

## Endpoints privados

Requieren `Authorization: Bearer <token-admin>`.

- `POST /api/v1/admin/login`
- `GET /api/v1/admin/templates`
- `POST /api/v1/admin/templates`
- `PATCH /api/v1/admin/templates/:id`
- `POST /api/v1/admin/templates/:id/publish`
- `DELETE /api/v1/admin/templates/:id`
- `POST /api/v1/admin/templates/:id/assets`
- `GET /api/v1/admin/stats`

## Seguridad

- Los usuarios no ven ni reciben credenciales admin.
- Las plantillas se validan con un contrato declarativo.
- Tipos permitidos: `highlighted_subtitle`, `text_animation`, `caption_style`, `curve_pack`, `transition_pack`.
- Los `.jsx` no deben ejecutarse automaticamente. Deben ser plantillas aprobadas, revisadas y versionadas.
- Cada descarga de asset entrega URL firmada temporal.
- Se guarda auditoria de acciones admin y descargas.
- Se calcula SHA-256 para archivos subidos.
- Se bloquean rutas con traversal.
- Se aplican limites de request y tamano de archivo.

## Conexion con ASHI AFTER

Cuando tengas dominio real:

1. Publica este backend.
2. Verifica `https://tu-dominio.com/health` desde otra computadora.
3. En `js/ashi-cloud-templates.js`, configura:

```js
window.ASHI_OFFICIAL_CLOUD_URL = 'https://tu-dominio.com/api/v1/templates';
```

4. Empaqueta ASHI AFTER para usuarios.

Si el servidor falla, ASHI usa cache local y plantillas internas. No debe mostrar el error antiguo de `No encontre ASHI_TEMPLATE_SERVER/templates.json` como bloqueo.

## Reversion

Conserva:

- ZIP anterior de ASHI AFTER.
- Backup de PostgreSQL.
- Bucket R2/S3 con versionado.
- Plantillas exportadas en JSON.

Para volver atras, restaura el ZIP anterior o cambia temporalmente el endpoint del cliente a cache/local.
