import { NextResponse } from 'next/server'

interface NormalizedMessage {
  id: string
  text: string
  createdAt: string
  fromId: string
  fromName: string
  isFromAgency: boolean
}

interface NormalizedConversation {
  id: string
  platform: 'instagram' | 'facebook'
  updatedAt: string
  participant: {
    id: string
    name: string
    username?: string
  }
  lastMessage: string
  messages: NormalizedMessage[]
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const platformFilter = searchParams.get('platform') || 'all'

    let pageId = process.env.FACEBOOK_PAGE_ID?.trim() || '660246930503733'
    let pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim()
    let igUserId = process.env.INSTAGRAM_ACCOUNT_ID?.trim() || '17841474277477470'

    try {
      const { createClient } = await import('@/lib/supabase/server')
      const { getUserAgencyId, getValidFacebookPageToken, getValidInstagramToken } = await import('@/lib/services/integrations')
      const supabase = await createClient()
      const agencyId = await getUserAgencyId(supabase)
      const fbTokenRes = await getValidFacebookPageToken(supabase, agencyId)
      if (fbTokenRes.pageId) pageId = fbTokenRes.pageId
      if (fbTokenRes.pageToken) pageToken = fbTokenRes.pageToken

      const igTokenRes = await getValidInstagramToken(supabase, agencyId)
      if (igTokenRes.igUserId) igUserId = igTokenRes.igUserId
      if (igTokenRes.accessToken && !pageToken) pageToken = igTokenRes.accessToken
    } catch (e) {
      // Fallback a variables de entorno
    }

    if (!pageId || !pageToken) {
      return NextResponse.json({
        success: false,
        error: 'Credenciales de Meta no configuradas'
      }, { status: 400 })
    }

    const conversations: NormalizedConversation[] = []
    const warnings: string[] = []

