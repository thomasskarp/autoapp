import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { VehiclePhotoBook } from '@/components/stock/vehicle-media-books'

export const dynamic = 'force-dynamic'

const STORAGE_BUCKET = 'vehicle-images'

/**
 * GET /api/vehicles/books?vehicleId=...
 * Obtiene los books de fotos asociados a un vehículo desde la nube (APP_ENVIOS y Storage)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const vehicleId = searchParams.get('vehicleId')

    if (!vehicleId) {
      return NextResponse.json({ success: false, error: 'vehicleId requerido' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const configId = `BOOKS_AUTO_${vehicleId}`
    const storagePath = `books/${vehicleId}.json`

    // 1. Intentar leer desde tabla APP_ENVIOS
    const { data: dbData } = await supabase
      .from('APP_ENVIOS')
      .select('Observaciones')
      .eq('ID', configId)
      .maybeSingle()

    if (dbData?.Observaciones) {
      try {
        const parsed = JSON.parse(dbData.Observaciones) as VehiclePhotoBook[]
        if (Array.isArray(parsed)) {
          return NextResponse.json(
            { success: true, books: parsed },
            { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
          )
        }
      } catch (e) {
        console.warn('[API Books] Error parseando Observaciones:', e)
      }
    }

    // 2. Respaldo: leer desde Supabase Storage
    try {
      const { data: fileData, error: fileErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(storagePath)

      if (fileData && !fileErr) {
        const text = await fileData.text()
        const parsed = JSON.parse(text) as VehiclePhotoBook[]
        if (Array.isArray(parsed)) {
          return NextResponse.json(
            { success: true, books: parsed },
            { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
          )
        }
      }
    } catch {
      // Storage file might not exist yet
    }

    return NextResponse.json(
      { success: true, books: [] },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    )
  } catch (err: any) {
    console.error('[API Books] GET Exception:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

/**
 * POST /api/vehicles/books
 * Guarda o actualiza los books de fotos de un vehículo sincronizándolos en Supabase
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { vehicleId, books } = body

    if (!vehicleId || !Array.isArray(books)) {
      return NextResponse.json({ success: false, error: 'vehicleId y array de books requeridos' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const configId = `BOOKS_AUTO_${vehicleId}`
    const storagePath = `books/${vehicleId}.json`
    const jsonString = JSON.stringify(books)

    // 1. Guardar en tabla APP_ENVIOS
    const { error: upsertErr } = await supabase
      .from('APP_ENVIOS')
      .upsert({
        ID: configId,
        Patente: 'BOOKS',
        Vehiculo: String(vehicleId),
        Cliente_Nombre: 'VEHICLE_BOOKS',
        Observaciones: jsonString
      }, { onConflict: 'ID' })

    if (upsertErr) {
      console.error('[API Books] Error upserting en APP_ENVIOS:', upsertErr)
    }

    // 2. Respaldo dual en Supabase Storage
    try {
      const blob = new Blob([jsonString], { type: 'application/json' })
      await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, blob, { upsert: true })
    } catch (storageErr) {
      console.warn('[API Books] Error en respaldo de Storage:', storageErr)
    }

    return NextResponse.json({ success: true, count: books.length })
  } catch (err: any) {
    console.error('[API Books] POST Exception:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
