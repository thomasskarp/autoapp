import { NextResponse } from 'next/server'

export async function POST() {
  try {
    let supabase: any = null
    let agencyId = ''
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const { getUserAgencyId, deleteAgencyIntegration } = await import('@/lib/services/integrations')
      supabase = await createClient()
      agencyId = await getUserAgencyId(supabase)

      if (supabase && agencyId) {
        await deleteAgencyIntegration(supabase, agencyId, 'mercadolibre')
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
