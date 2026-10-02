import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const clientKey = process.env.TIKTOK_CLIENT_KEY?.trim()
    const host = req.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const appOrigin = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`

    const redirectUri = process.env.TIKTOK_REDIRECT_URI?.trim() || `${appOrigin}/api/tiktok/callback`

    if (!clientKey) {
      return NextResponse.redirect(
        new URL('/publicaciones?tiktok_notice=TIKTOK_DEV_APP_REQUIRED', req.url)
      )
    }

    const scope = [
      'user.info.basic',
      'video.upload',
      'video.publish'
    ].join(',')

    const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/')
    authUrl.searchParams.set('client_key', clientKey)
    authUrl.searchParams.set('scope', scope)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('state', 'autoapp_tiktok_oauth')

    return NextResponse.redirect(authUrl.toString())
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
