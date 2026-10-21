import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { CircularConfig } from '@/lib/services/circular-service'
import { getAccountContext } from '@/lib/services/account-context'

export const dynamic = 'force-dynamic'

const STORAGE_BUCKET = 'vehicle-images'

/**
 * GET /api/circulares
 * Retorna las circulares de financiación 0KM sincronizadas en Supabase para la agencia
 */
export async function GET() {
  try {
    const userClient = await createClient()
    const context = await getAccountContext(userClient)
    const adminSupabase = createAdminClient()

    const configId = context.isOkmAccount
      ? 'CONFIG_CIRCULARES_OKM'
      : `CONFIG_CIRCULARES_${context.agencyId}`

    const storagePath = context.isOkmAccount
      ? 'config/circulares_0km.json'
      : `config/circulares_${context.agencyId}.json`

    // 1. Intentar leer desde tabla de configuración APP_ENVIOS
    const { data: dbData } = await adminSupabase
      .from('APP_ENVIOS')
      .select('Observaciones')
      .eq('ID', configId)
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
      const { data: fileData } = await adminSupabase.storage
        .from(STORAGE_BUCKET)
        .download(storagePath)

      if (fileData) {
        const text = await fileData.text()
        const parsed = JSON.parse(text) as Record<string, CircularConfig>
        return NextResponse.json(
          { success: true, circulares: parsed },
          { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
        )
      }
    } catch (e) {}

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
 * Guarda o actualiza las circulares en Supabase para la agencia del usuario
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { circulares } = body

    if (!circulares || typeof circulares !== 'object') {
      return NextResponse.json({ success: false, error: 'Payload de circulares inválido' }, { status: 400 })
    }

    const userClient = await createClient()
    const context = await getAccountContext(userClient)
    const adminSupabase = createAdminClient()

    const configId = context.isOkmAccount
      ? 'CONFIG_CIRCULARES_OKM'
      : `CONFIG_CIRCULARES_${context.agencyId}`

    const storagePath = context.isOkmAccount
      ? 'config/circulares_0km.json'
      : `config/circulares_${context.agencyId}.json`

    const jsonString = JSON.stringify(circulares)

    // 1. Guardar en APP_ENVIOS
    const { error: upsertErr } = await adminSupabase
      .from('APP_ENVIOS')
      .upsert({
        ID: configId,
        Patente: 'CONFIG',
        Vehiculo: 'CIRCULARES',
        Cliente_Nombre: context.agencyId,
        Observaciones: jsonString
      }, { onConflict: 'ID' })

    if (upsertErr) {
      console.error('[API Circulares] Error upserting en APP_ENVIOS:', upsertErr)
    }

    // 2. Respaldo dual en Supabase Storage
    try {
      const blob = new Blob([jsonString], { type: 'application/json' })
      await adminSupabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, blob, { upsert: true })
    } catch (storageErr) {
      console.warn('[API Circulares] Error en respaldo de Storage:', storageErr)
    }

    return NextResponse.json({ success: true, count: Object.keys(circulares).length, agencyId: context.agencyId })
  } catch (err: any) {
    console.error('[API Circulares] POST Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
