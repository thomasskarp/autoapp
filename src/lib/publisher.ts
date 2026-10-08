// ─── AutoApp Publisher Utility ───────────────────────────────────────────────
// Communicates with Chrome Extension "Auto-Cyborg 360" via URL Hash, Chrome Extension API, DOM Events & postMessage

import { getAllVehiclePhotos } from '@/lib/utils'

export interface PublishVehiclePayload {
  id: string
  patente?: string
  marca: string
  modelo: string
  version?: string
  anio: string | number
  precio: string
  precioNumero: number
  precioEntrega?: string
  kms: string
  estado: string
  Tipo_Combustible?: string
  transmision?: string
  Tipo_Carroceria?: string
  Estado_Vehiculo?: string
  Tipo_Vehiculo?: string
  photoLinks: string[]
  imagenPath?: string | null
  descripcion?: string
}

declare const chrome: any

const EXTENSION_ID = 'kjfjedgjkehndonpbgkffilaidcdpjob' 

  // Convert image URL to Base64 using Next.js proxy route to bypass CORS safely
export async function downloadImageAsBase64(url: string): Promise<string | null> {
  try {
    if (!url || typeof url !== 'string' || url.trim() === '') return null
    if (url.startsWith('data:image')) return url

    // Route through local Next.js proxy to prevent CORS errors in browser
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url.trim())}`
    
    // Add 8 second timeout to prevent infinite hangs
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    
    const response = await fetch(proxyUrl, { signal: controller.signal })
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      console.warn('[AutoApp Publisher] Proxy fetch non-ok status:', response.status, 'for url:', url)
      return null
    }

    const blob = await response.blob()

    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch (err) {
    console.error('[AutoApp Publisher] Error downloading image via proxy:', err)
    return null
  }
}

// Format vehicle data for Extension payload
export function formatVehicleForExtension(vehicle: any, options?: { customCopy?: string; customTitle?: string }): PublishVehiclePayload {
  const anioRaw = vehicle.Año || vehicle.Anio || '2024'

  const marcaRaw = (vehicle.Marca || '').trim()
  // Remove 4-digit years from Modelo and Version to avoid repeating the year in title
  let modeloClean = `${vehicle.Modelo || ''} ${vehicle.Version || ''}`.replace(/\b(19|20)\d{2}\b/g, '').trim()
  
  // Remove Marca from start of Modelo if it exists
  if (modeloClean.toLowerCase().startsWith(marcaRaw.toLowerCase())) {
    modeloClean = modeloClean.substring(marcaRaw.length).trim()
  } else {
    // Handle partial overlaps like Marca="Mercedes Benz" and Modelo="Benz GLC"
    const marcaParts = marcaRaw.toLowerCase().split(/[ \-]+/)
    const lastPart = marcaParts[marcaParts.length - 1]
    if (lastPart && modeloClean.toLowerCase().startsWith(lastPart + ' ')) {
      modeloClean = modeloClean.substring(lastPart.length).trim()
    }
  }

  // Capitalize every word (Title Case)
  const toTitleCase = (s: string) => {
    if (!s) return ''
    return s.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  const marcaFormatted = toTitleCase(marcaRaw)
  const modeloFormatted = toTitleCase(modeloClean)

  // Extract ALL photos (Portada + FOTOS_EXTRA parsed safely as JSON array or string list)
  const allPhotoLinks = getAllVehiclePhotos(vehicle)

  const numericPrice = typeof vehicle.Precio_Venta === 'number'
    ? vehicle.Precio_Venta
    : parseFloat(vehicle.Precio_Venta || '0') || 0

  const formattedPrice = numericPrice > 0 ? `$${numericPrice.toLocaleString('es-AR')}` : '$0'
  const formattedEntrega = vehicle.Precio_entrega
    ? (typeof vehicle.Precio_entrega === 'string' && vehicle.Precio_entrega.trim() !== ''
        ? (vehicle.Precio_entrega.trim().startsWith('$') ? vehicle.Precio_entrega.trim() : `$${vehicle.Precio_entrega.trim()}`)
        : `$${Number(vehicle.Precio_entrega).toLocaleString('es-AR')}`)
    : undefined

  // Generate high-retention description template for Facebook Marketplace & Extensions (Optimizado para Dwell Time y "Ver más")
  let originalDesc = (vehicle.Descripcion || '').trim()
  if (originalDesc.toLowerCase().includes('ingreso masivo')) {
    originalDesc = ''
  }
  
  const entrega50 = vehicle.Precio_entrega
    ? (typeof vehicle.Precio_entrega === 'string' && vehicle.Precio_entrega.trim() !== ''
        ? (vehicle.Precio_entrega.trim().startsWith('$') ? vehicle.Precio_entrega.trim() : `$${vehicle.Precio_entrega.trim()}`)
        : (Number(vehicle.Precio_entrega) > 0 ? `$${Number(vehicle.Precio_entrega).toLocaleString('es-AR')}` : 'Consultar'))
    : (numericPrice > 0 ? `$${(numericPrice * 0.5).toLocaleString('es-AR')}` : 'Consultar')

  const kmsText = vehicle.Km != null ? `${Number(vehicle.Km).toLocaleString('es-AR')} km` : '0 km'
  // Title without repeating year or version twice
  const fullVehicleTitle = options?.customTitle || `${marcaFormatted} ${modeloFormatted}`.replace(/\s+/g, ' ').trim()

  const templateParts: string[] = [
    `🔥 ${fullVehicleTitle} (${anioRaw || 'Unidad Seleccionada'}) — ¡Listo para transferir! 📍 Año: ${anioRaw || 'N/A'} | Kilometraje: ${kmsText}`,
  ]

  if (formattedPrice !== '$0') {
    templateParts.push(`💰 Precio de Contado: ${formattedPrice}`)
  }

  if (entrega50 !== 'Consultar') {
    templateParts.push(`💵 Anticipo mínimo / Financiación desde: ${entrega50}`)
  }

  templateParts.push(
    `📋 Documentación 100% al día  🚗 Tomamos tu auto usado en parte de pago al mejor valor 📍 Consultanos por mensaje privado`
  )

  if (originalDesc) {
    templateParts.push(`\n📝 Detalles adicionales:\n${originalDesc}`)
  }

  const formattedDescripcion = options?.customCopy || templateParts.join('\n')

  return {
    id: vehicle.ID || crypto.randomUUID(),
    patente: vehicle.Patente || '',
    marca: marcaFormatted || 'Vehículo',
    modelo: modeloFormatted || 'Modelo',
    version: vehicle.Version || '',
    anio: anioRaw,
    precio: formattedPrice,
    precioNumero: numericPrice,
    precioEntrega: formattedEntrega,
    kms: `${vehicle.Km || 0} km`,
    estado: vehicle.Estado || 'DISPONIBLE',
    Tipo_Combustible: vehicle.Tipo_Combustible || 'Nafta',
    transmision: vehicle.Transmision || 'Manual',
    Tipo_Carroceria: vehicle.Tipo_Carroceria || 'Sedán',
    Estado_Vehiculo: vehicle.Estado_Vehiculo || 'Excelente',
    Tipo_Vehiculo: vehicle.Tipo_Vehiculo || 'Usado',
    photoLinks: allPhotoLinks,
    imagenPath: allPhotoLinks[0] || null,
    descripcion: formattedDescripcion,
  }
}

// Helper to send storage payload via all available browser extension channels
export async function setExtensionStorage(data: Record<string, any>): Promise<boolean> {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      await chrome.storage.local.set(data)
      console.log('[AutoApp Publisher] Saved to chrome.storage.local directly')
      return true
    } catch (e) {
      console.warn('[AutoApp Publisher] Direct chrome.storage failed:', e)
    }
  }

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    try {
      chrome.runtime.sendMessage(EXTENSION_ID, { type: 'SET_STORAGE', data }, () => {})
    } catch (e) {}
  }

  if (typeof window !== 'undefined') {
    window.postMessage({ type: 'AUTOAPP_SET_STORAGE', data }, window.location.origin)
  }
  window.dispatchEvent(new CustomEvent('AutoAppSetStorageEvent', { detail: data }))

  return false
}

// 🚀 Trigger Facebook Marketplace Publication
export async function publishToFacebookMarketplace(
  vehicleData: any,
  onStatus?: (msg: string) => void,
  options?: { customCopy?: string; customTitle?: string }
) {
  onStatus?.('Procesando datos e imágenes del vehículo...')
  const car = formatVehicleForExtension(vehicleData, options)
  
  // Up to 20 photos for Facebook Marketplace
  const imagePromises = car.photoLinks.slice(0, 20).map(async (link) => {
    try {
      return await downloadImageAsBase64(link)
    } catch (e) {
      console.warn('[AutoApp Publisher] Skipping unresolvable photo:', link)
      return null
    }
  })
  
  const resolvedImages = await Promise.all(imagePromises)
  const imagePayloads = resolvedImages.filter(Boolean) as string[]

  const payload = {
    ...car,
    images: imagePayloads,
    precio: car.precioNumero.toString(),
  }

  onStatus?.('Enviando vehículo a la extensión Auto-Cyborg...')

  // Broadcast payload via window.postMessage for Chrome extension autoapp_bridge content script
  if (typeof window !== 'undefined') {
    window.postMessage({
      type: 'AUTOAPP_PUBLISH_TASK',
      target: 'FACEBOOK_MARKETPLACE',
      payload: {
        active_car: payload,
        fb_active_car: payload,
        task_status: 'ready_to_fill'
      }
    }, window.location.origin)
  }

  const storageData = {
    active_car: payload,
    fb_active_car: payload,
    task_status: 'ready_to_fill'
  }

  await setExtensionStorage(storageData)

  onStatus?.('Abriendo Facebook Marketplace para autocompletar...')

  // Encode lightweight metadata payload into URL hash to prevent Chrome about:blank#blocked URL length limits!
  const lightweightMeta = {
    id: car.id,
    marca: car.marca,
    modelo: car.modelo,
    version: car.version,
    anio: car.anio,
    precio: car.precio,
    precioNumero: car.precioNumero,
    precioEntrega: car.precioEntrega,
    kms: car.kms,
    estado: car.estado,
    Tipo_Combustible: car.Tipo_Combustible,
    transmision: car.transmision,
    Tipo_Carroceria: car.Tipo_Carroceria,
    Estado_Vehiculo: car.Estado_Vehiculo,
    Tipo_Vehiculo: car.Tipo_Vehiculo,
    photoLinks: car.photoLinks.slice(0, 15),
    imagenPath: car.imagenPath,
    descripcion: car.descripcion
  }

  const encodedMeta = encodeURIComponent(JSON.stringify(lightweightMeta))
  const targetUrl = `https://www.facebook.com/marketplace/create/vehicle#autoapp=${encodedMeta}`

  setTimeout(() => {
    window.open(targetUrl, '_blank')
  }, 500)

  onStatus?.('¡Publicación iniciada en Facebook Marketplace!')
}

