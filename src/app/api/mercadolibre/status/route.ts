import { NextResponse } from 'next/server'
import { DEFAULT_AGENCY_ID } from '@/lib/services/integrations'


export async function GET() {
  try {
    let tokenToUse = ''
    let nickname = ''
    let userId = ''
    let agencyId = ''

    try {
      const { createClient } = await import('@/lib/supabase/server')
      const { getUserAgencyId, getValidMercadoLibreToken, getAgencyIntegration, DEFAULT_AGENCY_ID } = await import('@/lib/services/integrations')
      const supabase = await createClient()
      agencyId = await getUserAgencyId(supabase)
      const tokenRes = await getValidMercadoLibreToken(supabase, agencyId)
      tokenToUse = tokenRes.accessToken || ''

      const integration = await getAgencyIntegration(supabase, agencyId, 'mercadolibre')
      if (integration) {
        nickname = integration.nickname || ''
        userId = integration.user_id || ''
      }
    } catch (e) {}

    if (!tokenToUse && (!agencyId || agencyId === DEFAULT_AGENCY_ID)) {
      tokenToUse = process.env.MERCADOLIBRE_ACCESS_TOKEN || ''
      userId = process.env.MERCADOLIBRE_USER_ID || ''
    }


    if (!tokenToUse) {
      return NextResponse.json({
        connected: false,
        message: 'No hay cuenta de MercadoLibre conectada'
      })
    }

    // Consultar usuario en vivo con el token
    try {
      const userRes = await fetch('https://api.mercadolibre.com/users/me', {
        headers: { Authorization: `Bearer ${tokenToUse}` }
      })
      if (userRes.ok) {
        const userData = await userRes.json()
        return NextResponse.json({
          connected: true,
          userId: String(userData.id),
          nickname: userData.nickname || nickname || 'Vendedor MLA',
          permalink: userData.permalink || `https://perfil.mercadolibre.com.ar/${userData.nickname}`,
          siteId: userData.site_id || 'MLA'
        })
      }
    } catch (e) {}

    // Fallback con datos guardados
    return NextResponse.json({
      connected: true,
      userId: userId || '380382133',
      nickname: nickname || 'Concesionaria Oficial MLA',
      siteId: 'MLA'
    })
  } catch (err: any) {
    return NextResponse.json({ connected: false, error: err.message }, { status: 500 })
  }
}


export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { itemId, status } = body || {}

    if (!itemId || !status) {
      return NextResponse.json({
        success: false,
        error: 'itemId y status son obligatorios.'
      }, { status: 400 })
    }

    const validStatuses = ['active', 'paused', 'closed', 'deleted']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({
        success: false,
        error: `Estado inválido: "${status}". Debe ser active, paused, closed o deleted.`
      }, { status: 400 })
    }

    let tokenToUse = ''
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const { getUserAgencyId, getValidMercadoLibreToken } = await import('@/lib/services/integrations')
      const supabase = await createClient()
      const agencyId = await getUserAgencyId(supabase)
      const tokenRes = await getValidMercadoLibreToken(supabase, agencyId)
      tokenToUse = tokenRes.accessToken || ''
    } catch (e) {}

    if (!tokenToUse) {
      tokenToUse = process.env.MERCADOLIBRE_ACCESS_TOKEN || ''
    }

    if (!tokenToUse) {
      return NextResponse.json({ success: false, error: 'Token de MercadoLibre no disponible.' }, { status: 401 })
    }

    const executeStatusChange = async (token: string, itId: string, st: string) => {
      let putBody: any = {}
      if (st === 'deleted') {
        putBody = { deleted: 'true' }
      } else {
        putBody = { status: st }
      }

      return fetch(`https://api.mercadolibre.com/items/${itId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(putBody)
      })
    }

    let res = await executeStatusChange(tokenToUse, itemId, status)
    let data = await res.json()

    // Auto-refresh token if 401
    if (!res.ok && (res.status === 401 || data.error === 'invalid_token')) {
      console.log('[API Meli Status] Token expirado al cambiar estado. Renovando...')
      try {
        const refreshToken = process.env.MERCADOLIBRE_REFRESH_TOKEN
        const clientId = process.env.MERCADOLIBRE_CLIENT_ID
        const clientSecret = process.env.MERCADOLIBRE_CLIENT_SECRET

        if (refreshToken && clientId && clientSecret) {
          const refreshRes = await fetch('https://api.mercadolibre.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: refreshToken
            })
          })
          const refreshData = await refreshRes.json()
          if (refreshRes.ok && refreshData.access_token) {
            tokenToUse = refreshData.access_token
            res = await executeStatusChange(tokenToUse, itemId, status)
            data = await res.json()
          }
        }
      } catch (rErr) {
        console.error('[API Meli Status] Error en auto-refresh:', rErr)
      }
    }

    if (!res.ok) {
      let causeDetails = ''
      if (Array.isArray(data.cause) && data.cause.length > 0) {
        causeDetails = data.cause.map((c: any) => c.message || c.code || (typeof c === 'string' ? c : JSON.stringify(c))).join(' | ')
      }
      return NextResponse.json({
        success: false,
        error: data.message || causeDetails || 'Error al actualizar estado en MercadoLibre',
        details: data
      }, { status: res.status })
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      status: data.status,
      sub_status: data.sub_status || [],
      permalink: data.permalink,
      message: `Estado actualizado exitosamente a: ${status}`
    })

  } catch (err: any) {
    console.error('[API Meli Status Exception]:', err)
    return NextResponse.json({ success: false, error: err.message || 'Error interno' }, { status: 500 })
  }
}
