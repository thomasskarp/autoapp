import { SupabaseClient } from '@supabase/supabase-js'
import { AgencyIntegration } from '@/lib/supabase/types'

export const DEFAULT_AGENCY_ID = 'a1000000-0000-0000-0000-000000000001'

/**
 * Obtiene el agency_id asociado a un usuario autenticado
 */
export async function getUserAgencyId(supabase: SupabaseClient, userId?: string): Promise<string> {
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id
  }

  if (!userId) {
    return DEFAULT_AGENCY_ID
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('agency_id')
    .eq('id', userId)
    .single()

  return profile?.agency_id || DEFAULT_AGENCY_ID
}

let agencyIntegrationsTableMissing = false

/**
 * Consulta la integración de un proveedor para una agencia
 */
export async function getAgencyIntegration(
  supabase: SupabaseClient,
  agencyId: string,
  provider: string = 'mercadolibre'
): Promise<AgencyIntegration | null> {
  if (agencyIntegrationsTableMissing) return null

  try {
    const { data, error } = await supabase
      .from('agency_integrations')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('provider', provider)
      .maybeSingle()

    if (error) {
      if (error.message?.includes('schema cache')) {
        agencyIntegrationsTableMissing = true
      }
      console.warn(`[Integrations Service] Error fetching integration for ${provider}:`, error.message)
      return null
    }

    return data as AgencyIntegration | null
  } catch (err: any) {
    console.warn(`[Integrations Service] Exception fetching integration:`, err.message)
    return null
  }
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
    const payload = {
      agency_id: integration.agency_id,
      provider: integration.provider,
      access_token: integration.access_token,
      refresh_token: integration.refresh_token || null,
      expires_at: integration.expires_at || null,
      user_id: integration.user_id ? String(integration.user_id) : null,
      nickname: integration.nickname || null,
      metadata: integration.metadata || {},
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('agency_integrations')
      .upsert(payload, { onConflict: 'agency_id,provider' })

    if (error) {
      console.error('[Integrations Service] Error saving integration:', error.message)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error('[Integrations Service] Exception saving integration:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Obtiene un token válido de MercadoLibre para la agencia,
 * realizando auto-renovación si el token está expirado.
 */
export async function getValidMercadoLibreToken(
  supabase: SupabaseClient,
  agencyId: string
): Promise<{ accessToken: string | null; refreshed: boolean; source: 'db' | 'env' | 'none' }> {
  const integration = await getAgencyIntegration(supabase, agencyId, 'mercadolibre')

  if (integration && integration.access_token) {
    const isExpired = integration.expires_at 
      ? new Date(integration.expires_at).getTime() <= Date.now() + 60000 // Buffer de 1 minuto
      : false

    // Si no está vencido, retornar token existente
    if (!isExpired) {
      return { accessToken: integration.access_token, refreshed: false, source: 'db' }
    }

    // Si está vencido y tenemos refresh_token, renovar con MercadoLibre
    if (integration.refresh_token) {
      const clientId = process.env.MERCADOLIBRE_CLIENT_ID
      const clientSecret = process.env.MERCADOLIBRE_CLIENT_SECRET

      if (clientId && clientSecret) {
        console.log(`[Integrations] Renovando token expirado para agencia ${agencyId}...`)
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
              nickname: integration.nickname
            })

            console.log(`[Integrations] Token renovado exitosamente para agencia ${agencyId}`)
            return { accessToken: data.access_token, refreshed: true, source: 'db' }
          }
        } catch (rErr) {
          console.error('[Integrations] Falló la llamada de refresco a MercadoLibre:', rErr)
        }
      }
    }

    // Si no se pudo renovar, probar con el último token guardado como fallback
    return { accessToken: integration.access_token, refreshed: false, source: 'db' }
  }

  // Fallback a variable de entorno solo para agencia por defecto de desarrollo
  if (agencyId === DEFAULT_AGENCY_ID) {
    const envToken = process.env.MERCADOLIBRE_ACCESS_TOKEN?.trim()
    if (envToken) {
      return { accessToken: envToken, refreshed: false, source: 'env' }
    }
  }

  return { accessToken: null, refreshed: false, source: 'none' }
}