// 🚀 Trigger Instagram Feed Publication
export async function publishToInstagramFeed(
  vehicleData: any,
  onStatus?: (msg: string) => void,
  options?: { customCaption?: string }
) {
  onStatus?.('Procesando datos e imágenes para Instagram...')
  const car = formatVehicleForExtension(vehicleData)

  const imagePromises = car.photoLinks.slice(0, 5).map(async (link) => {
    try {
      return await downloadImageAsBase64(link)
    } catch (e) {
      console.warn('[AutoApp Publisher] Skipping unresolvable photo:', link)
      return null
    }
  })
  
  const resolvedImages = await Promise.all(imagePromises)
  const imagePayloads = resolvedImages.filter(Boolean) as string[]

  const fullTitle = `${car.marca} ${car.modelo} ${car.anio}`.trim()
  const defaultIGCaption = [
    `✨ ${fullTitle} — ¡Ingreso Seleccionado!`,
    `📍 Kilometraje: ${car.kms} | Caja: ${car.transmision} | Motor: ${car.Tipo_Combustible}`,
    `💰 Precio: ${car.precio}`,
    car.precioEntrega ? `💵 Anticipo mínimo / Cuotas desde: ${car.precioEntrega}` : '',
    `\n📋 Unidad peritada, con documentación 100% al día y lista para transferir.`,
    `🚗 Tomamos tu usado en parte de pago al mejor valor de plaza llave por llave.`,
    `\n💬 ¿Te gustaría conocerlo o hacer una prueba de manejo? Envianos un mensaje directo para coordinar hoy mismo.`,
    `\n#autosargentina #usadosseleccionados #concesionaria #autos #${car.marca.toLowerCase().replace(/[^a-z0-9]/g, '')} #autoapp`
  ].filter(Boolean).join('\n')

  const caption = options?.customCaption || defaultIGCaption

  const payload = {
    ...car,
    images: imagePayloads,
    caption: caption,
  }

  onStatus?.('Enviando vehículo a la extensión Auto-Cyborg...')

  if (typeof window !== 'undefined') {
    window.postMessage({
      type: 'AUTOAPP_PUBLISH_TASK',
      target: 'INSTAGRAM_FEED',
      payload: {
        ig_active_car: payload,
        ig_task_status: 'start_sequency'
      }
    }, window.location.origin)
  }

  const storageData = {
    ig_active_car: payload,
    ig_task_status: 'start_sequency'
  }

  await setExtensionStorage(storageData)

  onStatus?.('Abriendo Instagram...')

  const lightweightMetaIG = {
    id: car.id,
    marca: car.marca,
    modelo: car.modelo,
    anio: car.anio,
    precio: car.precio,
    kms: car.kms,
    caption: caption
  }

  const encodedMetaIG = encodeURIComponent(JSON.stringify(lightweightMetaIG))
  const targetUrl = `https://www.instagram.com/#autoapp_ig=${encodedMetaIG}`

  setTimeout(() => {
    window.open(targetUrl, '_blank')
  }, 500)

  onStatus?.('¡Publicación iniciada en Instagram!')
}

