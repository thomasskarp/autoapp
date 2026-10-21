import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { CircularConfig } from '@/lib/services/circular-service'

export const dynamic = 'force-dynamic'

const CONFIG_ID = 'CONFIG_CIRCULARES_OKM'
const STORAGE_BUCKET = 'vehicle-images'
const STORAGE_PATH = 'config/circulares_0km.json'

/**
 * GET /api/circulares
 * Retorna todas las circulares de financiación 0KM sincronizadas en la nube (Supabase)
 */
export async function GET() {
  try {
    const supabase = createAdminClient()

    // 1. Intentar leer desde tabla de configuración APP_ENVIOS
    const { data: dbData, error: dbErr } = await supabase
      .from('APP_ENVIOS')
      .select('Observaciones')
      .eq('ID', CONFIG_ID)
      .maybeSingle()

    if (dbData?.Observaciones) {
      try {
        const parsed = JSON.parse(dbData.Observaciones) as Record<string, CircularConfig>
        return NextResponse.json(
          { success: true, circulares: parsed },
          { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
        )
      } catch (e) {
        console.warn('[API Circulares] Error parseando Observaciones:', e)
      }
    }

    // 2. Respaldo: intentar leer desde Supabase Storage
    try {
      const { data: fileData, error: storageErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(STORAGE_PATH)

      if (fileData) {
        const text = await fileData.text()
        const parsed = JSON.parse(text) as Record<string, CircularConfig>
        return NextResponse.json(
          { success: true, circulares: parsed },
          { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
        )
      }
    } catch (e) {
      // Ignorar si no existe el archivo aún
    }

    return NextResponse.json(
      { success: true, circulares: {} },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    )
  } catch (err: any) {
    console.error('[API Circulares] GET Error:', err)
    return NextResponse.json(
      { success: false, error: err.message, circulares: {} },
      { status: 500 }
    )
  }
}

/**
 * POST /api/circulares
 * Guarda o actualiza las circulares en Supabase para que estén disponibles para todos los vendedores
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { circulares } = body

    if (!circulares || typeof circulares !== 'object') {
      return NextResponse.json({ success: false, error: 'Payload de circulares inválido' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const jsonString = JSON.stringify(circulares)

    // 1. Guardar en APP_ENVIOS
    const { error: upsertErr } = await supabase
      .from('APP_ENVIOS')
      .upsert({
        ID: CONFIG_ID,
        Patente: 'CONFIG',
        Vehiculo: 'CIRCULARES',
        Cliente_Nombre: 'ADMIN_CIRCULARES',
        Observaciones: jsonString
      })

    if (upsertErr) {
      console.error('[API Circulares] Error upserting en APP_ENVIOS:', upsertErr)
    }

    // 2. Respaldo dual en Supabase Storage
    try {
      await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(STORAGE_PATH, jsonString, {
          contentType: 'application/json',
          upsert: true
        })
    } catch (e) {
      console.warn('[API Circulares] Respaldo en Storage advierte:', e)
    }

    return NextResponse.json({
      success: true,
      count: Object.keys(circulares).length
    })
  } catch (err: any) {
    console.error('[API Circulares] POST Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
