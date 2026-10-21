import { NextResponse } from 'next/server'

export async function GET() {
  try {
    let tokenToUse = ''
    let nickname = ''
    let userId = ''
    let agencyId = ''

    try {
      const { createClient } = await import('@/lib/supabase/server')
      const { getUserAgencyId, getValidMercadoLibreToken, getAgencyIntegration } = await import('@/lib/services/integrations')
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

    if (userId && nickname) {
      return NextResponse.json({
        connected: true,
        userId: userId,
        nickname: nickname,
        siteId: 'MLA'
      })
    }

    return NextResponse.json({
      connected: false,
      message: 'No hay cuenta de MercadoLibre conectada'
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
      return NextResponse.json({
        success: false,
        error: 'No hay una cuenta de MercadoLibre conectada.'
      }, { status: 400 })
    }

    const res = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokenToUse}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ status })
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({
        success: false,
        error: data.message || `Error en MercadoLibre (${res.status}): ${JSON.stringify(data.cause || data)}`
      }, { status: res.status })
    }

    return NextResponse.json({
      success: true,
      item: {
        id: data.id,
        title: data.title,
        status: data.status,
        permalink: data.permalink
      }
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
