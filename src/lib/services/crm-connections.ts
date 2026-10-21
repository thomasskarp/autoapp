import { SupabaseClient } from '@supabase/supabase-js'
import {
  getUserAgencyId,
  getAgencyIntegration,
  saveAgencyIntegration,
  deleteAgencyIntegration
} from '@/lib/services/integrations'

export interface MetaConnectionConfig {
  connected: boolean
  pageId?: string | null
  pageName?: string | null
  pageToken?: string | null
  igUserId?: string | null
  igUsername?: string | null
  verifyToken?: string | null
  appId?: string | null
  appSecret?: string | null
  updatedAt?: string | null
}

export interface MeliConnectionConfig {
  connected: boolean
  clientId?: string | null
  clientSecret?: string | null
  accessToken?: string | null
  nickname?: string | null
  sellerId?: string | null
  expiresAt?: string | null
  updatedAt?: string | null
}

export interface WhatsAppConnectionConfig {
  connected: boolean
  mode: 'cloud_api' | 'web_session'
  phoneNumberId?: string | null
  wabaId?: string | null
  accessToken?: string | null
  phoneNumber?: string | null
  verifyToken?: string | null
  webConnected?: boolean
  webPhoneNumber?: string | null
  updatedAt?: string | null
}

export interface CRMConnectionsOverview {
  meta: MetaConnectionConfig
  mercadolibre: MeliConnectionConfig
  whatsapp: WhatsAppConnectionConfig
}

/**
 * Obtiene el estado consolidado de todas las conexiones CRM para la agencia del usuario autenticado.
 * Cada usuario/agencia inicia 100% limpia sin cuentas pre-conectadas.
 */
export async function getCRMConnectionsOverview(supabase: SupabaseClient): Promise<CRMConnectionsOverview> {
  const agencyId = await getUserAgencyId(supabase)

  // 1. Meta (Facebook + Instagram + Comentarios)
  const metaFb = await getAgencyIntegration(supabase, agencyId, 'facebook_page')
  const metaIg = await getAgencyIntegration(supabase, agencyId, 'instagram')
  const metaGeneral = await getAgencyIntegration(supabase, agencyId, 'meta')

  const metaData = metaFb || metaGeneral || metaIg
  const isMetaConnected = Boolean(metaData?.access_token && (metaFb?.metadata?.page_id || metaData?.user_id))

  const meta: MetaConnectionConfig = {
    connected: isMetaConnected,
    pageId: isMetaConnected ? (metaFb?.metadata?.page_id || metaData?.user_id || null) : '',
    pageName: isMetaConnected ? (metaFb?.nickname || metaData?.nickname || 'Fan Page Oficial') : '',
    pageToken: isMetaConnected && metaData?.access_token ? '••••••••' + metaData.access_token.slice(-6) : '',
    igUserId: isMetaConnected ? (metaIg?.user_id || metaData?.metadata?.instagram_business_account?.id || null) : '',
    igUsername: isMetaConnected ? (metaIg?.nickname || metaData?.metadata?.instagram_business_account?.username || null) : '',
    verifyToken: metaData?.metadata?.verify_token || 'autoapp_meta_webhook_secret',
    appId: isMetaConnected ? (metaData?.metadata?.app_id || null) : '',
    updatedAt: metaData?.updated_at || null
  }

  // 2. MercadoLibre
  const meliData = await getAgencyIntegration(supabase, agencyId, 'mercadolibre')
  const isMeliConnected = Boolean(meliData?.access_token && meliData.access_token !== 'PENDING_OAUTH')

  const meli: MeliConnectionConfig = {
    connected: isMeliConnected,
    clientId: isMeliConnected ? (meliData?.metadata?.client_id || null) : '',
    clientSecret: isMeliConnected && meliData?.metadata?.client_secret ? '••••••••' : '',
    accessToken: isMeliConnected && meliData?.access_token ? '••••••••' + meliData.access_token.slice(-6) : '',
    nickname: isMeliConnected ? (meliData?.nickname || 'Cuenta MercadoLibre') : '',
    sellerId: isMeliConnected ? (meliData?.user_id || null) : '',
    expiresAt: meliData?.expires_at || null,
    updatedAt: meliData?.updated_at || null
  }

  // 3. WhatsApp
  const waCloud = await getAgencyIntegration(supabase, agencyId, 'whatsapp_cloud')
  const waWeb = await getAgencyIntegration(supabase, agencyId, 'whatsapp_web')

  const isWaCloudConnected = Boolean(waCloud?.access_token && waCloud?.metadata?.phone_number_id)
  const isWaWebConnected = Boolean(waWeb?.metadata?.connected)

  const whatsapp: WhatsAppConnectionConfig = {
    connected: isWaCloudConnected || isWaWebConnected,
    mode: waCloud?.metadata?.preferred_mode || (isWaWebConnected ? 'web_session' : 'cloud_api'),
    phoneNumberId: isWaCloudConnected ? (waCloud?.metadata?.phone_number_id || null) : '',
    wabaId: isWaCloudConnected ? (waCloud?.metadata?.waba_id || null) : '',
    accessToken: isWaCloudConnected && waCloud?.access_token ? '••••••••' + waCloud.access_token.slice(-6) : '',
    phoneNumber: isWaCloudConnected ? (waCloud?.nickname || waCloud?.metadata?.phone_number || null) : '',
    verifyToken: waCloud?.metadata?.verify_token || 'autoapp_whatsapp_webhook_secret',
    webConnected: isWaWebConnected,
    webPhoneNumber: waWeb?.nickname || null,
    updatedAt: waCloud?.updated_at || waWeb?.updated_at || null
  }

  return { meta, mercadolibre: meli, whatsapp }
}

