import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { sendTelegramNotification } from '@/lib/services/telegram-notifier'

// Token secreto para verificar el webhook con Meta Developers
const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN

function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.FACEBOOK_APP_SECRET
  if (!appSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Meta Webhook] FACEBOOK_APP_SECRET no configurado en entorno de producción. Rechazando payload.')
      return false
    }
    return true
  }

  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false
  }

  const expectedSignature = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expectedSignature))
  } catch {
    return false
  }
}

/**
 * GET: Verificación del Webhook por parte de Meta Developers (Subscription Challenge)
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    if (!VERIFY_TOKEN) {
      console.error('[Meta Webhook Verification] META_WEBHOOK_VERIFY_TOKEN no está definido en variables de entorno.')
      return new Response('Configuración incompleta', { status: 500 })
    }

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[Meta Webhook Verification] ¡Verificación exitosa!')
      return new Response(challenge || '', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    console.warn('[Meta Webhook Verification] Token o modo inválido.')
    return new Response('Verificación rechazada: Token inválido', { status: 403 })
  } catch (err: any) {
    console.error('[Meta Webhook Verification Exception]:', err)
    return new Response('Error interno', { status: 500 })
  }
}

/**
 * POST: Recepción de eventos en tiempo real (Push Notifications de Meta)
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-hub-signature-256')

    // Validar firma criptográfica HMAC-SHA256
    if (!verifyMetaSignature(rawBody, signature)) {
      console.warn('[Meta Webhook] Intento de invocación con firma X-Hub-Signature-256 inválida o ausente.')
      return NextResponse.json({ error: 'Firma criptográfica inválida' }, { status: 401 })
    }

    const body = JSON.parse(rawBody)
    console.log('[Meta Webhook Event] Payload verificado recibido:', JSON.stringify(body, null, 2))

    const objectType = body.object // 'instagram' o 'page'

    if (objectType === 'instagram') {
      await handleInstagramEvent(body)
    } else if (objectType === 'page') {
      await handleFacebookPageEvent(body)
    }

    // Meta exige responder 200 OK inmediatamente
    return NextResponse.json({ status: 'EVENT_RECEIVED' })
  } catch (err: any) {
    console.error('[Meta Webhook POST Exception]:', err)
    return NextResponse.json({ status: 'ERROR', error: err.message }, { status: 200 })
  }
}

/**
 * Procesa eventos entrantes de Instagram Business (@okmmotors)
 */
