// ─── AutoApp AI Assistant Agent ───────────────────────────────────────────────
// Powered by the modular Agent Graph architecture (AGENT_GRAPH.md)

import { createInitialState } from './graph/state'
import { runAutoAppGraph } from './graph/runner'

export interface AssistantResponse {
  reply: string
  action?: 'VEHICLE_CREATED' | 'VEHICLE_PUBLISHED' | 'APPRAISAL_OFFER' | 'INFO'
  vehicle?: any
  publicationResults?: any
  executionPath?: string[]
  validation?: any
}

/**
 * Procesa mensajes del usuario a través de la arquitectura de Grafo de Agentes
 */
export async function processAssistantMessage(params: {
  userId: string
  message: string
  photoUrls?: string[]
  agencyId?: string
}): Promise<AssistantResponse> {
  const initialState = createInitialState({
    userId: params.userId,
    message: params.message,
    photoUrls: params.photoUrls,
    agencyId: params.agencyId
  })

  const finalState = await runAutoAppGraph(initialState)

  return {
    reply: finalState.outputReply,
    action: finalState.action || 'INFO',
    vehicle: finalState.publishedVehicle || finalState.draftVehicle,
    publicationResults: finalState.publicationResults,
    executionPath: finalState.executionPath,
    validation: finalState.validation
  }
}
