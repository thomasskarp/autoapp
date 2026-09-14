import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'

// Schema Zod para validación estricta de salida multicanal
export const MultichannelCopySchema = z.object({
  instagram: z.object({
    hook: z.string().describe('Gancho aspiracional para captar atención en el feed o historias'),
    caption: z.string().describe('Texto completo optimizado con emojis y saltos de línea legibles'),
    hashtags: z.array(z.string()).describe('Hashtags automotrices estratégicos de Argentina / LATAM'),
  }),
  facebook: z.object({
    title: z.string().describe('Título directo y llamativo para Facebook Marketplace'),
    description: z.string().describe('Descripción enfocada en facilidades de pago, permutas y ubicación'),
    key_features: z.array(z.string()).describe('Lista de 3 a 5 puntos fuertes del auto'),
  }),
  mercadolibre: z.object({
    title: z.string().describe('Título VIS formal cumpliendo normas de MercadoLibre (Marca Modelo Versión Año)'),
    description: z.string().describe('Ficha técnica limpia sin caracteres prohibidos, documentación y estado general'),
  }),
  whatsapp: z.object({
    status_text: z.string().describe('Texto breve y dinámico para Estados de WhatsApp con llamada al test drive'),
    chat_pitch: z.string().describe('Mensaje de respuesta comercial rápida para enviar por chat a interesados'),
  }),
})

export type MultichannelCopy = z.infer<typeof MultichannelCopySchema>

// Schema Zod para Tasación Inteligente y Matching Semántico
export const SmartAppraisalSchema = z.object({
  matched_brand: z.string(),
  matched_model: z.string(),
  matched_version: z.string(),
  year: z.number(),
  estimated_table_price: z.number().describe('Precio estimado de tabla InfoAuto en pesos argentinos'),
  suggested_sale_price: z.number().describe('Precio de venta sugerido al público en concesionaria'),
  suggested_purchase_price: z.number().describe('Precio sugerido de toma / compra para asegurar margen'),
  estimated_margin_percentage: z.number().describe('Margen bruto porcentual estimado'),
  liquidity_rating: z.enum(['ALTA', 'MEDIA', 'BAJA']).describe('Velocidad estimada de rotación del vehículo en el mercado'),
  commercial_rationale: z.string().describe('Justificación técnica comercial breve del precio sugerido'),
})

export type SmartAppraisal = z.infer<typeof SmartAppraisalSchema>

// Inicializar cliente oficial de Gemini
const apiKey = process.env.GEMINI_API_KEY
let aiClient: GoogleGenAI | null = null

if (apiKey) {
  aiClient = new GoogleGenAI({ apiKey })
}

/**
 * Genera copys profesionales hiper-optimizados para los 4 canales simultáneos
 */
