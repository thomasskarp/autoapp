import { parseVehicleFromConversation, ParsedVehicle } from '@/lib/ai/gemini'
import { createClient } from '@/lib/supabase/server'
import { getUserAgencyId, DEFAULT_AGENCY_ID } from '@/lib/services/integrations'
import { publishToMercadoLibre } from '@/lib/publisher'
import { Vehicle } from '@/lib/supabase/types'

export interface AssistantResponse {
  reply: string
  action?: 'VEHICLE_CREATED' | 'VEHICLE_PUBLISHED' | 'INFO'
  vehicle?: any
  publicationResults?: any
}

// In-memory context for pending confirmation (e.g. user added vehicle and we wait for "yes publish")
const userPendingActions = new Map<string, { action: 'CONFIRM_PUBLISH'; vehicleId: string; vehicleData: any; timestamp: number }>()

export async function processAssistantMessage(params: {
  userId: string
  message: string
  photoUrls?: string[]
}): Promise<AssistantResponse> {
  const { userId, message, photoUrls = [] } = params
  const trimmed = message.trim()
  const lower = trimmed.toLowerCase()

  const pending = userPendingActions.get(userId)

  // ─── CASE 1: USER RESPONDS "YES, PUBLISH" TO A PENDING CAR ─────────────────
  const isAffirmative = /^(si|sí|publicar|publicalo|dale|confirmar|publica|hacelo|ok|de una)\b/i.test(lower)

  if (pending && pending.action === 'CONFIRM_PUBLISH' && isAffirmative) {
    userPendingActions.delete(userId)
    const vehicle = pending.vehicleData

    try {
      // Disparar publicación oficial en MercadoLibre VIS
      const meliRes = await publishToMercadoLibre(vehicle, undefined, 'gold_premium')

      const reply = `🚀 *¡Vehículo publicado exitosamente en las plataformas!*

✅ *MercadoLibre VIS:* Publicado con éxito.
🔗 *Ver en MercadoLibre:* ${meliRes.url}

📋 *Facebook Marketplace & WhatsApp:*
Ficha técnica y fotos listas en tu panel de publicaciones para compartir en 1 clic.

¿Necesitás algo más para este vehículo o querés ingresar otro?`

      return {
        reply,
        action: 'VEHICLE_PUBLISHED',
        vehicle,
        publicationResults: {
          mercadolibre: meliRes
        }
      }
    } catch (err: any) {
      return {
        reply: `⚠️ Se guardó el auto en Stock, pero al conectar con MercadoLibre ocurrió un aviso: ${err.message}. Podés revisar la publicación desde el panel web de AutoApp.`,
        action: 'INFO',
        vehicle
      }
    }
  }

  // ─── CASE 2: DETECT INTENT TO ADD VEHICLE TO STOCK ─────────────────────────
  const isAddVehicleIntent = /agrega|ingresa|cargar|nuevo auto|entra|tomamos|ingreso|auto al stock/i.test(lower) ||
    /(\d{4}).*(km|millon|precio)/i.test(lower)

  if (isAddVehicleIntent) {
    const parsed = await parseVehicleFromConversation(trimmed)

    if (parsed && parsed.marca && parsed.modelo) {
      // Guardar en Supabase tabla vehicles
      let supabase: any = null
      let agencyId = DEFAULT_AGENCY_ID

      try {
        supabase = await createClient()
        agencyId = (await getUserAgencyId(supabase)) || DEFAULT_AGENCY_ID
      } catch (e) {
        console.warn('[Assistant Agent] Supabase client init fallback')
      }

      const coverImage = photoUrls[0] || null
      const extraPhotos = photoUrls.slice(1).join(',')

      const vehicleRecord: Partial<Vehicle> = {
        ID: crypto.randomUUID(),
        Marca: parsed.marca,
        Modelo: parsed.modelo,
        Version: parsed.version || '',
        Año: parsed.anio,
        Km: parsed.km,
        Precio_Venta: parsed.precio_venta,
        Precio_entrega: parsed.precio_entrega || 0,
        Tipo_Combustible: parsed.tipo_combustible,
        Transmision: parsed.transmision,
        Patente: parsed.patente || '',
        Descripcion: parsed.descripcion || `${parsed.marca} ${parsed.modelo} ${parsed.anio}`,
        Estado: 'DISPONIBLE',
        Tipo_Vehiculo: parsed.km === 0 ? '0km' : 'Usado',
        FOTO_PORTADA: coverImage || undefined,
        FOTOS_EXTRA: extraPhotos || undefined,
        agency_id: agencyId,
        createdAt: new Date().toISOString()
      }

      if (supabase) {
        try {
          await supabase.from('vehicles').insert(vehicleRecord)
        } catch (dbErr) {
          console.error('[Assistant Agent] Error al insertar en tabla vehicles:', dbErr)
        }
      }

      // Guardar estado pendiente en memoria para la confirmación de publicación
      userPendingActions.set(userId, {
        action: 'CONFIRM_PUBLISH',
        vehicleId: vehicleRecord.ID!,
        vehicleData: vehicleRecord,
        timestamp: Date.now()
      })

      const formattedPrice = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(parsed.precio_venta)
      const formattedKm = new Intl.NumberFormat('es-AR').format(parsed.km) + ' km'

      const reply = `✅ *¡Vehículo agregado exitosamente al Stock de AutoApp!*

🚘 *${parsed.marca} ${parsed.modelo} ${parsed.version || ''} (${parsed.anio})*
📍 *Kilómetros:* ${formattedKm}
💰 *Precio de Venta:* ${formattedPrice}
⚙️ *Caja:* ${parsed.transmision} | *Combustible:* ${parsed.tipo_combustible}
${parsed.patente ? `🏷️ *Patente:* ${parsed.patente}\n` : ''}
¿Deseas que lo publique en las redes y portales ahora mismo? *(Respondé "Sí, publicar" o hacé clic en el botón)*`

      return {
        reply,
        action: 'VEHICLE_CREATED',
        vehicle: vehicleRecord
      }
    }
  }

  // ─── CASE 3: GENERAL CONVERSATION OR INVENTORY QUERY ───────────────────────
  return {
    reply: `¡Hola! Soy tu Copiloto Comercial de AutoApp 🚘

Podés pedirme por ejemplo:
• *"Agregá este auto al stock: Toyota Hilux 2022 SRX 4x4, 45.000 km, automática, blanca, $48 millones, patente AF123CD"*
• *"Tasame un Cruze 2021 LTZ con 35.000 km"*
• *"¿Cómo vienen los leads de la semana?"*

Si me envías las fotos del vehículo junto con el mensaje, las guardaré directamente como portada de la unidad.`,
    action: 'INFO'
  }
}
