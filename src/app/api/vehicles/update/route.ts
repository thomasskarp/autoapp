import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { updateVehicleInCache } from '@/lib/services/vehicles-service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, isOkm, fields } = body

    if (!id || !fields || typeof fields !== 'object') {
      return NextResponse.json(
        { error: 'ID del vehículo y campos a actualizar son requeridos' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Determinar tabla si no se especifica explícitamente
    let targetTable = isOkm ? 'DB_STOCK_OKM' : 'DB_STOCK'
    
    // Si isOkm no vino definido, verificamos si existe en DB_STOCK o DB_STOCK_OKM
    if (isOkm === undefined) {
      const { data: checkStock } = await supabase
        .from('DB_STOCK')
        .select('ID')
        .eq('ID', id)
        .maybeSingle()

      if (!checkStock) {
        targetTable = 'DB_STOCK_OKM'
      }
    }

    // Actualizar en base de datos
    const { data, error } = await supabase
      .from(targetTable)
      .update(fields)
      .eq('ID', id)
      .select()

    if (error) {
      console.error(`Error updating vehicle in ${targetTable}:`, error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Actualizar inmediatamente la caché en RAM del servidor para que router.refresh()
    // y consultas posteriores devuelvan los datos actualizados al milisegundo
    updateVehicleInCache(id, fields)

    return NextResponse.json({
      success: true,
      updated: data?.[0] || fields,
    })
  } catch (err: any) {
    console.error('Unhandled error in /api/vehicles/update:', err)
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}
