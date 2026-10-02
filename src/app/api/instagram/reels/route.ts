import { NextResponse } from 'next/server'
import { sendTelegramNotification } from '@/lib/services/telegram-notifier'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { videoUrl, caption, shareToFeed = true, vehicleTitle = 'Vehículo', vehicleId } = body

    if (!videoUrl) {
      return NextResponse.json({ success: false, error: 'videoUrl es requerido' }, { status: 400 })
    }

    let igUserId = process.env.INSTAGRAM_ACCOUNT_ID?.trim() || '17841474277477470'
    let accessToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim()

    try {
      const { createClient } = await import('@/lib/supabase/server')
      const { getUserAgencyId, getValidInstagramToken } = await import('@/lib/services/integrations')
      const supabase = await createClient()
      const agencyId = await getUserAgencyId(supabase)
      const tokenRes = await getValidInstagramToken(supabase, agencyId)
      if (tokenRes.accessToken) accessToken = tokenRes.accessToken
      if (tokenRes.igUserId) igUserId = tokenRes.igUserId
    } catch (e) {}

    if (!igUserId || !accessToken) {
      return NextResponse.json({ success: false, error: 'Credenciales de Instagram no configuradas' }, { status: 400 })
    }

    // 1. Crear contenedor de Reel en Instagram Graph API
    const containerUrl = `https://graph.facebook.com/v21.0/${igUserId}/media`
    const containerParams = new URLSearchParams()
    containerParams.append('media_type', 'REELS')
    containerParams.append('video_url', videoUrl)
    if (caption) containerParams.append('caption', caption)
    containerParams.append('share_to_feed', shareToFeed ? 'true' : 'false')
    containerParams.append('access_token', accessToken)

    const cRes = await fetch(containerUrl, {
      method: 'POST',
      body: containerParams
    })
    const cData = await cRes.json()

    if (!cRes.ok || cData.error) {
      return NextResponse.json({
        success: false,
        error: cData.error?.message || 'Error al iniciar contenedor de Reel en Instagram'
      }, { status: 400 })
    }

    const containerId = cData.id

    // 2. Esperar a que Meta procese y codifique el video (polling de status_code)
    let isFinished = false
    let attempts = 0
    const maxAttempts = 25

    while (!isFinished && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      attempts++

      const statusRes = await fetch(`https://graph.facebook.com/v21.0/${containerId}?fields=status_code,status&access_token=${accessToken}`)
      const statusData = await statusRes.json()
      console.log(`[Instagram Reel Container ${containerId}] attempt ${attempts}:`, statusData)

      if (statusData.status_code === 'FINISHED') {
        isFinished = true
      } else if (statusData.status_code === 'ERROR') {
        return NextResponse.json({
          success: false,
          error: `Meta no pudo procesar el video del Reel: ${statusData.status || 'Error en codificación'}`
        }, { status: 400 })
      }
    }

    if (!isFinished) {
      return NextResponse.json({
        success: false,
        error: 'El video del Reel demoró demasiado en procesarse en los servidores de Meta. Intenta nuevamente.'
      }, { status: 408 })
    }

    // 3. Publicar el contenedor en Instagram (@okmmotors)
    const pubUrl = `https://graph.facebook.com/v21.0/${igUserId}/media_publish`
    const pubParams = new URLSearchParams()
    pubParams.append('creation_id', containerId)
    pubParams.append('access_token', accessToken)

    const pubRes = await fetch(pubUrl, {
      method: 'POST',
      body: pubParams
    })
    const pubData = await pubRes.json()

    if (!pubRes.ok || pubData.error) {
      return NextResponse.json({
        success: false,
        error: pubData.error?.message || 'Error al publicar Reel en Instagram'
      }, { status: 400 })
    }

    const reelId = pubData.id

    // 3.B Obtener permalink real oficial con shortcode desde Graph API
    let permalink = 'https://www.instagram.com/okmmotors/reels/'
    try {
      const mediaRes = await fetch(`https://graph.facebook.com/v21.0/${reelId}?fields=permalink,shortcode&access_token=${accessToken}`)
      const mediaData = await mediaRes.json()
      if (mediaData.permalink) {
        permalink = mediaData.permalink
      } else if (mediaData.shortcode) {
        permalink = `https://www.instagram.com/reel/${mediaData.shortcode}/`
      }
    } catch (permErr) {
      console.warn('[Instagram Reels] Error consultando permalink oficial:', permErr)
    }

    // 4. Notificar a Telegram
    try {
      await sendTelegramNotification({
        title: '🎬 ¡Nuevo Reel Publicado en Instagram!',
        source: 'instagram',
        userName: '@okmmotors',
        vehicleInfo: vehicleTitle,
        messageText: caption ? caption.split('\n')[0] : 'Video Catálogo Publicado',
        permalink: 'https://www.instagram.com/okmmotors/reels/'
      })
    } catch (e) {}

    // 5. Registrar en Supabase DB_INTERACCIONES
    try {
      const supabaseAdmin = createAdminClient()
      await supabaseAdmin.from('DB_INTERACCIONES').insert({
        ID: crypto.randomUUID(),
        Tipo_Interaccion: 'Instagram - REEL PUBLICADO',
        Detalle_Conversacion: `Reel de ${vehicleTitle} publicado en @okmmotors. ID: ${reelId}`,
        Vendedor: 'AutoApp Oficial',
        Fecha: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
    } catch (e) {}

    return NextResponse.json({
      success: true,
      reelId,
      containerId,
      permalink
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
