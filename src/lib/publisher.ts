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

const EXTENSION_ID = 'YOUR_EXTENSION_ID' 

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
  const formattedEntrega = vehicle.Precio_entrega ? `$${Number(vehicle.Precio_entrega).toLocaleString('es-AR')}` : undefined

  // Generate high-retention description template for Facebook Marketplace & Extensions (Optimizado para Dwell Time y "Ver más")
  let originalDesc = (vehicle.Descripcion || '').trim()
  if (originalDesc.toLowerCase().includes('ingreso masivo')) {
    originalDesc = ''
  }
  
  const entrega50 = (vehicle.Precio_entrega && Number(vehicle.Precio_entrega) > 0)
    ? `$${Number(vehicle.Precio_entrega).toLocaleString('es-AR')}`
    : (numericPrice > 0 ? `$${(numericPrice * 0.5).toLocaleString('es-AR')}` : 'Consultar')

  const kmsText = vehicle.Km != null ? `${Number(vehicle.Km).toLocaleString('es-AR')} km` : '0 km'
  // Title without repeating year or version twice
  const fullVehicleTitle = options?.customTitle || `${marcaFormatted} ${modeloFormatted}`.replace(/\s+/g, ' ').trim()

  const templateParts: string[] = [
    `🔥 ${fullVehicleTitle} (${anioRaw || 'Unidad Seleccionada'}) — ¡Listo para transferir!`,
    `👉 (Tocá en "Ver más" para conocer equipamiento, facilidades y financiación 👇)`,
    ``,
    `📍 Año: ${anioRaw || 'N/A'} | Kilometraje: ${kmsText}`,
  ]

  if (formattedPrice !== '$0') {
    templateParts.push(`💰 Precio de Contado: ${formattedPrice}`)
  }

  if (entrega50 !== 'Consultar') {
    templateParts.push(`💵 Anticipo mínimo / Financiación desde: ${entrega50}`)
  }

  if (vehicle.Tipo_Combustible || vehicle.Transmision) {
    templateParts.push(`⛽ Combustible: ${vehicle.Tipo_Combustible || 'Nafta'} | Caja: ${vehicle.Transmision || 'Manual'}`)
  }

  templateParts.push(
    `📋 Documentación 100% al día, grabado de autopartes y verificación policial lista.`,
    `🚗 Tomamos tu auto usado en parte de pago al mejor valor de plaza.`,
    `📍 Consultanos por mensaje privado para coordinar tu visita o prueba de manejo.`
  )

  if (originalDesc) {
    templateParts.push(`\n📝 Detalles adicionales:\n${originalDesc}`)
  }

  templateParts.push(
    `\n💬 ¿Qué te parece este modelo? ¿Preferís caja manual o automática en ciudad? ¡Dejanos tu comentario abajo! 👇`
  )

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
async function setExtensionStorage(data: Record<string, any>): Promise<boolean> {
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

  window.postMessage({ type: 'AUTOAPP_SET_STORAGE', data }, '*')
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
  window.postMessage({
    type: 'AUTOAPP_PUBLISH_TASK',
    target: 'FACEBOOK_MARKETPLACE',
    payload: {
      active_car: payload,
      task_status: 'ready_to_fill'
    }
  }, '*')

  const storageData = {
    active_car: payload,
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

  window.postMessage({
    type: 'AUTOAPP_PUBLISH_TASK',
    target: 'INSTAGRAM_FEED',
    payload: {
      ig_active_car: payload,
      ig_task_status: 'start_sequency'
    }
  }, '*')

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

// 🚀 Trigger WhatsApp Publication
export async function publishToWhatsAppStatus(
  vehicleData: any,
  onStatus?: (msg: string) => void,
  options?: { customStatusText?: string }
) {
  onStatus?.('Procesando datos e imagen de portada para WhatsApp...')
  const car = formatVehicleForExtension(vehicleData)
  const coverUrl = car.photoLinks[0] || car.imagenPath

  let imageCopied = false
  let coverBase64: string | null = null

  if (coverUrl) {
    onStatus?.('Preparando foto de portada para WhatsApp...')
    coverBase64 = await downloadImageAsBase64(coverUrl)
    // Write cover photo to clipboard as PNG Blob so extension or user paste can access it directly
    imageCopied = await copyImageToClipboard(coverUrl)
  }

  const fullTitle = `${car.marca} ${car.modelo} ${car.anio}`.trim()
  const defaultWAStatus = [
    `🔥 *NUEVO INGRESO:* ${fullTitle}`,
    `📍 *Kilometraje:* ${car.kms}`,
    `💰 *Precio de Contado:* ${car.precio}`,
    car.precioEntrega ? `💵 *Anticipo mínimo / Cuotas:* ${car.precioEntrega}` : '',
    `⚙️ *Caja:* ${car.transmision} | *Combustible:* ${car.Tipo_Combustible}`,
    `\n✅ Tomamos tu auto usado llave por llave.`,
    `📲 _¡Respondé a este estado para consultar o coordinar visita!_`
  ].filter(Boolean).join('\n')

  const statusText = options?.customStatusText || defaultWAStatus

  // Copy vehicle summary text to clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(statusText)
    } catch (e) {}
  }

  const payload = {
    ...car,
    coverImageBase64: coverBase64,
    images: coverBase64 ? [coverBase64] : [],
    caption: statusText,
    task_status: 'ready_for_whatsapp'
  }

  onStatus?.('Enviando vehículo a la extensión Auto-Cyborg...')

  window.postMessage({
    type: 'AUTOAPP_PUBLISH_TASK',
    target: 'WHATSAPP_STATUS',
    payload: payload
  }, '*')

  await setExtensionStorage({
    wa_active_car: payload,
    wa_task_status: 'ready_for_whatsapp',
    active_car: payload
  })

  // Encode lightweight metadata payload into URL hash for extension content script on web.whatsapp.com
  const lightweightMetaWA = {
    id: car.id,
    marca: car.marca,
    modelo: car.modelo,
    version: car.version,
    anio: car.anio,
    precio: car.precio,
    kms: car.kms,
    descripcion: car.descripcion,
    imagenPath: coverUrl
  }

  const encodedMetaWA = encodeURIComponent(JSON.stringify(lightweightMetaWA))
  const targetUrl = `https://web.whatsapp.com/#autoapp_wa=${encodedMetaWA}`

  onStatus?.('¡Publicación iniciada! Abriendo WhatsApp Web...')

  setTimeout(() => {
    window.open(targetUrl, '_blank')
  }, 500)
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
