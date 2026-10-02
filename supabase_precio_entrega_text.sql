-- ============================================================
-- AutoApp — Migración: Permitir letras y texto en Precio_entrega
-- Ejecutar en: https://supabase.com/dashboard/project/ycbvjnydxrhygtvusowr.co (SQL Editor)
-- ============================================================

ALTER TABLE public."DB_STOCK" ALTER COLUMN "Precio_entrega" TYPE text USING "Precio_entrega"::text;
ALTER TABLE public."DB_STOCK_OKM" ALTER COLUMN "Precio_entrega" TYPE text USING "Precio_entrega"::text;
