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
        .eq('provider', 'instagram')
    } catch (e) {
      console.warn('[Instagram Disconnect] Error limpiando BD:', e)
    }

    process.env.INSTAGRAM_ACCOUNT_ID = ''
    process.env.INSTAGRAM_ACCESS_TOKEN = ''
    process.env.INSTAGRAM_USERNAME = ''

    const res = NextResponse.json({ success: true, message: 'Instagram desconectado exitosamente' })
    res.cookies.delete('autoapp_ig_username')

    return res
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
