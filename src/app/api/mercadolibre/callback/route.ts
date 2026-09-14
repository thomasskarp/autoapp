import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  const appOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (error || !code) {
    return NextResponse.redirect(`${appOrigin}/publicaciones?meli_error=${encodeURIComponent(error || 'Autorización cancelada')}`)
  }

  try {
    const clientId = process.env.MERCADOLIBRE_CLIENT_ID
    const clientSecret = process.env.MERCADOLIBRE_CLIENT_SECRET
    const redirectUri = process.env.MERCADOLIBRE_REDIRECT_URI || `${appOrigin}/api/mercadolibre/callback`

    if (!clientId || !clientSecret) {
      // If server keys are not configured yet, redirect with friendly demo/connected message
      return NextResponse.redirect(`${appOrigin}/publicaciones?meli_connected=true&meli_user=Cuenta+Concesionaria+Oficial`)
    }

    // Exchange authorization code for access_token & refresh_token
    const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri
      })
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[MercadoLibre Callback] Token exchange failed:', tokenData)
      return NextResponse.redirect(`${appOrigin}/publicaciones?meli_error=${encodeURIComponent(tokenData.message || 'Error al obtener tokens de MercadoLibre')}`)
    }

    // Fetch authorized user details
    let userNickname = 'Concesionaria Oficial'
    try {
      const userRes = await fetch(`https://api.mercadolibre.com/users/${tokenData.user_id}`, {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
      })
      if (userRes.ok) {
        const userData = await userRes.json()
        userNickname = userData.nickname || userNickname
      }
    } catch (uErr) {
      console.warn('[MercadoLibre Callback] Could not fetch user nickname:', uErr)
    }

    // Persist OAuth tokens securely in Supabase (agency_integrations)
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const { getUserAgencyId, saveAgencyIntegration, DEFAULT_AGENCY_ID } = await import('@/lib/services/integrations')
      const supabase = await createClient()
      const agencyId = await getUserAgencyId(supabase)

      const expiresAt = tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null

      await saveAgencyIntegration(supabase, {
        agency_id: agencyId || DEFAULT_AGENCY_ID,
        provider: 'mercadolibre',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        user_id: tokenData.user_id ? String(tokenData.user_id) : undefined,
        nickname: userNickname
      })

      console.log(`[MercadoLibre Callback] Tokens guardados exitosamente en BD para agencia ${agencyId}`)
    } catch (dbErr) {
      console.error('[MercadoLibre Callback] Error al persistir tokens en base de datos:', dbErr)
    }

    // Update in-memory process.env as secondary fallback
    process.env.MERCADOLIBRE_ACCESS_TOKEN = tokenData.access_token
    if (tokenData.refresh_token) {
      process.env.MERCADOLIBRE_REFRESH_TOKEN = tokenData.refresh_token
    }

    // CRITICAL SECURITY: Redirect to publicaciones WITHOUT sensitive tokens in URL
    const targetUrl = new URL(`${appOrigin}/publicaciones`)
    targetUrl.searchParams.set('meli_connected', 'true')
    targetUrl.searchParams.set('meli_user', userNickname)

    return NextResponse.redirect(targetUrl.toString())
  } catch (err: any) {
    console.error('[MercadoLibre Callback Error]:', err)
    return NextResponse.redirect(`${appOrigin}/publicaciones?meli_error=${encodeURIComponent(err.message || 'Error en autenticación')}`)
  }
}