export async function generateMultichannelCopy(vehicle: {
  marca: string
  modelo: string
  version?: string
  anio?: number | string
  km?: number
  precio_venta?: number
  precio_entrega?: number
  combustible?: string
  transmision?: string
  estado?: string
  descripcion?: string
  tipo?: string
}): Promise<MultichannelCopy> {
  const vehicleSummary = `
Vehículo: ${vehicle.marca} ${vehicle.modelo} ${vehicle.version || ''}
Año: ${vehicle.anio || 'No especificado'}
Kilometraje: ${vehicle.km ? vehicle.km.toLocaleString('es-AR') + ' km' : '0 km / No especificado'}
Precio de Venta: ${vehicle.precio_venta ? '$' + vehicle.precio_venta.toLocaleString('es-AR') : 'Consultar'}
Anticipo / Entrega Mínima: ${vehicle.precio_entrega ? '$' + vehicle.precio_entrega.toLocaleString('es-AR') : 'A convenir'}
Combustible: ${vehicle.combustible || 'Nafta'}
Transmisión: ${vehicle.transmision || 'Manual'}
Condición: ${vehicle.tipo || 'Usado Seleccionado'}
Detalles adicionales: ${vehicle.descripcion || 'Excelente unidad, papeles al día, listo para transferir.'}
`

  // Si Gemini está disponible, usamos inferencia con Structured Outputs
  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Eres el Director de Marketing y Copywriting Automotriz de una prestigiosa red de concesionarias.
Genera los copys publicitarios de venta para este vehículo adaptados exactamente a la psicología de cada plataforma:
- Instagram: aspiracional, estético, llamadas a la emoción de estrenar auto, emojis elegantes y hashtags virales.
- Facebook Marketplace: directo, destaca si hay anticipo/cuotas y si se acepta permuta, lenguaje claro y accesible.
- MercadoLibre: profesional, datos técnicos rigurosos, estado de la documentación y garantías.
- WhatsApp: compacto, dinámico, ideal para leer en pantalla de celular y responder con un clic.

Ficha del auto:
${vehicleSummary}

Devuelve el resultado estrictamente en formato JSON con la siguiente estructura:
{
  "instagram": { "hook": "...", "caption": "...", "hashtags": ["...", "..."] },
  "facebook": { "title": "...", "description": "...", "key_features": ["...", "..."] },
  "mercadolibre": { "title": "...", "description": "..." },
  "whatsapp": { "status_text": "...", "chat_pitch": "..." }
}`
              }
            ]
          }
        ],
        config: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        }
      })

      const rawText = response.text || ''
      const parsed = JSON.parse(rawText)
      return MultichannelCopySchema.parse(parsed)
    } catch (err) {
      console.warn('[Gemini AI Copy] Error en llamada a Gemini API, usando generador algorítmico determinista:', err)
    }
  }

  // Generador algorítmico determinista de respaldo (alta disponibilidad offline/resiliente)
  const autoName = `${vehicle.marca} ${vehicle.modelo} ${vehicle.anio || ''}`.trim()
  const priceStr = vehicle.precio_venta ? `$${vehicle.precio_venta.toLocaleString('es-AR')}` : 'Consultar precio'
  const kmStr = vehicle.km ? `${vehicle.km.toLocaleString('es-AR')} km` : 'Excelente kilometraje'

  return {
    instagram: {
      hook: `✨ ¿Buscabas una unidad impecable? Mirá lo que acaba de ingresar: ${autoName}`,
      caption: `🔥 ${autoName}\n\n📍 ${kmStr} | Motor ${vehicle.combustible || 'Nafta'} | Caja ${vehicle.transmision || 'Manual'}\n💰 Precio: ${priceStr}\n\n📋 Unidad seleccionada y peritada con garantía documental.\n🚗 Tomamos tu usado en parte de pago al mejor valor de mercado.\n\n📲 Envianos un mensaje directo y coordiná tu prueba de manejo hoy mismo.`,
      hashtags: ['#autosargentina', '#concesionaria', '#usadosseleccionados', '#autos', `#${vehicle.marca.toLowerCase().replace(/\s+/g, '')}`, '#autoapp']
    },
    facebook: {
      title: `${autoName} - Impecable estado - Acepto permuta`,
      description: `${autoName}\n\nKilometraje: ${kmStr}\nPrecio: ${priceStr}\n${vehicle.precio_entrega ? `Entrega mínima desde: $${vehicle.precio_entrega.toLocaleString('es-AR')}\n` : ''}Listo para transferir, documentación al día sin deudas.\nTomamos permutas y ofrecemos financiación en cuotas fijas. Consultá por privado para coordinar visita.`,
      key_features: [
        `Año ${vehicle.anio || 'Reciente'} con ${kmStr}`,
        `Transmisión ${vehicle.transmision || 'Manual'}`,
        'Papeles al día garantizados',
        'Financiación disponible'
      ]
    },
    mercadolibre: {
      title: `${vehicle.marca} ${vehicle.modelo} ${vehicle.version || ''} ${vehicle.anio || ''}`.slice(0, 60),
      description: `${autoName.toUpperCase()} EN IMPECABLE ESTADO GENERAL.\n\n` +
        `• Kilometraje real: ${kmStr}\n` +
        `• Motor y caja: ${vehicle.combustible || 'Nafta'} - ${vehicle.transmision || 'Manual'}\n` +
        `• Estado: ${vehicle.estado || 'Disponible'}\n\n` +
        `Documentación al día, grabado de autopartes y VTV vigente. Transferencia obligatoria inmediata.\n` +
        `Somos concesionaria oficial. Garantizamos procedencia y transparencia.`
    },
    whatsapp: {
      status_text: `🚀 ¡RECIÉN INGRESADO! 🚘 ${autoName} | ${kmStr} | ${priceStr} ✨ ¡Respondé este estado y reservalo hoy!`,
      chat_pitch: `¡Hola! Te comparto la ficha de la unidad disponible:\n\n🚘 *${autoName}*\n📍 *KM:* ${kmStr}\n💰 *Precio:* ${priceStr}\n${vehicle.precio_entrega ? `💵 *Anticipo:* $${vehicle.precio_entrega.toLocaleString('es-AR')}\n` : ''}\n¿Te gustaría pasar a verlo por el salón o hacer una prueba de manejo?`
    }
  }
}

/**
 * Tasador Inteligente: Matching semántico contra InfoAuto y cálculo de rentabilidad esperada
 */
