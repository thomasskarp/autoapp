import { NextResponse } from 'next/server'

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { itemId, price, pictures, notes } = body || {}

    if (!itemId) {
      return NextResponse.json({ success: false, error: 'itemId es obligatorio.' }, { status: 400 })
    }

    let tokenToUse = ''
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const { getUserAgencyId, getValidMercadoLibreToken } = await import('@/lib/services/integrations')
      const supabase = await createClient()
      const agencyId = await getUserAgencyId(supabase)
      const tokenRes = await getValidMercadoLibreToken(supabase, agencyId)
      tokenToUse = tokenRes.accessToken || ''
    } catch (e) {}

    if (!tokenToUse) tokenToUse = (process.env.MERCADOLIBRE_ACCESS_TOKEN || '').replace(/["']/g, '').trim()
    if (!tokenToUse) {
      return NextResponse.json({ success: false, error: 'Token de MercadoLibre no disponible.' }, { status: 401 })
    }

    const payload: any = {}
    if (price && typeof price === 'number' && price > 0) {
      payload.price = price
    }
    if (Array.isArray(pictures) && pictures.length > 0) {
      payload.pictures = pictures.map((p: any) => typeof p === 'string' ? { source: p } : p)
    }

    let updateRes = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokenToUse}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    let updateData = await updateRes.json()

    // If description needs update
    if (notes && typeof notes === 'string') {
      try {
        await fetch(`https://api.mercadolibre.com/items/${itemId}/description`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${tokenToUse}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ plain_text: notes })
        })
      } catch (dErr) {}
    }

    if (!updateRes.ok) {
      return NextResponse.json({
        success: false,
        error: updateData.message || 'Error al actualizar publicación en MercadoLibre'
      }, { status: updateRes.status })
    }

    return NextResponse.json({
      success: true,
      item: updateData
    })
  } catch (error: any) {
    console.error('[API Meli Update] Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
