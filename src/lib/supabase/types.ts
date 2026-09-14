// ─── DB_STOCK ─────────────────────────────────────────────────────────────────
export interface Vehicle {
  ID: string
  Patente: string
  Marca: string
  Modelo: string
  Version?: string
  Año?: number
  Km?: number
  Descripcion?: string
  Precio_Venta?: number
  Precio_entrega?: number
  Precio_Compra?: number
  Precio_Info?: number
  Estado?: 'DISPONIBLE' | 'RESERVADO' | 'VENDIDO' | 'SEÑADO'
  Tipo_Combustible?: string
  Transmision?: string
  Tipo_Carroceria?: string
  Estado_Vehiculo?: string
  Tipo_Vehiculo?: string
  Link_Carpeta?: string
  FOTO_PORTADA?: string
  FOTOS_EXTRA?: string
  createdAt?: string
  agency_id?: string
  is_okm_table?: boolean
}

// ─── DB_LEADS ─────────────────────────────────────────────────────────────────
export type LeadStage =
  | 'NUEVO'
  | 'CONTACTADO'
  | 'INTERESADO'
  | 'PROPUESTA'
  | 'CERRADO'
  | 'PERDIDO'

export type LeadTemperature = 'CALIENTE' | 'TIBIO' | 'FRIO'

export interface Lead {
  ID: string
  Nombre_Cliente: string
  Telefono?: string
  Email?: string
  Auto_Interes?: string
  Presupuesto?: number | string
  Notas?: string
  Etapa?: LeadStage
  Moneda?: string
  Vendedor?: string
  Vendedor_Asignado?: string
  Proximo_Recordatorio?: string
  Temperatura?: LeadTemperature
  Next_Best_Action?: string
  AI_Summary?: string
  created_at?: string
  updated_at?: string
  agency_id?: string
}

// ─── DB_INTERACCIONES ─────────────────────────────────────────────────────────
export type InteraccionSender = 'CLIENTE' | 'BOT' | 'ASESOR'

export interface Interaccion {
  ID: string
  ID_LEAD?: string
  Patente?: string
  Tipo_Interaccion?: 'WHATSAPP' | 'ML_CHAT' | 'FACEBOOK' | 'LLAMADA' | 'MANUAL' | string
  Remitente?: InteraccionSender
  Fecha?: string
  Vendedor?: string
  Detalle_Conversacion?: string
  created_at?: string
  agency_id?: string
}

// ─── AGENCIES ─────────────────────────────────────────────────────────────────
export interface Agency {
  id: string
  name: string
  slug: string
  logo_url?: string
  created_at?: string
}

// ─── USER_PROFILES ────────────────────────────────────────────────────────────
export type UserRole = 'owner' | 'seller' | 'admin' | 'superadmin'

export interface UserProfile {
  id: string
  agency_id?: string
  full_name?: string
  role?: UserRole
  avatar_url?: string
  created_at?: string
}

// ─── AGENCY_VISIBILITY ────────────────────────────────────────────────────────
export interface AgencyVisibility {
  id: string
  from_agency_id: string
  to_agency_id: string
  granted_by?: string
  created_at?: string
  from_agency?: Agency
  to_agency?: Agency
}

// ─── AGENCY_INTEGRATIONS ──────────────────────────────────────────────────────
export interface AgencyIntegration {
  id: string
  agency_id: string
  provider: 'mercadolibre' | 'whatsapp' | 'facebook' | 'instagram' | string
  access_token: string
  refresh_token?: string | null
  token_type?: string
  expires_at?: string | null
  user_id?: string | null
  nickname?: string | null
  scope?: string | null
  metadata?: Record<string, any>
  created_at?: string
  updated_at?: string
}
