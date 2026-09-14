import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    let tokenToUse = ''
    let userIdToUse = ''
    let agencyId = ''
    let supabase: any = null

    try {
      const { createClient } = await import('@/lib/supabase/server')
      const { getUserAgencyId, getValidMercadoLibreToken, getAgencyIntegration } = await import('@/lib/services/integrations')
      supabase = await createClient()
      agencyId = await getUserAgencyId(supabase)

      const tokenRes = await getValidMercadoLibreToken(supabase, agencyId)
      tokenToUse = tokenRes.accessToken || ''

      const integration = await getAgencyIntegration(supabase, agencyId, 'mercadolibre')
      userIdToUse = integration?.user_id || process.env.MERCADOLIBRE_USER_ID || ''
    } catch (dbErr) {
      console.warn('[API Meli Sync] No se pudo leer token de base de datos, usando fallback:', dbErr)
    }

    if (!tokenToUse) {
      tokenToUse = process.env.MERCADOLIBRE_ACCESS_TOKEN || ''
    }
    if (!userIdToUse) {
      userIdToUse = process.env.MERCADOLIBRE_USER_ID || ''
    }

    if (!tokenToUse || !userIdToUse) {
      return NextResponse.json({
        success: false,
        error: 'No hay credenciales de MercadoLibre configuradas.',
        items: []
      }, { status: 400 })
    }

    // Helper to fetch user item IDs with auto-refresh if 401
    const fetchItemIds = async (token: string, userId: string) => {
      const res = await fetch(`https://api.mercadolibre.com/users/${userId}/items/search?search_type=scan`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      return { ok: res.ok, status: res.status, data }
    }

    let searchRes = await fetchItemIds(tokenToUse, userIdToUse)

    // Token refresh if 401
    if (!searchRes.ok && (searchRes.status === 401 || searchRes.data?.error === 'invalid_token')) {
      console.log('[API Meli Sync] Token expirado en sync. Renovando con refresh_token...')
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
            searchRes = await fetchItemIds(tokenToUse, userIdToUse)
          }
        }
      } catch (rErr) {
        console.error('[API Meli Sync] Error renovando token:', rErr)
      }
    }

    if (!searchRes.ok) {
      return NextResponse.json({
        success: false,
        error: searchRes.data?.message || 'Error al obtener publicaciones de MercadoLibre',
        items: []
      }, { status: searchRes.status })
    }

    const itemIds: string[] = searchRes.data.results || []
    if (itemIds.length === 0) {
      return NextResponse.json({
        success: true,
        items: [],
        total: 0
      })
    }

    // Multiget items in chunks of 20
    const itemsDetails: any[] = []
    const chunkSize = 20

    for (let i = 0; i < itemIds.length; i += chunkSize) {
      const chunk = itemIds.slice(i, i + chunkSize).join(',')
      try {
        const multiRes = await fetch(`https://api.mercadolibre.com/items?ids=${chunk}`, {
          headers: { Authorization: `Bearer ${tokenToUse}` }
        })
        const multiData = await multiRes.json()
        if (Array.isArray(multiData)) {
          for (const wrapper of multiData) {
            if (wrapper.code === 200 && wrapper.body) {
              const b = wrapper.body
              const isDeleted = (b.sub_status || []).includes('deleted')
              itemsDetails.push({
                id: b.id,
                title: b.title,
                status: isDeleted ? 'deleted' : b.status, // 'active' | 'paused' | 'closed' | 'payment_required' | 'deleted'
                raw_status: b.status,
                sub_status: b.sub_status || [],
                is_deleted: isDeleted,
                price: b.price,
                currency_id: b.currency_id,
                permalink: b.permalink || `https://auto.mercadolibre.com.ar/${b.id}`,
                thumbnail: b.thumbnail,
                pictures: (b.pictures || []).map((p: any) => p.url || p.secure_url),
                date_created: b.date_created,
                last_updated: b.last_updated,
                attributes: b.attributes || [],
                listing_type_id: b.listing_type_id
              })
            }
          }
        }
      } catch (chunkErr) {
        console.error('[API Meli Sync] Error fetching chunk details:', chunkErr)
      }
    }

    return NextResponse.json({
      success: true,
      items: itemsDetails,
      total: itemsDetails.length,
      timestamp: new Date().toISOString()
    })

  } catch (err: any) {
    console.error('[API Meli Sync Exception]:', err)
    return NextResponse.json({ success: false, error: err.message || 'Error interno' }, { status: 500 })
  }
}
