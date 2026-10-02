import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { vehicle, customCopy, customTitle } = body || {}

    if (!vehicle || (!vehicle.Marca && !vehicle.marca)) {
      return NextResponse.json({ success: false, error: 'Datos del vehículo incompletos' }, { status: 400 })
    }

    let igUserId = process.env.INSTAGRAM_ACCOUNT_ID?.trim() || '17841474277477470'
    let accessToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim()

    try {
      const { createClient } = await import('@/lib/supabase/server')
      const { getUserAgencyId, getValidInstagramToken } = await import('@/lib/services/integrations')
      const supabase = await createClient()
      const agencyId = await getUserAgencyId(supabase)
      const tokenRes = await getValidInstagramToken(supabase, agencyId)
      if (tokenRes.accessToken) {
        accessToken = tokenRes.accessToken
      }
      if (tokenRes.igUserId) {
        igUserId = tokenRes.igUserId
      }
    } catch (dbErr) {
      // Fallback a env
    }

    if (!igUserId || !accessToken) {
      return NextResponse.json({ success: false, error: 'Credenciales de Instagram no configuradas' }, { status: 400 })
    }

    // Extraer datos del vehículo
    const marca = vehicle.Marca || vehicle.marca || 'Vehículo'
    const modelo = vehicle.Modelo || vehicle.modelo || ''
    const version = vehicle.Version || vehicle.version || ''
    const anio = vehicle.Año || vehicle.Anio || vehicle.anio || '2024'
    const kmNum = vehicle.Km ?? vehicle.km ?? vehicle.kms ?? 0
    const kmsText = `${Number(kmNum).toLocaleString('es-AR')} km`

    const numericPrice = typeof vehicle.Precio_Venta === 'number'
      ? vehicle.Precio_Venta
      : (parseFloat(vehicle.Precio_Venta || vehicle.precioNumero || '0') || 0)

    const formattedPrice = numericPrice > 0 ? `$${numericPrice.toLocaleString('es-AR')}` : 'Consultar'
    const entrega50 = (vehicle.Precio_entrega && Number(vehicle.Precio_entrega) > 0)
      ? `$${Number(vehicle.Precio_entrega).toLocaleString('es-AR')}`
      : (numericPrice > 0 ? `$${Math.round(numericPrice * 0.5).toLocaleString('es-AR')}` : 'Consultar')

    const combustible = vehicle.Tipo_Combustible || vehicle.combustible || 'Nafta'
    const transmision = vehicle.Transmision || vehicle.transmision || 'Manual'

    // Extraer lista de fotos ordenadas
    let photos: string[] = []
    if (Array.isArray(vehicle.photoLinks) && vehicle.photoLinks.length > 0) {
      photos = vehicle.photoLinks
    } else if (Array.isArray(vehicle.FOTOS_EXTRA)) {
      photos = [vehicle.FOTO_PORTADA, ...vehicle.FOTOS_EXTRA].filter(Boolean)
    } else if (typeof vehicle.FOTOS_EXTRA === 'string') {
      try {
        const parsed = JSON.parse(vehicle.FOTOS_EXTRA)
        photos = [vehicle.FOTO_PORTADA, ...(Array.isArray(parsed) ? parsed : [])].filter(Boolean)
      } catch (e) {
        photos = [vehicle.FOTO_PORTADA].filter(Boolean)
      }
    } else if (vehicle.FOTO_PORTADA) {
      photos = [vehicle.FOTO_PORTADA]
    } else if (vehicle.imagenPath) {
      photos = [vehicle.imagenPath]
    }

    // Filtrar fotos públicas válidas (máximo 10 para carrusel de Instagram)
    const validPhotos = photos.filter(p => typeof p === 'string' && p.startsWith('http')).slice(0, 10)

    if (validPhotos.length === 0) {
      return NextResponse.json({ success: false, error: 'El vehículo debe tener al menos una fotografía con URL pública para publicar en Instagram.' }, { status: 400 })
    }

    // Generar Copy optimizado para Instagram
    const title = customTitle || `${marca} ${modelo} ${version} ${anio}`.replace(/\s+/g, ' ').trim()

    let caption = customCopy
    if (!caption) {
      const cleanMarcaTag = marca.toLowerCase().replace(/[^a-z0-9]/g, '')
      const cleanModeloTag = modelo.toLowerCase().replace(/[^a-z0-9]/g, '')

      const copyLines = [
        `🔥 ${title} 🔥`,
        `Swipe ➡️ para ver todos los detalles del vehículo`,
        ``,
        `📍 Año: ${anio} | Kilometraje: ${kmsText}`,
        `💰 Precio de Contado: ${formattedPrice}`,
        entrega50 !== 'Consultar' ? `💵 Financiamos con entrega mínima de: ${entrega50}` : '',
        `⚙️ Transmisión: ${transmision} | Combustible: ${combustible}`,
        ``,
        `✅ Documentación al día, listo para transferir en el acto.`,
        `🚗 Recibimos tu vehículo usado como parte de pago.`,
        ``,
        `📲 Envianos un MD o escribinos al WhatsApp del perfil para coordinar una prueba de manejo.`,
        ``,
        `#autos #${cleanMarcaTag} #${cleanModeloTag} #seminuevos #autosusados #concesionaria #resistencia #chaco`
      ].filter(Boolean)

      caption = copyLines.join('\n')
    }

    // PASO 1: Subir cada foto a un Instagram Media Container
    const itemContainerIds: string[] = []

    for (const photoUrl of validPhotos) {
      try {
        const isCarousel = validPhotos.length > 1
        const containerUrl = `https://graph.facebook.com/v21.0/${igUserId}/media`
        const containerParams: any = {
          image_url: photoUrl,
          access_token: accessToken
        }

        if (isCarousel) {
          containerParams.is_carousel_item = true
        } else {
          containerParams.caption = caption
        }

        const cRes = await fetch(containerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(containerParams)
        })

        const cData = await cRes.json()
        if (cRes.ok && cData.id) {
          itemContainerIds.push(cData.id)
        } else {
          console.warn('[Instagram Publish] Error al crear contenedor de foto:', cData)
        }
      } catch (uploadErr) {
        console.warn('[Instagram Publish] Error de red en contenedor:', uploadErr)
      }
    }

    if (itemContainerIds.length === 0) {
      return NextResponse.json({ success: false, error: 'No se pudieron procesar las imágenes en Instagram.' }, { status: 400 })
    }

    let finalCreationId = itemContainerIds[0]

    // PASO 2: Si son múltiples fotos, crear el contenedor Carousel Padre
    if (validPhotos.length > 1) {
      const carouselRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'CAROUSEL',
          children: itemContainerIds,
          caption: caption,
          access_token: accessToken
        })
      })

      const carouselData = await carouselRes.json()
      if (!carouselRes.ok || !carouselData.id) {
        return NextResponse.json({
          success: false,
          error: carouselData.error?.message || 'Error al crear álbum carrusel en Instagram'
        }, { status: 400 })
      }
      finalCreationId = carouselData.id
    }

    // Esperar 1.5s para que Meta sincronice los contenedores en CDN
    await new Promise(resolve => setTimeout(resolve, 1500))

    // PASO 3: Publicar el contenedor en el Feed de Instagram
    const publishRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: finalCreationId,
        access_token: accessToken
      })
    })

    const publishData = await publishRes.json()

    if (!publishRes.ok || !publishData.id) {
      return NextResponse.json({
        success: false,
        error: publishData.error?.message || 'Error al publicar contenedor en Instagram'
      }, { status: 400 })
    }

    // PASO 4: Obtener el permalink oficial del post
    let permalink = `https://www.instagram.com/p/${publishData.id}/`
    try {
      const metaRes = await fetch(`https://graph.facebook.com/v21.0/${publishData.id}?fields=permalink&access_token=${accessToken}`)
      const metaData = await metaRes.json()
      if (metaData.permalink) permalink = metaData.permalink
    } catch (e) {}

    return NextResponse.json({
      success: true,
      id: publishData.id,
      permalink,
      message: '¡Publicado exitosamente en @okmmotors de Instagram!'
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Error interno' }, { status: 500 })
  }
}