async function handleInstagramEvent(body: any) {
  const entries = body.entry || []

  for (const entry of entries) {
    const changes = entry.changes || []

    for (const change of changes) {
      const field = change.field
      const val = change.value

      // 1. Evento de Comentarios en Instagram
      if (field === 'comments' && val) {
        const commentId = val.id
        const text = val.text || ''
        const userHandle = val.from?.username || 'interesado'
        const mediaId = val.media?.id

        // Omitir si es un comentario emitido por la propia cuenta
        if (userHandle === 'okmmotors') continue

        console.log(`[Meta Webhook IG] Nuevo comentario de @${userHandle}: "${text}" en media ${mediaId}`)

        // Consultar contexto del post si es posible
        let permalink = 'https://www.instagram.com/okmmotors/'
        let postTitle = 'Publicación de Instagram (@okmmotors)'

        try {
          const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN
          if (mediaId && accessToken) {
            const mRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}?fields=permalink,caption&access_token=${accessToken}`)
            const mData = await mRes.json()
            if (mData.permalink) permalink = mData.permalink
            if (mData.caption) postTitle = mData.caption.split('\n')[0].replace(/^[🔥✨🚘🚗💰 ]+/, '').trim()
          }
        } catch (e) {
          console.warn('[Meta Webhook IG] No se pudo obtener permalink del media:', e)
        }

        // Generar respuesta con IA sugerida
        let suggestedAnswer = `¡Hola @${userHandle}! Sí, está disponible con entrega inmediata. Podés financiar con un anticipo mínimo del 50% y saldo en cuotas fijas. Escribinos a WhatsApp para coordinar una prueba de manejo.`
        try {
          suggestedAnswer = await generateQuickAISuggestion(text, postTitle)
        } catch (aiErr) {
          console.warn('[Meta Webhook IG] Error generando sugerencia IA:', aiErr)
        }

        // 1. Notificar a Telegram al instante
        await sendTelegramNotification({
          title: 'Nuevo Comentario en Instagram',
          source: 'instagram',
          userHandle: userHandle,
          messageText: text,
          vehicleInfo: postTitle,
          permalink: permalink,
          suggestedAnswer: suggestedAnswer
        })

        // 2. Registrar en Supabase DB_INTERACCIONES
        try {
          const { createAdminClient } = await import('@/lib/supabase/server')
          const supabase = createAdminClient()
          await supabase.from('DB_INTERACCIONES').insert({
            ID: crypto.randomUUID(),
            Tipo_Interaccion: 'Instagram - COMENTARIO REAL-TIME',
            Detalle_Conversacion: `Consulta de @${userHandle}: "${text}" (Vehículo: ${postTitle})\n\nRespuesta IA sugerida: "${suggestedAnswer}"`,
            Vendedor: 'AutoApp Meta Webhook AI',
            Fecha: new Date().toISOString(),
            created_at: new Date().toISOString()
          })

          // Ingestar en DB_LEADS para el CRM Omnicanal
          await supabase.from('DB_LEADS').upsert({
            ID: `ig_c_${commentId}`,
            Nombre_Cliente: `@${userHandle} (Instagram Comentario)`,
            Auto_Interes: postTitle,
            Notas: `[Instagram Comentario] "${text}"\nCOMMENT_ID: ${commentId}\nSugerencia IA: "${suggestedAnswer}"`,
            Etapa: 'SIN_RESPONDER',
            created_at: new Date().toISOString()
          }, { onConflict: 'ID' })
        } catch (dbErr) {
          console.warn('[Meta Webhook IG] Excepción guardando en base de datos:', dbErr)
        }
      }
    }

    // 2. Eventos de Mensajería Directa en Instagram (DMs)
    const messaging = entry.messaging || []
    for (const msg of messaging) {
      if (msg.message && msg.message.text) {
        const senderId = msg.sender?.id
        const ownIgId = process.env.INSTAGRAM_ACCOUNT_ID || '17841474277477470'
        if (senderId === ownIgId) continue

        const text = msg.message.text
        console.log(`[Meta Webhook IG Messaging] Nuevo DM de ${senderId}: "${text}"`)

        let suggestedAnswer = '¡Hola! Gracias por comunicarte con @okmmotors. Sí, lo tenemos disponible con entrega inmediata. Podés retirar con el 50% de anticipo y cuotas fijas.'
        try {
          suggestedAnswer = await generateQuickAISuggestion(text, 'Mensaje Directo de Instagram (@okmmotors)')
        } catch (e) {}

        await sendTelegramNotification({
          title: '💬 Nuevo Mensaje Directo (Instagram DM)',
          source: 'instagram',
          userHandle: `id_${senderId}`,
          messageText: text,
          vehicleInfo: 'Chat Privado Instagram (@okmmotors)',
          permalink: 'https://www.instagram.com/direct/inbox/',
          suggestedAnswer: suggestedAnswer
        })

        try {
          const { createAdminClient } = await import('@/lib/supabase/server')
          const supabase = createAdminClient()
          await supabase.from('DB_INTERACCIONES').insert({
            ID: crypto.randomUUID(),
            Tipo_Interaccion: 'Instagram - DM ENTRANTE REAL-TIME',
            Detalle_Conversacion: `Mensaje directo de ${senderId}: "${text}"\n\nRespuesta IA sugerida: "${suggestedAnswer}"`,
            Vendedor: 'AutoApp Meta Webhook AI',
            Fecha: new Date().toISOString(),
            created_at: new Date().toISOString()
          })

          // Ingestar en DB_LEADS para el CRM Omnicanal
          await supabase.from('DB_LEADS').upsert({
            ID: `ig_dm_${senderId}`,
            Nombre_Cliente: `@id_${senderId} (Instagram DM)`,
            Auto_Interes: 'Consulta por Instagram DM',
            Notas: `[Instagram DM] "${text}"\nRECIPIENT_ID: ${senderId}\nSugerencia IA: "${suggestedAnswer}"`,
            Etapa: 'SIN_RESPONDER',
            created_at: new Date().toISOString()
          }, { onConflict: 'ID' })
        } catch (e) {}
      }
    }
  }
}

/**
 * Procesa eventos entrantes de Facebook Fan Page (SK automotores)
 */
async function handleFacebookPageEvent(body: any) {
  const entries = body.entry || []

  for (const entry of entries) {
    const changes = entry.changes || []

    for (const change of changes) {
      const field = change.field
      const val = change.value

      // 1. Evento de Feed (Comentarios en el muro)
      if (field === 'feed' && val) {
        const itemType = val.item // 'comment', 'post', 'reaction', etc.
        const verb = val.verb // 'add', 'edited', 'remove'

        if (itemType === 'comment' && verb === 'add') {
          const text = val.message || ''
          const userName = val.from?.name || 'Usuario de Facebook'
          const postId = val.post_id || ''

          // Omitir si es un comentario de la propia página
          const ownPageId = process.env.FACEBOOK_PAGE_ID
          if (val.from?.id && val.from.id === ownPageId) continue

          console.log(`[Meta Webhook FB] Nuevo comentario de ${userName}: "${text}" en post ${postId}`)

          const permalink = `https://facebook.com/${postId}`
          const postTitle = 'Publicación en Muro de Facebook'

          let suggestedAnswer = `Hola ${userName}! Está disponible. Financiamos con anticipo mínimo del 50% y cuotas fijas en pesos. ¡Escribinos para verlo en el showroom!`
          try {
            suggestedAnswer = await generateQuickAISuggestion(text, postTitle)
          } catch (aiErr) {
            console.warn('[Meta Webhook FB] Error generando sugerencia IA:', aiErr)
          }

          // 1. Notificar a Telegram al instante
          await sendTelegramNotification({
            title: 'Nuevo Comentario en Facebook',
            source: 'facebook',
            userName: userName,
            messageText: text,
            vehicleInfo: postTitle,
            permalink: permalink,
            suggestedAnswer: suggestedAnswer
          })

          // 2. Registrar en Supabase DB_INTERACCIONES
          try {
            const { createAdminClient } = await import('@/lib/supabase/server')
            const supabase = createAdminClient()
            const { error: insErr } = await supabase.from('DB_INTERACCIONES').insert({
              ID: crypto.randomUUID(),
              Tipo_Interaccion: 'Facebook - COMENTARIO REAL-TIME',
              Detalle_Conversacion: `Consulta de ${userName}: "${text}" (Vehículo: ${postTitle})\n\nRespuesta IA sugerida: "${suggestedAnswer}"`,
              Vendedor: 'AutoApp Meta Webhook AI',
              Fecha: new Date().toISOString(),
              created_at: new Date().toISOString()
            })

            // Ingestar en DB_LEADS para el CRM Omnicanal
            await supabase.from('DB_LEADS').upsert({
              ID: `fb_c_${val.comment_id || Date.now()}`,
              Nombre_Cliente: `${userName} (Facebook Comentario)`,
              Auto_Interes: postTitle,
              Notas: `[Facebook Comentario] "${text}"\nCOMMENT_ID: ${val.comment_id}\nPOST_ID: ${postId}\nSugerencia IA: "${suggestedAnswer}"`,
              Etapa: 'SIN_RESPONDER',
              created_at: new Date().toISOString()
            }, { onConflict: 'ID' })
          } catch (dbErr) {
            console.warn('[Meta Webhook FB] Excepción guardando en base de datos:', dbErr)
          }
        }
      }
    }

    // 2. Eventos de Mensajería Directa en Facebook Messenger
    const fbMessaging = entry.messaging || []
    for (const msg of fbMessaging) {
      if (msg.message && msg.message.text) {
        const senderId = msg.sender?.id
        const ownPageId = process.env.FACEBOOK_PAGE_ID || '660246930503733'
        if (senderId === ownPageId) continue

        const text = msg.message.text
        console.log(`[Meta Webhook FB Messenger] Nuevo mensaje de ${senderId}: "${text}"`)

        let suggestedAnswer = '¡Hola! Gracias por comunicarte con SK automotores. Sí, tenemos unidades disponibles con entrega inmediata y tomamos tu usado en parte de pago.'
        try {
          suggestedAnswer = await generateQuickAISuggestion(text, 'Facebook Messenger (SK automotores)')
        } catch (e) {}

        await sendTelegramNotification({
          title: '💬 Nuevo Mensaje (Facebook Messenger)',
          source: 'facebook',
          userName: `Cliente (ID: ${senderId})`,
          messageText: text,
          vehicleInfo: 'Chat Privado Facebook Messenger',
          permalink: 'https://business.facebook.com/latest/inbox/messenger',
          suggestedAnswer: suggestedAnswer
        })

        try {
          const { createAdminClient } = await import('@/lib/supabase/server')
          const supabase = createAdminClient()
          await supabase.from('DB_INTERACCIONES').insert({
            ID: crypto.randomUUID(),
            Tipo_Interaccion: 'Facebook - MESSENGER ENTRANTE REAL-TIME',
            Detalle_Conversacion: `Mensaje de Messenger de ${senderId}: "${text}"\n\nRespuesta IA sugerida: "${suggestedAnswer}"`,
            Vendedor: 'AutoApp Meta Webhook AI',
            Fecha: new Date().toISOString(),
            created_at: new Date().toISOString()
          })

          // Ingestar en DB_LEADS para el CRM Omnicanal
          await supabase.from('DB_LEADS').upsert({
            ID: `fb_msg_${senderId}`,
            Nombre_Cliente: `Cliente ID ${senderId} (Facebook Messenger)`,
            Auto_Interes: 'Consulta por Facebook Messenger',
            Notas: `[Facebook Messenger] "${text}"\nRECIPIENT_ID: ${senderId}\nSugerencia IA: "${suggestedAnswer}"`,
            Etapa: 'SIN_RESPONDER',
            created_at: new Date().toISOString()
          }, { onConflict: 'ID' })
        } catch (e) {}
      }
    }
  }
}

/**
 * Genera una respuesta persuasiva corta orientada al cierre con Gemini AI
 */
async function generateQuickAISuggestion(userQuestion: string, vehicleTitle: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return '¡Hola! Sí, está disponible con entrega inmediata. Podés financiar con entrega mínima del 50% y saldo en cuotas fijas. Escribinos por privado o WhatsApp para más detalles.'
  }

  const prompt = `Sos el asesor de ventas automotor de la concesionaria oficial SK automotores / @okmmotors.
Un cliente acaba de comentar en una publicación de redes sociales sobre el vehículo: "${vehicleTitle}".
Comentario del cliente: "${userQuestion}"

Redactá una respuesta súper atractiva, profesional y cálida para responder el comentario:
- Máximo 2 o 3 oraciones.
- Confirmá disponibilidad, mencioná la posibilidad de financiar con 50% de entrega o tomar permuta.
- Hacé un llamado a la acción para que escriban por privado o por WhatsApp.`

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 150 }
    })
  })

  const data = await res.json()
  const generated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  return generated || '¡Hola! Sí, está disponible. Podés retirar con el 50% y financiar el saldo en cuotas fijas. ¡Escribinos para coordinar una visita!'
}