// Helper to copy cover image blob directly into system clipboard
export async function copyImageToClipboard(imageUrl: string): Promise<boolean> {
  try {
    if (!imageUrl) return false
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl.trim())}`
    const res = await fetch(proxyUrl)
    if (!res.ok) return false
    const blob = await res.blob()

    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = URL.createObjectURL(blob)
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          canvas.toBlob(async (pngBlob) => {
            if (pngBlob && typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
              try {
                await navigator.clipboard.write([
                  new ClipboardItem({ 'image/png': pngBlob })
                ])
                resolve(true)
                return
              } catch (e) {
                console.warn('[AutoApp] Clipboard write image failed:', e)
              }
            }
            resolve(false)
          }, 'image/png')
        } else {
          resolve(false)
        }
      }
      img.onerror = () => resolve(false)
    })
  } catch (e) {
    console.error('[AutoApp] copyImageToClipboard error:', e)
    return false
  }
}

// Helper to download image file directly to user's Downloads folder
export async function downloadFileFromUrl(url: string, filename: string): Promise<boolean> {
  try {
    if (!url) return false
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url.trim())}`
    const res = await fetch(proxyUrl)
    if (!res.ok) return false
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
    return true
  } catch (e) {
    console.warn('[AutoApp] downloadFileFromUrl failed:', e)
    return false
  }
}

// Detectar si el usuario está accediendo desde un teléfono celular o tablet
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || ''
  const isTouchMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua)
  const isIPad = navigator.maxTouchPoints > 1 && /macintosh/i.test(ua)
  return isTouchMobile || isIPad
}

