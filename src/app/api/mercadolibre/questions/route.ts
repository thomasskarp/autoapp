import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status') // 'UNANSWERED' | 'ANSWERED' | null

    let tokenToUse = ''
    let userIdToUse = ''
    let agencyId = ''
    let supabase: any = null

    try {
      const { createClient } = await import('@/lib/supabase/server')
      const { getUserAgencyId, getValidMercadoLibreToken, getAgencyIntegration } = await import('@/lib/services/integrations')
      supabase = await createClient()
      agencyId = await getUserAgencyId(supabase)
      const tokenRes = await getValidMercadoLibreToken(supabase, agencyId)
      tokenToUse = tokenRes.accessToken || ''
      const integration = await getAgencyIntegration(supabase, agencyId, 'mercadolibre')
      userIdToUse = integration?.user_id || process.env.MERCADOLIBRE_USER_ID || ''
    } catch (dbErr) {
      console.warn('[API Meli Questions] No se pudo leer token de DB, usando env fallback:', dbErr)
    }

    if (!tokenToUse) tokenToUse = (process.env.MERCADOLIBRE_ACCESS_TOKEN || '').replace(/["']/g, '').trim()
    if (!userIdToUse) userIdToUse = (process.env.MERCADOLIBRE_USER_ID || '').replace(/["']/g, '').trim()

    if (!tokenToUse || !userIdToUse) {
      return NextResponse.json({
        success: false,
        error: 'No hay credenciales de MercadoLibre configuradas.',
        questions: []
      }, { status: 400 })
    }

    // Helper to query questions
    const fetchQuestions = async (token: string, uId: string, st: string | null) => {
      let url = `https://api.mercadolibre.com/questions/search?seller_id=${uId}&limit=50`
      if (st) url += `&status=${st}`
      return fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
    }

    let qRes = await fetchQuestions(tokenToUse, userIdToUse, statusFilter)
    let qData = await qRes.json()

    // Auto-refresh token if 401
    if (!qRes.ok && (qRes.status === 401 || qData.error === 'invalid_token')) {
      try {
        const refreshToken = (process.env.MERCADOLIBRE_REFRESH_TOKEN || '').replace(/["']/g, '').trim()
        const clientId = (process.env.MERCADOLIBRE_CLIENT_ID || '').replace(/["']/g, '').trim()
        const clientSecret = (process.env.MERCADOLIBRE_CLIENT_SECRET || '').replace(/["']/g, '').trim()

        if (refreshToken && clientId && clientSecret) {
          const refreshRes = await fetch('https://api.mercadolibre.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: refreshToken
            })
          })
          const refreshData = await refreshRes.json()
          if (refreshRes.ok && refreshData.access_token) {
            tokenToUse = refreshData.access_token
            qRes = await fetchQuestions(tokenToUse, userIdToUse, statusFilter)
            qData = await qRes.json()
          }
        }
      } catch (rErr) {
        console.warn('[API Meli Questions] Error al refrescar token:', rErr)
      }
    }

    if (!qRes.ok) {
      return NextResponse.json({
        success: false,
        error: qData.message || 'Error al obtener preguntas de MercadoLibre',
        questions: []
      }, { status: qRes.status })
    }

    const rawQuestions: any[] = qData.questions || []
    if (rawQuestions.length === 0) {
      return NextResponse.json({ success: true, total: 0, questions: [] })
    }

    // Multiget items to enrich question with vehicle info
    const itemIds = Array.from(new Set(rawQuestions.map((q: any) => q.item_id).filter(Boolean)))
    const itemsMap = new Map<string, any>()

    if (itemIds.length > 0) {
      try {
        const multiRes = await fetch(`https://api.mercadolibre.com/items?ids=${itemIds.slice(0, 20).join(',')}`, {
          headers: { Authorization: `Bearer ${tokenToUse}` }
        })
        const multiData = await multiRes.json()
        if (Array.isArray(multiData)) {
          for (const itemObj of multiData) {
            if (itemObj.code === 200 && itemObj.body) {
              itemsMap.set(itemObj.body.id, {
                title: itemObj.body.title,
                permalink: itemObj.body.permalink,
                thumbnail: itemObj.body.thumbnail,
                price: itemObj.body.price,
                status: itemObj.body.status
              })
            }
          }
        }
      } catch (mErr) {
        console.warn('[API Meli Questions] Error al obtener detalles de ítems:', mErr)
      }
    }

    const formattedQuestions = rawQuestions.map((q: any) => {
      const itemInfo = itemsMap.get(q.item_id) || {}
      return {
        id: q.id,
        text: q.text,
        status: q.status, // 'UNANSWERED' | 'ANSWERED' | 'CLOSED_UNANSWERED'
        date_created: q.date_created,
        from: {
          id: q.from?.id,
          answered_questions: q.from?.answered_questions
        },
        item_id: q.item_id,
        item_title: itemInfo.title || 'Vehículo en MercadoLibre',
        item_permalink: itemInfo.permalink || `https://auto.mercadolibre.com.ar/${q.item_id}`,
        item_thumbnail: itemInfo.thumbnail || '',
        item_price: itemInfo.price || 0,
        item_status: itemInfo.status || 'active',
        answer: q.answer ? {
          text: q.answer.text,
          status: q.answer.status,
          date_created: q.answer.date_created
        } : null
      }
    })

    return NextResponse.json({
      success: true,
      total: qData.total || formattedQuestions.length,
      questions: formattedQuestions
    })

  } catch (error: any) {
    console.error('[API Meli Questions] Error:', error)
    return NextResponse.json({ success: false, error: error.message, questions: [] }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { questionId, text } = body || {}

    if (!questionId || !text || !text.trim()) {
      return NextResponse.json({
        success: false,
        error: 'questionId y text son obligatorios para responder.'
      }, { status: 400 })
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

    const postAnswer = async (token: string) => {
      return fetch('https://api.mercadolibre.com/answers', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question_id: Number(questionId),
          text: text.trim()
        })
      })
    }

    let res = await postAnswer(tokenToUse)
    let data = await res.json()

    // Auto-refresh token if 401
    if (!res.ok && (res.status === 401 || data.error === 'invalid_token')) {
      try {
        const refreshToken = (process.env.MERCADOLIBRE_REFRESH_TOKEN || '').replace(/["']/g, '').trim()
        const clientId = (process.env.MERCADOLIBRE_CLIENT_ID || '').replace(/["']/g, '').trim()
        const clientSecret = (process.env.MERCADOLIBRE_CLIENT_SECRET || '').replace(/["']/g, '').trim()

        if (refreshToken && clientId && clientSecret) {
          const refreshRes = await fetch('https://api.mercadolibre.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: refreshToken
            })
          })
          const refreshData = await refreshRes.json()
          if (refreshRes.ok && refreshData.access_token) {
            tokenToUse = refreshData.access_token
            res = await postAnswer(tokenToUse)
            data = await res.json()
          }
        }
      } catch (rErr) {
        console.warn('[API Meli Answer] Error refrescando token:', rErr)
      }
    }

    if (!res.ok) {
      return NextResponse.json({
        success: false,
        error: data.message || 'Error al enviar respuesta a MercadoLibre'
      }, { status: res.status })
    }

    return NextResponse.json({
      success: true,
      answer: data
    })

  } catch (error: any) {
    console.error('[API Meli Answer] Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
