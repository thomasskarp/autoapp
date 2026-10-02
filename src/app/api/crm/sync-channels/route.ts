import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  return handleSync(req)
}

export async function POST(req: Request) {
  return handleSync(req)
}

async function handleSync(req: Request) {
  try {
    const supabase = createAdminClient()
    const url = new URL(req.url)
    const origin = url.origin

    let totalSynced = 0
    const syncedLeads: any[] = []

    // 1. Sincronizar Preguntas Pendientes de MercadoLibre
    try {
      const meliRes = await fetch(`${origin}/api/mercadolibre/questions`)
      const meliData = await meliRes.json()

      if (meliData.success && Array.isArray(meliData.questions)) {
        for (const q of meliData.questions) {
          if (q.status === 'UNANSWERED') {
            const leadId = `meli_q_${q.id}`
            const leadPayload = {
              ID: leadId,
              Nombre_Cliente: `Comprador MeLi #${q.from?.id || q.id}`,
              Auto_Interes: q.item_title || 'Vehículo en MercadoLibre',
              Notas: `[MercadoLibre] "${q.text}"\nID_PREGUNTA: ${q.id}\nITEM_ID: ${q.item_id}`,
              Etapa: 'SIN_RESPONDER',
              created_at: q.date_created || new Date().toISOString()
            }

            const { data, error } = await supabase
              .from('DB_LEADS')
              .upsert(leadPayload, { onConflict: 'ID' })
              .select()
              .single()

            if (!error && data) {
              totalSynced++
              syncedLeads.push(data)
            }
          }
        }
      }
    } catch (meliErr) {
      console.warn('[CRM Sync] Error sincronizando MercadoLibre:', meliErr)
    }

    // 2. Sincronizar Mensajes Directos de Instagram y Facebook
    try {
      const msgRes = await fetch(`${origin}/api/meta/messages`)
      const msgData = await msgRes.json()

      if (msgData.success && Array.isArray(msgData.data)) {
        for (const conv of msgData.data) {
          const lastMsg = conv.messages?.[conv.messages.length - 1]
          // Si el último mensaje es del cliente (no de la agencia), está sin responder
          if (lastMsg && !lastMsg.isFromAgency) {
            const isIg = conv.platform === 'instagram'
            const leadId = isIg ? `ig_dm_${conv.participant.id}` : `fb_msg_${conv.participant.id}`
            const channelTag = isIg ? 'Instagram DM' : 'Facebook Messenger'

            const leadPayload = {
              ID: leadId,
              Nombre_Cliente: `${isIg ? '@' : ''}${conv.participant.name} (${channelTag})`,
              Auto_Interes: `Consulta por Chat ${isIg ? 'Instagram' : 'Facebook'}`,
              Notas: `[${channelTag}] "${conv.lastMessage}"\nRECIPIENT_ID: ${conv.participant.id}\nCONVERSATION_ID: ${conv.id}`,
              Etapa: 'SIN_RESPONDER',
              created_at: conv.updatedAt || new Date().toISOString()
            }

            const { data, error } = await supabase
              .from('DB_LEADS')
              .upsert(leadPayload, { onConflict: 'ID' })
              .select()
              .single()

            if (!error && data) {
              totalSynced++
              syncedLeads.push(data)
            }
          }
        }
      }
    } catch (metaMsgErr) {
      console.warn('[CRM Sync] Error sincronizando Meta Messages:', metaMsgErr)
    }

    // 3. Sincronizar Comentarios Pendientes de Instagram
    try {
      const igComRes = await fetch(`${origin}/api/instagram/comments`)
      const igComData = await igComRes.json()

      if (igComData.success && Array.isArray(igComData.comments)) {
        for (const c of igComData.comments) {
          if (!c.isAnswered) {
            const leadId = `ig_c_${c.id}`
            const leadPayload = {
              ID: leadId,
              Nombre_Cliente: `@${c.authorName} (Instagram Comentario)`,
              Auto_Interes: c.postTitle || 'Publicación de Instagram',
              Notas: `[Instagram Comentario] "${c.message}"\nCOMMENT_ID: ${c.id}\nPOST_ID: ${c.postId}`,
              Etapa: 'SIN_RESPONDER',
              created_at: c.created_time || new Date().toISOString()
            }

            const { data, error } = await supabase
              .from('DB_LEADS')
              .upsert(leadPayload, { onConflict: 'ID' })
              .select()
              .single()

            if (!error && data) {
              totalSynced++
              syncedLeads.push(data)
            }
          }
        }
      }
    } catch (igComErr) {
      console.warn('[CRM Sync] Error sincronizando comentarios de Instagram:', igComErr)
    }

    // 4. Sincronizar Comentarios Pendientes de Facebook
    try {
      const fbComRes = await fetch(`${origin}/api/facebook/comments`)
      const fbComData = await fbComRes.json()

      if (fbComData.success && Array.isArray(fbComData.comments)) {
        for (const c of fbComData.comments) {
          if (!c.isAnswered) {
            const leadId = `fb_c_${c.id}`
            const leadPayload = {
              ID: leadId,
              Nombre_Cliente: `${c.authorName} (Facebook Comentario)`,
              Auto_Interes: c.postTitle || 'Publicación en Muro de Facebook',
              Notas: `[Facebook Comentario] "${c.message}"\nCOMMENT_ID: ${c.id}\nPOST_ID: ${c.postId}`,
              Etapa: 'SIN_RESPONDER',
              created_at: c.created_time || new Date().toISOString()
            }

            const { data, error } = await supabase
              .from('DB_LEADS')
              .upsert(leadPayload, { onConflict: 'ID' })
              .select()
              .single()

            if (!error && data) {
              totalSynced++
              syncedLeads.push(data)
            }
          }
        }
      }
    } catch (fbComErr) {
      console.warn('[CRM Sync] Error sincronizando comentarios de Facebook:', fbComErr)
    }

    return NextResponse.json({
      success: true,
      message: `Sincronización completada. Se centralizaron ${totalSynced} chats/consultas pendientes en el CRM.`,
      totalSynced,
      leads: syncedLeads
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
