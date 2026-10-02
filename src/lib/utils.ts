// Utility function for merging Tailwind classes
export function cn(...inputs: (string | undefined | null | false | Record<string, boolean>)[]): string {
  return inputs
    .flatMap((input) => {
      if (!input) return []
      if (typeof input === 'string') return [input]
      return Object.entries(input)
        .filter(([, value]) => value)
        .map(([key]) => key)
    })
    .join(' ')
}

// Reusable formatters to avoid expensive new Intl instantiations on every render
const priceFormatterARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const dotsFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const kmFormatter = new Intl.NumberFormat('es-AR')

// Format currency in Argentine Pesos
export function formatPrice(value?: number | null): string {
  if (value == null) return '—'
  return priceFormatterARS.format(value)
}

// Format raw number with thousands dots for inputs (e.g. 28000000 -> "28.000.000")
export function formatNumberDots(value?: number | string | null): string {
  if (value == null || value === '') return ''
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/\./g, '').replace(/,/g, ''))
  if (isNaN(num)) return ''
  return dotsFormatter.format(num)
}

// Parse string with dots back to raw number (e.g. "28.000.000" -> 28000000)
export function parseNumberFromDots(str: string): number | '' {
  if (!str) return ''
  const clean = str.replace(/\./g, '').replace(/,/g, '').replace(/[^0-9]/g, '')
  if (!clean) return ''
  const parsed = parseInt(clean, 10)
  return isNaN(parsed) ? '' : parsed
}


// Format USD price
export function formatUSD(value?: number | null): string {
  if (value == null) return '—'
  return usdFormatter.format(value)
}

// Format kilometers
export function formatKm(value?: number | null): string {
  if (value == null) return '—'
  return kmFormatter.format(value) + ' km'
}

// Relative time (hace X horas / días)
export function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'ahora'
  if (diffMins < 60) return `hace ${diffMins}m`
  if (diffHours < 24) return `hace ${diffHours}h`
  if (diffDays < 7) return `hace ${diffDays}d`
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

// Get vehicle display name
export function vehicleName(v: { Marca?: string; Modelo?: string; Version?: string }): string {
  return [v.Marca, v.Modelo, v.Version].filter(Boolean).join(' ')
}

// Helper to map and normalize segment/carrocería (e.g. "Coche pequeño" -> "Hatchback")
export function formatBodyType(type?: string | null): string {
  if (!type || typeof type !== 'string') return ''
  const clean = type.trim()
  if (clean.toLowerCase().includes('pequeñ') || clean.toLowerCase().includes('pequen') || clean.toLowerCase() === 'coche pequeño') {
    return 'Hatchback'
  }
  return clean
}

// Helper to format any image URL safely (preserving direct HTTP/HTTPS URLs and converting Drive view links)
export function formatImageUrl(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null
  const clean = rawUrl.trim()
  if (!clean) return null

  // 1. Direct HTTP/HTTPS URLs (including drive.google.com/thumbnail?id=... and lh3.googleusercontent.com)
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    // Convert view/open links to direct LH3 links
    if (clean.includes('drive.google.com/file/d/') || clean.includes('drive.google.com/open?id=')) {
      const match = clean.match(/\/d\/([a-zA-Z0-9_-]{25,50})/) || clean.match(/[?&]id=([a-zA-Z0-9_-]{25,50})/)
      if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}=s600`
      }
    }
    return clean
  }

  // 2. Pure Google Drive File ID string (25-50 chars)
  if (/^[a-zA-Z0-9_-]{25,50}$/.test(clean)) {
    return `https://lh3.googleusercontent.com/d/${clean}=s600`
  }

  return null
}

// Helper to extract and format direct viewable cover image URL
export function getVehicleCoverImage(v: { FOTO_PORTADA?: string | null; FOTOS_EXTRA?: string | null }): string | null {
  const list = getAllVehiclePhotos(v)
  return list[0] || null
}

// Helper to extract ALL formatted photo URLs for a vehicle
export function getAllVehiclePhotos(v: { FOTO_PORTADA?: string | null; FOTOS_EXTRA?: string | null }): string[] {
  if (!v) return []

  const rawCandidates: string[] = []

  // Check FOTO_PORTADA
  if (v.FOTO_PORTADA && typeof v.FOTO_PORTADA === 'string' && v.FOTO_PORTADA.trim()) {
    rawCandidates.push(v.FOTO_PORTADA.trim())
  }

  // Check FOTOS_EXTRA
  if (v.FOTOS_EXTRA && typeof v.FOTOS_EXTRA === 'string' && v.FOTOS_EXTRA.trim()) {
    let str = v.FOTOS_EXTRA.trim()

    // Handle JSON stringified array e.g. ["url1", "url2"]
    if (str.startsWith('[') && str.endsWith(']')) {
      try {
        const parsed = JSON.parse(str)
        if (Array.isArray(parsed)) {
          parsed.forEach(item => {
            if (typeof item === 'string' && item.trim()) {
              rawCandidates.push(item.trim())
            }
          })
        }
      } catch (e) {
        // Fallback to split
      }
    }

    // Split by commas, semicolons, or newlines
    str.split(/[,;\n\r]+/).forEach(p => {
      const clean = p.trim()
      if (clean && !rawCandidates.includes(clean)) {
        rawCandidates.push(clean)
      }
    })
  }

  const result: string[] = []
  for (const raw of rawCandidates) {
    const formatted = formatImageUrl(raw)
    if (formatted && !result.includes(formatted)) {
      result.push(formatted)
    }
  }

  return result
}