export async function smartAppraisalMatch(
  query: string,
  declaredPrice?: number
): Promise<SmartAppraisal> {
  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Eres un Perito Tasador Automotriz de élite en Argentina con conocimiento exacto de precios de InfoAuto, CCA y cotizaciones reales de agencias.
Analiza la siguiente consulta o vehículo y realiza el appraisal profesional:
"${query}"
${declaredPrice ? `Precio de referencia indicado: $${declaredPrice.toLocaleString('es-AR')}` : ''}

Determina la marca, modelo, versión, año probable, precio estimado de tabla InfoAuto en pesos, precio sugerido de venta en concesionaria, precio de toma/compra sugerido (descontando gastos de reventa y gestoría para lograr ~15-20% de margen) y califica la liquidez de mercado (ALTA, MEDIA o BAJA).

Devuelve estrictamente un JSON con esta estructura:
{
  "matched_brand": "...",
  "matched_model": "...",
  "matched_version": "...",
  "year": 2022,
  "estimated_table_price": 24500000,
  "suggested_sale_price": 25800000,
  "suggested_purchase_price": 21500000,
  "estimated_margin_percentage": 16.7,
  "liquidity_rating": "ALTA",
  "commercial_rationale": "Breve explicación de la demanda del modelo y rotación."
}`
              }
            ]
          }
        ],
        config: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        }
      })

      const rawText = response.text || ''
      const parsed = JSON.parse(rawText)
      return SmartAppraisalSchema.parse(parsed)
    } catch (err) {
      console.warn('[Gemini AI Appraisal] Error en llamada a Gemini API, usando tasador algorítmico:', err)
    }
  }

  // Tasador determinista de reserva
  const basePrice = declaredPrice || 22000000
  const purchasePrice = Math.round(basePrice * 0.82)
  const marginPct = Number((((basePrice - purchasePrice) / basePrice) * 100).toFixed(1))

  return {
    matched_brand: 'Marca Evaluada',
    matched_model: query.slice(0, 30),
    matched_version: 'Versión Sugerida',
    year: new Date().getFullYear() - 2,
    estimated_table_price: basePrice,
    suggested_sale_price: Math.round(basePrice * 1.05),
    suggested_purchase_price: purchasePrice,
    estimated_margin_percentage: marginPct,
    liquidity_rating: 'ALTA',
    commercial_rationale: 'Unidad de alta rotación en el mercado de usados. Margen comercial proyectado entre 15% y 20%.'
  }
}

// ─── CRM LEAD INTELLIGENCE & NEXT BEST ACTION ─────────────────────────────────
export const LeadIntelligenceSchema = z.object({
  temperatura: z.enum(['CALIENTE', 'TIBIO', 'FRIO']).describe('Temperatura comercial del lead: CALIENTE (intención inmediata o presupuesto disponible), TIBIO (evaluando opciones o permutas), FRIO (curioso o sin respuesta)'),
  temperature_rationale: z.string().describe('Breve explicación de por qué se asignó esta temperatura'),
  ai_summary: z.string().describe('Resumen ejecutivo de la conversación: auto de interés, presupuesto, estado y objeciones'),
  next_best_action: z.string().describe('Acción comercial sugerida concreta e inmediata para el vendedor'),
  whatsapp_quick_reply: z.string().describe('Mensaje redactado listo para enviar al cliente por WhatsApp para avanzar el cierre'),
})

export type LeadIntelligence = z.infer<typeof LeadIntelligenceSchema>

/**
 * Analiza el historial conversacional y perfil de un lead para clasificar temperatura,
 * resumir la intención de compra y sugerir la siguiente mejor acción comercial.
 */
export async function generateLeadIntelligence(params: {
  lead: {
    Nombre_Cliente?: string
    Telefono?: string
    Auto_Interes?: string
    Notas?: string
    Etapa?: string
    Presupuesto?: string | number
  }
  interactions: Array<{
    Tipo_Interaccion?: string
    Remitente?: string
    Detalle_Conversacion?: string
    Fecha?: string
    created_at?: string
  }>
}): Promise<LeadIntelligence> {
  const { lead, interactions } = params

  const interactionsHistory = (interactions && interactions.length > 0)
    ? interactions.map((it, idx) => `[#${idx + 1}] (${it.Remitente || 'MENSAJE'} - ${it.Tipo_Interaccion || 'WA'}): ${it.Detalle_Conversacion || ''}`).join('\n')
    : 'No hay mensajes previos registrados aún.'

  const prompt = `Eres el Director Comercial y Copiloto de Ventas IA de una concesionaria de autos en Argentina.
Analiza el siguiente prospecto (lead) y su historial de conversaciones (WhatsApp / CRM) para calificarlo y generar la estrategia de cierre óptima.

INFORMACIÓN DEL PROSPECTO:
- Nombre: ${lead.Nombre_Cliente || 'Cliente'}
- Teléfono: ${lead.Telefono || 'No informado'}
- Vehículo de Interés: ${lead.Auto_Interes || 'No especificado'}
- Presupuesto Informado: ${lead.Presupuesto ? '$' + lead.Presupuesto : 'A definir'}
- Etapa Actual en Kanban: ${lead.Etapa || 'NUEVO'}
- Notas del Asesor: ${lead.Notas || 'Sin notas adicionales'}

HISTORIAL DE MENSAJES E INTERACCIONES:
${interactionsHistory}

REGLAS DE EVALUACIÓN:
1. Temperatura:
   - "CALIENTE": Pregunta por disponibilidad inmediata, solicita visitar la agencia/test drive, tiene seña o presupuesto listo en mano, o responde con urgencia.
   - "TIBIO": Consulta precio, formas de financiación o permuta, pero aún compara o no definió fecha de visita.
   - "FRIO": Respuestas monosilábicas, demoras en contestar, mera curiosidad sin intención firme o no responde.
2. Next Best Action:
   - Debe ser una recomendación directa, estratégica y accionable para el vendedor (ej: "Enviar video personalizado del interior del auto y proponer visita hoy a las 18hs").
3. WhatsApp Quick Reply:
   - Mensaje redactado en tono argentino, profesional pero cercano, con modismos naturales de concesionaria ("¡Hola ${lead.Nombre_Cliente?.split(' ')[0] || 'cómo estás'}!", "¿te parece si...?"), listo para enviar por WhatsApp.

Responde ÚNICAMENTE en formato JSON con la siguiente estructura exacta:
{
  "temperatura": "CALIENTE" | "TIBIO" | "FRIO",
  "temperature_rationale": "explicación concisa",
  "ai_summary": "resumen ejecutivo del caso",
  "next_best_action": "acción comercial recomendada",
  "whatsapp_quick_reply": "texto listo para enviar por WhatsApp"
}`

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        }
      })

      const rawText = response.text || ''
      const parsed = JSON.parse(rawText)
      return LeadIntelligenceSchema.parse(parsed)
    } catch (err) {
      console.warn('[Gemini AI Lead Intelligence] Error en llamada a Gemini API, usando fallback algorítmico:', err)
    }
  }

  // Fallback heurístico inteligente
  const hasHistory = interactions && interactions.length > 0
  const isHot = (lead.Auto_Interes && lead.Notas?.toLowerCase().includes('seña')) || (lead.Etapa === 'INTERESADO' || lead.Etapa === 'PROPUESTA')
  const temp = isHot ? 'CALIENTE' : (hasHistory ? 'TIBIO' : 'TIBIO')

  return {
    temperatura: temp,
    temperature_rationale: isHot 
      ? 'El cliente muestra interés activo y avance en las etapas de negociación.'
      : 'Cliente en evaluación inicial de alternativas de compra o financiación.',
    ai_summary: `Interesado en ${lead.Auto_Interes || 'vehículos del catálogo'}. ${hasHistory ? 'Conversación activa iniciada por canales digitales.' : 'Prospecto recién ingresado sin diálogo previo asentado.'}`,
    next_best_action: isHot
      ? 'Contactar prioritariamente por WhatsApp para ofrecer simulación de cuotas y coordinar visita al salón.'
      : 'Enviar ficha técnica con fotos detalladas y consultar si cuenta con vehículo para entregar en parte de pago.',
    whatsapp_quick_reply: `¡Hola ${lead.Nombre_Cliente?.split(' ')[0] || ''}! ¿Cómo estás? Te escribo de la concesionaria para comentarte que tenemos disponible la unidad ${lead.Auto_Interes || ''}. ¿Te gustaría que te comparta la ficha técnica y opciones de financiación?`
  }
}

