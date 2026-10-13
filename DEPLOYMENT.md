# Despliegue real en Internet

## Opcion recomendada simple

1. Crea PostgreSQL administrado.
2. Crea bucket privado en Cloudflare R2 o S3.
3. Sube `ASHI_CLOUD_SERVER` a GitHub privado.
4. Conecta el repositorio en Railway, Render o Fly.io.
5. Configura las variables de entorno.
6. Ejecuta `npm run migrate`.
7. Ejecuta `npm run import:templates`.
8. Apunta tu dominio al servicio cloud.
9. Verifica HTTPS:

```bash
curl https://api.tu-dominio.com/health
curl https://api.tu-dominio.com/api/v1/templates
```

10. Solo despues de esa verificacion configura el endpoint oficial dentro del plugin ASHI.

## DNS

- CNAME recomendado: `api.tu-dominio.com` hacia el host del proveedor.
- Activa HTTPS automatico en el proveedor.
- No uses IP fija manual para usuarios.

## Prueba desde computadora distinta

Desde una computadora que no sea la tuya:

```bash
curl https://api.tu-dominio.com/health
curl https://api.tu-dominio.com/api/v1/templates
```

Luego abre ASHI AFTER y valida que el panel `SV` cargue sin tocar URL manual.

## Checklist antes de produccion

- `JWT_SECRET` largo y unico.
- `ADMIN_PASSWORD` fuerte y cambiado despues del primer deploy.
- PostgreSQL con backups automaticos.
- Bucket privado.
- HTTPS activo.
- Logs visibles en el proveedor.
- Rate limit activo.
- Prueba de descarga con SHA-256.
- Plantillas `.jsx` revisadas manualmente.
- Version compatible de After Effects documentada en cada plantilla.
