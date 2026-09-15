// ─── AutoApp Agent Graph State Definition ─────────────────────────────────────
// Blackboard state shared across all nodes in the multi-agent graph execution

import { MultichannelCopy, ParsedVehicle, SmartAppraisal } from '@/lib/ai/gemini'
import { Vehicle } from '@/lib/supabase/types'

export type AgentIntent =
  | 'ADD_STOCK'
  | 'APPRAISAL'
  | 'LEAD_CRM'
  | 'CONFIRM_PUBLISH'
  | 'GENERAL_FAQ'

export interface QualityValidation {
  passed: boolean
  errors: string[]
  warnings: string[]
  checkerName: string
  timestamp: number
}

export interface OfficialValuationResult {
  tablePrice: number
  suggestedPurchasePrice: number
  suggestedSalePrice: number
  marginPercent: number
  liquidity: 'ALTA' | 'MEDIA' | 'BAJA'
  matchedModel: string
  matchedVersion: string
  source: 'POSTGRES_PG_TRGM' | 'IN_MEMORY_MAP' | 'AI_HEURISTIC'
}

export interface AutoAppState {
  // 1. Session & Tracking
  sessionId: string
  userId: string
  agencyId: string
  channel: 'WEB_CHAT' | 'WHATSAPP' | 'TELEGRAM'

  // 2. Raw Input & Context
  inputMessage: string
  photoUrls: string[]

  // 3. Routing & Navigation
  intent?: AgentIntent
  confidence?: number
  currentNode: string
  executionPath: string[] // e.g. ['router (12ms)', 'extractor (210ms)', 'valuation (4ms)']

  // 4. Domain Artifacts
  draftVehicle?: ParsedVehicle & {
    ID?: string
    FOTO_PORTADA?: string
    FOTOS_EXTRA?: string
  }
  officialValuation?: OfficialValuationResult
  generatedCopies?: MultichannelCopy
  smartAppraisal?: SmartAppraisal

  // 5. Independent Verification Gate
  validation: QualityValidation

  // 6. Human-in-the-Loop (HITL)
  requiresConfirmation: boolean
  confirmationPrompt?: string
  confirmationPayload?: any

  // 7. Terminal Action Results
  publishedVehicle?: Partial<Vehicle>
  publicationResults?: {
    mercadolibre?: any
    marketplaceUrl?: string
    whatsappUrl?: string
  }
  
  // 8. Output to User
  outputReply: string
  action?: 'VEHICLE_CREATED' | 'VEHICLE_PUBLISHED' | 'APPRAISAL_OFFER' | 'INFO'
}

export function createInitialState(params: {
  userId: string
  message: string
  photoUrls?: string[]
  agencyId?: string
  channel?: 'WEB_CHAT' | 'WHATSAPP' | 'TELEGRAM'
}): AutoAppState {
  return {
    sessionId: crypto.randomUUID(),
    userId: params.userId || 'default_user',
    agencyId: params.agencyId || 'a1000000-0000-0000-0000-000000000001',
    channel: params.channel || 'WEB_CHAT',
    inputMessage: params.message.trim(),
    photoUrls: params.photoUrls || [],
    currentNode: 'entrypoint',
    executionPath: [],
    validation: {
      passed: true,
      errors: [],
      warnings: [],
      checkerName: 'init',
      timestamp: Date.now()
    },
    requiresConfirmation: false,
    outputReply: ''
  }
}
