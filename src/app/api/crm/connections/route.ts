import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getCRMConnectionsOverview,
  saveMetaConnection,
  saveMeliConnection,
  saveWhatsAppCloudConnection,
  disconnectProvider
} from '@/lib/services/crm-connections'

export async function GET() {
  try {
    const supabase = await createClient()
    const overview = await getCRMConnectionsOverview(supabase)
    return NextResponse.json({ success: true, connections: overview })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json()
    const { action, provider, data } = body

    if (action === 'save_meta') {
      const res = await saveMetaConnection(supabase, {
        pageId: data.pageId,
        pageToken: data.pageToken,
        pageName: data.pageName,
        igUserId: data.igUserId,
        igUsername: data.igUsername,
        appId: data.appId,
        appSecret: data.appSecret,
        verifyToken: data.verifyToken,
      })
      return NextResponse.json(res)
    }

    if (action === 'save_meli') {
      const res = await saveMeliConnection(supabase, {
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        accessToken: data.accessToken,
        nickname: data.nickname,
      })
      return NextResponse.json(res)
    }

    if (action === 'save_whatsapp_cloud') {
      const res = await saveWhatsAppCloudConnection(supabase, {
        phoneNumberId: data.phoneNumberId,
        wabaId: data.wabaId,
        accessToken: data.accessToken,
        phoneNumber: data.phoneNumber,
        verifyToken: data.verifyToken,
      })
      return NextResponse.json(res)
    }

    if (action === 'disconnect') {
      const targetProvider = provider === 'meta' ? 'facebook_page' : provider
      const res = await disconnectProvider(supabase, targetProvider)
      return NextResponse.json(res)
    }

    if (action === 'test_meta') {
      // Prueba de validación de token de Meta contra Graph API (sin enviar mensajes)
      const token = data.pageToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN
      const pageId = data.pageId || process.env.FACEBOOK_PAGE_ID
      if (!token || !pageId) {
        return NextResponse.json({ success: false, message: 'Falta Page ID o Access Token para probar.' })
      }
      try {
        const metaRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}?fields=id,name&access_token=${token}`)
        const metaJson = await metaRes.json()
        if (metaRes.ok && metaJson.id) {
          return NextResponse.json({ success: true, message: `Conexión exitosa con Meta: ${metaJson.name} (ID: ${metaJson.id})` })
        }
        return NextResponse.json({ success: false, message: metaJson.error?.message || 'Error validando credenciales de Meta.' })
      } catch (e: any) {
        return NextResponse.json({ success: false, message: 'Error de red con Meta: ' + e.message })
      }
    }

    if (action === 'test_meli') {
      // Prueba de validación de MercadoLibre (sin publicar ni enviar)
      const token = data.accessToken || process.env.MERCADOLIBRE_ACCESS_TOKEN
      if (!token) {
        return NextResponse.json({ success: false, message: 'Token de acceso no ingresado aún. Podés vincular con el botón de OAuth o ingresar el token.' })
      }
      try {
        const meliRes = await fetch('https://api.mercadolibre.com/users/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const meliJson = await meliRes.json()
        if (meliRes.ok && meliJson.id) {
          return NextResponse.json({ success: true, message: `Conexión exitosa con MercadoLibre: ${meliJson.nickname} (ID: ${meliJson.id})` })
        }
        return NextResponse.json({ success: false, message: meliJson.message || 'Token no válido o expirado.' })
      } catch (e: any) {
        return NextResponse.json({ success: false, message: 'Error de conexión con MercadoLibre: ' + e.message })
      }
    }

    if (action === 'test_whatsapp_cloud') {
      // Prueba de validación de WhatsApp Cloud API (solo valida el Phone Number ID en Meta)
      const token = data.accessToken || process.env.WHATSAPP_CLOUD_ACCESS_TOKEN
      const phoneId = data.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID
      if (!token || !phoneId) {
        return NextResponse.json({ success: false, message: 'Falta Phone Number ID o Access Token para verificar.' })
      }
      try {
        const waRes = await fetch(`https://graph.facebook.com/v21.0/${phoneId}?access_token=${token}`)
        const waJson = await waRes.json()
        if (waRes.ok && waJson.id) {
          return NextResponse.json({
            success: true,
            message: `Número verificado en WhatsApp Cloud API: ${waJson.display_phone_number || waJson.id} (${waJson.verified_name || 'Agencia'})`
          })
        }
        return NextResponse.json({ success: false, message: waJson.error?.message || 'Error validando credenciales de WhatsApp Cloud API.' })
      } catch (e: any) {
        return NextResponse.json({ success: false, message: 'Error de red con Meta WhatsApp: ' + e.message })
      }
    }

    return NextResponse.json({ success: false, error: 'Acción no reconocida' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