// 🚀 Trigger WhatsApp Publication
// En Celular: Dispara nativamente WhatsApp con la foto y el texto listos para elegir "Mi Estado" en 1 toque.
// En PC: Abre WhatsApp Web con la extensión Auto-Cyborg para inyectar la foto y el texto 100% automático.
export async function publishToWhatsAppStatus(
  vehicleData: any,
  onStatus?: (msg: string) => void,
  options?: { customStatusText?: string }
) {
  const isMobile = isMobileDevice()

  // 1. MODO CELULAR / TABLET: Compartir de forma nativa directa en WhatsApp
  if (isMobile && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    onStatus?.('Abriendo WhatsApp en tu celular...')
    const shared = await shareToWhatsAppMobile(vehicleData, options)
    if (shared) {
      onStatus?.('¡Publicado exitosamente en WhatsApp!')
      return
    }
  }

  // 2. MODO COMPUTADORA / ESCRITORIO: Publicación 100% automática vía WhatsApp Web + Extensión Auto-Cyborg
  onStatus?.('Conectando con WhatsApp Web y Extensión Auto-Cyborg...')
  const car = formatVehicleForExtension(vehicleData)
  const coverUrl = car.photoLinks[0] || car.imagenPath

  const fullTitle = `${car.marca} ${car.modelo} ${car.anio}`.trim()
  const cleanFileName = `AutoApp_${car.marca}_${car.modelo}_${car.anio}`.replace(/[^a-zA-Z0-9_-]/g, '_') + '.jpg'

  const kmFormatted = Number(String(car.kms).replace(/\D/g, '') || 0).toLocaleString('es-AR')
  const defaultWAStatus = [
    `*${fullTitle}*`,
    `Km: ${kmFormatted}`,
    `Precio: ${car.precio}`,
    car.precioEntrega ? `Anticipo: ${car.precioEntrega}` : '',
    car.transmision || '',
    car.Tipo_Combustible || ''
  ].filter(Boolean).join(' | ')

  const statusText = options?.customStatusText || defaultWAStatus

  // A. Copiar texto al portapapeles preventivamente
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(statusText)
    } catch (e) {}
  }

  // B. Obtener imagen en Base64 para que la extensión la tenga directamente en memoria
  let coverBase64 = ''
  if (coverUrl) {
    onStatus?.('Preparando imagen del vehículo...')
    if (coverUrl.startsWith('data:image')) {
      coverBase64 = coverUrl
    } else {
      // 1. Descargar rápidamente vía proxy de imágenes (sin bloqueos de CORS y en formato base64 listo)
      try {
        coverBase64 = (await downloadImageAsBase64(coverUrl)) || ''
      } catch (e) {}

      // 2. Fallback: Cargar en cliente mediante elemento Image + Canvas si el proxy no estuviese disponible
      if (!coverBase64) {
        try {
          coverBase64 = await new Promise<string>((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas')
                canvas.width = img.naturalWidth || img.width || 800
                canvas.height = img.naturalHeight || img.height || 600
                const ctx = canvas.getContext('2d')
                if (ctx) {
                  ctx.drawImage(img, 0, 0)
                  resolve(canvas.toDataURL('image/jpeg', 0.85))
                  return
                }
              } catch (err) {}
              resolve('')
            }
            img.onerror = () => resolve('')
            img.src = coverUrl
          })
        } catch (e) {}
      }
    }
  }

  // Copiar preventivamente imagen al portapapeles (permite pegar con Ctrl+V de forma inmediata en cualquier chat o Estado)
  if (coverBase64 && typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
    try {
      const parts = coverBase64.split(',')
      const b64 = parts[1] || parts[0]
      const bin = atob(b64)
      const u8 = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i)
      const blob = new Blob([u8], { type: 'image/jpeg' })

      const img = new Image()
      img.src = URL.createObjectURL(blob)
      await new Promise(r => img.onload = r)
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      const ctx = c.getContext('2d')
      ctx?.drawImage(img, 0, 0)
      c.toBlob(async (pngBlob) => {
        if (pngBlob && navigator.clipboard?.write) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({
                'image/png': pngBlob,
                'text/plain': new Blob([statusText], { type: 'text/plain' })
              })
            ])
          } catch (e) {}
        }
      }, 'image/png')
    } catch (e) {}
  }

  // C. Preparar el payload completo para la extensión
  const payloadWA = {
    id: car.id || vehicleData?.ID,
    marca: car.marca,
    modelo: car.modelo,
    anio: car.anio,
    precio: car.precio,
    kms: car.kms,
    caption: statusText,
    descripcion: statusText,
    imagenPath: coverUrl,
    coverImageBase64: coverBase64
  }

  // Guardar en storage local de extensión a través de todos los canales posibles
  await setExtensionStorage({
    wa_active_car: payloadWA,
    cyborg_pending_wa_story: payloadWA,
    task_status: 'ready_for_whatsapp'
  })

  // D. Codificar payload en el hash de WhatsApp Web (ligero para no desbordar ni truncar la URL)
  const hashPayloadWA = {
    id: payloadWA.id,
    marca: payloadWA.marca,
    modelo: payloadWA.modelo,
    anio: payloadWA.anio,
    precio: payloadWA.precio,
    kms: payloadWA.kms,
    caption: payloadWA.caption,
    descripcion: payloadWA.descripcion,
    imagenPath: payloadWA.imagenPath
  }
  const encodedPayload = encodeURIComponent(JSON.stringify(hashPayloadWA))
  const targetUrl = `https://web.whatsapp.com/#autoapp_wa=${encodedPayload}`

  onStatus?.('¡Abriendo WhatsApp Web! La extensión inyectará la foto y el texto en Estados...')

  setTimeout(() => {
    window.open(targetUrl, '_blank')
  }, 400)
}

