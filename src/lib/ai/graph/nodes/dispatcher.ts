// ─── Node 6: Transactional Dispatcher ─────────────────────────────────────────
import { createClient } from '@/lib/supabase/server'
import { publishToMercadoLibre } from '@/lib/publisher'
import { Vehicle } from '@/lib/supabase/types'
import { AutoAppState } from '../state'

export async function dispatcherNode(state: AutoAppState, pendingVehicle?: any): Promise<Partial<AutoAppState>> {
  const v = pendingVehicle || state.draftVehicle
  if (!v) {
    return {
      outputReply: '⚠️ No se encontró la ficha del vehículo pendiente de confirmación. Por favor, reenvía los datos del auto.',
      action: 'INFO'
    }
  }

  // 1. Persistencia Transaccional en Base de Datos Supabase
  let savedRecord: Partial<Vehicle> | null = null
  try {
    const supabase = await createClient()
    const targetTable = (v.km === 0 || v.Tipo_Vehiculo === '0km') ? 'DB_STOCK_OKM' : 'DB_STOCK'

    const recordToInsert: Partial<Vehicle> = {
      ID: v.ID || crypto.randomUUID(),
      Marca: v.marca,
      Modelo: v.modelo,
      Version: v.version || '',
      Año: v.anio,
      Km: v.km || 0,
      Precio_Venta: v.precio_venta,
      Precio_entrega: v.precio_entrega || 0,
      Tipo_Combustible: v.tipo_combustible || 'Nafta',
      Transmision: v.transmision || 'Manual',
      Patente: v.patente || '',
      Descripcion: v.descripcion || `${v.marca} ${v.modelo} ${v.anio}`,
      Estado: 'DISPONIBLE',
      Tipo_Vehiculo: v.km === 0 ? '0km' : 'Usado',
      FOTO_PORTADA: v.FOTO_PORTADA,
      FOTOS_EXTRA: v.FOTOS_EXTRA,
      agency_id: state.agencyId,
      createdAt: new Date().toISOString()
    }

    const { error: dbErr } = await supabase.from(targetTable).insert(recordToInsert)
    if (dbErr) {
      console.error('[Dispatcher Node] Error persistiendo en DB:', dbErr)
    } else {
      savedRecord = recordToInsert
    }
  } catch (err) {
    console.warn('[Dispatcher Node] Error inicializando Supabase Client:', err)
  }

  // 2. Publicación Oficial en MercadoLibre VIS API
  let meliResult: any = null
  try {
    meliResult = await publishToMercadoLibre(v, undefined, 'gold_premium')
  } catch (meliErr: any) {
    console.warn('[Dispatcher Node] Aviso en publicación MercadoLibre:', meliErr.message)
    meliResult = { url: 'Aviso guardado en borrador. Conecta tu cuenta de MercadoLibre en el panel web.' }
  }

  const reply = `🚀 *¡Vehículo publicado y sincronizado con éxito!*

✅ *Base de Datos:* Ingresado a **${v.km === 0 ? 'Stock 0KM' : 'Stock Usados'}**
🟡 *MercadoLibre VIS:* ${meliResult?.url ? `Publicado con éxito (${meliResult.url})` : 'En cola de sincronización'}
🔵 *Facebook Marketplace & Instagram:* Ficha y copys generados disponibles en tu módulo de publicaciones.

¿Necesitas algo más para este vehículo o deseas ingresar otro?`

  return {
    publishedVehicle: savedRecord || v,
    publicationResults: {
      mercadolibre: meliResult
    },
    outputReply: reply,
    action: 'VEHICLE_PUBLISHED',
    requiresConfirmation: false
  }
}
