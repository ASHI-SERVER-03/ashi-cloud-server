# ASHI CLOUD SERVER 1.141 · Vista previa y gestión de plantillas

## Incluye

- Vista lateral de la tarjeta de ASHI LIBRARY: nombre, categoría, versión, descripción y etiquetas se actualizan al editar.
- Imagen o video de preview visible desde la selección del archivo, antes de subirlo; reproducción del video con controles. La vista local se indica como pendiente de subir.
- El navegador no renderiza proyectos .aep ni presets .ffx. Para mostrar su animación, sube un MP4 H.264 renderizado desde After Effects. Cambiar los campos del formulario no modifica ese video.
- Botón Eliminar plantilla con confirmación. El servidor la retira del catálogo mediante borrado lógico y conserva el registro de auditoría. No borra las copias que los usuarios ya descargaron.
- Si caduca la sesión o cambia la clave del servidor, aparece el acceso de propietario con una explicación comprensible. Al entrar de nuevo se conserva el formulario y se reintenta una vez la operación pendiente con el nuevo token.
- La autorización sigue activa: solo cuentas habilitadas con rol owner pueden modificar, publicar, despublicar o eliminar.
- Los enlaces del archivo y del preview recién subidos se conservan al guardar posteriormente.
- Publicar/despublicar y su registro de auditoría se guardan en la misma transacción.

## Actualizar Railway paso a paso

1. Descomprime ASHI_CLOUD_SERVER_1_141_ADMIN_PREVIEW_DELETE.zip. Los archivos package.json, Dockerfile, public, src, tests, scripts y migrations están en la raíz del ZIP.
2. Abre en GitHub el repositorio conectado a tu servicio Railway (ashi-cloud-server). Sustituye sus archivos por el contenido descomprimido, manteniendo la misma estructura. No metas una carpeta adicional dentro del repositorio.
3. Guarda los cambios en la rama que Railway utiliza para desplegar y espera a que el despliegue termine correctamente.
4. Conserva las variables que ya funcionan, en especial DATABASE_URL y JWT_SECRET. No generes una JWT_SECRET nueva en cada reinicio: cambiarla invalida las sesiones abiertas. No subas contraseñas ni archivos .env al repositorio.
5. PUBLIC_BASE_URL debe ser https://amiable-wonder-production-fbea.up.railway.app (sin /admin). Esta actualización permite el origen del panel administrativo correspondiente a esa URL.
6. Abre https://amiable-wonder-production-fbea.up.railway.app/admin/ y recarga con Ctrl+Shift+R. Inicia sesión con tu cuenta de propietario.
7. Selecciona una plantilla: a la derecha verás la tarjeta. Selecciona un MP4 en Preview imagen/video para verlo antes de subir. Pulsa Subir preview para guardarlo en el servidor.
8. Prueba Despublicar con una plantilla de prueba; debe indicar que queda oculta. Prueba Eliminar plantilla y confirma solo cuando quieras retirarla de la biblioteca.
9. Comprueba /health y la biblioteca desde ASHI AFTER. Los usuarios no necesitan reinstalar el plugin para esta actualización del administrador.

No requiere nuevas migraciones de base de datos. El despliegue real no se ha realizado desde esta sesión: este ZIP contiene los cambios para tu repositorio.

## Verificación y reversión

Pasaron npm run check, npm test y las pruebas existentes de compatibilidad del catálogo cloud del plugin. Las pruebas del administrador simulan la API y la base de datos para verificar caducidad de sesión, reintento autenticado, permisos, borrado lógico y conservación de enlaces. No se probó el servidor Railway ni la aplicación dentro de After Effects desde este entorno.

Para volver a la versión anterior, revierte el commit en GitHub o despliega la revisión anterior en Railway. El borrado lógico conserva los registros de plantillas, versiones y archivos; restaurar el código por sí solo no vuelve a publicar una plantilla eliminada.
