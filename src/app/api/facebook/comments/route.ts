import { NextResponse } from 'next/server'

export async function GET() {
  try {
    let pageId = process.env.FACEBOOK_PAGE_ID?.trim()
    let pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim()

    try {
      const { createClient } = await import('@/lib/supabase/server')
      const { getUserAgencyId, getValidFacebookPageToken } = await import('@/lib/services/integrations')
      const supabase = await createClient()
      const agencyId = await getUserAgencyId(supabase)
      const tokenRes = await getValidFacebookPageToken(supabase, agencyId)
      if (tokenRes.pageId) pageId = tokenRes.pageId
      if (tokenRes.pageToken) pageToken = tokenRes.pageToken
    } catch (e) {}

    if (!pageId || !pageToken) {
      return NextResponse.json({ success: false, error: 'Credenciales de Fan Page no configuradas' }, { status: 400 })
    }

    // Traer publicaciones recientes con sus comentarios y sub-comentarios
    const fields = 'id,message,permalink_url,attachments{media},comments{id,from,message,created_time,comment_count,comments{id,from,message,created_time}}'
    const graphUrl = `https://graph.facebook.com/v21.0/${pageId}/feed?fields=${encodeURIComponent(fields)}&limit=25&access_token=${pageToken}`

    const res = await fetch(graphUrl)
    const data = await res.json()

    if (!res.ok || data.error) {
      return NextResponse.json({ success: false, error: data.error?.message || 'Error al consultar comentarios' }, { status: 400 })
    }

    const commentsList: any[] = []

    for (const post of data.data || []) {
      const postTitle = post.message ? post.message.split('\n')[0].replace(/^[🔥✨🚘🚗 ]+/, '').trim() : 'Publicación de Facebook'
      const postThumbnail = post.attachments?.data?.[0]?.media?.image?.src || null
      const postPermalink = post.permalink_url || `https://facebook.com/${post.id}`

      if (post.comments && Array.isArray(post.comments.data)) {
        for (const c of post.comments.data) {
          // Si el comentario es de la propia página, omitirlo
          if (c.from?.id === pageId) continue

          const replies = c.comments?.data || []
          const isAnswered = replies.some((r: any) => r.from?.id === pageId)
          const lastReply = isAnswered ? replies.find((r: any) => r.from?.id === pageId) : null

          commentsList.push({
            id: c.id,
            postId: post.id,
            postTitle,
            postThumbnail,
            postPermalink,
            authorName: c.from?.name || 'Usuario de Facebook',
            authorId: c.from?.id || null,
            message: c.message,
            created_time: c.created_time,
            isAnswered,
            reply: lastReply ? { id: lastReply.id, text: lastReply.message, date: lastReply.created_time } : null
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

    let pageId = process.env.FACEBOOK_PAGE_ID?.trim()
    let pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim()

    try {
      const { createClient } = await import('@/lib/supabase/server')
      const { getUserAgencyId, getValidFacebookPageToken } = await import('@/lib/services/integrations')
      const supabase = await createClient()
      const agencyId = await getUserAgencyId(supabase)
      const tokenRes = await getValidFacebookPageToken(supabase, agencyId)
      if (tokenRes.pageId) pageId = tokenRes.pageId
      if (tokenRes.pageToken) pageToken = tokenRes.pageToken
    } catch (e) {}

    if (!pageToken) {
      return NextResponse.json({ success: false, error: 'Token de Fan Page no disponible' }, { status: 400 })
    }

    // 1. Responder públicamente el comentario en Facebook
    const replyUrl = `https://graph.facebook.com/v21.0/${commentId}/comments`
    const fbRes = await fetch(replyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        access_token: pageToken
      })
    })

    const fbData = await fbRes.json()

    if (!fbRes.ok || fbData.error) {
      console.error('[Facebook Reply Error]:', fbData.error)
      return NextResponse.json({
        success: false,
        error: fbData.error?.message || 'Error al enviar respuesta a Facebook'
      }, { status: fbRes.status || 400 })
    }

    // 2. Registrar Lead / Interacción en Supabase si está disponible
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      await supabase.from('DB_INTERACCIONES').insert({
        Tipo: 'Facebook Comentario',
        Detalle: `Respuesta a ${authorName || 'comprador'}: "${text}" (Vehículo: ${postTitle || 'Aviso Facebook'})`,
        created_at: new Date().toISOString()
      })
    } catch (dbErr) {
      console.warn('[Facebook Reply] Omitiendo registro en DB_INTERACCIONES:', dbErr)
    }

    return NextResponse.json({
      success: true,
      id: fbData.id,
      message: 'Respuesta enviada exitosamente al usuario en Facebook'
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
