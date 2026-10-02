import { NextResponse } from 'next/server'

export async function GET() {
  try {
    let igUserId: string | null = null
    let accessToken: string | null = null
    let username: string | null = null

    try {
      const { createClient } = await import('@/lib/supabase/server')
      const { getUserAgencyId, getValidInstagramToken, DEFAULT_AGENCY_ID } = await import('@/lib/services/integrations')
      const supabase = await createClient()
      const agencyId = await getUserAgencyId(supabase)
      const tokenRes = await getValidInstagramToken(supabase, agencyId)
      if (tokenRes.accessToken) {
        accessToken = tokenRes.accessToken
      }
      if (tokenRes.igUserId) {
        igUserId = tokenRes.igUserId
      }
      if (tokenRes.username) {
        username = tokenRes.username
      }

      if (!accessToken && (!agencyId || agencyId === DEFAULT_AGENCY_ID)) {
        igUserId = process.env.INSTAGRAM_ACCOUNT_ID?.trim() || null
        accessToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim() || null
        username = process.env.INSTAGRAM_USERNAME?.trim() || null
      }
    } catch (dbErr) {
      igUserId = process.env.INSTAGRAM_ACCOUNT_ID?.trim() || null
      accessToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim() || null
      username = process.env.INSTAGRAM_USERNAME?.trim() || null
    }

    if (!igUserId || !accessToken) {
      return NextResponse.json({ connected: false, message: 'Credenciales de Instagram no configuradas' })
    }


    // Consultar perfil de Instagram Business en vivo
    const res = await fetch(`https://graph.facebook.com/v21.0/${igUserId}?fields=id,username,name,profile_picture_url,biography,media_count,followers_count&access_token=${accessToken}`)
    const data = await res.json()

    if (!res.ok || data.error) {
      return NextResponse.json({
        connected: false,
        error: data.error?.message || 'Error al validar cuenta de Instagram'
      })
    }

    return NextResponse.json({
      connected: true,
      igUserId: data.id,
      username: data.username || username,
      name: data.name || 'okm motors',
      profilePic: data.profile_picture_url || null,
      mediaCount: data.media_count || 0,
      followersCount: data.followers_count || 0,
      profileUrl: `https://www.instagram.com/${data.username || username}/`
    })
  } catch (err: any) {
    return NextResponse.json({ connected: false, error: err.message }, { status: 500 })
  }
}
