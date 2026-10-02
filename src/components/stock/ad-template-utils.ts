import { Vehicle } from '@/lib/supabase/types'
import { formatPrice } from '@/lib/utils'

export interface AdTemplateData {
  title: string
  subtitle: string
  bannerText: string

  // Card 1 (24 Cuotas)
  card1Price: string
  card1Sub: string

  // Card 2 (18 Cuotas)
  card2Price: string
  card2Sub: string

  // Card 3 (12 Cuotas)
  card3Price: string
  card3Sub: string

  // Card 4 (Contado)
  card4Title: string
  card4Price: string

  // Footer
  phone: string
  location: string
  instagram: string
  legalLeft: string
  legalRight: string

  // Car image
  carImageUrl: string
}

export function compileDefaultAdData(vehicle: Vehicle | null, portadaUrl?: string): AdTemplateData {
  const brand = (vehicle?.Marca || 'VOLKSWAGEN').toUpperCase()
  const model = (vehicle?.Modelo || 'AMAROK').toUpperCase()
  const title = `${brand} ${model}`.trim()

  const ver = (vehicle?.Version || 'COMFORTLINE AT 4X2').toUpperCase()
  const anio = vehicle?.Año ? `${vehicle.Año}` : ''
  const subtitle = anio && !ver.includes(anio) ? `${ver} (${anio})` : ver

  const rawPrice = vehicle?.Precio_Venta ?? 53800000
  const pVenta = typeof rawPrice === 'number' && rawPrice > 0 ? rawPrice : 53800000

  // Intelligent estimations for 12, 18, 24 months
  // Plan 24: ~70% Anticipo
  const ant24 = Math.round((pVenta * 0.7) / 100000) * 100000
  const cuota24 = Math.round(((pVenta - ant24) / 24) / 10000) * 10000 || 690000

  // Plan 18: ~55% Anticipo
  const ant18 = Math.round((pVenta * 0.55) / 100000) * 100000
  const cuota18 = Math.round(((pVenta - ant18) / 18) / 10000) * 10000 || 1370000

  // Plan 12: ~35% Anticipo
  const ant12 = Math.round((pVenta * 0.35) / 100000) * 100000
  const cuota12 = Math.round(((pVenta - ant12) / 12) / 10000) * 10000 || 3050000

  return {
    title,
    subtitle,
    bannerText: 'ENTREGA INMEDIATA | FINANCIACION TASA 0%',

    card1Price: formatPrice(ant24),
    card1Sub: `+ 24 Cuotas de ${formatPrice(cuota24)}`,

    card2Price: formatPrice(ant18),
    card2Sub: `+ 18 Cuotas de ${formatPrice(cuota18)}`,

    card3Price: formatPrice(ant12),
    card3Sub: `+ 12 Cuotas de ${formatPrice(cuota12)}`,

    card4Title: 'OFERTA CONTADO',
    card4Price: formatPrice(pVenta),

    phone: '362-4750716',
    location: 'resistencia chaco',
    instagram: 'okmmotors',
    legalLeft: 'Okmmotors - Venta de vehiculos seleccionados',
    legalRight: 'Promocion válida hasta agotar stock',

    carImageUrl: portadaUrl || '/templates/sample_cutout.png'
  }
}

/**
 * Formats AdTemplateData into structured text for the "Plantilla de Texto" textarea
 */
export function formatAdDataToText(data: AdTemplateData): string {
  return [
    `TITULO: ${data.title}`,
    `SUBTITULO: ${data.subtitle}`,
    `CINTA: ${data.bannerText}`,
    ``,
    `ANTICIPO_24: ${data.card1Price}`,
    `CUOTA_24: ${data.card1Sub}`,
    `ANTICIPO_18: ${data.card2Price}`,
    `CUOTA_18: ${data.card2Sub}`,
    `ANTICIPO_12: ${data.card3Price}`,
    `CUOTA_12: ${data.card3Sub}`,
    `OFERTA_CONTADO_TITULO: ${data.card4Title}`,
    `PRECIO_CONTADO: ${data.card4Price}`,
    ``,
    `WHATSAPP: ${data.phone}`,
    `UBICACION: ${data.location}`,
    `INSTAGRAM: ${data.instagram}`,
    `LEGAL_IZQ: ${data.legalLeft}`,
    `LEGAL_DER: ${data.legalRight}`
  ].join('\n')
}

/**
 * Parses user edits from the textarea back into AdTemplateData in real-time
 */
