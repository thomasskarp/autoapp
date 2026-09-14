# 🚀 Guía Maestra de Despliegue en Producción — AutoApp SaaS

Esta guía detalla los dos métodos recomendados para poner **AutoApp** en línea en producción de forma segura, escalable y con costo $0 o mínimo.

---

## 🌟 Opción 1: Despliegue en Vercel (Recomendado — 100% Gratuito)

Vercel es la plataforma nativa de los creadores de Next.js. Provee compilación instantánea, CDN global y certificados SSL automáticos.

### Paso 1: Subir el código a GitHub
1. Si aún no lo has hecho, inicializa tu repositorio Git:
   ```bash
   git init
   git add .
   git commit -m "feat: autoapp produccion v1.0.0"
   ```
2. Crea un repositorio privado en GitHub (ej: `autoapp-saas`) y sube tu código:
   ```bash
   git remote add origin https://github.com/TU-USUARIO/autoapp-saas.git
   git branch -M main
   git push -u origin main
   ```

### Paso 2: Importar el Proyecto en Vercel
1. Entra a [vercel.com](https://vercel.com) e inicia sesión con GitHub.
2. Haz clic en **"Add New..."** > **"Project"**.
3. Selecciona tu repositorio `autoapp-saas` (si el proyecto está en una subcarpeta, selecciona `autoapp` como *Root Directory*).
4. El framework preset se detectará automáticamente como **Next.js**.

### Paso 3: Configurar Variables de Entorno en Vercel
En la sección **"Environment Variables"**, copia y pega las variables de tu archivo `.env.local` / `.env.production.example`:

| Variable | Valor / Origen |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Llave anónima pública de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Llave secreta de servicio de Supabase |
| `NEXT_PUBLIC_APP_NAME` | `AutoApp` |
| `NEXT_PUBLIC_APP_URL` | `https://tu-proyecto.vercel.app` (o tu dominio propio) |
| `GEMINI_API_KEY` | Tu API key de Google AI Studio |
| `MERCADOLIBRE_CLIENT_ID` | Client ID de tu App en MercadoLibre Developers |
| `MERCADOLIBRE_CLIENT_SECRET` | Client Secret de tu App en MercadoLibre Developers |
| `MERCADOLIBRE_REDIRECT_URI` | `https://tu-proyecto.vercel.app/api/mercadolibre/callback` |

### Paso 4: Desplegar y Verificar
1. Haz clic en **"Deploy"**. En ~2 minutos Vercel compilará tu aplicación y te entregará una URL productiva con candado verde SSL.
2. Verifica la salud del sistema accediendo a:
   ```text
   https://tu-proyecto.vercel.app/api/health
   ```
   Debe responder con `{ "status": "healthy", ... }`.

### Paso 5: Registrar la URL en MercadoLibre
1. Ingresa a [MercadoLibre Developers](https://developers.mercadolibre.com.ar/).
2. En la configuración de tu aplicación, actualiza el campo **Redirect URI** con tu dominio real:
   `https://tu-proyecto.vercel.app/api/mercadolibre/callback`

---

## 🐳 Opción 2: Despliegue en VPS con Docker (DigitalOcean / Hetzner / AWS)

Si prefieres tener tu propio servidor virtual (Ubuntu Linux) o usar herramientas como Coolify / Portainer:

### Paso 1: Clonar y Configurar Entorno
```bash
git clone https://github.com/TU-USUARIO/autoapp-saas.git
cd autoapp-saas/autoapp
cp .env.production.example .env.local
nano .env.local  # Completa con tus credenciales reales
```

### Paso 2: Compilar y Levantar el Contenedor
```bash
docker compose up -d --build
```

El servicio levantará en el puerto `3000` con arranque automático en caso de reinicio del servidor (`restart: unless-stopped`).

### Paso 3: Verificar Estado
```bash
# Ver logs en vivo
docker logs -f autoapp_web

# Test de salud
curl http://localhost:3000/api/health
```

---

## 🛡️ Lista de Chequeo Final de Seguridad en Producción
- [x] RLS activado en Supabase para `DB_STOCK`, `DB_LEADS`, `DB_INTERACCIONES` y `agency_integrations`.
- [x] Cortafuegos Anti-SSRF activo en `/api/proxy-image`.
- [x] Verificación criptográfica JWT activa en el proxy (`src/proxy.ts`).
- [x] Tokens OAuth de MercadoLibre protegidos en base de datos sin exposición en URLs.
- [x] Motor InfoAuto optimizado con caché HTTP de 1 hora (`s-maxage=3600`).
- [x] Endpoint de salud y diagnóstico activo en `/api/health`.
