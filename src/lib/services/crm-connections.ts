import { SupabaseClient } from '@supabase/supabase-js'
import { getUserAgencyId, getAgencyIntegration, saveAgencyIntegration, DEFAULT_AGENCY_ID } from '@/lib/services/integrations'

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
 * Obtiene el estado consolidado de todas las conexiones CRM
 */
export async function getCRMConnectionsOverview(supabase: SupabaseClient): Promise<CRMConnectionsOverview> {
  const agencyId = await getUserAgencyId(supabase)

  // 1. Meta (Facebook + Instagram + Comentarios)
  const metaFb = await getAgencyIntegration(supabase, agencyId, 'facebook_page')
  const metaIg = await getAgencyIntegration(supabase, agencyId, 'instagram')
  const metaGeneral = await getAgencyIntegration(supabase, agencyId, 'meta')

  const metaData = metaFb || metaGeneral || metaIg
  const isMetaConnected = Boolean(metaData?.access_token)

  const meta: MetaConnectionConfig = {
    connected: isMetaConnected,
    pageId: metaFb?.metadata?.page_id || metaData?.user_id || process.env.FACEBOOK_PAGE_ID || null,
    pageName: metaFb?.nickname || metaData?.nickname || process.env.FACEBOOK_PAGE_NAME || null,
    pageToken: metaData?.access_token ? '••••••••' + metaData.access_token.slice(-6) : (process.env.FACEBOOK_PAGE_ACCESS_TOKEN ? '••••••••' + process.env.FACEBOOK_PAGE_ACCESS_TOKEN.slice(-6) : null),
    igUserId: metaIg?.user_id || metaData?.metadata?.instagram_business_account?.id || process.env.INSTAGRAM_ACCOUNT_ID || null,
    igUsername: metaIg?.nickname || metaData?.metadata?.instagram_business_account?.username || process.env.INSTAGRAM_USERNAME || null,
    verifyToken: metaData?.metadata?.verify_token || process.env.META_WEBHOOK_VERIFY_TOKEN || 'autoapp_meta_webhook_secret',
    appId: metaData?.metadata?.app_id || process.env.FACEBOOK_APP_ID || null,
    updatedAt: metaData?.updated_at || null
  }

  // 2. MercadoLibre
  const meliData = await getAgencyIntegration(supabase, agencyId, 'mercadolibre')
  const isMeliConnected = Boolean(meliData?.access_token || process.env.MERCADOLIBRE_ACCESS_TOKEN)

  const meli: MeliConnectionConfig = {
    connected: isMeliConnected,
    clientId: meliData?.metadata?.client_id || process.env.MERCADOLIBRE_CLIENT_ID || null,
    clientSecret: meliData?.metadata?.client_secret ? '••••••••' : (process.env.MERCADOLIBRE_CLIENT_SECRET ? '••••••••' : null),
    accessToken: meliData?.access_token ? '••••••••' + meliData.access_token.slice(-6) : (process.env.MERCADOLIBRE_ACCESS_TOKEN ? '••••••••' + process.env.MERCADOLIBRE_ACCESS_TOKEN.slice(-6) : null),
    nickname: meliData?.nickname || 'Concesionaria Oficial',
    sellerId: meliData?.user_id || null,
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
    phoneNumberId: waCloud?.metadata?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || null,
    wabaId: waCloud?.metadata?.waba_id || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || null,
    accessToken: waCloud?.access_token ? '••••••••' + waCloud.access_token.slice(-6) : (process.env.WHATSAPP_CLOUD_ACCESS_TOKEN ? '••••••••' + process.env.WHATSAPP_CLOUD_ACCESS_TOKEN.slice(-6) : null),
    phoneNumber: waCloud?.nickname || waCloud?.metadata?.phone_number || process.env.WHATSAPP_PHONE_NUMBER || null,
    verifyToken: waCloud?.metadata?.verify_token || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'autoapp_whatsapp_webhook_secret',
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
 * Desconecta un proveedor
 */
export async function disconnectProvider(
  supabase: SupabaseClient,
  provider: string
) {
  const agencyId = await getUserAgencyId(supabase)
  try {
    await supabase
      .from('agency_integrations')
      .delete()
      .eq('agency_id', agencyId)
      .eq('provider', provider)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
