// ─── Node 4: Multichannel Copy Fan-out ─────────────────────────────────────────
import { generateMultichannelCopy } from '@/lib/ai/gemini'
import { AutoAppState } from '../state'

export async function copyFanoutNode(state: AutoAppState): Promise<Partial<AutoAppState>> {
  const v = state.draftVehicle
  if (!v) return {}

  try {
    const copies = await generateMultichannelCopy({
      marca: v.marca,
      modelo: v.modelo,
      version: v.version,
      anio: v.anio,
      km: v.km,
      precio_venta: v.precio_venta,
      precio_entrega: v.precio_entrega,
      combustible: v.tipo_combustible,
      transmision: v.transmision,
      descripcion: v.descripcion
    })

    return {
      generatedCopies: copies
    }
  } catch (err) {
    console.warn('[Copy Fan-out Node] Error generando copys:', err)
    return {}
  }
}
