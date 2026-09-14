import { NextResponse } from 'next/server'

export async function POST() {
  try {
    let supabase: any = null
    let agencyId = ''
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const { getUserAgencyId } = await import('@/lib/services/integrations')
      supabase = await createClient()
      agencyId = await getUserAgencyId(supabase)

      if (supabase && agencyId) {
        await supabase
          .from('agency_integrations')
          .delete()
          .eq('agency_id', agencyId)
          .eq('provider', 'mercadolibre')
      }
    } catch (dbErr) {
      console.warn('[Disconnect API] Error clearing from database:', dbErr)
    }

    // Clean in-memory tokens
    delete process.env.MERCADOLIBRE_ACCESS_TOKEN
    delete process.env.MERCADOLIBRE_REFRESH_TOKEN

    return NextResponse.json({
      success: true,
      message: 'Cuenta de MercadoLibre desconectada exitosamente'
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