export function parseTextToAdData(text: string, current: AdTemplateData): AdTemplateData {
  const result = { ...current }
  const lines = text.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const colonIdx = trimmed.indexOf(':')
    if (colonIdx === -1) continue

    const key = trimmed.slice(0, colonIdx).trim().toUpperCase()
    const val = trimmed.slice(colonIdx + 1).trim()

    switch (key) {
      case 'TITULO':
        if (val) result.title = val
        break
      case 'SUBTITULO':
        if (val) result.subtitle = val
        break
      case 'CINTA':
        if (val) result.bannerText = val
        break
      case 'ANTICIPO_24':
        if (val) result.card1Price = val
        break
      case 'CUOTA_24':
        if (val) result.card1Sub = val.startsWith('+') ? val : `+ ${val}`
        break
      case 'ANTICIPO_18':
        if (val) result.card2Price = val
        break
      case 'CUOTA_18':
        if (val) result.card2Sub = val.startsWith('+') ? val : `+ ${val}`
        break
      case 'ANTICIPO_12':
        if (val) result.card3Price = val
        break
      case 'CUOTA_12':
        if (val) result.card3Sub = val.startsWith('+') ? val : `+ ${val}`
        break
      case 'OFERTA_CONTADO_TITULO':
        if (val) result.card4Title = val
        break
      case 'PRECIO_CONTADO':
      case 'CONTADO':
        if (val) result.card4Price = val
        break
      case 'WHATSAPP':
      case 'TELEFONO':
        if (val) result.phone = val
        break
      case 'UBICACION':
        if (val) result.location = val
        break
      case 'INSTAGRAM':
        if (val) result.instagram = val
        break
      case 'LEGAL_IZQ':
        if (val) result.legalLeft = val
        break
      case 'LEGAL_DER':
        if (val) result.legalRight = val
        break
    }
  }

  return result
}

export interface AdPublicidadTemplate {
  id: string
  name: string
  model: string // e.g. "Amarok", "S10", "Hilux"
  brand: string // e.g. "Volkswagen", "Chevrolet"
  imageUrl: string // URL or base64 of the flyer image
  isDefault?: boolean
  only0km?: boolean
  description?: string
  createdAt: number
}

export const DEFAULT_PUBLICIDADES: AdPublicidadTemplate[] = [
  {
    id: 'amarok-official-flyer',
    name: 'Publicidad Oficial Amarok 0KM',
    model: 'Amarok',
    brand: 'Volkswagen',
    imageUrl: '/templates/plantilla_publicidad_okm.png?v=6',
    isDefault: true,
    only0km: true,
    description: 'Plantilla publicitaria oficial para Volkswagen Amarok 0KM (todas las versiones: V6, Comfortline, Highline, Trendline)',
    createdAt: 1740000000000
  }
]

export function isVehicle0km(v: Vehicle | null | undefined): boolean {
  if (!v) return false
  if (v.is_okm_table === true) return true
  const tipo = (v.Tipo_Vehiculo || '').trim().toLowerCase()
  if (tipo === '0km' || tipo === '0 km' || tipo === 'nuevo') return true
  const estado = (v.Estado_Vehiculo || '').trim().toLowerCase()
  if (estado === '0km' || estado === '0 km' || estado === 'nuevo') return true
  if (v.Patente && v.Patente.trim().toUpperCase() === '0KM') return true
  if (v.Km !== undefined && v.Km !== null && Number(v.Km) === 0) return true
  return false
}

export function isVehicleMatchingModel(vehicle: Vehicle | null | undefined, targetModel: string): boolean {
  if (!vehicle || !targetModel) return false
  const t = targetModel.trim().toLowerCase()
  const vModel = (vehicle.Modelo || '').trim().toLowerCase()
  const vVersion = (vehicle.Version || '').trim().toLowerCase()

  if (vModel === t) return true
  if (vModel.includes(t) || t.includes(vModel)) return true
  if (vVersion.includes(t)) return true

  return false
}

export function isVehicleMatchingPublicidad(vehicle: Vehicle | null | undefined, pub: AdPublicidadTemplate): boolean {
  if (!vehicle || !pub) return false

  // 1. Model check: must match the vehicle model
  if (!isVehicleMatchingModel(vehicle, pub.model)) {
    return false
  }

  // 2. 0km check: if only0km is specified or if it's the official Amarok flyer
  const isOfficialAmarok = pub.id === 'amarok-official-flyer' || (pub.model.trim().toLowerCase() === 'amarok' && pub.isDefault)
  if (pub.only0km || isOfficialAmarok) {
    if (!isVehicle0km(vehicle)) {
      return false
    }
  }

  return true
}

export function getSavedPublicidades(): AdPublicidadTemplate[] {
  if (typeof window === 'undefined') return DEFAULT_PUBLICIDADES
  try {
    const raw = localStorage.getItem('autoapp_ad_publicidades_v2')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const mapped = parsed.map((p: AdPublicidadTemplate) => {
          if (p.id === 'amarok-official-flyer' || (p.model?.toLowerCase() === 'amarok' && p.isDefault)) {
            return { ...p, only0km: true, name: 'Publicidad Oficial Amarok 0KM' }
          }
          return p
        })
        const hasAmarok = mapped.some(p => p.id === 'amarok-official-flyer' || p.model?.toLowerCase() === 'amarok')
        return hasAmarok ? mapped : [DEFAULT_PUBLICIDADES[0], ...mapped]
      }
    }
  } catch (e) {
    console.warn('Error reading saved publicidades:', e)
  }
  return DEFAULT_PUBLICIDADES
}

export function savePublicidades(list: AdPublicidadTemplate[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('autoapp_ad_publicidades_v2', JSON.stringify(list))
  } catch (e) {
    console.warn('Error saving publicidades:', e)
  }
}

