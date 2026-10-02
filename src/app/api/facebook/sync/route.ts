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

    const fields = [
      'id',
      'message',
      'created_time',
      'permalink_url',
      'attachments{media_type,media,title,url,subattachments}',
      'shares',
      'reactions.summary(true)',
      'comments.summary(true)'
    ].join(',')

    const graphUrl = `https://graph.facebook.com/v21.0/${pageId}/feed?fields=${fields}&limit=50&access_token=${pageToken}`
    const res = await fetch(graphUrl)
    const data = await res.json()

    if (!res.ok || data.error) {
      console.error('[Facebook Sync Error]:', data.error)
      return NextResponse.json({
        success: false,
        error: data.error?.message || 'Error al sincronizar con Facebook'
      }, { status: res.status || 400 })
    }

    const items = (data.data || []).map((post: any) => {
      let thumbnail: string | null = null
      const attachment = post.attachments?.data?.[0]
      if (attachment?.media?.image?.src) {
        thumbnail = attachment.media.image.src
      } else if (attachment?.subattachments?.data?.[0]?.media?.image?.src) {
        thumbnail = attachment.subattachments.data[0].media.image.src
      }

      return {
        id: post.id,
        message: post.message || '',
        title: post.message ? post.message.split('\n')[0].replace(/^[🔥✨🚘🚗 ]+/, '').trim() : 'Publicación de Facebook',
        permalink: post.permalink_url || `https://facebook.com/${post.id}`,
        created_time: post.created_time,
        thumbnail,
        reactionsCount: post.reactions?.summary?.total_count || 0,
        commentsCount: post.comments?.summary?.total_count || 0,
        sharesCount: post.shares?.count || 0,
        status: 'active'
      }
    })

    return NextResponse.json({
      success: true,
      items,
      count: items.length
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}
