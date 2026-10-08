import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true, message: 'Sesión cerrada correctamente' })
    const isLocalHttp = !request.url.startsWith('https://')

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, {
                ...options,
                secure: !isLocalHttp,
                sameSite: 'lax',
                path: '/',
              })
            })
          },
        },
      }
    )

    await supabase.auth.signOut().catch(() => {})

    // Limpiar todas las cookies de sesión y Supabase
    const allCookies = request.cookies.getAll()
    allCookies.forEach((c) => {
      if (c.name.includes('supabase') || c.name.includes('sb-') || c.name.includes('auth')) {
        response.cookies.set(c.name, '', {
          maxAge: 0,
          path: '/',
          expires: new Date(0),
        })
      }
    })

    return response
  } catch (err: any) {
    console.error('[API Logout] Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const postRes = await POST(request)
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  const redirectRes = NextResponse.redirect(url)

  postRes.cookies.getAll().forEach((c) => {
    redirectRes.cookies.set(c.name, c.value, {
      maxAge: 0,
      path: '/',
      expires: new Date(0),
    })
  })

  return redirectRes
}
