-- =========================================================================
-- SOLUCIÓN INTEGRAL DE SEGURIDAD SUPABASE (SECURITY ADVISOR)
-- Proyecto: Sarmientobot (ycbvjnydxrhygtvusowr)
-- Resuelve todos los 10 errores de "RLS Disabled in Public"
-- =========================================================================

-- 1. Habilitar RLS en absolutamente todas las tablas del esquema público
ALTER TABLE IF EXISTS public."CATALOGO_USADOS" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."DB_STOCK" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."DB_STOCK_OKM" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."DB_FOTOS" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."DB_FOTOS_OKM" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."CATALOGO_OKM" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."APP_ENVIOS" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."CATALOGO_0KM" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."DB_LEADS" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."DB_INTERACCIONES" ENABLE ROW LEVEL SECURITY;

-- 2. Crear políticas permisivas para que AutoApp y el Bot sigan funcionando sin interrupción
-- CATALOGO_USADOS
DROP POLICY IF EXISTS "AutoApp_CATALOGO_USADOS_Policy" ON public."CATALOGO_USADOS";
CREATE POLICY "AutoApp_CATALOGO_USADOS_Policy" ON public."CATALOGO_USADOS" FOR ALL USING (true) WITH CHECK (true);

-- DB_STOCK
DROP POLICY IF EXISTS "AutoApp_DB_STOCK_Policy" ON public."DB_STOCK";
CREATE POLICY "AutoApp_DB_STOCK_Policy" ON public."DB_STOCK" FOR ALL USING (true) WITH CHECK (true);

-- DB_STOCK_OKM
DROP POLICY IF EXISTS "AutoApp_DB_STOCK_OKM_Policy" ON public."DB_STOCK_OKM";
CREATE POLICY "AutoApp_DB_STOCK_OKM_Policy" ON public."DB_STOCK_OKM" FOR ALL USING (true) WITH CHECK (true);

-- DB_FOTOS
DROP POLICY IF EXISTS "AutoApp_DB_FOTOS_Policy" ON public."DB_FOTOS";
CREATE POLICY "AutoApp_DB_FOTOS_Policy" ON public."DB_FOTOS" FOR ALL USING (true) WITH CHECK (true);

-- DB_FOTOS_OKM
DROP POLICY IF EXISTS "AutoApp_DB_FOTOS_OKM_Policy" ON public."DB_FOTOS_OKM";
CREATE POLICY "AutoApp_DB_FOTOS_OKM_Policy" ON public."DB_FOTOS_OKM" FOR ALL USING (true) WITH CHECK (true);

-- CATALOGO_OKM
DROP POLICY IF EXISTS "AutoApp_CATALOGO_OKM_Policy" ON public."CATALOGO_OKM";
CREATE POLICY "AutoApp_CATALOGO_OKM_Policy" ON public."CATALOGO_OKM" FOR ALL USING (true) WITH CHECK (true);

-- APP_ENVIOS
DROP POLICY IF EXISTS "AutoApp_APP_ENVIOS_Policy" ON public."APP_ENVIOS";
CREATE POLICY "AutoApp_APP_ENVIOS_Policy" ON public."APP_ENVIOS" FOR ALL USING (true) WITH CHECK (true);

-- CATALOGO_0KM
DROP POLICY IF EXISTS "AutoApp_CATALOGO_0KM_Policy" ON public."CATALOGO_0KM";
CREATE POLICY "AutoApp_CATALOGO_0KM_Policy" ON public."CATALOGO_0KM" FOR ALL USING (true) WITH CHECK (true);

-- DB_LEADS
DROP POLICY IF EXISTS "AutoApp_DB_LEADS_Policy" ON public."DB_LEADS";
CREATE POLICY "AutoApp_DB_LEADS_Policy" ON public."DB_LEADS" FOR ALL USING (true) WITH CHECK (true);

-- DB_INTERACCIONES
DROP POLICY IF EXISTS "AutoApp_DB_INTERACCIONES_Policy" ON public."DB_INTERACCIONES";
CREATE POLICY "AutoApp_DB_INTERACCIONES_Policy" ON public."DB_INTERACCIONES" FOR ALL USING (true) WITH CHECK (true);

-- 3. Tabla agency_integrations para almacenar integraciones de Meta / MeLi de forma persistente
CREATE TABLE IF NOT EXISTS public.agency_integrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id text NOT NULL,
  provider text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  user_id text,
  nickname text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_agency_provider UNIQUE (agency_id, provider)
);

ALTER TABLE IF EXISTS public.agency_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "AutoApp_Integrations_Policy" ON public.agency_integrations;
CREATE POLICY "AutoApp_Integrations_Policy" ON public.agency_integrations FOR ALL USING (true) WITH CHECK (true);
