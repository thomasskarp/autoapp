-- ============================================================
-- AutoApp — Fase 4: Migración Ecosistema WhatsApp ↔ CRM con IA
-- Unificación de DB_LEADS, DB_INTERACCIONES y Supabase Realtime
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Asegurar tabla DB_LEADS con columnas unificadas y enriquecidas
CREATE TABLE IF NOT EXISTS public."DB_LEADS" (
  "ID" TEXT PRIMARY KEY,
  "Nombre_Cliente" TEXT,
  "Telefono" TEXT,
  "Email" TEXT,
  "Auto_Interes" TEXT,
  "Presupuesto" TEXT,
  "Moneda" TEXT DEFAULT 'ARS',
  "Etapa" TEXT DEFAULT 'NUEVO',
  "Vendedor_Asignado" TEXT,
  "Notas" TEXT,
  "Proximo_Recordatorio" TIMESTAMPTZ,
  "Temperatura" TEXT DEFAULT 'TIBIO', -- 'CALIENTE' | 'TIBIO' | 'FRIO'
  "Next_Best_Action" TEXT,
  "AI_Summary" TEXT,
  "agency_id" UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar columnas en caso de que la tabla ya existiese con esquema antiguo
ALTER TABLE public."DB_LEADS" ADD COLUMN IF NOT EXISTS "Email" TEXT;
ALTER TABLE public."DB_LEADS" ADD COLUMN IF NOT EXISTS "Presupuesto" TEXT;
ALTER TABLE public."DB_LEADS" ADD COLUMN IF NOT EXISTS "Moneda" TEXT DEFAULT 'ARS';
ALTER TABLE public."DB_LEADS" ADD COLUMN IF NOT EXISTS "Vendedor_Asignado" TEXT;
ALTER TABLE public."DB_LEADS" ADD COLUMN IF NOT EXISTS "Proximo_Recordatorio" TIMESTAMPTZ;
ALTER TABLE public."DB_LEADS" ADD COLUMN IF NOT EXISTS "Temperatura" TEXT DEFAULT 'TIBIO';
ALTER TABLE public."DB_LEADS" ADD COLUMN IF NOT EXISTS "Next_Best_Action" TEXT;
ALTER TABLE public."DB_LEADS" ADD COLUMN IF NOT EXISTS "AI_Summary" TEXT;
ALTER TABLE public."DB_LEADS" ADD COLUMN IF NOT EXISTS "agency_id" UUID REFERENCES public.agencies(id) ON DELETE SET NULL;
ALTER TABLE public."DB_LEADS" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT NOW();

-- 2. Asegurar tabla DB_INTERACCIONES para historial conversacional (WhatsApp / Web / Meta)
CREATE TABLE IF NOT EXISTS public."DB_INTERACCIONES" (
  "ID" TEXT PRIMARY KEY,
  "ID_LEAD" TEXT,
  "Patente" TEXT,
  "Tipo_Interaccion" TEXT DEFAULT 'WHATSAPP', -- 'WHATSAPP' | 'ML_CHAT' | 'FACEBOOK' | 'LLAMADA' | 'MANUAL'
  "Remitente" TEXT DEFAULT 'CLIENTE',        -- 'CLIENTE' | 'BOT' | 'ASESOR'
  "Fecha" TIMESTAMPTZ DEFAULT NOW(),
  "Vendedor" TEXT,
  "Detalle_Conversacion" TEXT,
  "agency_id" UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public."DB_INTERACCIONES" ADD COLUMN IF NOT EXISTS "ID_LEAD" TEXT;
ALTER TABLE public."DB_INTERACCIONES" ADD COLUMN IF NOT EXISTS "Patente" TEXT;
ALTER TABLE public."DB_INTERACCIONES" ADD COLUMN IF NOT EXISTS "Tipo_Interaccion" TEXT DEFAULT 'WHATSAPP';
ALTER TABLE public."DB_INTERACCIONES" ADD COLUMN IF NOT EXISTS "Remitente" TEXT DEFAULT 'CLIENTE';
ALTER TABLE public."DB_INTERACCIONES" ADD COLUMN IF NOT EXISTS "Fecha" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public."DB_INTERACCIONES" ADD COLUMN IF NOT EXISTS "Vendedor" TEXT;
ALTER TABLE public."DB_INTERACCIONES" ADD COLUMN IF NOT EXISTS "Detalle_Conversacion" TEXT;
ALTER TABLE public."DB_INTERACCIONES" ADD COLUMN IF NOT EXISTS "agency_id" UUID REFERENCES public.agencies(id) ON DELETE SET NULL;
ALTER TABLE public."DB_INTERACCIONES" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT NOW();

-- Índices de alto rendimiento para búsqueda rápida por lead y fecha
CREATE INDEX IF NOT EXISTS idx_leads_stage ON public."DB_LEADS"("Etapa");
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public."DB_LEADS"("Telefono");
CREATE INDEX IF NOT EXISTS idx_leads_temp ON public."DB_LEADS"("Temperatura");
CREATE INDEX IF NOT EXISTS idx_interacciones_lead ON public."DB_INTERACCIONES"("ID_LEAD");
CREATE INDEX IF NOT EXISTS idx_interacciones_fecha ON public."DB_INTERACCIONES"("created_at" DESC);

-- 3. Habilitar Suscripciones Supabase Realtime para actualización reactiva en el Kanban
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'DB_LEADS'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."DB_LEADS";
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'DB_INTERACCIONES'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."DB_INTERACCIONES";
  END IF;
END $$;
