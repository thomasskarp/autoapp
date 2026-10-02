import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { mediaId } = body || {}

    if (!mediaId) {
      return NextResponse.json({ success: false, error: 'mediaId requerido' }, { status: 400 })
    }

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
    } catch (dbErr) {
      // Fallback
    }

    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Token de Instagram no disponible' }, { status: 400 })
    }

    const res = await fetch(`https://graph.facebook.com/v21.0/${mediaId}?access_token=${accessToken}`, {
      method: 'DELETE'
    })

    const data = await res.json()

    if (!res.ok || data.error) {
      return NextResponse.json({
        success: false,
        error: data.error?.message || 'Error al eliminar publicación de Instagram'
      }, { status: res.status || 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Publicación eliminada correctamente de Instagram'
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
