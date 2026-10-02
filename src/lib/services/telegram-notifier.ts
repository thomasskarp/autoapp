/**
 * Servicio de Notificaciones Instantáneas a Telegram
 * Envía alertas de leads, comentarios de redes sociales y eventos en tiempo real.
 */

export interface TelegramButton {
  text: string
  url?: string
  callback_data?: string
}

export interface SendTelegramAlertParams {
  title: string
  source: 'instagram' | 'facebook' | 'mercadolibre' | 'system'
  userName?: string
  userHandle?: string
  messageText: string
  vehicleInfo?: string
  permalink?: string
  suggestedAnswer?: string
  chatId?: string | number
  buttons?: TelegramButton[][]
}

export async function sendTelegramNotification(params: SendTelegramAlertParams): Promise<{ success: boolean; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const defaultChatId = process.env.ALLOWED_TELEGRAM_CHAT_IDS?.split(',')[0]?.trim() || '1377596204'
  const targetChatId = params.chatId || defaultChatId

  if (!botToken) {
    console.warn('[Telegram Notifier] TELEGRAM_BOT_TOKEN no configurado en entorno')
    return { success: false, error: 'TELEGRAM_BOT_TOKEN no configurado' }
  }

  // Emojis según la plataforma
  const icon = params.source === 'instagram' 
    ? '📸' 
    : params.source === 'facebook' 
    ? '📘' 
    : params.source === 'mercadolibre' 
    ? '🟡' 
    : '⚡'

  const platformName = params.source === 'instagram'
    ? 'Instagram Oficial (@okmmotors)'
    : params.source === 'facebook'
    ? 'Facebook Fan Page (SK automotores)'
    : params.source === 'mercadolibre'
    ? 'MercadoLibre'
    : 'AutoApp'

  // Armado del mensaje en Markdown de Telegram
  let text = `${icon} *NUEVA CONSULTA EN TIEMPO REAL*\n`
  text += `📍 *Plataforma:* ${platformName}\n`
  
  if (params.userHandle) {
    text += `👤 *Usuario:* @${params.userHandle.replace(/^@/, '')}\n`
  } else if (params.userName) {
    text += `👤 *Usuario:* ${params.userName}\n`
  }

  if (params.vehicleInfo) {
    text += `🚘 *Vehículo:* ${params.vehicleInfo}\n`
  }

  text += `\n💬 *Mensaje del cliente:*\n"${params.messageText}"\n`

  if (params.suggestedAnswer) {
    text += `\n💡 *Respuesta sugerida con IA:*\n_${params.suggestedAnswer}_\n`
  }

  // Botones inline
  let inline_keyboard: any[][] = []

  if (params.buttons && params.buttons.length > 0) {
    inline_keyboard = params.buttons
  } else if (params.permalink) {
    inline_keyboard = [
      [
        { text: '🔗 Ver en ' + (params.source === 'instagram' ? 'Instagram' : 'Facebook'), url: params.permalink }
      ]
    ]
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: inline_keyboard.length > 0 ? { inline_keyboard } : undefined
      })
    })

    const data = await res.json()

    if (!res.ok || !data.ok) {
      console.error('[Telegram Notifier] Error al enviar mensaje:', data)
      return { success: false, error: data.description || 'Error en API de Telegram' }
    }

    return { success: true }
  } catch (err: any) {
    console.error('[Telegram Notifier] Excepción enviando notificación:', err)
    return { success: false, error: err.message }
  }
}
