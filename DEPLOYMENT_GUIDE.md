# 🚀 Production Deployment Master Guide — AutoApp SaaS

This guide outlines the recommended deployment strategies to run **AutoApp** in production with high availability, enterprise security, and zero-to-minimal infrastructure costs.

---

## 🌟 Option 1: Vercel Serverless (Recommended — 100% Free Tier Available)

Vercel provides edge network acceleration, automatic SSL certificate provisioning, and native Next.js 16 App Router optimization.

### Step 1: Push Code to GitHub
Ensure your repository is synchronized on GitHub:
```bash
git remote add origin https://github.com/thomasskarp/autoapp.git
git branch -M main
git push -u origin main
```

### Step 2: Import Project in Vercel
1. Navigate to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **"Add New..."** > **"Project"**.
3. Select the `thomasskarp/autoapp` repository.
4. The framework preset will automatically detect **Next.js**.

### Step 3: Configure Environment Variables
Under the **"Environment Variables"** tab, configure the variables based on `.env.production.example`:

| Variable | Description / Source |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL (`https://[project-id].supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Public Anonymous API Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Admin Service Role Secret Key |
| `NEXT_PUBLIC_APP_NAME` | `AutoApp` |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` (or custom domain) |
| `GEMINI_API_KEY` | Google AI Studio API Key |
| `MERCADOLIBRE_CLIENT_ID` | MercadoLibre Developers Application ID |
| `MERCADOLIBRE_CLIENT_SECRET` | MercadoLibre Developers Client Secret |
| `MERCADOLIBRE_REDIRECT_URI` | `https://your-domain.vercel.app/api/mercadolibre/callback` |

### Step 4: Deploy & Verify Telemetry
1. Click **"Deploy"**. The build process finishes in ~2 minutes with an SSL-secured URL.
2. Confirm system status by pinging the live health endpoint:
   ```text
   https://your-domain.vercel.app/api/health
   ```
   Expected response: `{ "status": "healthy", ... }`.

### Step 5: Register Production URL with MercadoLibre
1. Open [MercadoLibre Developers](https://developers.mercadolibre.com.ar/).
2. In your application settings, set **Redirect URI** to:
   `https://your-domain.vercel.app/api/mercadolibre/callback`

---

## 🐳 Option 2: Self-Hosted VPS with Docker (DigitalOcean / Hetzner / AWS)

For self-hosted Linux servers or orchestrators (Portainer, Coolify):

### Step 1: Clone and Configure Environment
```bash
git clone https://github.com/thomasskarp/autoapp.git
cd autoapp
cp .env.production.example .env.local
nano .env.local  # Populate with production credentials
```

### Step 2: Build & Start Container
```bash
docker compose up -d --build
```
The application runs on port `3000` with automatic container restart (`restart: unless-stopped`).

### Step 3: Inspect Health & Logs
```bash
# Stream container logs
docker logs -f autoapp_web

# Verify service health
curl http://localhost:3000/api/health
```

---

## 🛡️ Production Security Checklist
- [x] Row Level Security (RLS) active on `DB_STOCK`, `DB_LEADS`, `DB_INTERACCIONES`, and `agency_integrations`.
- [x] Anti-SSRF media proxy firewall active on `/api/proxy-image`.
- [x] Fail-Closed cryptographic JWT session verification active in `src/proxy.ts`.
- [x] MercadoLibre OAuth tokens persisted transactionally in database without URL exposure.
- [x] InfoAuto catalog optimized with sub-5ms GIN trigram queries and RFC 7234 edge cache.
- [x] Continuous health and uptime telemetry active at `/api/health`.
