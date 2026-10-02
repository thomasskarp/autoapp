-- =========================================================================
-- AUTOAPP — ENDURECIMIENTO DE SEGURIDAD PARA PRODUCCIÓN (SUPABASE RLS)
-- =========================================================================
-- Ejecutar en el SQL Editor de Supabase (https://supabase.com/dashboard/project/ycbvjnydxrhygtvusowr/sql)
--
-- Objetivo:
-- 1. Permitir que cualquier visitante/página pueda LEER el stock y fotos (SELECT).
-- 2. Restringir MODIFICACIONES (INSERT, UPDATE, DELETE) EXCLUSIVAMENTE a usuarios
--    autenticados (vendedores/admins logueados en AutoApp) o llamadas de backend (Service Role).
-- 3. Blindar contra borrados maliciosos con la Anon Key pública.
-- =========================================================================

-- 1. Habilitar RLS en las tablas principales
ALTER TABLE IF EXISTS public."DB_STOCK" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."DB_STOCK_OKM" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."DB_FOTOS" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."DB_FOTOS_OKM" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."DB_LEADS" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."DB_INTERACCIONES" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."agency_integrations" ENABLE ROW LEVEL SECURITY;

-- 2. DB_STOCK: Lectura pública, mutaciones solo autenticadas
DROP POLICY IF EXISTS "AutoApp_DB_STOCK_Policy" ON public."DB_STOCK";
DROP POLICY IF EXISTS "AutoApp_DB_STOCK_Select" ON public."DB_STOCK";
DROP POLICY IF EXISTS "AutoApp_DB_STOCK_Modify" ON public."DB_STOCK";

CREATE POLICY "AutoApp_DB_STOCK_Select" ON public."DB_STOCK"
  FOR SELECT USING (true);

CREATE POLICY "AutoApp_DB_STOCK_Modify" ON public."DB_STOCK"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. DB_STOCK_OKM: Lectura pública, mutaciones solo autenticadas
DROP POLICY IF EXISTS "AutoApp_DB_STOCK_OKM_Policy" ON public."DB_STOCK_OKM";
DROP POLICY IF EXISTS "AutoApp_DB_STOCK_OKM_Select" ON public."DB_STOCK_OKM";
DROP POLICY IF EXISTS "AutoApp_DB_STOCK_OKM_Modify" ON public."DB_STOCK_OKM";

CREATE POLICY "AutoApp_DB_STOCK_OKM_Select" ON public."DB_STOCK_OKM"
  FOR SELECT USING (true);

CREATE POLICY "AutoApp_DB_STOCK_OKM_Modify" ON public."DB_STOCK_OKM"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. DB_FOTOS y DB_FOTOS_OKM: Lectura pública, mutaciones solo autenticadas
DROP POLICY IF EXISTS "AutoApp_DB_FOTOS_Policy" ON public."DB_FOTOS";
DROP POLICY IF EXISTS "AutoApp_DB_FOTOS_Select" ON public."DB_FOTOS";
DROP POLICY IF EXISTS "AutoApp_DB_FOTOS_Modify" ON public."DB_FOTOS";

CREATE POLICY "AutoApp_DB_FOTOS_Select" ON public."DB_FOTOS"
  FOR SELECT USING (true);

CREATE POLICY "AutoApp_DB_FOTOS_Modify" ON public."DB_FOTOS"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "AutoApp_DB_FOTOS_OKM_Policy" ON public."DB_FOTOS_OKM";
DROP POLICY IF EXISTS "AutoApp_DB_FOTOS_OKM_Select" ON public."DB_FOTOS_OKM";
DROP POLICY IF EXISTS "AutoApp_DB_FOTOS_OKM_Modify" ON public."DB_FOTOS_OKM";

CREATE POLICY "AutoApp_DB_FOTOS_OKM_Select" ON public."DB_FOTOS_OKM"
  FOR SELECT USING (true);

CREATE POLICY "AutoApp_DB_FOTOS_OKM_Modify" ON public."DB_FOTOS_OKM"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. DB_LEADS & DB_INTERACCIONES: Protegidas para usuarios autenticados
DROP POLICY IF EXISTS "AutoApp_DB_LEADS_Policy" ON public."DB_LEADS";
CREATE POLICY "AutoApp_DB_LEADS_Auth" ON public."DB_LEADS"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Permitir inserción de leads entrantes desde webhooks públicos (Facebook, IG, WA)
CREATE POLICY "AutoApp_DB_LEADS_Insert_Public" ON public."DB_LEADS"
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "AutoApp_DB_INTERACCIONES_Policy" ON public."DB_INTERACCIONES";
CREATE POLICY "AutoApp_DB_INTERACCIONES_Auth" ON public."DB_INTERACCIONES"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. agency_integrations: Tokens de Meta, MeLi y credenciales críticas
DROP POLICY IF EXISTS "AutoApp_agency_integrations_Policy" ON public."agency_integrations";
CREATE POLICY "AutoApp_agency_integrations_Auth" ON public."agency_integrations"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
