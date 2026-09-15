// ─── AutoApp Agent Graph Runner ───────────────────────────────────────────────
// Coordinates node execution, state transitions, quality gates and HITL pauses

import { AutoAppState } from './state'
import { routerNode } from './nodes/router'
import { extractorNode } from './nodes/extractor'
import { valuationNode } from './nodes/valuation'
import { copyFanoutNode } from './nodes/copy-fanout'
import { qualityCheckerNode } from './nodes/checker'
import { dispatcherNode } from './nodes/dispatcher'
import { smartAppraisalMatch } from '@/lib/ai/gemini'

// In-memory persistent state for Human-in-the-Loop pending actions per user
export const pendingActionsStore = new Map<string, {
  action: 'CONFIRM_PUBLISH'
  vehicleData: any
  state: AutoAppState
  timestamp: number
}>()

export async function runAutoAppGraph(initialState: AutoAppState): Promise<AutoAppState> {
  let state: AutoAppState = { ...initialState, executionPath: [] }

  const pending = pendingActionsStore.get(state.userId)

  // 1. Router & Supervisor Node
  state = await executeTransition(state, 'router', (s) => routerNode(s, pending))

  // ─── ROUTE A: CONFIRM ACTION (HUMAN APPROVED) ──────────────────────────────
  if (state.intent === 'CONFIRM_PUBLISH') {
    const pendingVehicle = pending?.vehicleData || state.draftVehicle
    pendingActionsStore.delete(state.userId)

    state = await executeTransition(state, 'dispatcher', (s) => dispatcherNode(s, pendingVehicle))
    return state
  }

  // ─── ROUTE B: ADD VEHICLE TO STOCK ─────────────────────────────────────────
  if (state.intent === 'ADD_STOCK') {
    // Paso 1: Extracción Estructurada con Zod
    state = await executeTransition(state, 'extractor', extractorNode)

    if (!state.draftVehicle) {
      state.outputReply = '⚠️ No pude identificar la marca, modelo o año del vehículo. ¿Podrías indicarme por ejemplo: *"Toyota Hilux 2022 SRX, 45.000 km, $48 millones"*?'
      state.action = 'INFO'
      return state
    }

    // Paso 2: Matcher de Valuación con InfoAuto (< 5ms)
    state = await executeTransition(state, 'valuation', valuationNode)

    // Paso 3: Generación Concurrente de Copys (Fan-Out)
    state = await executeTransition(state, 'copy_fanout', copyFanoutNode)

    // Paso 4: Quality & Margin Checker (Verificador Independiente)
    state = await executeTransition(state, 'quality_checker', qualityCheckerNode)

    // Si no superó los controles de calidad, reportar errores al usuario
    if (!state.validation.passed) {
      const errorList = state.validation.errors.map(e => `• ${e}`).join('\n')
      state.outputReply = `⚠️ *Verificación de Integridad Incompleta:*\n${errorList}\n\nPor favor corrige estos datos para continuar.`
      state.action = 'INFO'
      return state
    }

    const v = state.draftVehicle
    if (!v) {
      state.outputReply = 'Error inesperado procesando la ficha del vehículo.'
      return state
    }

    // Registrar en memoria para el paso de confirmación humana (HITL)
    pendingActionsStore.set(state.userId, {
      action: 'CONFIRM_PUBLISH',
      vehicleData: v,
      state,
      timestamp: Date.now()
    })

    const val = state.officialValuation
    const formattedPrice = v.precio_venta ? `$${v.precio_venta.toLocaleString('es-AR')}` : 'Consultar'
    const formattedKm = v.km === 0 ? '0 km (Nuevo)' : `${v.km.toLocaleString('es-AR')} km`

    let warningsText = ''
    if (state.validation.warnings.length > 0) {
      warningsText = '\n' + state.validation.warnings.map(w => `${w}`).join('\n') + '\n'
    }

    state.outputReply = `✅ *Vehículo verificado y listo para Stock:*

🚘 *${v.marca} ${v.modelo} ${v.version || ''} (${v.anio})*
📍 *Kilómetros:* ${formattedKm}
💰 *Precio Informado:* ${formattedPrice}
📊 *Referencia InfoAuto:* $${val ? val.tablePrice.toLocaleString('es-AR') : 'N/A'} | *Margen Estimado:* ~${val ? val.marginPercent : 20}%
${v.patente ? `🏷️ *Patente:* ${v.patente}\n` : ''}${warningsText}
${state.confirmationPrompt || '¿Deseas confirmar la publicación en portales?'}`

    state.action = 'VEHICLE_CREATED'
    return state
  }

  // ─── ROUTE C: APPRAISAL / PERMUTA ──────────────────────────────────────────
  if (state.intent === 'APPRAISAL') {
    try {
      const appraisal = await smartAppraisalMatch(state.inputMessage)
      state.smartAppraisal = appraisal

      const priceTable = `$${appraisal.estimated_table_price.toLocaleString('es-AR')}`
      const pricePurchase = `$${appraisal.suggested_purchase_price.toLocaleString('es-AR')}`
      const priceSale = `$${appraisal.suggested_sale_price.toLocaleString('es-AR')}`

      state.outputReply = `📐 *Tasación de Permuta Oficial AutoApp:*

🚘 *Unidad:* ${appraisal.matched_brand} ${appraisal.matched_model} ${appraisal.matched_version} (${appraisal.year})
📚 *Valor de Tabla InfoAuto:* ${priceTable}
💰 *Toma Sugerida (Compra):* ${pricePurchase} *(Margen: ${appraisal.estimated_margin_percentage}%)*
🏷️ *Venta Sugerida en Salón:* ${priceSale}
⚡ *Liquidez de Mercado:* **${appraisal.liquidity_rating}**

📋 *Criterio Comercial:*
${appraisal.commercial_rationale}

¿Querés ingresar este vehículo al inventario ahora mismo?`
      state.action = 'APPRAISAL_OFFER'
      return state
    } catch (e) {
      console.warn('[Runner Appraisal] Fallback appraisal error:', e)
    }
  }

  // ─── ROUTE D: GENERAL FAQ & FALLBACK ────────────────────────────────────────
  state.outputReply = `¡Hola! Soy tu Copiloto Automotriz de AutoApp 🚘

Puedo asistirte en tu operación diaria:
• 🚗 *Cargar Stock:* "Ingresá un Corolla 2021 XEI con 45.000 km a 24 millones, patente AF123CD"
• 📐 *Tasar Permutas:* "Tasame una Ford Ranger 2020 XLT con 75.000 km"
• 🎯 *Copys & Redes:* "Redactame los avisos para una Tracker 2023"
• 📊 *Seguimiento de Leads:* "¿Cómo vienen los prospectos de la semana?"

Si adjuntas fotografías en el mensaje, las usaré automáticamente como portada de la ficha.`
  state.action = 'INFO'
  return state
}

async function executeTransition(
  state: AutoAppState,
  nodeName: string,
  fn: (s: AutoAppState) => Promise<Partial<AutoAppState>>
): Promise<AutoAppState> {
  const start = Date.now()
  try {
    const patch = await fn(state)
    const elapsed = Date.now() - start
    return {
      ...state,
      ...patch,
      currentNode: nodeName,
      executionPath: [...state.executionPath, `${nodeName} (${elapsed}ms)`]
    }
  } catch (err: any) {
    const elapsed = Date.now() - start
    console.error(`[Agent Graph Error at node "${nodeName}"]:`, err)
    return {
      ...state,
      currentNode: nodeName,
      executionPath: [...state.executionPath, `${nodeName} FAILED (${elapsed}ms): ${err.message}`]
    }
  }
}
