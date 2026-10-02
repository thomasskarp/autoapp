import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { leadId, channel, replyText, manualStage, metadata = {} } = body

    if (!leadId || !replyText?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'leadId y replyText son obligatorios'
      }, { status: 400 })
    }

    const supabase = createAdminClient()
    const origin = new URL(req.url).origin
    let channelResult: any = null

    // 1. Despachar la respuesta al canal oficial
    try {
      if (channel === 'MELI' && metadata.questionId) {
        const res = await fetch(`${origin}/api/mercadolibre/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId: metadata.questionId, text: replyText.trim() })
        })
        channelResult = await res.json()
      } else if (channel === 'INSTAGRAM_DM' && metadata.recipientId) {
        const res = await fetch(`${origin}/api/meta/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform: 'instagram',
            recipientId: metadata.recipientId,
            message: replyText.trim()
          })
        })
        channelResult = await res.json()
      } else if (channel === 'INSTAGRAM_COMMENT' && metadata.commentId) {
        const res = await fetch(`${origin}/api/instagram/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commentId: metadata.commentId,
            text: replyText.trim()
          })
        })
        channelResult = await res.json()
      } else if (channel === 'FACEBOOK_MESSENGER' && metadata.recipientId) {
        const res = await fetch(`${origin}/api/meta/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform: 'facebook',
            recipientId: metadata.recipientId,
            message: replyText.trim()
          })
        })
        channelResult = await res.json()
      } else if (channel === 'FACEBOOK_COMMENT' && metadata.commentId) {
        const res = await fetch(`${origin}/api/facebook/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commentId: metadata.commentId,
            text: replyText.trim()
          })
        })
        channelResult = await res.json()
      }
    } catch (dispatchErr: any) {
      console.warn('[CRM Reply] Advertencia al despachar mensaje al canal:', dispatchErr)
    }

    // 2. Registrar en DB_INTERACCIONES
    try {
      await supabase.from('DB_INTERACCIONES').insert({
        ID: crypto.randomUUID(),
        ID_LEAD: leadId,
        Tipo_Interaccion: `CRM_REPLY_${channel || 'DIRECT'}`,
        Detalle_Conversacion: `Respuesta enviada a ${metadata.customerName || 'Cliente'}: "${replyText.trim()}"`,
        Vendedor: 'AutoApp CRM',
        Fecha: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
    } catch (e) {
      console.warn('[CRM Reply] Error guardando interacción:', e)
    }

    // 3. Determinar la nueva etapa (clasificación manual o con IA)
    let nextStage = manualStage || 'FOTOS_INFO'

    if (!manualStage) {
      try {
        nextStage = await classifyLeadWithAI(metadata.lastCustomerMessage || '', replyText.trim())
      } catch (aiErr) {
        console.warn('[CRM Reply] Error en clasificación IA, usando fallback:', aiErr)
      }
    }

    // 4. Actualizar el lead en DB_LEADS
    const { data: updatedLead, error: updateErr } = await supabase
      .from('DB_LEADS')
      .update({
        Etapa: nextStage,
        Notas: `${metadata.existingNotas || ''}\n\n[Respuesta Enviada - ${new Date().toLocaleTimeString('es-AR')}]: "${replyText.trim()}"`
      })
      .eq('ID', leadId)
      .select()
      .single()

    if (updateErr) {
      console.error('[CRM Reply] Error actualizando etapa en DB_LEADS:', updateErr.message)
    }

    return NextResponse.json({
      success: true,
      newStage: nextStage,
      lead: updatedLead,
      channelResult
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

/**
 * Clasifica la conversación en una de las etapas comerciales reales con Gemini AI
 */
async function classifyLeadWithAI(customerMessage: string, replyMessage: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    // Clasificación heurística básica
    const lower = (customerMessage + ' ' + replyMessage).toLowerCase()
    if (lower.includes('visita') || lower.includes('ver') || lower.includes('salon') || lower.includes('showroom') || lower.includes('pasar')) {
      return 'VISITA'
    }
    if (lower.includes('cuota') || lower.includes('financi') || lower.includes('anticipo') || lower.includes('credito')) {
      return 'FINANCIACION'
    }
    if (lower.includes('toman') || lower.includes('usado') || lower.includes('permuta') || lower.includes('cotiz')) {
      return 'COTIZACION'
    }
    if (lower.includes('foto') || lower.includes('ficha') || lower.includes('km') || lower.includes('info')) {
      return 'FOTOS_INFO'
    }
    return 'CURIOSOS'
  }

  const prompt = `Sos el director comercial de una concesionaria automotor.
Un cliente envió una consulta y se le acaba de responder.
Mensaje del cliente: "${customerMessage}"
Respuesta enviada: "${replyMessage}"

Clasificá al cliente en EXACTAMENTE UNA de las siguientes etapas según el objetivo comercial:
- VISITA: Si se coordinó o invitó a ver/probar el auto presencialmente en la agencia.
- COTIZACION: Si el cliente busca tasar o entregar un auto usado en parte de pago o espera cotización.
- FINANCIACION: Si consultó por cuotas fijas, tasa, créditos prendarios o anticipo de dinero.
- FOTOS_INFO: Si se le enviaron o solicitaron fotos, ficha técnica o especificaciones del vehículo.
- CURIOSOS: Si fue solo una pregunta de paso, no demostró intención firme o no avanzó.
- CERRADO: Si la venta o seña ya fue concretada.

Devolvé ÚNICAMENTE la palabra clave elegida (VISITA, COTIZACION, FINANCIACION, FOTOS_INFO, CURIOSOS o CERRADO).`

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 20 }
    })
  })

  const data = await res.json()
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()?.toUpperCase() || ''

  const validStages = ['VISITA', 'COTIZACION', 'FINANCIACION', 'FOTOS_INFO', 'CURIOSOS', 'CERRADO']
  const matched = validStages.find(s => rawText.includes(s))
  return matched || 'FOTOS_INFO'
}
