import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const platform = body.platform || 'instagram' // 'instagram' | 'facebook'

    let simulatedPayload: any = null

    if (platform === 'instagram_dm') {
      simulatedPayload = {
        object: 'instagram',
        entry: [
          {
            id: '17841474277477470',
            time: Math.floor(Date.now() / 1000),
            messaging: [
              {
                sender: { id: '9988776655' },
                recipient: { id: '17841474277477470' },
                timestamp: Date.now(),
                message: {
                  mid: 'mid.test_ig_dm_' + Date.now(),
                  text: body.message || 'Hola! Me interesa saber el valor de la cuota del Corolla publicado en Instagram y si aceptan usados en parte de pago.'
                }
              }
            ]
          }
        ]
      }
    } else if (platform === 'facebook_messenger') {
      simulatedPayload = {
        object: 'page',
        entry: [
          {
            id: '660246930503733',
            time: Math.floor(Date.now() / 1000),
            messaging: [
              {
                sender: { id: '1122334455' },
                recipient: { id: '660246930503733' },
                timestamp: Date.now(),
                message: {
                  mid: 'mid.test_fb_msg_' + Date.now(),
                  text: body.message || 'Buenas tardes, quería consultar si el vehículo sigue disponible para pasar a verlo por el salón de ventas.'
                }
              }
            ]
          }
        ]
      }
    } else if (platform === 'instagram') {
      simulatedPayload = {
        object: 'instagram',
        entry: [
          {
            id: '17841474277477470',
            time: Math.floor(Date.now() / 1000),
            changes: [
              {
                field: 'comments',
                value: {
                  id: 'test_comment_' + Date.now(),
                  text: body.message || '¿Hola, cuánto piden de entrega por el Corolla y toman permuta?',
                  from: {
                    id: '9988776655',
                    username: body.username || 'martin_gomez92'
                  },
                  media: {
                    id: '18029384756201928'
                  }
                }
              }
            ]
          }
        ]
      }
    } else {
      simulatedPayload = {
        object: 'page',
        entry: [
          {
            id: '660246930503733',
            time: Math.floor(Date.now() / 1000),
            changes: [
              {
                field: 'feed',
                value: {
                  item: 'comment',
                  verb: 'add',
                  comment_id: 'test_fb_comment_' + Date.now(),
                  post_id: '660246930503733_122190634118888958',
                  message: body.message || 'Buenas tardes, ¿sigue disponible el vehículo? ¿Qué financiación tienen?',
                  from: {
                    id: '1122334455',
                    name: body.username || 'Lucas Pereyra'
                  }
                }
              }
            ]
          }
        ]
      }
    }

    // Invocar el webhook localmente
    const origin = new URL(req.url).origin
    const webhookRes = await fetch(`${origin}/api/meta/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(simulatedPayload)
    })

    const webhookData = await webhookRes.json()

    return NextResponse.json({
      success: true,
      message: `Evento simulado de ${platform} enviado exitosamente al Webhook. Revisá tu Telegram para confirmar la notificación.`,
      webhookResponse: webhookData,
      simulatedPayload
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
