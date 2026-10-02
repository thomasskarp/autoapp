import { NextResponse } from 'next/server'
import { sendTelegramNotification } from '@/lib/services/telegram-notifier'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { videoUrl, description, caption, vehicleTitle = 'Vehículo', vehicleId } = body || {}

    if (!videoUrl) {
      return NextResponse.json({ success: false, error: 'videoUrl es requerido' }, { status: 400 })
    }

    let pageId = ''
    let pageToken = ''
    let pageName = ''

    try {
      const { createClient } = await import('@/lib/supabase/server')
      const { getUserAgencyId, getValidFacebookPageToken } = await import('@/lib/services/integrations')
      const supabase = await createClient()
      const agencyId = await getUserAgencyId(supabase)
      const tokenRes = await getValidFacebookPageToken(supabase, agencyId)

      pageId = tokenRes.pageId || ''
      pageToken = tokenRes.pageToken || ''
      pageName = tokenRes.pageName || ''
    } catch (e) {
      console.warn('[Facebook Reels] Fallback a variables de entorno:', e)
    }

    if (!pageId) pageId = process.env.FACEBOOK_PAGE_ID || ''
    if (!pageToken) pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || ''
    if (!pageName) pageName = process.env.FACEBOOK_PAGE_NAME || 'Fan Page Oficial'

    if (!pageId || !pageToken) {
      return NextResponse.json({ success: false, error: 'Credenciales de Facebook Fan Page no configuradas' }, { status: 400 })
    }

    const postDescription = description || caption || `🔥 ${vehicleTitle} ¡Disponible en nuestra concesionaria! Consultanos por WhatsApp o mensaje directo.`

    // Publicar video en la Fan Page de Facebook (Meta Graph API /videos)
    const fbVideoUrl = `https://graph.facebook.com/v21.0/${pageId}/videos`
    const fbParams = new URLSearchParams()
    fbParams.append('file_url', videoUrl)
    fbParams.append('description', postDescription)
    fbParams.append('title', vehicleTitle)
    fbParams.append('published', 'true')
    fbParams.append('access_token', pageToken)

    const fbRes = await fetch(fbVideoUrl, {
      method: 'POST',
      body: fbParams
    })
    const fbData = await fbRes.json()

    if (!fbRes.ok || fbData.error) {
      console.error('[Facebook Reels Error]:', fbData)
      return NextResponse.json({
        success: false,
        error: fbData.error?.message || 'Error al publicar Reel/Video en Facebook'
      }, { status: 400 })
    }

    const videoId = fbData.id
    let permalink = pageId ? `https://www.facebook.com/${pageId}/videos` : `https://www.facebook.com/${videoId}`

    try {
      const vRes = await fetch(`https://graph.facebook.com/v21.0/${videoId}?fields=permalink_url,status&access_token=${pageToken}`)
      const vData = await vRes.json()
      if (vData.permalink_url) {
        permalink = vData.permalink_url.startsWith('http')
          ? vData.permalink_url
          : `https://www.facebook.com${vData.permalink_url}`
      }
    } catch (vErr) {
      console.warn('[Facebook Reels] Error fetching permalink_url:', vErr)
    }

    // Notificar a Telegram
    try {
      await sendTelegramNotification({
        title: '🎬 ¡Nuevo Reel / Video Publicado en Facebook!',
        source: 'facebook',
        userName: pageName,
        vehicleInfo: vehicleTitle,
        messageText: postDescription.split('\n')[0] || 'Video Catálogo Publicado',
        permalink
      })
    } catch (e) {}

    // Registrar en Supabase DB_INTERACCIONES
    try {
      const supabaseAdmin = createAdminClient()
      await supabaseAdmin.from('DB_INTERACCIONES').insert({
        ID: crypto.randomUUID(),
        Tipo_Interaccion: 'Facebook - REEL PUBLICADO',
        Detalle_Conversacion: `Reel de ${vehicleTitle} publicado en ${pageName}. ID: ${videoId}`,
        Vendedor: 'AutoApp Oficial',
        Fecha: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
    } catch (e) {}

    return NextResponse.json({
      success: true,
      videoId,
      permalink,
      pageName
    })
  } catch (err: any) {
    console.error('[Facebook Reels Exception]:', err)
    return NextResponse.json({ success: false, error: err.message || 'Error interno' }, { status: 500 })
  }
}
