import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = body?.email?.trim()
    const password = body?.password

    if (!email || !password) {
      return NextResponse.json({ error: 'Debes ingresar correo electrónico y contraseña.' }, { status: 400 })
    }

    let response = NextResponse.json({ success: true, email })

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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('[API Auth] Error signInWithPassword:', error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return response
  } catch (err: any) {
    console.error('[API Auth] Internal error:', err)
    return NextResponse.json({ error: err.message || 'Error interno de autenticación' }, { status: 500 })
  }
}
