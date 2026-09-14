-- ============================================================
-- AutoApp — Migración: Tabla agency_integrations (Multi-Tenant)
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agency_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- e.g. 'mercadolibre'
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  user_id TEXT, -- MercadoLibre Seller ID o identificador externo
  nickname TEXT, -- Nickname de la cuenta conectada
  scope TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id, provider)
);

-- Habilitar Row Level Security
ALTER TABLE public.agency_integrations ENABLE ROW LEVEL SECURITY;

-- Políticas de aislamiento por Agencia
DROP POLICY IF EXISTS "tenant_agency_integrations_select" ON public.agency_integrations;
CREATE POLICY "tenant_agency_integrations_select" ON public.agency_integrations
  FOR SELECT USING (
    agency_id = (SELECT agency_id FROM public.user_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "tenant_agency_integrations_insert" ON public.agency_integrations;
CREATE POLICY "tenant_agency_integrations_insert" ON public.agency_integrations
  FOR INSERT WITH CHECK (
    agency_id = (SELECT agency_id FROM public.user_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "tenant_agency_integrations_update" ON public.agency_integrations;
CREATE POLICY "tenant_agency_integrations_update" ON public.agency_integrations
  FOR UPDATE USING (
    agency_id = (SELECT agency_id FROM public.user_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "tenant_agency_integrations_delete" ON public.agency_integrations;
CREATE POLICY "tenant_agency_integrations_delete" ON public.agency_integrations
  FOR DELETE USING (
    agency_id = (SELECT agency_id FROM public.user_profiles WHERE id = auth.uid())
  );

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS tr_agency_integrations_updated_at ON public.agency_integrations;
CREATE TRIGGER tr_agency_integrations_updated_at
  BEFORE UPDATE ON public.agency_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
