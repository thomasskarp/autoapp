import { NextResponse } from 'next/server'
import { processAssistantMessage } from '@/lib/ai/assistant-agent'

export async function POST(req: Request) {
  try {
    const update = await req.json()
    const botToken = process.env.TELEGRAM_BOT_TOKEN

    // Manejo de mensajes de texto o fotos con caption
    const message = update.message || update.edited_message
    const callbackQuery = update.callback_query

    // Helper para enviar mensaje a Telegram
    const sendMessage = async (chatId: number | string, text: string, replyMarkup?: any) => {
      if (!botToken) {
        console.warn('[Telegram Webhook] TELEGRAM_BOT_TOKEN no configurado en entorno')
        return
      }

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'Markdown',
          reply_markup: replyMarkup
        })
      })
    }

    // ─── 1. CASO CALLBACK BUTTON (Click en botón de Telegram) ────────────────
    if (callbackQuery) {
      const chatId = callbackQuery.message?.chat?.id
      const data = callbackQuery.data
      const userId = String(callbackQuery.from?.id || chatId)

      if (data === 'publish_yes') {
        const res = await processAssistantMessage({
          userId,
          message: 'sí, publicar'
        })
        await sendMessage(chatId, res.reply)
      } else if (data === 'publish_no') {
        await sendMessage(chatId, '✅ Perfecto. El vehículo quedó guardado en tu Stock sin publicar en las redes.')
      }

      return NextResponse.json({ ok: true })
    }

    // ─── 2. CASO MENSAJE REGULAR ─────────────────────────────────────────────
    if (!message) {
      return NextResponse.json({ ok: true })
    }

    const chatId = message.chat.id
    const userId = String(message.from?.id || chatId)
    const text = message.text || message.caption || ''

    // Manejo de fotos adjuntas en Telegram
    let photoUrls: string[] = []
    if (message.photo && Array.isArray(message.photo) && message.photo.length > 0 && botToken) {
      try {
        const largestPhoto = message.photo[message.photo.length - 1]
        const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${largestPhoto.file_id}`)
        const fileData = await fileRes.json()
        if (fileData.ok && fileData.result?.file_path) {
          const directPhotoUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`
          photoUrls.push(directPhotoUrl)
        }
      } catch (fErr) {
        console.warn('[Telegram Webhook] Error al obtener URL de foto:', fErr)
      }
    }

    if (!text && photoUrls.length === 0) {
      return NextResponse.json({ ok: true })
    }

    // Procesar con el orquestador inteligente
    const result = await processAssistantMessage({
      userId,
      message: text || 'Foto de vehículo recibida para agregar al stock',
      photoUrls
    })

    // Si recién se creó el vehículo, ofrecemos botones inline interactivos
    let replyMarkup = undefined
    if (result.action === 'VEHICLE_CREATED') {
      replyMarkup = {
        inline_keyboard: [
          [
            { text: '🚀 Sí, Publicar Ahora', callback_data: 'publish_yes' },
            { text: '❌ Solo Guardar en Stock', callback_data: 'publish_no' }
          ]
        ]
      }
    }

    await sendMessage(chatId, result.reply, replyMarkup)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[Telegram Webhook Error]:', err)
    return NextResponse.json({ ok: true })
  }
}