    // 1. Obtener conversaciones de Instagram Direct
    if (platformFilter === 'all' || platformFilter === 'instagram') {
      try {
        const igUrl = `https://graph.facebook.com/v21.0/${pageId}/conversations?platform=instagram&fields=id,updated_time,participants,messages.limit(25){id,message,created_time,from,to}&access_token=${pageToken}`
        const resIg = await fetch(igUrl)
        const dataIg = await resIg.json()

        if (resIg.ok && Array.isArray(dataIg.data)) {
          for (const conv of dataIg.data) {
            const rawMessages = conv.messages?.data || []
            const participants = conv.participants?.data || []
            // El cliente es el participante que no es la cuenta de la agencia
            const customer = participants.find((p: any) => p.id !== igUserId && p.id !== pageId) || participants[0] || { id: 'unknown', name: 'Usuario de Instagram' }

            const normMessages: NormalizedMessage[] = rawMessages.map((m: any) => ({
              id: m.id,
              text: m.message || '',
              createdAt: m.created_time,
              fromId: m.from?.id || '',
              fromName: m.from?.username || m.from?.name || 'Usuario',
              isFromAgency: m.from?.id === igUserId || m.from?.id === pageId || m.from?.username === 'okmmotors'
            })).sort((a: NormalizedMessage, b: NormalizedMessage) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

            conversations.push({
              id: conv.id,
              platform: 'instagram',
              updatedAt: conv.updated_time || new Date().toISOString(),
              participant: {
                id: customer.id,
                name: customer.name || customer.username || 'Usuario de Instagram',
                username: customer.username || undefined
              },
              lastMessage: normMessages[normMessages.length - 1]?.text || 'Conversación iniciada',
              messages: normMessages
            })
          }
        } else if (dataIg.error) {
          warnings.push(`Instagram: ${dataIg.error.message}`)
        }
      } catch (igErr: any) {
        warnings.push(`Instagram error: ${igErr.message}`)
      }
    }

    // 2. Obtener conversaciones de Facebook Messenger
    if (platformFilter === 'all' || platformFilter === 'facebook') {
      try {
        const fbUrl = `https://graph.facebook.com/v21.0/${pageId}/conversations?fields=id,updated_time,participants,messages.limit(25){id,message,created_time,from,to}&access_token=${pageToken}`
        const resFb = await fetch(fbUrl)
        const dataFb = await resFb.json()

        if (resFb.ok && Array.isArray(dataFb.data)) {
          for (const conv of dataFb.data) {
            const rawMessages = conv.messages?.data || []
            const participants = conv.participants?.data || []
            const customer = participants.find((p: any) => p.id !== pageId) || participants[0] || { id: 'unknown', name: 'Usuario de Facebook' }

            const normMessages: NormalizedMessage[] = rawMessages.map((m: any) => ({
              id: m.id,
              text: m.message || '',
              createdAt: m.created_time,
              fromId: m.from?.id || '',
              fromName: m.from?.name || 'Usuario',
              isFromAgency: m.from?.id === pageId
            })).sort((a: NormalizedMessage, b: NormalizedMessage) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

            conversations.push({
              id: conv.id,
              platform: 'facebook',
              updatedAt: conv.updated_time || new Date().toISOString(),
              participant: {
                id: customer.id,
                name: customer.name || 'Usuario de Facebook'
              },
              lastMessage: normMessages[normMessages.length - 1]?.text || 'Conversación iniciada',
              messages: normMessages
            })
          }
        } else if (dataFb.error) {
          warnings.push(`Facebook Messenger: ${dataFb.error.message}`)
        }
      } catch (fbErr: any) {
        warnings.push(`Facebook error: ${fbErr.message}`)
      }
    }

    // Ordenar de más reciente a más antiguo
    conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

    return NextResponse.json({
      success: true,
      data: conversations,
      total: conversations.length,
      warnings: warnings.length > 0 ? warnings : undefined
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { platform, recipientId, message, conversationId } = body

    if (!recipientId || !message?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'recipientId y message son requeridos'
      }, { status: 400 })
    }

    let pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim()

    try {
      const { createClient } = await import('@/lib/supabase/server')
      const { getUserAgencyId, getValidFacebookPageToken } = await import('@/lib/services/integrations')
      const supabase = await createClient()
      const agencyId = await getUserAgencyId(supabase)
      const fbTokenRes = await getValidFacebookPageToken(supabase, agencyId)
      if (fbTokenRes.pageToken) pageToken = fbTokenRes.pageToken
    } catch (e) {}

    if (!pageToken) {
      return NextResponse.json({
        success: false,
        error: 'Token de acceso de Meta no configurado'
      }, { status: 400 })
    }

    // Envío oficial mediante Meta Send API (me/messages)
    const sendUrl = `https://graph.facebook.com/v21.0/me/messages?access_token=${pageToken}`
    const payload = {
      recipient: { id: recipientId },
      message: { text: message.trim() }
    }

    const res = await fetch(sendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const data = await res.json()

    if (!res.ok || data.error) {
      return NextResponse.json({
        success: false,
        error: data.error?.message || 'Error al enviar mensaje por Meta Graph API'
      }, { status: 400 })
    }

    // Registrar en Supabase CRM (DB_INTERACCIONES)
    try {
      const { createAdminClient } = await import('@/lib/supabase/server')
      const supabaseAdmin = createAdminClient()
      await supabaseAdmin.from('DB_INTERACCIONES').insert({
        ID: crypto.randomUUID(),
        Tipo_Interaccion: platform === 'instagram' ? 'Instagram DM Enviado' : 'Facebook Messenger Enviado',
        Detalle_Conversacion: `Destinatario ID: ${recipientId}. Mensaje: ${message.trim()}`,
        Vendedor: 'AutoApp Oficial',
        Fecha: new Date().toISOString().split('T')[0]
      })
    } catch (crmErr) {
      console.warn('Advertencia al registrar interacción en CRM:', crmErr)
    }

    return NextResponse.json({
      success: true,
      messageId: data.message_id || data.id,
      recipientId
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