// 📲 Direct Web Share API for Mobile / Tablet to WhatsApp Status
export async function shareToWhatsAppMobile(
  vehicleData: any,
  options?: { customStatusText?: string }
): Promise<boolean> {
  const car = formatVehicleForExtension(vehicleData)
  const fullTitle = `${car.marca} ${car.modelo} ${car.anio}`.trim()
  const kmFormatted = Number(String(car.kms).replace(/\D/g, '') || 0).toLocaleString('es-AR')
  const statusText = options?.customStatusText || [
    `*${fullTitle}*`,
    `Km: ${kmFormatted}`,
    `Precio: ${car.precio}`,
    car.precioEntrega ? `Anticipo: ${car.precioEntrega}` : '',
    car.transmision || '',
    car.Tipo_Combustible || ''
  ].filter(Boolean).join(' | ')

  const coverUrl = car.photoLinks[0] || car.imagenPath

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      let file: File | undefined
      if (coverUrl) {
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(coverUrl.trim())}`
        const res = await fetch(proxyUrl)
        if (res.ok) {
          const blob = await res.blob()
          const filename = `AutoApp_${car.marca}_${car.modelo}`.replace(/[^a-zA-Z0-9_-]/g, '_') + '.jpg'
          file = new File([blob], filename, { type: blob.type || 'image/jpeg' })
        }
      }

      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: fullTitle,
          text: statusText,
          files: [file]
        })
        return true
      } else {
        await navigator.share({
          title: fullTitle,
          text: statusText,
          url: coverUrl || undefined
        })
        return true
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.warn('[AutoApp] navigator.share error:', e)
      }
    }
  }
  return false
}

// 📲 Enviar auto a un chat de WhatsApp (Opción 1 en Celular / Opción 3 en PC con Auto-Cyborg)
export async function sendVehicleToWhatsAppChat(
  vehicleData: any,
  onStatus?: (msg: string) => void,
  options?: { customText?: string }
): Promise<boolean> {
  const isMobile = isMobileDevice()
  const car = formatVehicleForExtension(vehicleData)
  const fullTitle = `${car.marca} ${car.modelo} ${car.anio}`.trim()
  const kmFormatted = Number(String(car.kms).replace(/\D/g, '') || 0).toLocaleString('es-AR')
  const coverUrl = car.photoLinks[0] || car.imagenPath

  const defaultChatText = options?.customText || [
    `*${fullTitle}*`,
    `Km: ${kmFormatted}`,
    `Precio: ${car.precio}`,
    car.precioEntrega ? `Anticipo: ${car.precioEntrega}` : '',
    car.transmision || '',
    car.Tipo_Combustible || ''
  ].filter(Boolean).join(' | ')

  // 1. OPCIÓN 1 (CELULAR / TABLET): Web Share API nativo con foto y texto en 1 sola acción
  if (isMobile && typeof navigator !== 'undefined' && navigator.share) {
    onStatus?.('Abriendo WhatsApp en tu celular...')
    try {
      let file: File | undefined
      if (coverUrl) {
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(coverUrl.trim())}`
        const res = await fetch(proxyUrl)
        if (res.ok) {
          const blob = await res.blob()
          const filename = `Auto_${car.marca}_${car.modelo}`.replace(/[^a-zA-Z0-9_-]/g, '_') + '.jpg'
          file = new File([blob], filename, { type: blob.type || 'image/jpeg' })
        }
      }

      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: fullTitle,
          text: defaultChatText,
          files: [file]
        })
        onStatus?.('¡Compartido con éxito!')
        return true
      } else {
        await navigator.share({
          title: fullTitle,
          text: defaultChatText,
          url: coverUrl || undefined
        })
        onStatus?.('¡Compartido con éxito!')
        return true
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return false
      console.warn('[AutoApp] sendVehicleToWhatsAppChat share error:', e)
    }
  }

  // 2. OPCIÓN 3 (PC / ESCRITORIO): Auto-Cyborg inyecta foto y texto directamente en el chat abierto de WhatsApp Web
  onStatus?.('Conectando con WhatsApp Web y Extensión Auto-Cyborg...')

  // Copiar preventivamente imagen y texto al portapapeles
  if (coverUrl) {
    try {
      await copyImageToClipboard(coverUrl)
    } catch (e) {}
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(defaultChatText)
    } catch (e) {}
  }

  // Preparar imagen en base64
  let coverBase64 = ''
  if (coverUrl) {
    try {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(coverUrl.trim())}`
      const imgRes = await fetch(proxyUrl)
      if (imgRes.ok) {
        const imgBlob = await imgRes.blob()
        coverBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve((reader.result as string) || '')
          reader.onerror = () => resolve('')
          reader.readAsDataURL(imgBlob)
        })
      }
    } catch (e) {}
  }

  const payloadChat = {
    id: car.id || vehicleData?.ID,
    marca: car.marca,
    modelo: car.modelo,
    anio: car.anio,
    precio: car.precio,
    kms: car.kms,
    text: defaultChatText,
    caption: defaultChatText,
    imageUrl: coverUrl,
    images: coverBase64 ? [coverBase64] : [],
    coverImageBase64: coverBase64
  }

  // Notificar al puente de la extensión
  try {
    if (typeof window !== 'undefined') {
      window.postMessage({
        type: 'AUTOAPP_PUBLISH_TASK',
        target: 'WHATSAPP_CHAT',
        payload: payloadChat
      }, window.location.origin)
    }
  } catch (e) {}

  // Abrir / enfocar WhatsApp Web con el hash
  const hashPayload = encodeURIComponent(JSON.stringify({
    id: payloadChat.id,
    marca: payloadChat.marca,
    modelo: payloadChat.modelo,
    anio: payloadChat.anio,
    precio: payloadChat.precio,
    kms: payloadChat.kms,
    text: payloadChat.text,
    imageUrl: payloadChat.imageUrl
  }))

  const targetUrl = `https://web.whatsapp.com/#autoapp_wa_chat=${hashPayload}`
  window.open(targetUrl, '_blank')
  onStatus?.('¡Inyectando en chat de WhatsApp Web!')
  return true
}