/**
 * Obtiene el Page ID y Page Access Token de Facebook para la agencia
 */
export async function getValidFacebookPageToken(
  supabase: SupabaseClient,
  agencyId: string
): Promise<{ pageId: string | null; pageToken: string | null; pageName: string | null; source: 'db' | 'env' | 'none' }> {
  // Primero buscar en base de datos en agency_integrations con provider = 'facebook_page' o 'facebook'
  const integration = (await getAgencyIntegration(supabase, agencyId, 'facebook_page')) || 
                      (await getAgencyIntegration(supabase, agencyId, 'facebook'))

  if (integration && integration.access_token) {
    const pageId = integration.metadata?.page_id || integration.user_id || process.env.FACEBOOK_PAGE_ID || null
    return {
      pageId: pageId ? String(pageId) : null,
      pageToken: integration.access_token,
      pageName: integration.nickname || integration.metadata?.page_name || 'Fan Page Concesionaria',
      source: 'db'
    }
  }

  // Fallback a variables de entorno solo para agencia por defecto de desarrollo
  if (agencyId === DEFAULT_AGENCY_ID) {
    const envPageId = process.env.FACEBOOK_PAGE_ID?.trim() || null
    const envPageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim() || null

    if (envPageId && envPageToken) {
      return {
        pageId: envPageId,
        pageToken: envPageToken,
        pageName: process.env.FACEBOOK_PAGE_NAME?.trim() || 'Fan Page Oficial',
        source: 'env'
      }
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
): Promise<{ igUserId: string | null; accessToken: string | null; username: string | null; source: 'db' | 'env' | 'none' }> {
  // 1. Buscar en agency_integrations con provider = 'instagram'
  const igIntegration = await getAgencyIntegration(supabase, agencyId, 'instagram')
  if (igIntegration && igIntegration.access_token) {
    return {
      igUserId: igIntegration.user_id || process.env.INSTAGRAM_ACCOUNT_ID || '17841474277477470',
      accessToken: igIntegration.access_token,
      username: igIntegration.nickname || process.env.INSTAGRAM_USERNAME || 'okmmotors',
      source: 'db'
    }
  }

  // 2. Buscar si la Fan Page tiene asociado el Instagram Business Account
  const fbIntegration = (await getAgencyIntegration(supabase, agencyId, 'facebook_page')) ||
                        (await getAgencyIntegration(supabase, agencyId, 'facebook'))
  if (fbIntegration && fbIntegration.access_token) {
    const igFromMeta = fbIntegration.metadata?.instagram_business_account
    if (igFromMeta?.id) {
      return {
        igUserId: igFromMeta.id,
        accessToken: fbIntegration.access_token,
        username: igFromMeta.username || 'okmmotors',
        source: 'db'
      }
    }
  }

  // 3. Fallback a variables de entorno solo para agencia por defecto de desarrollo
  if (agencyId === DEFAULT_AGENCY_ID) {
    const envIgUserId = process.env.INSTAGRAM_ACCOUNT_ID?.trim() || null
    const envAccessToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim() || null
    const envUsername = process.env.INSTAGRAM_USERNAME?.trim() || null

    if (envAccessToken) {
      return {
        igUserId: envIgUserId,
        accessToken: envAccessToken,
        username: envUsername,
        source: 'env'
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
): Promise<{ openId: string | null; accessToken: string | null; username: string | null; displayName: string | null; source: 'db' | 'env' | 'none' }> {
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

  // Fallback a variables de entorno solo para desarrollo
  if (agencyId === DEFAULT_AGENCY_ID) {
    const envOpenId = process.env.TIKTOK_OPEN_ID?.trim() || null
    const envAccessToken = process.env.TIKTOK_ACCESS_TOKEN?.trim() || null
    const envUsername = process.env.TIKTOK_USERNAME?.trim() || null

    if (envAccessToken) {
      return {
        openId: envOpenId,
        accessToken: envAccessToken,
        username: envUsername,
        displayName: process.env.TIKTOK_DISPLAY_NAME || envUsername || 'TikTok Oficial',
        source: 'env'
      }
    }
  }

  return { openId: null, accessToken: null, username: null, displayName: null, source: 'none' }
}



