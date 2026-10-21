import { SupabaseClient } from '@supabase/supabase-js'
import { AgencyIntegration } from '@/lib/supabase/types'
import { getAccountContext, OKM_AGENCY_ID } from '@/lib/services/account-context'

export const DEFAULT_AGENCY_ID = OKM_AGENCY_ID

/**
 * Obtiene el agency_id asociado a un usuario autenticado
 */
export async function getUserAgencyId(supabase: SupabaseClient, userId?: string): Promise<string> {
  const ctx = await getAccountContext(supabase)
  return ctx.agencyId || DEFAULT_AGENCY_ID
}

// In-memory cache for fast lookups (30s)
const integrationsCache: Record<string, { data: Record<string, AgencyIntegration>; timestamp: number }> = {}

/**
 * Carga el mapa de integraciones de una agencia desde APP_ENVIOS y Storage
 */
async function loadIntegrationsMap(
  supabase: SupabaseClient,
  agencyId: string
): Promise<Record<string, AgencyIntegration>> {
  const now = Date.now()
  const cached = integrationsCache[agencyId]
  if (cached && (now - cached.timestamp < 30000)) {
    return cached.data
  }

  const rowId = `CONFIG_INTEGRATIONS_${agencyId}`
  try {
    const { data, error } = await supabase
      .from('APP_ENVIOS')
      .select('Observaciones')
      .eq('ID', rowId)
      .maybeSingle()

    if (!error && data?.Observaciones) {
      const parsed = JSON.parse(data.Observaciones)
      integrationsCache[agencyId] = { data: parsed, timestamp: now }
      return parsed
    }
  } catch (e) {
    console.warn(`[Integrations] Error loading from APP_ENVIOS for ${agencyId}:`, e)
  }

  // Backup desde Supabase Storage
  try {
    const { data: fileData, error: fileErr } = await supabase.storage
      .from('vehicle-images')
      .download(`integrations/${agencyId}.json`)

    if (!fileErr && fileData) {
      const text = await fileData.text()
      const parsed = JSON.parse(text)
      integrationsCache[agencyId] = { data: parsed, timestamp: now }
      return parsed
    }
  } catch (e) {}

  return {}
}

/**
 * Guarda el mapa completo de integraciones para una agencia en APP_ENVIOS y Storage
 */
async function persistIntegrationsMap(
  supabase: SupabaseClient,
  agencyId: string,
  map: Record<string, AgencyIntegration>
): Promise<boolean> {
  integrationsCache[agencyId] = { data: map, timestamp: Date.now() }
  const jsonStr = JSON.stringify(map)
  const rowId = `CONFIG_INTEGRATIONS_${agencyId}`

  let success = false
  try {
    const { error } = await supabase
      .from('APP_ENVIOS')
      .upsert({
        ID: rowId,
        Patente: 'CONFIG',
        Vehiculo: 'INTEGRATIONS',
        Cliente_Nombre: agencyId,
        Fecha_Envio: new Date().toISOString(),
        Estado_Envio: 'ACTIVO',
        Observaciones: jsonStr,
      }, { onConflict: 'ID' })

    if (!error) success = true
  } catch (e) {
    console.error(`[Integrations] Error saving to APP_ENVIOS for ${agencyId}:`, e)
  }

  // Dual backup en Storage
  try {
    const blob = new Blob([jsonStr], { type: 'application/json' })
    await supabase.storage
      .from('vehicle-images')
      .upload(`integrations/${agencyId}.json`, blob, { upsert: true })
    success = true
  } catch (e) {}

  return success
}

/**
 * Consulta la integración de un proveedor para una agencia
 */
export async function getAgencyIntegration(
  supabase: SupabaseClient,
  agencyId: string,
  provider: string = 'mercadolibre'
): Promise<AgencyIntegration | null> {
  const map = await loadIntegrationsMap(supabase, agencyId)
  return map[provider] || null
}

/**
 * Persiste o actualiza los tokens de una integración de forma segura
 */
