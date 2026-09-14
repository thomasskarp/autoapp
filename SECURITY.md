# 🛡️ Política de Seguridad — AutoApp

La seguridad y confiabilidad de los datos en entornos B2B son una prioridad central en el desarrollo de AutoApp.

## Versiones Soportadas

| Versión | Soportada |
| :--- | :--- |
| `0.1.x` (Main) | :white_check_mark: |

## Modelo de Seguridad y Defensas Implementadas

### 1. Autenticación Fail-Closed
- Todas las rutas protegidas del panel SaaS son verificadas criptográficamente a nivel de servidor utilizando `supabase.auth.getUser()`.
- Ante cualquier error de red, expiración de token o cabecera ausente, el middleware redirige de inmediato a la pantalla de login (`fail-closed`), previniendo accesos indebidos.

### 2. Cortafuegos Anti-SSRF en Proxy de Recursos
- El endpoint `/api/proxy-image` implementa un filtro riguroso de direcciones IP:
  - Solo permite esquemas `http:` y `https:`.
  - Bloquea rangos locales y privados según RFC 1918 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`).
  - Bloquea explícitamente endpoints de metadatos de proveedores cloud (`169.254.169.254` para AWS/GCP).
  - Limita las respuestas a un tamaño máximo de 15 MB y restringe tipos MIME únicamente a imágenes legítimas (`image/*`).

### 3. Manejo de Credenciales OAuth de Terceros
- Los tokens de MercadoLibre VIS se almacenan en la tabla `agency_integrations` protegida con Row Level Security (RLS) en PostgreSQL.
- Nunca se exponen `access_token` o `refresh_token` en URLs ni en almacenamiento del navegador (`localStorage`).
- La renovación de tokens se procesa de forma transaccional en el backend para soportar la ejecución concurrente en funciones serverless.

## Reporte de Vulnerabilidades

Si descubres una posible vulnerabilidad de seguridad en este proyecto, te agradecemos reportarla de manera responsable:
- Por favor **no** abras un issue público.
- Envía un correo electrónico a `tomas.skarp@gmail.com` detallando:
  - Descripción del vector de ataque
  - Pasos para reproducir el hallazgo
  - Impacto potencial estimado

Agradecemos profundamente a la comunidad de seguridad y a los desarrolladores que contribuyen a mantener este ecosistema seguro.
