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
      // Fallback a env
    }

    if (!igUserId || !accessToken) {
      return NextResponse.json({ success: false, error: 'Credenciales de Instagram no configuradas' }, { status: 400 })
    }

    const fields = [
      'id',
      'caption',
      'media_type',
      'media_url',
      'permalink',
      'thumbnail_url',
      'timestamp',
      'like_count',
      'comments_count',
      'children{id,media_type,media_url}'
    ].join(',')

    const url = `https://graph.facebook.com/v21.0/${igUserId}/media?fields=${fields}&limit=50&access_token=${accessToken}`
    const res = await fetch(url)
    const data = await res.json()

    if (!res.ok || data.error) {
      return NextResponse.json({
        success: false,
        error: data.error?.message || 'Error al consultar publicaciones de Instagram'
      }, { status: res.status || 400 })
    }

    const items = (data.data || []).map((post: any) => {
      let thumbnail: string | null = post.media_url || post.thumbnail_url || null
      if (post.children?.data?.[0]?.media_url) {
        thumbnail = post.children.data[0].media_url
      }

      // Extraer primer línea del caption como título amigable
      const firstLine = post.caption ? post.caption.split('\n')[0].replace(/^[🔥✨🚘🚗💰 ]+/, '').trim() : 'Publicación de Instagram'

      return {
        id: post.id,
        caption: post.caption || '',
        title: firstLine || 'Aviso en Instagram',
        mediaType: post.media_type, // IMAGE, VIDEO, CAROUSEL_ALBUM
        permalink: post.permalink,
        thumbnail,
        created_time: post.timestamp,
        likesCount: post.like_count || 0,
        commentsCount: post.comments_count || 0,
        status: 'active'
      }
    })

    return NextResponse.json({
      success: true,
      items,
      count: items.length
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
