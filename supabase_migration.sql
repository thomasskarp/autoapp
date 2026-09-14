-- ============================================================
-- AutoApp — Schema SQL para Supabase
-- Ejecutar en: https://supabase.com/dashboard/project/ycbvjnydxrhygtvusowr/sql
-- ============================================================

-- 1. Tabla de Agencias (Multi-Tenant)
CREATE TABLE IF NOT EXISTS public.agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Perfiles de Usuario con Roles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  full_name TEXT,
  role TEXT DEFAULT 'seller' CHECK (role IN ('owner', 'seller', 'admin', 'superadmin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Visibilidad Cruzada entre Agencias (Feature especial)
CREATE TABLE IF NOT EXISTS public.agency_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  to_agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_agency_id, to_agency_id)
);

-- 4. Agregar agency_id a tablas existentes (no rompe nada existente)
ALTER TABLE public."DB_STOCK"
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id);

ALTER TABLE public."DB_LEADS"
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id);

ALTER TABLE public."DB_INTERACCIONES"
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id);

-- 5. Insertar la primera agencia: Sarmiento Automotores
INSERT INTO public.agencies (id, name, slug)
VALUES (
  'a1000000-0000-0000-0000-000000000001',
  'Sarmiento Automotores',
  'sarmiento-automotores'
) ON CONFLICT (slug) DO NOTHING;

-- 6. Asignar todos los registros existentes a Sarmiento Automotores
UPDATE public."DB_STOCK"
  SET agency_id = 'a1000000-0000-0000-0000-000000000001'
  WHERE agency_id IS NULL;

UPDATE public."DB_LEADS"
  SET agency_id = 'a1000000-0000-0000-0000-000000000001'
  WHERE agency_id IS NULL;

UPDATE public."DB_INTERACCIONES"
  SET agency_id = 'a1000000-0000-0000-0000-000000000001'
  WHERE agency_id IS NULL;

-- ============================================================
-- Row Level Security (RLS) — Aislamiento por Agencia
-- ============================================================

-- Habilitar RLS en tablas principales
ALTER TABLE public."DB_STOCK" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DB_LEADS" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DB_INTERACCIONES" ENABLE ROW LEVEL SECURITY;

-- Política: El usuario ve los datos de SU agencia
-- Y también los de agencias que le compartieron visibilidad
CREATE OR REPLACE FUNCTION public.get_visible_agency_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  -- The user's own agency
  SELECT agency_id FROM public.user_profiles WHERE id = auth.uid()
  UNION
  -- Agencies that shared visibility with the user's agency
  SELECT from_agency_id FROM public.agency_visibility
  WHERE to_agency_id = (
    SELECT agency_id FROM public.user_profiles WHERE id = auth.uid()
  )
$$;

-- Policies for DB_STOCK
DROP POLICY IF EXISTS "tenant_stock_select" ON public."DB_STOCK";
CREATE POLICY "tenant_stock_select" ON public."DB_STOCK"
  FOR SELECT USING (agency_id IN (SELECT public.get_visible_agency_ids()));

DROP POLICY IF EXISTS "tenant_stock_insert" ON public."DB_STOCK";
CREATE POLICY "tenant_stock_insert" ON public."DB_STOCK"
  FOR INSERT WITH CHECK (agency_id = (
    SELECT agency_id FROM public.user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "tenant_stock_update" ON public."DB_STOCK";
CREATE POLICY "tenant_stock_update" ON public."DB_STOCK"
  FOR UPDATE USING (agency_id = (
    SELECT agency_id FROM public.user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "tenant_stock_delete" ON public."DB_STOCK";
CREATE POLICY "tenant_stock_delete" ON public."DB_STOCK"
  FOR DELETE USING (agency_id = (
    SELECT agency_id FROM public.user_profiles WHERE id = auth.uid()
  ));

-- Policies for DB_LEADS
DROP POLICY IF EXISTS "tenant_leads_select" ON public."DB_LEADS";
CREATE POLICY "tenant_leads_select" ON public."DB_LEADS"
  FOR SELECT USING (agency_id IN (SELECT public.get_visible_agency_ids()));

DROP POLICY IF EXISTS "tenant_leads_all" ON public."DB_LEADS";
CREATE POLICY "tenant_leads_all" ON public."DB_LEADS"
  FOR ALL USING (agency_id = (
    SELECT agency_id FROM public.user_profiles WHERE id = auth.uid()
  ));

-- Policies for DB_INTERACCIONES
DROP POLICY IF EXISTS "tenant_inter_select" ON public."DB_INTERACCIONES";
CREATE POLICY "tenant_inter_select" ON public."DB_INTERACCIONES"
  FOR SELECT USING (agency_id IN (SELECT public.get_visible_agency_ids()));

DROP POLICY IF EXISTS "tenant_inter_all" ON public."DB_INTERACCIONES";
CREATE POLICY "tenant_inter_all" ON public."DB_INTERACCIONES"
  FOR ALL USING (agency_id = (
    SELECT agency_id FROM public.user_profiles WHERE id = auth.uid()
  ));

-- ============================================================
-- NOTA IMPORTANTE:
-- Después de ejecutar este SQL, creá un usuario en:
-- Authentication > Users > Add User
-- Y ejecutá:
-- INSERT INTO public.user_profiles (id, agency_id, full_name, role)
-- VALUES ('<USER-ID-DEL-AUTH>', 'a1000000-0000-0000-0000-000000000001', 'Tu Nombre', 'owner');
-- ============================================================
