import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ycbvjnydxrhygtvusowr.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_KEY) {
  console.error('❌ Falta SUPABASE_KEY en las variables de entorno.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function seedInfoAuto() {
  console.log('🚀 Iniciando Ingesta de Datos InfoAuto en Supabase (Fase 2)...')

  const jsonPath = path.join(process.cwd(), 'data', 'infoauto_db.json')
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Archivo no encontrado: ${jsonPath}`)
    process.exit(1)
  }

  const rawData = fs.readFileSync(jsonPath, 'utf-8')
  const records = JSON.parse(rawData)
  console.log(`📦 Registros leídos de JSON: ${records.length}`)

  // Verificar si la tabla existe en Supabase
  const { error: checkError } = await supabase
    .from('infoauto_prices')
    .select('id')
    .limit(1)

  if (checkError) {
    console.warn('⚠️ La tabla infoauto_prices no parece existir aún en Supabase o no tiene permisos de inserción directa:')
    console.warn(`   ${checkError.message}`)
    console.warn('👉 Asegúrate de ejecutar primero la migración supabase_infoauto_migration.sql en el panel SQL de Supabase.')
    return
  }

  // Insertar en lotes de 250 registros para óptimo rendimiento
  const BATCH_SIZE = 250
  let inserted = 0

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE).map(r => ({
      marca: r.marca.trim().toUpperCase(),
      modelo: r.modelo.trim(),
      version: r.version.trim(),
      anio: parseInt(r.anio, 10),
      precio: parseFloat(r.precio),
      edicion: r.edicion || 'Septiembre 2026'
    }))

    const { error } = await supabase.from('infoauto_prices').upsert(batch)
    if (error) {
      console.error(`❌ Error al insertar lote ${i}-${i + batch.length}:`, error.message)
      break
    }
    inserted += batch.length
    process.stdout.write(`\r✅ Insertados: ${inserted}/${records.length} (${Math.round((inserted / records.length) * 100)}%)`)
  }

  console.log('\n🎉 Ingesta completada con éxito en PostgreSQL!')
}

seedInfoAuto().catch(console.error)