export async function saveAgencyIntegration(
  supabase: SupabaseClient,
  integration: {
    agency_id: string
    provider: string
    access_token: string
    refresh_token?: string | null
    expires_at?: string | null
    user_id?: string | null
    nickname?: string | null
    metadata?: Record<string, any>
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const agencyId = integration.agency_id || DEFAULT_AGENCY_ID
    const map = await loadIntegrationsMap(supabase, agencyId)

    const record: AgencyIntegration = {
      id: `${agencyId}_${integration.provider}`,
      agency_id: agencyId,
      provider: integration.provider,
      access_token: integration.access_token,
      refresh_token: integration.refresh_token || null,
      expires_at: integration.expires_at || null,
      user_id: integration.user_id ? String(integration.user_id) : null,
      nickname: integration.nickname || null,
      metadata: integration.metadata || {},
      created_at: map[integration.provider]?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    map[integration.provider] = record
    const saved = await persistIntegrationsMap(supabase, agencyId, map)

    return { success: saved }
  } catch (err: any) {
    console.error('[Integrations Service] Exception saving integration:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Elimina una integración para una agencia (Desconectar)
 */
export async function deleteAgencyIntegration(
  supabase: SupabaseClient,
  agencyId: string,
  provider: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const map = await loadIntegrationsMap(supabase, agencyId)
    delete map[provider]
    if (provider === 'facebook_page') {
      delete map['facebook']
      delete map['meta']
    }
    const saved = await persistIntegrationsMap(supabase, agencyId, map)
    return { success: saved }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Obtiene un token válido de MercadoLibre para la agencia
 */
export async function getValidMercadoLibreToken(
  supabase: SupabaseClient,
  agencyId: string
): Promise<{ accessToken: string | null; refreshed: boolean; source: 'db' | 'none' }> {
  const integration = await getAgencyIntegration(supabase, agencyId, 'mercadolibre')

  if (integration && integration.access_token && integration.access_token !== 'PENDING_OAUTH') {
    const isExpired = integration.expires_at 
      ? new Date(integration.expires_at).getTime() <= Date.now() + 60000
      : false

    if (!isExpired) {
      return { accessToken: integration.access_token, refreshed: false, source: 'db' }
    }

    // Auto-refresh si tiene refresh_token
    if (integration.refresh_token) {
      const clientId = integration.metadata?.client_id || process.env.MERCADOLIBRE_CLIENT_ID
      const clientSecret = integration.metadata?.client_secret || process.env.MERCADOLIBRE_CLIENT_SECRET

      if (clientId && clientSecret) {
        try {
          const res = await fetch('https://api.mercadolibre.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: integration.refresh_token
            })
          })

          const data = await res.json()
          if (res.ok && data.access_token) {
            const expiresAt = data.expires_in
              ? new Date(Date.now() + data.expires_in * 1000).toISOString()
              : null

            await saveAgencyIntegration(supabase, {
              agency_id: agencyId,
              provider: 'mercadolibre',
              access_token: data.access_token,
              refresh_token: data.refresh_token || integration.refresh_token,
              expires_at: expiresAt,
              user_id: data.user_id ? String(data.user_id) : integration.user_id,
              nickname: integration.nickname,
              metadata: integration.metadata,
            })

            return { accessToken: data.access_token, refreshed: true, source: 'db' }
          }
        } catch (rErr) {
          console.error('[Integrations] Error refrescando token de MercadoLibre:', rErr)
        }
      }
    }

    return { accessToken: integration.access_token, refreshed: false, source: 'db' }
  }

  return { accessToken: null, refreshed: false, source: 'none' }
}

/**
 * Obtiene el Page ID y Page Access Token de Facebook para la agencia
 */
export async function getValidFacebookPageToken(
  supabase: SupabaseClient,
  agencyId: string
): Promise<{ pageId: string | null; pageToken: string | null; pageName: string | null; source: 'db' | 'none' }> {
  const integration = (await getAgencyIntegration(supabase, agencyId, 'facebook_page')) || 
                      (await getAgencyIntegration(supabase, agencyId, 'facebook')) ||
                      (await getAgencyIntegration(supabase, agencyId, 'meta'))

  if (integration && integration.access_token) {
    const pageId = integration.metadata?.page_id || integration.user_id || null
    return {
      pageId: pageId ? String(pageId) : null,
      pageToken: integration.access_token,
      pageName: integration.nickname || integration.metadata?.page_name || 'Fan Page Concesionaria',
      source: 'db'
    }
  }

  return { pageId: null, pageToken: null, pageName: null, source: 'none' }
}

/**
 * Obtiene el Instagram Account ID y Access Token para la agencia
 */
export async function getValidInstagramToken(
  supabase: SupabaseClient,
  agencyId: string
): Promise<{ igUserId: string | null; accessToken: string | null; username: string | null; source: 'db' | 'none' }> {
  const igIntegration = await getAgencyIntegration(supabase, agencyId, 'instagram')
  if (igIntegration && igIntegration.access_token) {
    return {
      igUserId: igIntegration.user_id || null,
      accessToken: igIntegration.access_token,
      username: igIntegration.nickname || null,
      source: 'db'
    }
  }

  const fbIntegration = (await getAgencyIntegration(supabase, agencyId, 'facebook_page')) ||
                        (await getAgencyIntegration(supabase, agencyId, 'facebook')) ||
                        (await getAgencyIntegration(supabase, agencyId, 'meta'))

  if (fbIntegration && fbIntegration.access_token) {
    const igFromMeta = fbIntegration.metadata?.instagram_business_account
    if (igFromMeta?.id) {
      return {
        igUserId: igFromMeta.id,
        accessToken: fbIntegration.access_token,
        username: igFromMeta.username || null,
        source: 'db'
      }
    }
  }

  return { igUserId: null, accessToken: null, username: null, source: 'none' }
}

/**
 * Obtiene el access_token y open_id de TikTok para la agencia
 */
export async function getValidTikTokToken(
  supabase: SupabaseClient,
  agencyId: string
): Promise<{ openId: string | null; accessToken: string | null; username: string | null; displayName: string | null; source: 'db' | 'none' }> {
  const integration = await getAgencyIntegration(supabase, agencyId, 'tiktok')
  if (integration && integration.access_token) {
    return {
      openId: integration.user_id || null,
      accessToken: integration.access_token,
      username: integration.nickname || integration.metadata?.username || null,
      displayName: integration.metadata?.display_name || integration.nickname || 'Cuenta TikTok',
      source: 'db'
    }
  }

  return { openId: null, accessToken: null, username: null, displayName: null, source: 'none' }
}
