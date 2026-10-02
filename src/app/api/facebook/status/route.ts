import { NextResponse } from 'next/server'
import { DEFAULT_AGENCY_ID } from '@/lib/services/integrations'


export async function GET(req: Request) {
  try {
    let pageId: string | null = null
    let pageToken: string | null = null
    let pageName: string | null = null
    let agencyId = ''

    try {
      const { createClient } = await import('@/lib/supabase/server')
      const { getUserAgencyId, getValidFacebookPageToken, DEFAULT_AGENCY_ID } = await import('@/lib/services/integrations')
      const supabase = await createClient()
      agencyId = await getUserAgencyId(supabase)
      const tokenRes = await getValidFacebookPageToken(supabase, agencyId)
      pageId = tokenRes.pageId
      pageToken = tokenRes.pageToken
      pageName = tokenRes.pageName

    } catch (e) {
      pageId = null
      pageToken = null
      pageName = null
    }

    if (!pageToken && (!agencyId || agencyId === DEFAULT_AGENCY_ID)) {
      pageId = process.env.FACEBOOK_PAGE_ID || null
      pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || null
      pageName = process.env.FACEBOOK_PAGE_NAME || null
    }


    if (!pageId || !pageToken) {
      return NextResponse.json({
        connected: false,
        message: 'No hay Fan Page de Facebook conectada'
      })
    }

    // Verificar en vivo contra la Graph API de Meta
    try {
      const graphRes = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}?fields=id,name,link,picture,fan_count&access_token=${pageToken}`
      )
      const graphData = await graphRes.json()

      if (!graphRes.ok || graphData.error) {
        console.warn('[Facebook Status] Error verificando token de página:', graphData.error)
        return NextResponse.json({
          connected: false,
          pageId,
          pageName: pageName || 'Fan Page',
          error: graphData.error?.message || 'Token de página no válido o expirado'
        })
      }

      return NextResponse.json({
        connected: true,
        pageId: graphData.id,
        pageName: graphData.name,
        pageLink: graphData.link || `https://facebook.com/${graphData.id}`,
        pictureUrl: graphData.picture?.data?.url || null,
        fanCount: graphData.fan_count || 0
      })
    } catch (metaErr: any) {
      // Si falla la red con Meta, informar token presente en BD
      return NextResponse.json({
        connected: true,
        pageId,
        pageName: pageName || 'Fan Page Concesionaria',
        isOfflineValidation: true
      })
    }
  } catch (err: any) {
    return NextResponse.json({ connected: false, error: err.message }, { status: 500 })
  }
}
