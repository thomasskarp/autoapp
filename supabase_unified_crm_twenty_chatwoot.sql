-- =========================================================================
-- AUTOAPP SUPER CRM: MIGRACIÓN ARQUITECTURA UNIFICADA (CHATWOOT + TWENTY CRM)
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- =========================================================================

-- 1. Contactos Centralizados (Chatwoot Identity Aggregation)
CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  instagram_handle TEXT,
  mercadolibre_buyer_id TEXT,
  facebook_id TEXT,
  avatar_url TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  custom_attributes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Canales / Inboxes de la Agencia (Chatwoot Inboxes)
CREATE TABLE IF NOT EXISTS public.crm_inboxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('whatsapp', 'instagram', 'facebook', 'mercadolibre', 'telegram', 'web')),
  channel_identifier TEXT, -- Ej: Número WhatsApp, IG Account ID, MeLi User ID
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Hilos de Conversación Omnicanal (Chatwoot Conversations)
CREATE TABLE IF NOT EXISTS public.crm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  inbox_id UUID REFERENCES public.crm_inboxes(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'pending', 'snoozed', 'resolved')),
  assigned_seller_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  vehicle_id TEXT REFERENCES public."DB_STOCK"("ID") ON DELETE SET NULL,
  unread_count INT DEFAULT 0,
  last_message_preview TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Mensajes e Interacciones (Chatwoot Messages + Notas Internas)
CREATE TABLE IF NOT EXISTS public.crm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.crm_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('contact', 'agent', 'ai_bot', 'system')),
  sender_id TEXT,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'video', 'file', 'internal_note', 'template')),
  is_private BOOLEAN DEFAULT FALSE, -- NOTA PRIVADA: visible solo para vendedores de la agencia
  attachments JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Oportunidades y Negocios en Pipeline (Twenty CRM Deals / Opportunities)
CREATE TABLE IF NOT EXISTS public.crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  vehicle_id TEXT REFERENCES public."DB_STOCK"("ID") ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.crm_conversations(id) ON DELETE SET NULL,
  stage TEXT DEFAULT 'SIN_RESPONDER' CHECK (stage IN ('SIN_RESPONDER', 'VISITA', 'COTIZACION', 'FINANCIACION', 'FOTOS_INFO', 'CURIOSOS', 'CERRADO')),
  temperature TEXT DEFAULT 'TIBIO' CHECK (temperature IN ('CALIENTE', 'TIBIO', 'FRIO')),
  deal_value NUMERIC,
  currency TEXT DEFAULT 'ARS',
  trade_in_details JSONB DEFAULT '{}'::jsonb, -- Datos de la permuta (Marca, Modelo, Año, Tasación InfoAuto)
  next_best_action TEXT,                       -- Recomendación cognitiva de Gemini AI
  ai_summary TEXT,                             -- Resumen semántico del prospecto
  probability INT DEFAULT 20,                  -- Probabilidad estimada de cierre (0 - 100%)
  expected_close_date DATE,
  assigned_seller_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Línea de Tiempo de Actividades y Auditoría (Twenty CRM Activities)
CREATE TABLE IF NOT EXISTS public.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('stage_change', 'call', 'visit_scheduled', 'test_drive', 'quote_sent', 'note', 'ai_scoring')),
  title TEXT NOT NULL,
  description TEXT,
  performed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de alto rendimiento para consultas sub-milimétricas
CREATE INDEX IF NOT EXISTS idx_crm_contacts_agency ON public.crm_contacts(agency_id);
CREATE INDEX IF NOT EXISTS idx_crm_conversations_contact ON public.crm_conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_conversations_channel ON public.crm_conversations(channel);
CREATE INDEX IF NOT EXISTS idx_crm_conversations_status ON public.crm_conversations(status);
CREATE INDEX IF NOT EXISTS idx_crm_messages_conv ON public.crm_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_stage ON public.crm_deals(stage);
CREATE INDEX IF NOT EXISTS idx_crm_deals_temp ON public.crm_deals(temperature);

-- Habilitar Supabase Realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'crm_conversations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_conversations;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'crm_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'crm_deals') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_deals;
  END IF;
END $$;
