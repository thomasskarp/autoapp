import { NextRequest, NextResponse } from 'next/server'
import { removeBackground } from '@imgly/background-removal-node'

// In-memory cache to avoid re-processing identical images (bounded to 100 entries to prevent memory exhaustion)
const cutoutCache = new Map<string, string>()
const MAX_CACHE_SIZE = 100
const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10 MB limit

const ALLOWED_DOMAIN_SUFFIXES = [
  'supabase.co',
  'mlstatic.com',
  'mercadolibre.com',
  'mercadolibre.com.ar',
  'storage.googleapis.com',
  'googleusercontent.com',
  'drive.google.com',
  'cloudinary.com',
  'imgur.com',
  'amazonaws.com',
  'cloudfront.net',
  'fbcdn.net',
  'cdninstagram.com',
  'loca.lt'
]

function isHostAllowed(hostname: string): boolean {
  const host = hostname.toLowerCase()

  if (process.env.NODE_ENV !== 'production' && (host === 'localhost' || host === '127.0.0.1')) {
    return true
  }

  // 1. Bloqueo estricto de loopback y nombres locales
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '0.0.0.0' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return false
  }

  // 2. Bloqueo estricto de metadata de nube
  if (host === '169.254.169.254' || host.startsWith('169.254.')) {
    return false
  }

  // 3. Bloqueo de rangos de red privada IPv4 (RFC 1918)
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  const ipMatch = host.match(ipv4Regex)
  if (ipMatch) {
    const a = Number(ipMatch[1])
    const b = Number(ipMatch[2])

    if (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254)
    ) {
      return false
    }
  }

  // 4. Verificación contra lista blanca de dominios
  const extraDomains = (process.env.ALLOWED_IMAGE_DOMAINS || '')
    .split(',')
    .map(d => d.trim().toLowerCase())
    .filter(Boolean)

  const allAllowed = [...ALLOWED_DOMAIN_SUFFIXES, ...extraDomains]
  return allAllowed.some(domain => host === domain || host.endsWith('.' + domain))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { imageUrl, imageBase64 } = body

    const cacheKey = imageUrl || (imageBase64 ? imageBase64.substring(0, 100) + imageBase64.length : null)
    if (cacheKey && cutoutCache.has(cacheKey)) {
      return NextResponse.json({
        success: true,
        cutoutUrl: cutoutCache.get(cacheKey)
      })
    }

    let inputBuffer: Buffer | null = null

    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')
      inputBuffer = Buffer.from(cleanBase64, 'base64')
    } else if (imageUrl) {
      let parsedUrl: URL
      try {
        parsedUrl = new URL(imageUrl.trim(), req.nextUrl.origin)
      } catch {
        return NextResponse.json({ error: 'Formato de URL inválido' }, { status: 400 })
      }

      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return NextResponse.json({ error: 'Protocolo no permitido (solo http/https)' }, { status: 403 })
      }

      if (!isHostAllowed(parsedUrl.hostname)) {
        return NextResponse.json({ error: 'Acceso a este host bloqueado por política de seguridad Anti-SSRF' }, { status: 403 })
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      try {
        const res = await fetch(parsedUrl.toString(), {
          signal: controller.signal,
          headers: {
            'User-Agent': 'AutoApp-SecureFetcher/1.0',
            'Accept': 'image/*'
          }
        })
        clearTimeout(timeoutId)

        if (!res.ok) {
          return NextResponse.json({ error: `Error al obtener imagen: ${res.statusText}` }, { status: 400 })
        }

        const contentType = res.headers.get('content-type') || ''
        if (!contentType.toLowerCase().startsWith('image/')) {
          return NextResponse.json({ error: 'El recurso solicitado no es una imagen válida' }, { status: 415 })
        }

        const arrayBuffer = await res.arrayBuffer()
        inputBuffer = Buffer.from(arrayBuffer)
      } catch (fetchErr: any) {
        clearTimeout(timeoutId)
        if (fetchErr.name === 'AbortError') {
          return NextResponse.json({ error: 'Tiempo de espera agotado al descargar imagen (10s)' }, { status: 504 })
        }
        throw fetchErr
      }
    }

    if (!inputBuffer) {
      return NextResponse.json({ error: 'No se suministró ninguna imagen válida' }, { status: 400 })
    }

    if (inputBuffer.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'La imagen excede el límite máximo permitido de 10MB' }, { status: 413 })
    }

    const blob = new Blob([new Uint8Array(inputBuffer)], { type: 'image/png' })
    const resultBlob = await removeBackground(blob)
    const arrayBuffer = await resultBlob.arrayBuffer()
    const resultBuffer = Buffer.from(arrayBuffer)

    // Return transparent PNG base64
    const base64 = `data:image/png;base64,${resultBuffer.toString('base64')}`

    if (cacheKey) {
      if (cutoutCache.size >= MAX_CACHE_SIZE) {
        const firstKey = cutoutCache.keys().next().value
        if (firstKey) cutoutCache.delete(firstKey)
      }
      cutoutCache.set(cacheKey, base64)
    }

    return NextResponse.json({
      success: true,
      cutoutUrl: base64
    })
  } catch (error: any) {
    console.error('Error removing background:', error)
    return NextResponse.json({ error: error.message || 'Error processing cutout' }, { status: 500 })
  }
}
