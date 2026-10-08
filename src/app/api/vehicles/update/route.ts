import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { updateVehicleInCache } from '@/lib/services/vehicles-service'

const ALLOWED_VEHICLE_FIELDS = new Set([
  'Marca', 'marca', 'Modelo', 'modelo', 'Version', 'version',
  'Año', 'Anio', 'anio', 'Precio_Venta', 'Precio_entrega',
  'Km', 'km', 'kms', 'Estado', 'estado', 'Tipo_Combustible', 'combustible',
  'Transmision', 'transmision', 'Tipo_Carroceria', 'Estado_Vehiculo',
  'Tipo_Vehiculo', 'Descripcion', 'descripcion', 'FOTO_PORTADA', 'FOTOS_EXTRA',
  'photoLinks', 'Moneda', 'Patente', 'Color', 'agency_id'
])

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

    // Filtrar únicamente campos permitidos para prevenir inyecciones o alteración de columnas no autorizadas
    const sanitizedFields: Record<string, any> = {}
    for (const [key, val] of Object.entries(fields)) {
      if (ALLOWED_VEHICLE_FIELDS.has(key)) {
        sanitizedFields[key] = val
      }
    }

    if (Object.keys(sanitizedFields).length === 0) {
      return NextResponse.json({ error: 'No se enviaron campos válidos para actualizar' }, { status: 400 })
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