// ─── VEHICLE PARSER FROM CONVERSATION / TELEGRAM / WHATSAPP ──────────────────
export const ParsedVehicleSchema = z.object({
  marca: z.string().describe('Marca del vehículo (ej: Toyota, Ford, Chevrolet, Volkswagen)'),
  modelo: z.string().describe('Modelo del vehículo (ej: Corolla, Hilux, Ranger, Cruze, Gol)'),
  version: z.string().optional().default('').describe('Versión o equipamiento (ej: XEI, SRX, XLT, Trendline)'),
  anio: z.number().describe('Año de fabricación (ej: 2021)'),
  km: z.number().describe('Kilómetros (ej: 45000)'),
  precio_venta: z.number().describe('Precio de venta en pesos argentinos (ej: 24000000)'),
  precio_entrega: z.number().optional().default(0).describe('Anticipo mínimo o entrega (si se menciona)'),
  tipo_combustible: z.string().default('Nafta').describe('Combustible normalizado (Nafta, Diésel, GNC, Nafta/GNC, Híbrido, Eléctrico)'),
  transmision: z.string().default('Manual').describe('Transmisión normalizada (Manual, Automática)'),
  patente: z.string().optional().default('').describe('Patente o dominio (ej: AF123CD, AA123BB, ORE123)'),
  descripcion: z.string().optional().default('').describe('Detalles adicionales, color o equipamiento mencionado'),
})

