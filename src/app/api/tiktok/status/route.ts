import { NextResponse } from 'next/server'

export async function GET() {
  try {
    let openId: string | null = null
    let accessToken: string | null = null
    let username: string | null = null
    let displayName: string | null = null

    try {
      const { createClient } = await import('@/lib/supabase/server')
      const { getUserAgencyId, getValidTikTokToken } = await import('@/lib/services/integrations')
      const supabase = await createClient()
      const agencyId = await getUserAgencyId(supabase)
      const tokenRes = await getValidTikTokToken(supabase, agencyId)
      openId = tokenRes.openId
      accessToken = tokenRes.accessToken
      username = tokenRes.username
      displayName = tokenRes.displayName
    } catch (e) {
      openId = process.env.TIKTOK_OPEN_ID || null
      accessToken = process.env.TIKTOK_ACCESS_TOKEN || null
      username = process.env.TIKTOK_USERNAME || null
      displayName = process.env.TIKTOK_DISPLAY_NAME || null
    }

    if (!accessToken) {
      return NextResponse.json({
        connected: false,
        message: 'No hay cuenta de TikTok Developers conectada'
      })
    }

    // Si tenemos access_token, intentar consultar información básica del usuario
    try {
      const userRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })
      const userData = await userRes.json()
      if (userRes.ok && userData.data?.user) {
        const u = userData.data.user
        return NextResponse.json({
          connected: true,
          openId: u.open_id || openId,
          username: u.username || username || 'tiktok_account',
          displayName: u.display_name || displayName || 'TikTok Oficial',
          avatarUrl: u.avatar_url || null
        })
      }
    } catch (e) {}

    return NextResponse.json({
      connected: true,
      openId,
      username: username || 'tiktok_account',
      displayName: displayName || 'TikTok Oficial'
    })
  } catch (err: any) {
    return NextResponse.json({ connected: false, error: err.message }, { status: 500 })
  }
}