// Status color map
export const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  DISPONIBLE: { label: 'Disponible', color: '#FACC15', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  RESERVADO:  { label: 'Reservado',  color: '#F59E0B', bg: 'bg-amber-500/10',   border: 'border-amber-500/30'   },
  SEÑADO:     { label: 'Señado',     color: '#8B5CF6', bg: 'bg-violet-500/10',  border: 'border-violet-500/30'  },
  VENDIDO:    { label: 'Vendido',    color: '#6B7280', bg: 'bg-gray-500/10',    border: 'border-gray-500/30'    },
}

// Lead stage config
export const stageConfig: Record<string, { label: string; color: string; bg: string }> = {
  SIN_RESPONDER: { label: 'Sin Responder',        color: '#FACC15', bg: 'bg-amber-500/10'   },
  VISITA:        { label: 'Visita al Salón',      color: '#3B82F6', bg: 'bg-blue-500/10'    },
  COTIZACION:    { label: 'Cotización / Usado',   color: '#EC4899', bg: 'bg-pink-500/10'    },
  FINANCIACION:  { label: 'Financiación',         color: '#8B5CF6', bg: 'bg-violet-500/10'  },
  FOTOS_INFO:    { label: 'Fotos / Info',         color: '#06B6D4', bg: 'bg-cyan-500/10'    },
  CURIOSOS:      { label: 'Curiosos / Sin Avance',color: '#6B7280', bg: 'bg-gray-500/10'    },
  CERRADO:       { label: 'Venta Concretada',     color: '#10B981', bg: 'bg-emerald-500/10' },

  // Compatibilidad con registros existentes:
  NUEVO:         { label: 'Sin Responder',        color: '#FACC15', bg: 'bg-amber-500/10'   },
  CONTACTADO:    { label: 'Fotos / Info',         color: '#06B6D4', bg: 'bg-cyan-500/10'    },
  INTERESADO:    { label: 'Cotización / Usado',   color: '#EC4899', bg: 'bg-pink-500/10'    },
  PROPUESTA:     { label: 'Financiación',         color: '#8B5CF6', bg: 'bg-violet-500/10'  },
  PERDIDO:       { label: 'Curiosos / Sin Avance',color: '#6B7280', bg: 'bg-gray-500/10'    },
}

// Check if a patent string is a temporary/internal bulk system code (e.g. BULK_59633_17, B19C3A01, TEMP_..., 0KM)
export function isTempPatent(p?: string | null): boolean {
  if (!p || typeof p !== 'string') return true
  const norm = p.trim().toUpperCase()
  if (
    norm.startsWith('TEMP') ||
    norm.includes('TEMP_') ||
    norm.startsWith('BULK') ||
    norm.includes('BULK_') ||
    norm === '0KM' ||
    norm === 'N/A' ||
    norm === 'SIN PATENTE' ||
    /^[A-Z]\d{2}[A-Z\d]+$/.test(norm)
  ) {
    return true
  }
  return false
}

// Format patent for public display or return null if it's an internal system code
export function formatDisplayPatent(p?: string | null): string | null {
  if (isTempPatent(p)) return null
  return p!.trim().toUpperCase()
}

/**
 * Función de ordenamiento 100% determinista y estable para cualquier lista de vehículos.
 * Garantiza que cuando se edita un precio, km, info, foto o nota de un auto,
 * el vehículo NUNCA cambie de posición en la lista ni salte de lugar.
 */
export function compareVehiclesStable(a: any, b: any): number {
  // 1. Marca normalizada (A-Z)
  const brandA = (a.Marca || '').trim().toUpperCase()
  const brandB = (b.Marca || '').trim().toUpperCase()
  if (brandA !== brandB) return brandA.localeCompare(brandB)

  // 2. Modelo normalizado (A-Z)
  const modelA = (a.Modelo || '').trim().toUpperCase()
  const modelB = (b.Modelo || '').trim().toUpperCase()
  if (modelA !== modelB) return modelA.localeCompare(modelB)

  // 3. Año (más nuevos primero: 2024 antes que 2020)
  const yearA = Number(a.Año) || 0
  const yearB = Number(b.Año) || 0
  if (yearA !== yearB) return yearB - yearA

  // 4. Patente (A-Z)
  const patA = (a.Patente || '').trim().toUpperCase()
  const patB = (b.Patente || '').trim().toUpperCase()
  if (patA !== patB) return patA.localeCompare(patB)

  // 5. ID único (desempate estricto absoluto)
  return String(a.ID).localeCompare(String(b.ID))
}

