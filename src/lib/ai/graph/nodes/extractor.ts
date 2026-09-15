// ─── Node 2: Vehicle Spec Extractor ───────────────────────────────────────────
import { parseVehicleFromConversation } from '@/lib/ai/gemini'
import { AutoAppState } from '../state'

export async function extractorNode(state: AutoAppState): Promise<Partial<AutoAppState>> {
  const parsed = await parseVehicleFromConversation(state.inputMessage)

  if (!parsed) {
    return {
      validation: {
        passed: false,
        errors: ['No se pudieron extraer los datos técnicos del vehículo.'],
        warnings: [],
        checkerName: 'extractor',
        timestamp: Date.now()
      }
    }
  }

  const coverPhoto = state.photoUrls[0] || undefined
  const extraPhotos = state.photoUrls.slice(1).join(',') || undefined

  return {
    draftVehicle: {
      ...parsed,
      ID: crypto.randomUUID(),
      FOTO_PORTADA: coverPhoto,
      FOTOS_EXTRA: extraPhotos
    }
  }
}
