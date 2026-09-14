import { NextRequest, NextResponse } from 'next/server'

// Maximum allowed image size (15 MB)
const MAX_IMAGE_BYTES = 15 * 1024 * 1024

// Trusted image providers whitelist
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
  'loca.lt' // Permite túneles de desarrollo local
]

function isHostAllowed(hostname: string): boolean {
  const host = hostname.toLowerCase()

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

  // 2. Bloqueo estricto de servicios de metadatos en la nube (AWS, GCP, Azure, OpenStack)
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
      a === 10 || // 10.0.0.0/8
      a === 127 || // 127.0.0.0/8
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
      (a === 192 && b === 168) || // 192.168.0.0/16
      (a === 169 && b === 254) // 169.254.0.0/16
    ) {
      return false
    }
  }

  // 4. Verificación contra lista blanca de dominios autorizados
  const extraDomains = (process.env.ALLOWED_IMAGE_DOMAINS || '')
    .split(',')
    .map(d => d.trim().toLowerCase())
    .filter(Boolean)

  const allAllowed = [...ALLOWED_DOMAIN_SUFFIXES, ...extraDomains]

  return allAllowed.some(domain => host === domain || host.endsWith('.' + domain))
}

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get('url')
  if (!rawUrl) {
    return new NextResponse('Missing url parameter', { status: 400 })
  }

  // 1. Parsing y validación de sintaxis de URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(rawUrl.trim())
  } catch {
    return new NextResponse('Invalid URL format', { status: 400 })
  }

  // 2. Validación de protocolo (exclusivamente HTTP / HTTPS)
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return new NextResponse('Forbidden protocol. Only http/https are allowed.', { status: 403 })
  }

  // 3. Defensa Anti-SSRF (Lista blanca y descarte de IPs privadas / metadata de nube)
  if (!isHostAllowed(parsedUrl.hostname)) {
    return new NextResponse('Access to this host is forbidden by SSRF security policy', { status: 403 })
  }

  // 4. Invocación controlada con timeout y protección de payload
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

  try {
    const res = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AutoApp-ImageProxy/1.0 (+https://autoapp.com)',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      return new NextResponse(`Failed to fetch image: upstream responded with ${res.status}`, { status: res.status })
    }

    // 5. Validación estricta de Content-Type (debe ser una imagen)
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.toLowerCase().startsWith('image/')) {
      return new NextResponse('Upstream response is not a valid image format', { status: 415 })
    }

    // 6. Validación de Content-Length
    const contentLength = res.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_BYTES) {
      return new NextResponse('Image exceeds maximum allowed limit (15MB)', { status: 413 })
    }

    const arrayBuffer = await res.arrayBuffer()
    if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
      return new NextResponse('Image payload exceeds maximum allowed limit (15MB)', { status: 413 })
    }

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      return new NextResponse('Upstream image request timed out (10s)', { status: 504 })
    }
    return new NextResponse(err.message || 'Image proxy internal error', { status: 500 })
  }
}
