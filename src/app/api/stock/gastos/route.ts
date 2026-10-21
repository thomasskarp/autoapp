import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const STORAGE_BUCKET = 'vehicle-images'

interface GastoItem {
  id: string
  concepto: string
  monto: number
  fecha?: string
}

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
 * GET /api/stock/gastos?vehicleId=...
 * Obtiene los gastos internos de un vehículo.
 * - Admin: Retorna los gastos y montos reales.
 * - Vendedor: Retorna acceso restringido (oculta números confidenciales).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const vehicleId = searchParams.get('vehicleId')

    if (!vehicleId) {
      return NextResponse.json({ success: false, error: 'vehicleId requerido' }, { status: 400 })
    }

    const { isAdmin } = await checkUserRole(req)

    // Protección RBAC: si es vendedor, no se devuelven los gastos
    if (!isAdmin) {
      return NextResponse.json(
        {
          success: true,
          restricted: true,
          gastos: [],
          totalGastos: 0,
          message: 'Información interna reservada para Administración.'
        },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
      )
    }

    const supabase = createAdminClient()
    const configId = `GASTOS_AUTO_${vehicleId}`
    const storagePath = `gastos/${vehicleId}.json`

    // 1. Intentar leer desde tabla APP_ENVIOS
    const { data: dbData } = await supabase
      .from('APP_ENVIOS')
      .select('Observaciones')
      .eq('ID', configId)
      .maybeSingle()

    if (dbData?.Observaciones) {
      try {
        const parsed = JSON.parse(dbData.Observaciones) as GastoItem[]
        if (Array.isArray(parsed)) {
          const totalGastos = parsed.reduce((sum, g) => sum + (Number(g.monto) || 0), 0)
          return NextResponse.json(
            { success: true, restricted: false, gastos: parsed, totalGastos },
            { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
          )
        }
      } catch (e) {
        console.warn('[API Gastos] Error parseando Observaciones:', e)
      }
    }

    // 2. Respaldo: leer desde Storage
    try {
      const { data: fileData } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(storagePath)

      if (fileData) {
        const text = await fileData.text()
        const parsed = JSON.parse(text) as GastoItem[]
        if (Array.isArray(parsed)) {
          const totalGastos = parsed.reduce((sum, g) => sum + (Number(g.monto) || 0), 0)
          return NextResponse.json(
            { success: true, restricted: false, gastos: parsed, totalGastos },
            { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
          )
        }
      }
    } catch {}

    return NextResponse.json(
      { success: true, restricted: false, gastos: [], totalGastos: 0 },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    )
  } catch (err: any) {
    console.error('[API Gastos] GET Error:', err)
    return NextResponse.json({ success: false, error: err.message, gastos: [] }, { status: 500 })
  }
}

/**
 * POST /api/stock/gastos
 * Guarda los gastos del vehículo en Supabase (Solo Admin)
 */
export async function POST(req: NextRequest) {
  try {
    const { isAdmin } = await checkUserRole(req)

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Acceso no autorizado. Se requiere rol de Administrador para modificar gastos.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { vehicleId, gastos, precioCompra, isOkm } = body

    if (!vehicleId || !Array.isArray(gastos)) {
      return NextResponse.json({ success: false, error: 'vehicleId y array de gastos requeridos' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const configId = `GASTOS_AUTO_${vehicleId}`
    const storagePath = `gastos/${vehicleId}.json`
    const jsonString = JSON.stringify(gastos)

    // 1. Guardar en APP_ENVIOS
    const { error: upsertErr } = await supabase
      .from('APP_ENVIOS')
      .upsert({
        ID: configId,
        Patente: 'GASTOS',
        Vehiculo: vehicleId,
        Cliente_Nombre: 'ADMIN_GASTOS',
        Observaciones: jsonString
      })

    if (upsertErr) {
      console.error('[API Gastos] Error guardando en APP_ENVIOS:', upsertErr)
    }

    // 2. Respaldo en Storage
    try {
      const blob = new Blob([jsonString], { type: 'application/json' })
      await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, blob, { contentType: 'application/json', upsert: true })
    } catch (e) {
      console.warn('[API Gastos] Exception storage backup:', e)
    }

    // 3. Si se pasó precioCompra, actualizar en la tabla de stock
    if (precioCompra != null && !isNaN(Number(precioCompra))) {
      const tableName = isOkm ? 'DB_STOCK_OKM' : 'DB_STOCK'
      await supabase.from(tableName).update({
        Precio_Compra: Number(precioCompra)
      }).eq('ID', vehicleId)
    }

    const totalGastos = gastos.reduce((sum, g) => sum + (Number(g.monto) || 0), 0)

    return NextResponse.json({
      success: true,
      vehicleId,
      totalGastos,
      count: gastos.length,
      syncedAt: new Date().toISOString()
    })
  } catch (err: any) {
    console.error('[API Gastos] POST Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