/**
 * Guarda credenciales de Meta (Facebook, Instagram y Comentarios)
 */
export async function saveMetaConnection(
  supabase: SupabaseClient,
  credentials: {
    pageId: string
    pageToken: string
    pageName?: string
    igUserId?: string
    igUsername?: string
    appId?: string
    appSecret?: string
    verifyToken?: string
  }
) {
  const agencyId = await getUserAgencyId(supabase)

  return await saveAgencyIntegration(supabase, {
    agency_id: agencyId,
    provider: 'facebook_page',
    access_token: credentials.pageToken,
    user_id: credentials.pageId,
    nickname: credentials.pageName || 'Fan Page Oficial',
    metadata: {
      page_id: credentials.pageId,
      page_name: credentials.pageName || 'Fan Page Oficial',
      app_id: credentials.appId,
      app_secret: credentials.appSecret,
      verify_token: credentials.verifyToken || 'autoapp_meta_webhook_secret',
      instagram_business_account: {
        id: credentials.igUserId || null,
        username: credentials.igUsername || null,
      }
    }
  })
}

/**
 * Guarda credenciales de MercadoLibre
 */
export async function saveMeliConnection(
  supabase: SupabaseClient,
  credentials: {
    clientId: string
    clientSecret: string
    accessToken?: string
    nickname?: string
  }
) {
  const agencyId = await getUserAgencyId(supabase)

  return await saveAgencyIntegration(supabase, {
    agency_id: agencyId,
    provider: 'mercadolibre',
    access_token: credentials.accessToken || 'PENDING_OAUTH',
    nickname: credentials.nickname || 'Cuenta MercadoLibre',
    metadata: {
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    }
  })
}

/**
 * Guarda credenciales de WhatsApp Cloud API Oficial
 */
export async function saveWhatsAppCloudConnection(
  supabase: SupabaseClient,
  credentials: {
    phoneNumberId: string
    wabaId: string
    accessToken: string
    phoneNumber?: string
    verifyToken?: string
  }
) {
  const agencyId = await getUserAgencyId(supabase)

  return await saveAgencyIntegration(supabase, {
    agency_id: agencyId,
    provider: 'whatsapp_cloud',
    access_token: credentials.accessToken,
    nickname: credentials.phoneNumber || 'Número WhatsApp Oficial',
    metadata: {
      phone_number_id: credentials.phoneNumberId,
      waba_id: credentials.wabaId,
      phone_number: credentials.phoneNumber || '',
      verify_token: credentials.verifyToken || 'autoapp_whatsapp_webhook_secret',
      preferred_mode: 'cloud_api'
    }
  })
}

/**
 * Desconecta un proveedor para la agencia del usuario
 */
export async function disconnectProvider(
  supabase: SupabaseClient,
  provider: string
) {
  const agencyId = await getUserAgencyId(supabase)
  return await deleteAgencyIntegration(supabase, agencyId, provider)
}
