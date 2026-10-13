import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { removeVehicleFromCache, invalidateVehiclesCache } from '@/lib/services/vehicles-service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'ID del vehículo es requerido' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const strId = String(id).trim()

    // Intentar eliminar de DB_STOCK y DB_STOCK_OKM para garantizar que se borre
    // sin importar si fue registrado como Usado o 0KM
    const deletePromises = [
      supabase.from('DB_STOCK').delete().eq('ID', strId),
      supabase.from('DB_STOCK_OKM').delete().eq('ID', strId),
    ]

    // Limpiar posibles fotos asociadas en tablas secundarias
    deletePromises.push(
      supabase.from('DB_FOTOS').delete().eq('ID_AUTO', strId) as any,
      supabase.from('DB_FOTOS_OKM').delete().eq('ID_AUTO', strId) as any,
    )

    const results = await Promise.all(deletePromises)
    const err = results.find(r => r.error)?.error
    if (err) {
      console.error('[API Delete Vehicle] Error en Supabase:', err)
      return NextResponse.json({ error: err.message }, { status: 500 })
    }

    // Actualizar inmediatamente la caché en RAM del servidor
    removeVehicleFromCache(strId)
    invalidateVehiclesCache()

    return NextResponse.json({ success: true, id: strId })
  } catch (err: any) {
    console.error('[API Delete Vehicle] Error inesperado:', err)
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}
