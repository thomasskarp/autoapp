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

// Format currency in Argentine Pesos
export function formatPrice(value?: number | null): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Format raw number with thousands dots for inputs (e.g. 28000000 -> "28.000.000")
export function formatNumberDots(value?: number | string | null): string {
  if (value == null || value === '') return ''
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/\./g, '').replace(/,/g, ''))
  if (isNaN(num)) return ''
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(num)
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
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Format kilometers
export function formatKm(value?: number | null): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('es-AR').format(value) + ' km'
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
  NUEVO:       { label: 'Nuevo',       color: '#FDE047', bg: 'bg-blue-500/10'    },
  CONTACTADO:  { label: 'Contactado',  color: '#F59E0B', bg: 'bg-amber-500/10'   },
  INTERESADO:  { label: 'Interesado',  color: '#F97316', bg: 'bg-orange-500/10'  },
  PROPUESTA:   { label: 'Propuesta',   color: '#8B5CF6', bg: 'bg-violet-500/10'  },
  CERRADO:     { label: 'Cerrado',     color: '#10B981', bg: 'bg-emerald-500/10' },
  PERDIDO:     { label: 'Perdido',     color: '#EF4444', bg: 'bg-red-500/10'     },
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
