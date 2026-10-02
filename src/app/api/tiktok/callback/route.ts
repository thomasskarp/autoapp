import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')
    const errorDescription = url.searchParams.get('error_description')

    if (error || !code) {
      console.warn('[TikTok Callback] Error recibido de TikTok:', error, errorDescription)
      return NextResponse.redirect(
        new URL(`/publicaciones?tiktok_error=${encodeURIComponent(errorDescription || error || 'Autorización de TikTok cancelada')}`, req.url)
      )
    }

    const clientKey = process.env.TIKTOK_CLIENT_KEY?.trim()
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET?.trim()
    const host = req.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const appOrigin = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`
    const redirectUri = process.env.TIKTOK_REDIRECT_URI?.trim() || `${appOrigin}/api/tiktok/callback`

    if (!clientKey || !clientSecret) {
      return NextResponse.redirect(
        new URL('/publicaciones?tiktok_error=Credenciales_de_TikTok_Developers_no_configuradas', req.url)
      )
    }

    // Intercambiar code por Access Token oficial de TikTok
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache'
      },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || !tokenData.data?.access_token) {
      console.error('[TikTok Callback] Error al intercambiar code:', tokenData)
      return NextResponse.redirect(
        new URL(`/publicaciones?tiktok_error=${encodeURIComponent(tokenData.message || tokenData.error?.message || 'Error al obtener token de TikTok')}`, req.url)
      )
    }

    const {
      access_token,
      expires_in,
      refresh_token,
      refresh_expires_in,
      open_id,
      scope
    } = tokenData.data

    // Obtener información del usuario conectado
    let username = 'tiktok_user'
    let displayName = 'TikTok Oficial'
    let avatarUrl = ''

    try {
      const userRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username', {
        headers: { Authorization: `Bearer ${access_token}` }
      })
      const userData = await userRes.json()
      if (userRes.ok && userData.data?.user) {
        username = userData.data.user.username || username
        displayName = userData.data.user.display_name || displayName
        avatarUrl = userData.data.user.avatar_url || ''
      }
    } catch (uErr) {
      console.warn('[TikTok Callback] No se pudo obtener perfil de usuario:', uErr)
    }

    // Guardar en Supabase agency_integrations
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const { getUserAgencyId, saveAgencyIntegration } = await import('@/lib/services/integrations')
      const supabase = await createClient()
      const agencyId = await getUserAgencyId(supabase)

      const expiresAt = expires_in
        ? new Date(Date.now() + expires_in * 1000).toISOString()
        : null

      await saveAgencyIntegration(supabase, {
        agency_id: agencyId,
        provider: 'tiktok',
        access_token,
        refresh_token: refresh_token || null,
        expires_at: expiresAt,
        user_id: open_id,
        nickname: username,
        metadata: {
          open_id,
          username,
          display_name: displayName,
          avatar_url: avatarUrl,
          scope
        }
      })
    } catch (dbErr) {
      console.warn('[TikTok Callback] Error guardando en Supabase:', dbErr)
    }

    process.env.TIKTOK_ACCESS_TOKEN = access_token
    process.env.TIKTOK_OPEN_ID = open_id
    process.env.TIKTOK_USERNAME = username
    process.env.TIKTOK_DISPLAY_NAME = displayName

    return NextResponse.redirect(
      new URL(`/publicaciones?tiktok_connected=true&username=${encodeURIComponent(username)}`, req.url)
    )
  } catch (err: any) {
    return NextResponse.redirect(
      new URL(`/publicaciones?tiktok_error=${encodeURIComponent(err.message)}`, req.url)
    )
  }
}