// 🚀 MercadoLibre VIS API Payload Format
export interface MercadoLibreVISPayload {
  title: string
  category_id: string // "MLA1744" (Autos y Camionetas Argentina)
  price: number
  currency_id: 'ARS' | 'USD'
  available_quantity: number
  buying_mode: 'classified'
  listing_type_id: string // "gold_premium" | "gold_plus" | "silver"
  condition: 'used' | 'new'
  description: { plain_text: string }
  pictures: { source: string }[]
  attributes: { id: string; value_name: string }[]
  location?: any
}

// Convert AutoApp Vehicle to MercadoLibre VIS Item Format
export function formatMercadoLibreVISItem(vehicleData: any, listingTypeId: string = 'free'): MercadoLibreVISPayload {
  const car = formatVehicleForExtension(vehicleData)
  const isOkm = (car.Tipo_Vehiculo || '').toLowerCase() === '0km' || car.kms === '0 km'

  const pictures = car.photoLinks.slice(0, 20).map(url => ({ source: url }))

  // Normalize Fuel Type according to MercadoLibre MLA1744 standards
  const rawFuel = (car.Tipo_Combustible || '').toLowerCase()
  let meliFuel = 'Nafta'
  if (rawFuel.includes('diesel') || rawFuel.includes('diésel')) meliFuel = 'Diésel'
  else if (rawFuel.includes('gnc') && rawFuel.includes('nafta')) meliFuel = 'Nafta/GNC'
  else if (rawFuel.includes('gnc')) meliFuel = 'GNC'
  else if (rawFuel.includes('híbrido') || rawFuel.includes('hibrido')) meliFuel = 'Híbrido'
  else if (rawFuel.includes('eléctrico') || rawFuel.includes('electrico')) meliFuel = 'Eléctrico'

  // Normalize Transmission according to MercadoLibre MLA1744 standards
  const rawTrans = (car.transmision || '').toLowerCase()
  let meliTrans = 'Manual'
  if (rawTrans.includes('auto') || rawTrans.includes('secuencial') || rawTrans.includes('cvt')) meliTrans = 'Automática'
  else if (rawTrans.includes('semi')) meliTrans = 'Semiautomática'

  const attributes = [
    { id: 'BRAND', value_name: car.marca },
    { id: 'MODEL', value_name: car.modelo },
    { id: 'VEHICLE_YEAR', value_name: String(car.anio) },
    { id: 'TRIM', value_name: car.version || car.modelo },
    { id: 'KILOMETERS', value_name: `${car.kms.replace(/[^0-9]/g, '') || '0'} km` },
    { id: 'VEHICLE_TYPE', value_name: 'Autos y camionetas' },
    { id: 'FUEL_TYPE', value_name: meliFuel },
    { id: 'TRANSMISSION', value_name: meliTrans },
    { id: 'DOORS', value_name: '5' },
    { id: 'BODY_TYPE', value_name: car.Tipo_Carroceria || 'Sedán' },
  ]

  const title = `${car.marca} ${car.modelo}`.substring(0, 60)

  // Asegurar al menos una foto de catálogo pública si no hay cargadas
  const validPictures = pictures.length > 0 
    ? pictures 
    : [{ source: 'https://http2.mlstatic.com/frontend-assets/ui-navigation/5.18.9/mercadolibre/logo__large_plus.png' }]

  return {
    title: title,
    category_id: 'MLA1744', // Categoría Oficial MercadoLibre Argentina: Autos y Camionetas
    price: car.precioNumero,
    currency_id: 'ARS',
    available_quantity: 1,
    buying_mode: 'classified',
    listing_type_id: listingTypeId || 'gold_premium',
    condition: isOkm ? 'new' : 'used',
    description: {
      plain_text: car.descripcion || ''
    },
    pictures: validPictures,
    attributes: attributes,
    location: {
      country: { name: 'Argentina' },
      state: { name: 'Capital Federal' },
      city: { name: 'Palermo' }
    }
  }
}

// 🚀 Trigger MercadoLibre VIS Direct API Publication
export async function publishToMercadoLibre(
  vehicleData: any,
  onStatus?: (msg: string) => void,
  listingTypeId: string = 'free'
): Promise<{ success: boolean; url: string; id: string }> {
  onStatus?.('Generando publicación estructurada para MercadoLibre VIS API...')
  const meliPayload = formatMercadoLibreVISItem(vehicleData, listingTypeId)

  onStatus?.('Enviando vehículo directamente a la API de MercadoLibre...')

  console.log('[AutoApp] Payload enviado a MercadoLibre VIS:', meliPayload)

  // Let the secure backend resolve the valid active token from .env.local / Supabase
  const baseUrl = typeof window !== 'undefined' 
    ? '' 
    : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')

  const res = await fetch(`${baseUrl}/api/mercadolibre/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      meliItem: meliPayload
    })
  })

  const result = await res.json()

  if (!res.ok || !result.success) {
    throw new Error(result.error || 'Error al comunicarse con la API de MercadoLibre')
  }

  onStatus?.(`¡Publicado exitosamente en MercadoLibre! (ID: ${result.id})`)

  return {
    success: true,
    url: result.permalink,
    id: result.id
  }
}

// 🚀 Trigger Facebook Fan Page Direct Graph API Publication
export async function publishToFacebookPage(
  vehicleData: any,
  onStatus?: (msg: string) => void,
  options?: { customCopy?: string; customTitle?: string }
): Promise<{ success: boolean; url: string; id: string; message: string; isSimulated?: boolean }> {
  onStatus?.('Formateando vehículo y fotos según secuencia estratégica de swipe...')

  const baseUrl = typeof window !== 'undefined' 
    ? '' 
    : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')

  onStatus?.('Enviando publicación a Facebook Page Graph API...')

  const res = await fetch(`${baseUrl}/api/facebook/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vehicle: vehicleData,
      customCopy: options?.customCopy,
      customTitle: options?.customTitle
    })
  })

  const result = await res.json()

  if (!res.ok || !result.success) {
    throw new Error(result.error || 'Error al comunicarse con la API de Facebook Page')
  }

  onStatus?.(`¡Publicado exitosamente en Facebook Fan Page!`)

  return {
    success: true,
    url: result.permalink,
    id: result.id,
    message: result.message,
    isSimulated: result.isSimulated
  }
}

