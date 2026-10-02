import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')
    const errorDescription = url.searchParams.get('error_description')

    if (error || !code) {
      console.warn('[Facebook Callback] Error recibido de Meta:', error, errorDescription)
      return NextResponse.redirect(
        new URL(`/publicaciones?facebook_error=${encodeURIComponent(errorDescription || error || 'Autorización cancelada')}`, req.url)
      )
    }

    const appId = process.env.FACEBOOK_APP_ID?.trim()
    const appSecret = process.env.FACEBOOK_APP_SECRET?.trim()
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI?.trim() || 'http://localhost:3000/api/facebook/callback'

    if (!appId || !appSecret) {
      return NextResponse.redirect(
        new URL('/publicaciones?facebook_error=Credenciales_de_Facebook_incompletas_en_servidor', req.url)
      )
    }

    // 1. Intercambiar code por User Access Token de corta duración
    const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
    tokenUrl.searchParams.set('client_id', appId)
    tokenUrl.searchParams.set('client_secret', appSecret)
    tokenUrl.searchParams.set('redirect_uri', redirectUri)
    tokenUrl.searchParams.set('code', code)

    const tokenRes = await fetch(tokenUrl.toString())
    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[Facebook Callback] Error al intercambiar code:', tokenData)
      return NextResponse.redirect(
        new URL(`/publicaciones?facebook_error=${encodeURIComponent(tokenData.error?.message || 'Error al obtener token de usuario')}`, req.url)
      )
    }

    const shortLivedUserToken = tokenData.access_token

    // 2. Extender a User Token de Larga Duración (60 días)
    const exchangeUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
    exchangeUrl.searchParams.set('grant_type', 'fb_exchange_token')
    exchangeUrl.searchParams.set('client_id', appId)
    exchangeUrl.searchParams.set('client_secret', appSecret)
    exchangeUrl.searchParams.set('fb_exchange_token', shortLivedUserToken)

    const exchangeRes = await fetch(exchangeUrl.toString())
    const exchangeData = await exchangeRes.json()
    const longLivedUserToken = exchangeData.access_token || shortLivedUserToken

    // 3. Consultar las Fan Pages que administra el usuario
    const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${longLivedUserToken}`)
    const pagesData = await pagesRes.json()

    if (!pagesRes.ok || !Array.isArray(pagesData.data) || pagesData.data.length === 0) {
      return NextResponse.redirect(
        new URL('/publicaciones?facebook_error=No_se_encontraron_Fan_Pages_administradas_en_esta_cuenta_de_Facebook', req.url)
      )
    }

    // Seleccionar la Fan Page principal
    const selectedPage = pagesData.data[0]
    const pageId = selectedPage.id
    const pageName = selectedPage.name
    // El page access token obtenido de un long-lived user token es permanente (no expira)
    const pageAccessToken = selectedPage.access_token

    console.log(`[Facebook Callback] Fan Page detectada con éxito: ${pageName} (ID: ${pageId})`)

    // 4. Consultar si tiene cuenta de Instagram Business vinculada
    let igAccount: { id: string; username?: string; name?: string } | null = null
    try {
      const igRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}?fields=instagram_business_account{id,username,name}&access_token=${pageAccessToken}`)
      const igData = await igRes.json()
      if (igData.instagram_business_account?.id) {
        igAccount = igData.instagram_business_account
        console.log(`[Facebook Callback] Cuenta de Instagram vinculada detectada: @${igAccount?.username} (ID: ${igAccount?.id})`)
      }
    } catch (igErr) {
      console.warn('[Facebook Callback] No se pudo consultar cuenta de Instagram vinculada:', igErr)
    }

    // 5. Guardar en Supabase agency_integrations
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const { getUserAgencyId, saveAgencyIntegration } = await import('@/lib/services/integrations')
      const supabase = await createClient()
      const agencyId = await getUserAgencyId(supabase)

      // Guardar Facebook Fan Page
      await saveAgencyIntegration(supabase, {
        agency_id: agencyId,
        provider: 'facebook_page',
        access_token: pageAccessToken,
        user_id: pageId,
        nickname: pageName,
        metadata: {
          page_id: pageId,
          page_name: pageName,
          category: selectedPage.category,
          instagram_business_account: igAccount,
          all_pages: pagesData.data.map((p: any) => ({ id: p.id, name: p.name, category: p.category }))
        }
      })

      // Si tiene Instagram, guardar también como integración 'instagram'
      if (igAccount?.id) {
        await saveAgencyIntegration(supabase, {
          agency_id: agencyId,
          provider: 'instagram',
          access_token: pageAccessToken,
          user_id: igAccount.id,
          nickname: igAccount.username || 'okmmotors',
          metadata: {
            instagram_account_id: igAccount.id,
            username: igAccount.username,
            page_id: pageId
          }
        })
      }
    } catch (dbErr) {
      console.warn('[Facebook Callback] No se pudo persistir en Supabase, usando en memoria:', dbErr)
    }

    // 6. Guardar en variables en memoria y actualizar .env.local de forma persistente
    process.env.FACEBOOK_PAGE_ID = pageId
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN = pageAccessToken
    process.env.FACEBOOK_PAGE_NAME = pageName

    if (igAccount?.id) {
      process.env.INSTAGRAM_ACCOUNT_ID = igAccount.id
      process.env.INSTAGRAM_USERNAME = igAccount.username || 'okmmotors'
      process.env.INSTAGRAM_ACCESS_TOKEN = pageAccessToken
    }

    try {
      const fs = await import('fs')
      const path = await import('path')
      const envPath = path.join(process.cwd(), '.env.local')
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8')
        envContent = envContent.replace(/FACEBOOK_PAGE_ACCESS_TOKEN=.*/, `FACEBOOK_PAGE_ACCESS_TOKEN=${pageAccessToken}`)
        envContent = envContent.replace(/FACEBOOK_PAGE_ID=.*/, `FACEBOOK_PAGE_ID=${pageId}`)
        envContent = envContent.replace(/FACEBOOK_PAGE_NAME=.*/, `FACEBOOK_PAGE_NAME="${pageName}"`)
        if (igAccount?.id) {
          envContent = envContent.replace(/INSTAGRAM_ACCOUNT_ID=.*/, `INSTAGRAM_ACCOUNT_ID=${igAccount.id}`)
          if (igAccount.username) {
            envContent = envContent.replace(/INSTAGRAM_USERNAME=.*/, `INSTAGRAM_USERNAME=${igAccount.username}`)
          }
          envContent = envContent.replace(/INSTAGRAM_ACCESS_TOKEN=.*/, `INSTAGRAM_ACCESS_TOKEN=${pageAccessToken}`)
        }
        fs.writeFileSync(envPath, envContent, 'utf8')
        console.log('[Facebook Callback] Archivo .env.local actualizado con tokens permanentes!')
      }
    } catch (fsErr) {
      console.warn('[Facebook Callback] No se pudo escribir en .env.local:', fsErr)
    }

    // Redirigir a la vista de publicaciones con confirmación
    const response = NextResponse.redirect(
      new URL(`/publicaciones?facebook_connected=true&page_name=${encodeURIComponent(pageName)}&page_id=${pageId}${igAccount?.username ? `&instagram_connected=true&ig_username=${encodeURIComponent(igAccount.username)}` : ''}`, req.url)
    )

    // Guardar cookie para lectura inmediata en cliente
    response.cookies.set('autoapp_fb_page_name', pageName, { path: '/', maxAge: 60 * 60 * 24 * 30 })
    response.cookies.set('autoapp_fb_page_id', pageId, { path: '/', maxAge: 60 * 60 * 24 * 30 })
    if (igAccount?.username) {
      response.cookies.set('autoapp_ig_username', igAccount.username, { path: '/', maxAge: 60 * 60 * 24 * 30 })
    }

    return response
  } catch (err: any) {
    console.error('[Facebook Callback Exception]:', err)
    return NextResponse.redirect(
      new URL(`/publicaciones?facebook_error=${encodeURIComponent(err.message || 'Error inesperado en callback de Facebook')}`, req.url)
    )
  }
}