export type ParsedVehicle = z.infer<typeof ParsedVehicleSchema>

/**
 * Parsea el texto libre de un mensaje de WhatsApp o Telegram para extraer los datos
 * estructurados de un auto listo para insertar en el Stock de AutoApp.
 */
export async function parseVehicleFromConversation(text: string): Promise<ParsedVehicle | null> {
  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Eres el Asistente Automotriz de AutoApp en Argentina.
Un usuario te envió un mensaje para agregar un vehículo a su stock. Extrae la información y devuelve un objeto JSON estructurado.

REGLAS OBLIGATORIAS:
- Marca y modelo deben capitalizarse correctamente.
- Año: Si dicen "21" o "2021", debe ser número entero 2021.
- Kilómetros: Si dicen "45 mil km" o "45.000", debe ser número 45000. Si dicen "0km" o "nuevo", debe ser 0.
- Precios: En Argentina se habla de millones (ej. "24 millones" -> 24000000, "24 palos" -> 24000000, "$16.800.000" -> 16800000). Convierte todo a número entero en ARS.
- Combustible: Únicamente uno de: "Nafta", "Diésel", "GNC", "Nafta/GNC", "Híbrido", "Eléctrico".
- Transmisión: Únicamente "Manual" o "Automática".
- Patente: Formato argentino (ej. AA123BB o ABC123). Si no se menciona, deja string vacío.

Mensaje del usuario:
"${text}"

Devuelve ÚNICAMENTE el JSON con la estructura:
{
  "marca": "Toyota",
  "modelo": "Corolla",
  "version": "XEI",
  "anio": 2021,
  "km": 45000,
  "precio_venta": 24000000,
  "precio_entrega": 0,
  "tipo_combustible": "Nafta",
  "transmision": "Automática",
  "patente": "AF123CD",
  "descripcion": "Color blanco, excelente estado"
}`
              }
            ]
          }
        ],
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        }
      })

      const rawText = response.text || ''
      const parsed = JSON.parse(rawText)
      return ParsedVehicleSchema.parse(parsed)
    } catch (err) {
      console.warn('[Gemini AI Parse Vehicle] Error extrayendo auto por Gemini:', err)
    }
  }

  // Parser heurístico de contingencia si no hay Gemini disponible
  const words = text.split(/\s+/)
  const yearMatch = text.match(/\b(20\d{2}|19\d{2})\b/)
  const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear()

  // Extraer precio
  let price = 15000000
  const millonMatch = text.match(/(\d+([\.,]\d+)?)\s*(millon|millones|palos|m)/i)
  if (millonMatch) {
    price = Math.round(parseFloat(millonMatch[1].replace(',', '.')) * 1000000)
  } else {
    const rawNum = text.match(/\$?\s*(\d{1,3}(\.\d{3}){2,})/g)
    if (rawNum) price = parseInt(rawNum[0].replace(/[\$\.]/g, ''), 10)
  }

  // Extraer kms
  let kms = 50000
  const kmMatch = text.match(/(\d+([\.,]\d+)?)\s*(mil\s*km|km|kilometros)/i)
  if (kmMatch) {
    const rawKm = kmMatch[1].replace(',', '.')
    kms = parseFloat(rawKm) < 500 ? Math.round(parseFloat(rawKm) * 1000) : parseInt(rawKm.replace('.', ''), 10)
  }

  // Transmisión y Combustible
  const isAuto = /auto|secuencial|at\b/i.test(text)
  const isDiesel = /diesel|diésel/i.test(text)

  return {
    marca: words[0] || 'Vehículo',
    modelo: words[1] || 'Modelo',
    version: '',
    anio: year,
    km: kms,
    precio_venta: price,
    precio_entrega: 0,
    tipo_combustible: isDiesel ? 'Diésel' : 'Nafta',
    transmision: isAuto ? 'Automática' : 'Manual',
    patente: '',
    descripcion: text.slice(0, 150)
  }
}