// 🗑️ Delete publication directly from Facebook Fan Page
export async function deleteFacebookPost(postId: string): Promise<boolean> {
  const baseUrl = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
  const res = await fetch(`${baseUrl}/api/facebook/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId })
  })
  const data = await res.json()
  return data.success === true
}

// 📸 Trigger Instagram Feed Direct Graph API Publication (Carousel / Photo)
export async function publishToInstagramGraphAPI(
  vehicleData: any,
  onStatus?: (msg: string) => void,
  options?: { customCopy?: string; customTitle?: string }
): Promise<{ success: boolean; url: string; id: string; message: string }> {
  onStatus?.('Procesando imágenes para contenedor de Instagram...')

  const baseUrl = typeof window !== 'undefined' 
    ? '' 
    : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')

  onStatus?.('Creando álbum carrusel en Instagram Graph API...')

  const res = await fetch(`${baseUrl}/api/instagram/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vehicle: vehicleData,
      customCopy: options?.customCopy,
      customTitle: options?.customTitle
    })
  })

  const result = await res.json()

  if (!res.ok || !result.success) {
    throw new Error(result.error || 'Error al comunicarse con la API de Instagram')
  }

  onStatus?.(`¡Publicado exitosamente en Instagram!`)

  return {
    success: true,
    url: result.permalink,
    id: result.id,
    message: result.message
  }
}

// 🗑️ Delete publication directly from Instagram
export async function deleteInstagramPost(mediaId: string): Promise<boolean> {
  const baseUrl = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
  const res = await fetch(`${baseUrl}/api/instagram/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mediaId })
  })
  const data = await res.json()
  return data.success === true
}

// ⚡ Publicar Historia en Instagram Oficial (Graph API)
export async function publishToInstagramStory(
  vehicleData: any,
  onStatus?: (msg: string) => void,
  options?: { imageUrl?: string; videoUrl?: string }
): Promise<{ success: boolean; id?: string; message?: string }> {
  onStatus?.('Publicando Historia en Instagram Oficial (@okmmotors)...')
  const baseUrl = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
  const imageUrl = options?.imageUrl || vehicleData.FOTO_PORTADA || (vehicleData.photoLinks && vehicleData.photoLinks[0])
  const vehicleTitle = `${vehicleData.Marca || vehicleData.marca || ''} ${vehicleData.Modelo || vehicleData.modelo || ''}`.trim() || 'Vehículo'

  const res = await fetch(`${baseUrl}/api/instagram/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageUrl,
      videoUrl: options?.videoUrl,
      vehicleTitle,
      vehicleId: vehicleData.ID || vehicleData.id
    })
  })
  const data = await res.json()
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Error al publicar Historia en Instagram')
  }
  onStatus?.('¡Historia publicada exitosamente en Instagram!')
  return data
}

// 🎵 Generar pie de publicación con hashtags para TikTok
export function generateTikTokCaption(vehicleData: any): string {
  const car = formatVehicleForExtension(vehicleData)
  const fullTitle = `${car.marca} ${car.modelo} ${car.anio}`.trim()
  const kmFormatted = Number(String(car.kms).replace(/\D/g, '') || 0).toLocaleString('es-AR')
  
  const cleanMarca = car.marca.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  const cleanModelo = car.modelo.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase()

  const lines = [
    `🚗 ${fullTitle}`,
    `📍 OKM Motors - Usados Seleccionados & 0km`,
    `⚡ ${kmFormatted} km | ${car.precio}`,
    car.precioEntrega ? `💰 Anticipo desde ${car.precioEntrega}` : '',
    car.transmision ? `⚙️ Transmisión: ${car.transmision}` : '',
    car.Tipo_Combustible ? `⛽ Combustible: ${car.Tipo_Combustible}` : '',
    '',
    `📲 Escribinos al WhatsApp del perfil para coordinar tu test drive o reservar la unidad.`,
    `Tomamos tu usado en parte de pago y financiamos en cuotas fijas.`,
    '',
    `#autos #autosargentina #concesionaria #vendo #${cleanMarca} #${cleanModelo} #usadosseleccionados #parati #fyp #viral`
  ].filter(line => line !== undefined && line !== null)

  return lines.join('\n')
}

