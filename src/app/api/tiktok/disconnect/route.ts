import { NextResponse } from 'next/server'

export async function POST() {
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
        .eq('provider', 'tiktok')
    } catch (e) {
      console.warn('[TikTok Disconnect] Error limpiando BD:', e)
    }

    delete process.env.TIKTOK_ACCESS_TOKEN
    delete process.env.TIKTOK_OPEN_ID
    delete process.env.TIKTOK_USERNAME
    delete process.env.TIKTOK_DISPLAY_NAME

    return NextResponse.json({ success: true, message: 'Cuenta de TikTok desconectada exitosamente' })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
