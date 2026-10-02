import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { postId } = body || {}

    if (!postId) {
      return NextResponse.json({ success: false, error: 'postId requerido' }, { status: 400 })
    }

    let pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim()

    try {
      const { createClient } = await import('@/lib/supabase/server')
      const { getUserAgencyId, getValidFacebookPageToken } = await import('@/lib/services/integrations')
      const supabase = await createClient()
      const agencyId = await getUserAgencyId(supabase)
      const tokenRes = await getValidFacebookPageToken(supabase, agencyId)
      if (tokenRes.pageToken) pageToken = tokenRes.pageToken
    } catch (e) {}

    if (!pageToken) {
      return NextResponse.json({ success: false, error: 'Token de Fan Page no configurado' }, { status: 400 })
    }

    const deleteUrl = `https://graph.facebook.com/v21.0/${postId}?access_token=${pageToken}`
    const res = await fetch(deleteUrl, { method: 'DELETE' })
    const data = await res.json()

    if (!res.ok || data.error) {
      return NextResponse.json({
        success: false,
        error: data.error?.message || 'Error al eliminar publicación en Facebook'
      }, { status: res.status || 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Publicación eliminada correctamente del muro de Facebook'
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