// 📱 Compartir a TikTok en Celular (Photo Mode / Carrusel de fotos)
export async function shareToTikTokMobile(
  vehicleData: any,
  options?: { customText?: string }
): Promise<boolean> {
  const car = formatVehicleForExtension(vehicleData)
  const fullTitle = `${car.marca} ${car.modelo} ${car.anio}`.trim()
  const caption = options?.customText || generateTikTokCaption(vehicleData)
  const allPhotos = car.photoLinks && car.photoLinks.length > 0 ? car.photoLinks : (car.imagenPath ? [car.imagenPath] : [])

  // 1. Copiar texto con hashtags al portapapeles preventivamente
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(caption)
    } catch (e) {}
  }

  // 2. Preparar fotos para Web Share (hasta 8 fotos para el Photo Mode de TikTok)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const files: File[] = []
      const photosToShare = allPhotos.slice(0, 8)
      
      for (let i = 0; i < photosToShare.length; i++) {
        const photoUrl = photosToShare[i]
        try {
          const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(photoUrl.trim())}`
          const res = await fetch(proxyUrl)
          if (res.ok) {
            const blob = await res.blob()
            const filename = `TikTok_${car.marca}_${car.modelo}_${i + 1}.jpg`.replace(/[^a-zA-Z0-9_.-]/g, '_')
            files.push(new File([blob], filename, { type: blob.type || 'image/jpeg' }))
          }
        } catch (fetchErr) {
          console.warn(`[TikTok] Error fetching photo ${i}:`, fetchErr)
        }
      }

      if (files.length > 0 && navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({
          title: fullTitle,
          text: caption,
          files: files
        })
        return true
      } else {
        await navigator.share({
          title: fullTitle,
          text: caption,
          url: allPhotos[0] || undefined
        })
        return true
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.warn('[AutoApp] shareToTikTokMobile error:', e)
      }
    }
  }
  return false
}

// 🚀 Publicar vehículo en TikTok (Fotos + Info)
// En Celular: Dispara nativamente la hoja de compartir con fotos para abrir TikTok en Photo Mode y elegir música.
// En PC: Abre TikTok Creator Center con la extensión Auto-Cyborg para inyectar fotos y descripción.
export async function publishToTikTok(
  vehicleData: any,
  onStatus?: (msg: string) => void,
  options?: { customText?: string }
): Promise<{ success: boolean; url: string }> {
  const isMobile = isMobileDevice()

  // 1. MODO CELULAR / TABLET: Web Share nativo directo a la App de TikTok
  if (isMobile) {
    onStatus?.('Preparando fotos y ficha para TikTok...')
    const shared = await shareToTikTokMobile(vehicleData, options)
    if (shared) {
      onStatus?.('¡Compartido exitosamente en TikTok!')
      return { success: true, url: 'https://www.tiktok.com/' }
    }
  }

  // 2. MODO COMPUTADORA / ESCRITORIO: Extensión Auto-Cyborg + TikTok Studio
  onStatus?.('Preparando fotos y ficha para TikTok Studio...')
  const car = formatVehicleForExtension(vehicleData)
  const caption = options?.customText || generateTikTokCaption(vehicleData)
  const allPhotos = car.photoLinks && car.photoLinks.length > 0 ? car.photoLinks : (car.imagenPath ? [car.imagenPath] : [])

  // Copiar descripción con hashtags al portapapeles preventivamente
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(caption)
    } catch (e) {}
  }

  // Convertir las fotos principales a Base64 en memoria (sin diálogos de descarga molestos)
  const photosBase64: string[] = []
  const photosToLoad = allPhotos.slice(0, 4)
  for (let i = 0; i < photosToLoad.length; i++) {
    onStatus?.(`Procesando foto ${i + 1} de ${photosToLoad.length}...`)
    try {
      const b64 = await downloadImageAsBase64(photosToLoad[i])
      if (b64) photosBase64.push(b64)
    } catch (err) {
      console.warn(`[TikTok] Error convirtiendo foto ${i} a base64:`, err)
    }
  }

  // Enviar carga completa con fotos en base64 a la extensión Auto-Cyborg (vía bridge)
  const fullPayload = {
    id: vehicleData.ID,
    marca: car.marca,
    modelo: car.modelo,
    anio: car.anio,
    precio: car.precio,
    kms: car.kms,
    caption: caption,
    photosBase64: photosBase64,
    photos: allPhotos.slice(0, 6),
    coverUrl: allPhotos[0] || null,
    isVideo: false
  }

  if (typeof window !== 'undefined') {
    window.postMessage({
      type: 'AUTOAPP_PUBLISH_TASK',
      target: 'TIKTOK_PUBLISH',
      payload: fullPayload,
      data: fullPayload
    }, window.location.origin)
  }

  await setExtensionStorage({
    cyborg_pending_tiktok: fullPayload,
    tiktok_active_car: fullPayload,
    task_status: 'ready_for_tiktok'
  })

  // Hash liviano para la URL (sin base64 gigante para no saturar la barra de direcciones)
  const urlHashMeta = {
    id: vehicleData.ID,
    marca: car.marca,
    modelo: car.modelo,
    anio: car.anio,
    precio: car.precio,
    kms: car.kms,
    isVideo: false
  }

  const encodedMeta = encodeURIComponent(JSON.stringify(urlHashMeta))
  const targetUrl = `https://www.tiktok.com/tiktokstudio/upload#autoapp_tiktok=${encodedMeta}`

  setTimeout(() => {
    window.open(targetUrl, '_blank')
  }, 400)

  onStatus?.('Abriendo TikTok Studio con Auto-Cyborg...')
  return { success: true, url: 'https://www.tiktok.com/tiktokstudio/upload' }
}




