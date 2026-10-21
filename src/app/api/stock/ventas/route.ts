import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const STORAGE_BUCKET = 'vehicle-images'

async function checkUserRole(req: NextRequest): Promise<{ isAdmin: boolean; user: any | null }> {
  try {
    const userClient = await createClient()
    let { data: { user } } = await userClient.auth.getUser()
    const adminClient = createAdminClient()

    if (!user) {
      const authHeader = req.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1]
        const { data: tokenData } = await adminClient.auth.getUser(token)
        user = tokenData?.user || null
      }
    }

    if (!user) {
      return { isAdmin: false, user: null }
    }

    const email = user.email?.toLowerCase() || ''
    const rawRole = user.user_metadata?.role?.toLowerCase()
    const isAdmin =
      email === 'okmmotorschaco@gmail.com' ||
      email === 'tomas.skarp@gmail.com' ||
      rawRole === 'admin' ||
      rawRole === 'administrador' ||
      rawRole === 'owner' ||
      rawRole === 'superadmin'

    return { isAdmin, user }
  } catch {
    return { isAdmin: false, user: null }
  }
}

/**
 * GET /api/stock/ventas?vehicleId=...
 * Obtiene el reporte de venta guardado en Supabase.
 * - Admin: Reporte completo con costos y ganancia neta.
 * - Vendedor: Oculta costo de compra, gastos internos y ganancia neta.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const vehicleId = searchParams.get('vehicleId')

    if (!vehicleId) {
      return NextResponse.json({ success: false, error: 'vehicleId requerido' }, { status: 400 })
    }

    const { isAdmin } = await checkUserRole(req)
    const supabase = createAdminClient()
    const configId = `REPORTE_VENTA_${vehicleId}`
    const storagePath = `ventas/${vehicleId}.json`

    let reporte: any = null

    // 1. Intentar leer desde tabla APP_ENVIOS
    const { data: dbData } = await supabase
      .from('APP_ENVIOS')
      .select('Observaciones')
      .eq('ID', configId)
      .maybeSingle()

    if (dbData?.Observaciones) {
      try {
        reporte = JSON.parse(dbData.Observaciones)
      } catch (e) {
        console.warn('[API Ventas] Error parseando Observaciones:', e)
      }
    }

    // 2. Respaldo: leer desde Storage
    if (!reporte) {
      try {
        const { data: fileData } = await supabase.storage
          .from(STORAGE_BUCKET)
          .download(storagePath)

        if (fileData) {
          const text = await fileData.text()
          reporte = JSON.parse(text)
        }
      } catch {}
    }

    if (!reporte) {
      return NextResponse.json(
        { success: true, reporte: null },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
      )
    }

    // Filtrar campos confidenciales para vendedores
    if (!isAdmin) {
      const sanitizedReporte = {
        ...reporte,
        precioCompra: undefined,
        totalGastos: undefined,
        listaGastos: [],
        inversionTotal: undefined,
        gananciaNeta: undefined,
        restricted: true
      }
      return NextResponse.json(
        { success: true, restricted: true, reporte: sanitizedReporte },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
      )
    }

    return NextResponse.json(
      { success: true, restricted: false, reporte },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    )
  } catch (err: any) {
    console.error('[API Ventas] GET Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

/**
 * POST /api/stock/ventas
 * Registra una venta en Supabase, guarda su reporte y actualiza el estado del stock
 */
export async function POST(req: NextRequest) {
  try {
    const { isAdmin, user } = await checkUserRole(req)
    const body = await req.json()
    const { vehicleId, reporte, isOkm } = body

    if (!vehicleId || !reporte) {
      return NextResponse.json({ success: false, error: 'vehicleId y reporte requeridos' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const configId = `REPORTE_VENTA_${vehicleId}`
    const storagePath = `ventas/${vehicleId}.json`
    const jsonString = JSON.stringify(reporte)

    // 1. Guardar reporte en APP_ENVIOS
    const { error: upsertErr } = await supabase
      .from('APP_ENVIOS')
      .upsert({
        ID: configId,
        Patente: reporte.patente || 'VENTA',
        Vehiculo: vehicleId,
        Cliente_Nombre: reporte.vendedor || 'AGENCIA',
        Observaciones: jsonString
      })

    if (upsertErr) {
      console.error('[API Ventas] Error guardando reporte en APP_ENVIOS:', upsertErr)
    }

    // 2. Respaldo en Storage
    try {
      const blob = new Blob([jsonString], { type: 'application/json' })
      await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, blob, { contentType: 'application/json', upsert: true })
    } catch (e) {
      console.warn('[API Ventas] Exception storage backup:', e)
    }

    // 3. Actualizar estado del vehículo a VENDIDO
    const tableName = isOkm ? 'DB_STOCK_OKM' : 'DB_STOCK'
    const updatePayload: Record<string, any> = {
      Estado: 'VENDIDO',
      Precio_Venta: reporte.precioVentaFinal || 0
    }
    if (isAdmin && reporte.precioCompra != null) {
      updatePayload.Precio_Compra = reporte.precioCompra
    }
    await supabase.from(tableName).update(updatePayload).eq('ID', vehicleId)

    // 4. Registrar interacción de venta en DB_INTERACCIONES
    const detalleConversacion = isAdmin
      ? `Venta de ${reporte.auto} por $${new Intl.NumberFormat('es-AR').format(reporte.precioVentaFinal || 0)} (Ganancia Neta: $${new Intl.NumberFormat('es-AR').format(reporte.gananciaNeta || 0)}). Método: ${reporte.metodoVenta || 'Contado'}`
      : `Venta de ${reporte.auto} registrada por $${new Intl.NumberFormat('es-AR').format(reporte.precioVentaFinal || 0)}. Método: ${reporte.metodoVenta || 'Contado'}`

    await supabase.from('DB_INTERACCIONES').insert({
      Tipo_Interaccion: 'VENTA_REGISTRADA',
      Vendedor: reporte.vendedor || user?.email || 'Vendedor',
      Detalle_Conversacion: detalleConversacion
    })

    return NextResponse.json({
      success: true,
      vehicleId,
      syncedAt: new Date().toISOString()
    })
  } catch (err: any) {
    console.error('[API Ventas] POST Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
