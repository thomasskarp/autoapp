import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

interface InfoAutoRecord {
  id?: number | string
  marca: string
  modelo: string
  version: string
  anio: number
  precio: number
  edicion?: string
}

// ─── INDEXED IN-MEMORY FALLBACK CACHE ─────────────────────────────────────────
// Estructura indexada en memoria para búsquedas O(1) instantáneas en caso de fallback
interface IndexedDb {
  records: InfoAutoRecord[]
  byMarca: Map<string, InfoAutoRecord[]>
  byMarcaAndAnio: Map<string, InfoAutoRecord[]>
}

let indexedDbCache: IndexedDb | null = null

async function getIndexedDb(): Promise<IndexedDb> {
  if (indexedDbCache) return indexedDbCache

  try {
    const filePath = path.join(process.cwd(), 'data', 'infoauto_db.json')
    const fileData = await fs.readFile(filePath, 'utf-8')
    const records = JSON.parse(fileData) as InfoAutoRecord[]

    const byMarca = new Map<string, InfoAutoRecord[]>()
    const byMarcaAndAnio = new Map<string, InfoAutoRecord[]>()

    for (const r of records) {
      const mKey = r.marca.toUpperCase().trim()
      const maKey = `${mKey}::${r.anio}`

      if (!byMarca.has(mKey)) byMarca.set(mKey, [])
      byMarca.get(mKey)!.push(r)

      if (!byMarcaAndAnio.has(maKey)) byMarcaAndAnio.set(maKey, [])
      byMarcaAndAnio.get(maKey)!.push(r)
    }

    indexedDbCache = { records, byMarca, byMarcaAndAnio }
    return indexedDbCache
  } catch (err) {
    console.error('[InfoAuto Engine] Error cargando data/infoauto_db.json:', err)
    return { records: [], byMarca: new Map(), byMarcaAndAnio: new Map() }
  }
}

// Búsqueda en memoria de alto rendimiento mediante índices
function searchInMemory(
  db: IndexedDb,
  marca: string,
  modelo: string,
  anio: number
): InfoAutoRecord[] {
  // 1. Reducir el universo de búsqueda usando el índice de Marca o Marca+Año
  let candidates: InfoAutoRecord[] = []

  if (marca && anio > 0) {
    const directBucket = db.byMarcaAndAnio.get(`${marca}::${anio}`)
    if (directBucket && directBucket.length > 0) {
      candidates = directBucket
    }
  }

  if (candidates.length === 0 && marca) {
    const marcaBucket = db.byMarca.get(marca)
    if (marcaBucket && marcaBucket.length > 0) {
      candidates = marcaBucket
    } else {
      // Coincidencia difusa sobre marcas indexadas
      for (const [key, records] of db.byMarca.entries()) {
        if (key.includes(marca) || marca.includes(key)) {
          candidates.push(...records)
        }
      }
    }
  }

  if (candidates.length === 0) {
    candidates = db.records
  }

  const modelParts = modelo.split(' ').filter(p => p.length >= 2)

  let matches = candidates.filter(r => {
    const rModelo = r.modelo.toUpperCase()
    const rVersion = r.version.toUpperCase()

    const matchModelo = !modelo ||
      rModelo.includes(modelo) ||
      rVersion.includes(modelo) ||
      modelParts.some(p => rVersion.includes(p) || rModelo.includes(p))

    const matchAnio = !anio || r.anio === anio

    return matchModelo && matchAnio
  })

  // Fallback 1: Si año exacto no coincide dentro de la marca, buscar por modelo sin filtrar año
  if (matches.length === 0 && anio > 0) {
    matches = candidates.filter(r => {
      const rModelo = r.modelo.toUpperCase()
      const rVersion = r.version.toUpperCase()
      return !modelo || rModelo.includes(modelo) || rVersion.includes(modelo)
    })
  }

  // Fallback 2: Si la búsqueda dentro de la marca retornó 0 (ej. por desplazamientos en la extracción de InfoAuto),
  // buscar el modelo en toda la base de datos
  if (matches.length === 0 && modelo) {
    const globalMatches = db.records.filter(r => {
      const rModelo = r.modelo.toUpperCase()
      const rVersion = r.version.toUpperCase()
      const matchModelo = rModelo.includes(modelo) || 
        rVersion.includes(modelo) || 
        modelParts.some(p => p.length >= 3 && (rVersion.includes(p) || rModelo.includes(p)))
      const matchAnio = !anio || r.anio === anio
      return matchModelo && matchAnio
    })

    if (globalMatches.length > 0) {
      return globalMatches
    }

    // Fallback 3: En toda la base sin año
    return db.records.filter(r => {
      const rModelo = r.modelo.toUpperCase()
      const rVersion = r.version.toUpperCase()
      return rModelo.includes(modelo) || 
        rVersion.includes(modelo) || 
        modelParts.some(p => p.length >= 3 && (rVersion.includes(p) || rModelo.includes(p)))
    })
  }

  return matches
}

// ─── HANDLER PRINCIPAL CON SMART CACHING & DUAL ENGINE ─────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const marca = (searchParams.get('marca') || '').trim().toUpperCase()
  const modelo = (searchParams.get('modelo') || '').trim().toUpperCase()
  const anio = parseInt(searchParams.get('anio') || '0', 10)

  if (!marca && !modelo) {
    return NextResponse.json(
      { versions: [], source: 'none' },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        }
      }
    )
  }

  // 1. Intentar consulta a PostgreSQL Supabase (pg_trgm) si está configurado
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let results: InfoAutoRecord[] = []
  let engineSource = 'memory_indexed'

  if (supabaseUrl && supabaseAnon) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnon)

      let query = supabase
        .from('infoauto_prices')
        .select('id, marca, modelo, version, anio, precio, edicion')
        .limit(50)

      if (marca) query = query.ilike('marca', `%${marca}%`)
      if (anio > 0) query = query.eq('anio', anio)
      if (modelo) {
        query = query.or(`modelo.ilike.%${modelo}%,version.ilike.%${modelo}%`)
      }

      const { data, error } = await query

      if (!error && data && data.length > 0) {
        results = data as InfoAutoRecord[]
        engineSource = 'postgres_trgm'
      }
    } catch (pgErr) {
      // Degradar silenciosamente al motor en memoria indexado
      console.warn('[InfoAuto] Fallo en consulta a PostgreSQL, aplicando fallback en memoria indexado:', pgErr)
    }
  }

  // 2. Si no hubo resultados en PostgreSQL, aplicar motor en memoria indexado O(1)
  if (results.length === 0) {
    const indexedDb = await getIndexedDb()
    results = searchInMemory(indexedDb, marca, modelo, anio)
    engineSource = 'memory_indexed'
  }

  // Deduplicación limpia
  const uniqueVersions = results.filter((r, index, self) =>
    index === self.findIndex(t => t.version === r.version && t.anio === r.anio && t.precio === r.precio)
  )

  // 3. Respuesta con cabeceras de Smart Caching (Edge Cache / CDN)
  return NextResponse.json(
    {
      total: uniqueVersions.length,
      source: engineSource,
      versions: uniqueVersions.slice(0, 50)
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'CDN-Cache-Control': 'public, s-maxage=86400',
        'X-Search-Engine': engineSource
      }
    }
  )
}
