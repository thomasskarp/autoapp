// ─── Node 1: Intent Router & Supervisor ───────────────────────────────────────
import { AutoAppState, AgentIntent } from '../state'

export async function routerNode(state: AutoAppState, pendingAction?: any): Promise<Partial<AutoAppState>> {
  const text = state.inputMessage.toLowerCase().trim()

  // 1. Prioridad: Chequeo de Confirmación Human-in-the-Loop pendiente
  if (pendingAction && pendingAction.action === 'CONFIRM_PUBLISH') {
    const isAffirmative = /^(si|sí|publicar|publicalo|dale|confirmar|publica|hacelo|ok|de una|afirmativo|yes)\b/i.test(text)
    if (isAffirmative) {
      return {
        intent: 'CONFIRM_PUBLISH',
        confidence: 0.99
      }
    }
  }

  // 2. Intención de Tasación o Permuta
  const isAppraisalIntent = /tasa|tasame|cotiza|cotizame|cuanto vale|toman|precio de toma|permuta|tomo este/i.test(text)
  if (isAppraisalIntent) {
    return {
      intent: 'APPRAISAL',
      confidence: 0.95
    }
  }

  // 3. Intención de Ingesta y Creación de Stock
  const isAddStockIntent =
    /agrega|ingresa|cargar|nuevo auto|entra|tomamos|ingreso|auto al stock|meter al stock/i.test(text) ||
    (/(\d{4})/.test(text) && /(km|millon|palos|precio|\$)/i.test(text))
  if (isAddStockIntent) {
    return {
      intent: 'ADD_STOCK',
      confidence: 0.92
    }
  }

  // 4. Intención de CRM / Leads
  const isLeadIntent = /lead|cliente|prospecto|interesado|whatsapp|consulta|califica/i.test(text)
  if (isLeadIntent) {
    return {
      intent: 'LEAD_CRM',
      confidence: 0.90
    }
  }

  // 5. Default: Consulta general / FAQ
  return {
    intent: 'GENERAL_FAQ',
    confidence: 0.85
  }
}
