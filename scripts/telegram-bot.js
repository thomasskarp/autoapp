/**
 * Script de Polling en Desarrollo Local para el Agente de Telegram
 * Ejecutar con: npm run bot:dev
 * 
 * Permite que el bot responda al instante en desarrollo local SIN necesidad de túneles ni webhooks públicos.
 */

const fs = require('fs')
const path = require('path')

// Cargar variables de entorno desde .env.local
const envPath = path.resolve(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8')
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = (match[2] || '').trim().replace(/^['"]|['"]$/g, '')
    }
  })
}

const botToken = process.env.TELEGRAM_BOT_TOKEN
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

if (!botToken || botToken === 'PEGA_AQUI_TU_TELEGRAM_BOT_TOKEN') {
  console.log(`
================================================================================
🤖 CONFIGURACIÓN DEL AGENTE DE TELEGRAM (AUTOAPP)
================================================================================
Para chatear con el bot en Telegram y pedirle que agregue autos y publique:

1. Abrí Telegram y buscá a: @BotFather
2. Escribile el comando: /newbot
3. Elegí un nombre (ej. AutoApp Agente) y un usuario (ej. AutoAppAgenteBot)
4. BotFather te va a dar un TOKEN (algo como: 7123456789:AAHk...)
5. Agregalo en tu archivo .env.local:
   TELEGRAM_BOT_TOKEN=tu_token_aqui

¡Y volvé a ejecutar: npm run bot:dev!
================================================================================
`)
  process.exit(0)
}

console.log(`🤖 Iniciando Agente de Telegram en modo interactivo...`)
console.log(`📡 Conectando con AutoApp API en: ${appUrl}/api/bot/telegram\n`)

let offset = 0

async function deleteWebhook() {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`)
  } catch (e) {}
}

async function poll() {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?offset=${offset}&timeout=30`)
    const data = await res.json()

    if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
      for (const update of data.result) {
        offset = update.update_id + 1

        const userMsg = update.message?.text || update.message?.caption || update.callback_query?.data || ''
        const sender = update.message?.from?.first_name || update.callback_query?.from?.first_name || 'Usuario'

        console.log(`📩 Mensaje recibido de ${sender}: "${userMsg}"`)

        // Reenviar update al webhook interno de Next.js
        try {
          await fetch(`${appUrl}/api/bot/telegram`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(update)
          })
        } catch (postErr) {
          console.error('❌ Error al procesar en API local:', postErr.message)
        }
      }
    }
  } catch (err) {
    if (!err.message?.includes('timeout')) {
      console.error('⚠️ Error en polling de Telegram:', err.message)
    }
  }

  setTimeout(poll, 1000)
}

deleteWebhook().then(() => {
  console.log('✅ Bot listo y escuchando en Telegram. ¡Escribile en la app de Telegram!')
  poll()
})
