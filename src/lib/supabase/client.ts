import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const isLocalHttp = typeof window !== 'undefined' && !window.location.protocol.includes('https')
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        secure: !isLocalHttp,
        sameSite: 'lax',
        path: '/',
      },
    }
  )
}
