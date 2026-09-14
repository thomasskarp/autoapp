import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const host = req.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const appOrigin = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`

    const clientId = process.env.MERCADOLIBRE_CLIENT_ID || '7284100481716968'
    const configuredRedirect = process.env.MERCADOLIBRE_REDIRECT_URI || `${appOrigin}/api/mercadolibre/callback`
    const redirectUri = encodeURIComponent(configuredRedirect)

    // MercadoLibre OAuth authorization URL
    // Supports MLA (Argentina), MLM (Mexico), MLB (Brazil), etc.
    const authUrl = `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}`

    return NextResponse.redirect(authUrl)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error generating MercadoLibre connect URL' }, { status: 500 })
  }
}
