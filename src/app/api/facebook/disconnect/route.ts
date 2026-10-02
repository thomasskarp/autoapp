import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const { getUserAgencyId } = await import('@/lib/services/integrations')
      const supabase = await createClient()
      const agencyId = await getUserAgencyId(supabase)

      await supabase
        .from('agency_integrations')
        .delete()
        .eq('agency_id', agencyId)
        .in('provider', ['facebook_page', 'facebook'])
    } catch (e) {
      console.warn('[Facebook Disconnect] Error limpiando BD:', e)
    }

    process.env.FACEBOOK_PAGE_ID = ''
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN = ''
    process.env.FACEBOOK_PAGE_NAME = ''

    const res = NextResponse.json({ success: true, message: 'Fan Page desconectada exitosamente' })
    res.cookies.delete('autoapp_fb_page_name')
    res.cookies.delete('autoapp_fb_page_id')

    return res
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
