import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const appId = process.env.FACEBOOK_APP_ID?.trim()
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI?.trim() || 'http://localhost:3000/api/facebook/callback'

    if (!appId) {
      return NextResponse.redirect(
        new URL('/publicaciones?facebook_error=FACEBOOK_APP_ID_no_configurado', req.url)
      )
    }

    // Permisos oficiales de Meta Graph API para Fan Pages e Instagram Business (incluye DMs & Messenger)
    const scope = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'pages_messaging',
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_comments',
      'instagram_manage_messages'
    ].join(',')

    const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth')
    authUrl.searchParams.set('client_id', appId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', scope)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('state', 'autoapp_facebook_oauth')

    return NextResponse.redirect(authUrl.toString())
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
