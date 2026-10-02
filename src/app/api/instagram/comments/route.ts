import { NextResponse } from 'next/server'

export async function GET() {
  try {
    let igUserId = process.env.INSTAGRAM_ACCOUNT_ID?.trim() || '17841474277477470'
    let accessToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim()

    try {
      const { createClient } = await import('@/lib/supabase/server')
      const { getUserAgencyId, getValidInstagramToken } = await import('@/lib/services/integrations')
      const supabase = await createClient()
      const agencyId = await getUserAgencyId(supabase)
      const tokenRes = await getValidInstagramToken(supabase, agencyId)
      if (tokenRes.accessToken) {
        accessToken = tokenRes.accessToken
      }
      if (tokenRes.igUserId) {
        igUserId = tokenRes.igUserId
      }
    } catch (dbErr) {
      // Fallback
    }

    if (!igUserId || !accessToken) {
      return NextResponse.json({ success: false, error: 'Credenciales de Instagram no configuradas' }, { status: 400 })
    }

    // Traer posts recientes con sus comentarios y sub-respuestas
    const fields = 'id,caption,permalink,thumbnail_url,media_url,comments{id,text,timestamp,username,from,replies{id,text,timestamp,username,from}}'
    const url = `https://graph.facebook.com/v21.0/${igUserId}/media?fields=${encodeURIComponent(fields)}&limit=25&access_token=${accessToken}`

    const res = await fetch(url)
    const data = await res.json()

    if (!res.ok || data.error) {
      return NextResponse.json({ success: false, error: data.error?.message || 'Error al consultar comentarios de Instagram' }, { status: 400 })
    }

    const commentsList: any[] = []

    for (const post of data.data || []) {
      const postTitle = post.caption ? post.caption.split('\n')[0].replace(/^[🔥✨🚘🚗💰 ]+/, '').trim() : 'Publicación de Instagram'
      const postThumbnail = post.media_url || post.thumbnail_url || null
      const postPermalink = post.permalink

      if (post.comments && Array.isArray(post.comments.data)) {
        for (const c of post.comments.data) {
          // Omitir si el comentario es de la propia cuenta
          if (c.username === 'okmmotors') continue

          const replies = c.replies?.data || []
          const isAnswered = replies.some((r: any) => r.username === 'okmmotors')
          const lastReply = isAnswered ? replies.find((r: any) => r.username === 'okmmotors') : null

          commentsList.push({
            id: c.id,
            postId: post.id,
            postTitle,
            postThumbnail,
            postPermalink,
            authorName: c.username || c.from?.username || 'Usuario de Instagram',
            message: c.text,
            created_time: c.timestamp,
            isAnswered,
            reply: lastReply ? { id: lastReply.id, text: lastReply.text, date: lastReply.timestamp } : null
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      comments: commentsList,
      count: commentsList.length
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { commentId, text, authorName, postTitle } = body || {}

    if (!commentId || !text) {
      return NextResponse.json({ success: false, error: 'commentId y texto requeridos' }, { status: 400 })
    }

    let accessToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim()

    try {
      const { createClient } = await import('@/lib/supabase/server')
      const { getUserAgencyId, getValidInstagramToken } = await import('@/lib/services/integrations')
      const supabase = await createClient()
      const agencyId = await getUserAgencyId(supabase)
      const tokenRes = await getValidInstagramToken(supabase, agencyId)
      if (tokenRes.accessToken) {
        accessToken = tokenRes.accessToken
      }
    } catch (dbErr) {
      // Fallback
    }

    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Token de Instagram no disponible' }, { status: 400 })
    }

    // 1. Responder el comentario directamente en Instagram
    const replyUrl = `https://graph.facebook.com/v21.0/${commentId}/replies`
    const fbRes = await fetch(replyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        access_token: accessToken
      })
    })

    const fbData = await fbRes.json()

    if (!fbRes.ok || fbData.error) {
      console.error('[Instagram Reply Error]:', fbData.error)
      return NextResponse.json({
        success: false,
        error: fbData.error?.message || 'Error al enviar respuesta a Instagram'
      }, { status: fbRes.status || 400 })
    }

    // 2. Registrar Lead / Interacción en Supabase si está disponible
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      await supabase.from('DB_INTERACCIONES').insert({
        Tipo: 'Instagram Comentario',
        Detalle: `Respuesta a @${authorName || 'interesado'}: "${text}" (Vehículo: ${postTitle || 'Aviso Instagram'})`,
        created_at: new Date().toISOString()
      })
    } catch (dbErr) {
      console.warn('[Instagram Reply] Omitiendo registro en DB_INTERACCIONES:', dbErr)
    }

 return NextResponse.json({
 success: true,
 id: fbData.id,
 message: 'Respuesta enviada exitosamente en Instagram'
 })
 } catch (err: any) {
 return NextResponse.json({ success: false, error: err.message }, { status: 500 })
 }
}
