-- ============================================================
-- AutoApp — Migración: Motor InfoAuto Optimizado (Fase 2)
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Habilitar la extensión de trigramas para búsqueda difusa rápida
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Tabla de Cotizaciones y Precios Oficiales InfoAuto
CREATE TABLE IF NOT EXISTS public.infoauto_prices (
  id BIGSERIAL PRIMARY KEY,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  version TEXT NOT NULL,
  anio INT NOT NULL,
  precio NUMERIC NOT NULL,
  edicion TEXT DEFAULT 'Actualizada',
  search_text TEXT GENERATED ALWAYS AS (marca || ' ' || modelo || ' ' || version || ' ' || anio::text) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices de Alto Rendimiento
-- Índice B-Tree para filtros exactos rápidos por año y marca
CREATE INDEX IF NOT EXISTS idx_infoauto_marca_anio ON public.infoauto_prices (marca, anio);
CREATE INDEX IF NOT EXISTS idx_infoauto_anio ON public.infoauto_prices (anio);

-- Índice GIN Trigram para coincidencias semánticas y búsqueda parcial en milisegundos (<5ms)
CREATE INDEX IF NOT EXISTS idx_infoauto_trgm_search 
ON public.infoauto_prices 
USING gin (search_text gin_trgm_ops);

-- 4. Permitir lectura pública a usuarios autenticados (y anónimos para cotizaciones)
ALTER TABLE public.infoauto_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_read_infoauto_prices" ON public.infoauto_prices;
CREATE POLICY "allow_read_infoauto_prices" ON public.infoauto_prices
  FOR SELECT USING (true);

-- 5. Función de búsqueda difusa trigram con ranking de relevancia
CREATE OR REPLACE FUNCTION search_infoauto_versions(
  p_marca TEXT,
  p_modelo TEXT,
  p_anio INT DEFAULT 0,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id BIGINT,
  marca TEXT,
  modelo TEXT,
  version TEXT,
  anio INT,
  precio NUMERIC,
  edicion TEXT,
  similarity REAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.marca,
    p.modelo,
    p.version,
    p.anio,
    p.precio,
    p.edicion,
    similarity(p.search_text, trim(p_marca || ' ' || p_modelo)) AS similarity
  FROM public.infoauto_prices p
  WHERE 
    (p_anio = 0 OR p.anio = p_anio)
    AND (
      p_marca = '' OR p.marca ILIKE '%' || p_marca || '%'
    )
    AND (
      p_modelo = '' OR 
      p.modelo ILIKE '%' || p_modelo || '%' OR 
      p.version ILIKE '%' || p_modelo || '%' OR
      p.search_text % (p_marca || ' ' || p_modelo)
    )
  ORDER BY 
    (p_anio > 0 AND p.anio = p_anio) DESC,
    similarity DESC,
    p.anio DESC,
    p.precio DESC
  LIMIT p_limit;
END;
$$;
