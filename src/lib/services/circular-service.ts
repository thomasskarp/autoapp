'use client'

import { Vehicle } from '@/lib/supabase/types'
import { formatNumberDots } from '@/lib/utils'

export interface CircularRow {
  id: number // 1, 2, 3, 4, ...
  maxFinanciar: number // Capital máximo a financiar
  cantCuotas: number // Cantidad de cuotas (ej. 12, 18, 24, 36)
  costoCuota: number // Costo por cuota (ej. maxFinanciar / cantCuotas)
}

export interface CircularConfig {
  id?: string
  marca: string
  modelo: string // Nombre legible o representación string (ej: 'ALL', 'Amarok', o 'Amarok, Taos')
  modelos?: string[] // ['ALL'] o lista de modelos: ['Amarok', 'Taos']
  version: string // 'ALL' = todas las versiones, o string de versión específica
  versiones?: string[] // ['ALL'] o lista de versiones: ['Trendline', 'Comfortline']
  selectedRowIndex?: number // Índice del renglón aplicado
  rows: CircularRow[]
  updatedAt: string
}

const STORAGE_KEY = 'autoapp_circulares_0km_v1'

// Renglones vacíos en blanco para vehículos sin circular cargada
export const EMPTY_CIRCULAR_ROWS: CircularRow[] = [
  { id: 1, maxFinanciar: 0, cantCuotas: 0, costoCuota: 0 },
  { id: 2, maxFinanciar: 0, cantCuotas: 0, costoCuota: 0 },
  { id: 3, maxFinanciar: 0, cantCuotas: 0, costoCuota: 0 },
  { id: 4, maxFinanciar: 0, cantCuotas: 0, costoCuota: 0 },
]

export const DEFAULT_CIRCULAR_ROWS: CircularRow[] = EMPTY_CIRCULAR_ROWS

export interface BrandCatalogEntry {
  models: string[]
  versions?: Record<string, string[]>
}

/**
 * Catálogo argentino de marcas, modelos y versiones para 0KM
 */
export const BRAND_MODELS_CATALOG: Record<string, BrandCatalogEntry> = {
  VOLKSWAGEN: {
    models: ['Amarok', 'Taos', 'Polo', 'Nivus', 'T-Cross', 'Saveiro', 'Virtus', 'Vento', 'Tiguan'],
    versions: {
      Amarok: ['Trendline', 'Comfortline', 'Highline', 'Extreme', 'Black Style', 'V6 Highline', 'V6 Extreme', 'V6 Black Style'],
      Taos: ['Comfortline', 'Highline', 'Bi-Tono'],
      Polo: ['Track', 'Trendline', 'Comfortline', 'Highline', 'GTS'],
      Nivus: ['170 TSI', 'Comfortline', 'Highline', 'Hero'],
      'T-Cross': ['170 TSI', 'Comfortline', 'Highline', 'Trendline'],
      Saveiro: ['Trendline', 'Comfortline', 'Extreme'],
      Virtus: ['Trendline', 'Comfortline', 'Highline', 'Exclusive'],
      Vento: ['GLI', 'Highline'],
      Tiguan: ['Allspace', 'Life', 'Elegance'],
    },
  },
  TOYOTA: {
    models: ['Hilux', 'Corolla', 'Corolla Cross', 'Yaris', 'SW4', 'Hiace', 'RAV4', 'GR Yaris'],
    versions: {
      Hilux: ['DX', 'SR', 'SRV', 'SRX', 'GR-Sport', 'Conquest'],
      Corolla: ['XLI', 'XEI', 'SEG', 'GR-Sport', 'HEV'],
      'Corolla Cross': ['XLI', 'XEI', 'SEG', 'GR-Sport', 'HEV'],
      Yaris: ['XS', 'XLS', 'XLS Pack', 'S'],
      SW4: ['SRX', 'Diamond', 'GR-Sport'],
      Hiace: ['Furgón', 'Commuter', 'Wagon'],
    },
  },
  FORD: {
    models: ['Ranger', 'Maverick', 'Territory', 'Bronco Sport', 'Transit', 'Mustang', 'F-150'],
    versions: {
      Ranger: ['XL', 'XLS', 'XLT', 'Limited', 'Limited+', 'Raptor', 'Black'],
      Maverick: ['XLT', 'Lariat', 'FX4', 'Hybrid'],
      Territory: ['SEL', 'Titanium'],
      'Bronco Sport': ['Big Bend', 'Wildtrak', 'Badlands'],
      Transit: ['Van', 'Minibus', 'Chasis'],
    },
  },
  FIAT: {
    models: ['Cronos', 'Toro', 'Strada', 'Pulse', 'Fastback', 'Fiorino', 'Mobi', 'Titano', 'Ducato'],
    versions: {
      Cronos: ['Like', 'Drive', 'Drive Pack Plus', 'Precision'],
      Toro: ['Freedom', 'Volcano', 'Ultra', 'Ranch'],
      Strada: ['Endurance', 'Freedom', 'Volcano', 'Ultra', 'Ranch'],
      Pulse: ['Drive', 'Audace', 'Impetus', 'Abarth'],
      Fastback: ['Turbo', 'T270', 'Abarth'],
      Fiorino: ['Endurance'],
      Mobi: ['Like', 'Trekking'],
      Titano: ['Endurance', 'Volcano', 'Ranch'],
    },
  },
  CHEVROLET: {
    models: ['Tracker', 'S10', 'Onix', 'Onix Plus', 'Montana', 'Spin', 'Cruze', 'Trailblazer', 'Silverado'],
    versions: {
      Tracker: ['LS', 'LTZ', 'Premier', 'RS'],
      S10: ['WT', 'LT', 'LTZ', 'High Country', 'Midnight', 'Z71'],
      Onix: ['1.2', 'LT', 'LTZ', 'Premier', 'RS'],
      'Onix Plus': ['1.2', 'LT', 'LTZ', 'Premier'],
      Montana: ['LT', 'LTZ', 'Premier', 'RS'],
      Spin: ['LT', 'LTZ', 'Premier'],
    },
  },
  PEUGEOT: {
    models: ['208', '2008', '3008', 'Partner', 'Expert', 'Boxer'],
    versions: {
      '208': ['Like', 'Active', 'Allure', 'Feline', 'GT', 'Style', 'Roadtrip'],
      '2008': ['Active', 'Allure', 'GT'],
      Partner: ['Confort', 'Furgón'],
      '3008': ['Allure', 'GT Pack'],
    },
  },
  RENAULT: {
    models: ['Kangoo', 'Sandero', 'Stepway', 'Logan', 'Duster', 'Oroch', 'Kardian', 'Master', 'Alaskan'],
    versions: {
      Kangoo: ['Confort', 'Emotion', 'Stepway'],
      Duster: ['Zen', 'Intens', 'Iconic'],
      Oroch: ['Emotion', 'Iconic', 'Outsider'],
      Kardian: ['Evolution', 'Techno', 'Premiere Edition'],
      Sandero: ['Life', 'Zen', 'Intens'],
      Stepway: ['Zen', 'Intens'],
      Alaskan: ['Confort', 'Emotion', 'Intens', 'Iconic'],
    },
  },
  JEEP: {
    models: ['Renegade', 'Compass', 'Commander', 'Wrangler', 'Gladiator', 'Grand Cherokee'],
    versions: {
      Renegade: ['Sport', 'Longitude', 'Trailhawk', 'Serie-S'],
      Compass: ['Sport', 'Longitude', 'Limited', 'Trailhawk', 'Serie-S'],
      Commander: ['Limited', 'Overland', 'Blackhawk'],
    },
  },
  CITROEN: {
    models: ['C3', 'C3 Aircross', 'C4 Cactus', 'Berlingo', 'Jumpy'],
    versions: {
      C3: ['Live', 'Live Pack', 'Feel', 'Feel Pack', 'First Edition'],
      'C3 Aircross': ['Feel Pack', 'Shine', '7 Plazas'],
      'C4 Cactus': ['Feel', 'Feel Pack', 'Shine', 'Rip Curl'],
      Berlingo: ['Furgón', 'Multispace'],
    },
  },
  NISSAN: {
    models: ['Frontier', 'Kicks', 'Versa', 'Sentra', 'X-Trail'],
    versions: {
      Frontier: ['S', 'XE', 'X-Gear', 'PRO-4X', 'Platinum'],
      Kicks: ['Sense', 'Advance', 'Exclusive'],
      Versa: ['Sense', 'Advance', 'Exclusive'],
      Sentra: ['Advance', 'SR', 'Exclusive'],
    },
  },
  RAM: {
    models: ['Rampage', '1500', '2500'],
    versions: {
      Rampage: ['Rebel', 'Laramie', 'R/T', 'Bighorn'],
      '1500': ['Laramie', 'Rebel', 'Limited'],
      '2500': ['Laramie'],
    },
  },
  HYUNDAI: {
    models: ['Creta', 'Tucson', 'Santa Fe', 'HB20', 'Staria'],
    versions: {
      Creta: ['Style', 'Safety'],
      HB20: ['Comfort', 'Premium', 'Platinum'],
    },
  },
  HONDA: {
    models: ['HR-V', 'CR-V', 'ZR-V', 'Civic'],
    versions: {
      'HR-V': ['LX', 'EX', 'EXL', 'Touring'],
      'ZR-V': ['LX', 'Touring'],
    },
  },
}

/**
 * Normaliza nombres de modelo/marca/versión para claves y comparaciones
 */
export function normalizeKey(str: string): string {
  return (str || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '_')
}

/**
 * Normaliza y resuelve la clave de marca según aliases comunes
 */
export function resolveBrandKey(brandStr: string): string {
  const norm = normalizeKey(brandStr)
  if (norm.includes('VOLKS') || norm === 'VW') return 'VOLKSWAGEN'
  if (norm.includes('TOYOTA')) return 'TOYOTA'
  if (norm.includes('FORD')) return 'FORD'
  if (norm.includes('FIAT')) return 'FIAT'
  if (norm.includes('CHEVR') || norm === 'CHEVY') return 'CHEVROLET'
  if (norm.includes('PEUG')) return 'PEUGEOT'
  if (norm.includes('RENAU')) return 'RENAULT'
  if (norm.includes('JEEP')) return 'JEEP'
  if (norm.includes('CITRO')) return 'CITROEN'
  if (norm.includes('NISS')) return 'NISSAN'
  if (norm.includes('RAM')) return 'RAM'
  if (norm.includes('HYUND')) return 'HYUNDAI'
  if (norm.includes('HOND')) return 'HONDA'
  if (norm.includes('MERCED') || norm.includes('BENZ')) return 'MERCEDES_BENZ'
  return norm
}

/**
 * Obtiene todos los modelos disponibles para una marca, fusionando el catálogo y extras detectados
 */
export function getModelsForBrand(marca: string, extraModels?: string[]): string[] {
  const brandKey = resolveBrandKey(marca)
  const catalogEntry = BRAND_MODELS_CATALOG[brandKey]
  const catalogModels = catalogEntry ? catalogEntry.models : []

  const set = new Set<string>()
  catalogModels.forEach(m => {
    if (m && m.trim()) set.add(m.trim())
  })

  if (extraModels) {
    extraModels.forEach(m => {
      if (m && m.trim() && m.toUpperCase() !== 'ALL') {
        set.add(m.trim())
      }
    })
  }

  return Array.from(set).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
}

/**
 * Obtiene todas las versiones para una marca y lista de modelos, fusionando catálogo y extras
 */
export function getVersionsForBrandAndModels(
  marca: string,
  modelos: string[],
  extraVersions?: string[]
): string[] {
  const brandKey = resolveBrandKey(marca)
  const catalogEntry = BRAND_MODELS_CATALOG[brandKey]

  const set = new Set<string>()

  if (catalogEntry?.versions) {
    modelos.forEach(mod => {
      const modNorm = normalizeKey(mod)
      for (const [catMod, vers] of Object.entries(catalogEntry.versions!)) {
        if (
          normalizeKey(catMod) === modNorm ||
          modNorm.includes(normalizeKey(catMod)) ||
          normalizeKey(catMod).includes(modNorm)
        ) {
          vers.forEach(v => {
            if (v && v.trim()) set.add(v.trim())
          })
        }
      }
    })

    // Si no encontró versiones para los modelos específicos, listar todas las versiones de la marca
    if (set.size === 0) {
      Object.values(catalogEntry.versions).forEach(vers => {
        vers.forEach(v => {
          if (v && v.trim()) set.add(v.trim())
        })
      })
    }
  }

  if (extraVersions) {
    extraVersions.forEach(v => {
      if (v && v.trim() && v.toUpperCase() !== 'ALL') {
        set.add(v.trim())
      }
    })
  }

  return Array.from(set).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
}

/**
 * Genera la clave canónica de almacenamiento para una circular
 */
export function buildCircularKey(
  marca: string,
  modelos: string[] | string,
  versiones?: string[] | string
): string {
  const m = resolveBrandKey(marca)

  let modPart = 'ALL'
  if (Array.isArray(modelos)) {
    if (modelos.length === 0 || modelos.includes('ALL')) {
      modPart = 'ALL'
    } else {
      const sortedMods = [...modelos].map(normalizeKey).sort()
      modPart = `MODS_${sortedMods.join('_')}`
    }
  } else if (modelos && modelos.trim().toUpperCase() !== 'ALL') {
    modPart = normalizeKey(modelos)
  }

  let verPart = 'ALL'
  if (Array.isArray(versiones)) {
    if (versiones.length === 0 || versiones.includes('ALL')) {
      verPart = 'ALL'
    } else {
      const sortedVers = [...versiones].map(normalizeKey).sort()
      verPart = `VERS_${sortedVers.join('_')}`
    }
  } else if (versiones && versiones.trim().toUpperCase() !== 'ALL') {
    verPart = normalizeKey(versiones)
  }

  return `${m}__${modPart}__${verPart}`
}

/**
 * Obtiene todas las circulares guardadas en localStorage
 */
export function getAllCirculares(): Record<string, CircularConfig> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, CircularConfig>
  } catch (err) {
    console.warn('[CircularService] Error reading circulares:', err)
    return {}
  }
}

/**
 * Busca si existe una circular guardada para una combinación específica de modelos y versiones
 */
export function findCircular(
  marca: string,
  modelos: string[] | string,
  versiones: string[] | string
): CircularConfig | null {
  const circulares = getAllCirculares()
  const allConfigs = Object.values(circulares)
  if (allConfigs.length === 0) return null

  const targetKey = buildCircularKey(marca, modelos, versiones)
  if (circulares[targetKey]) return circulares[targetKey]

  const mBrand = resolveBrandKey(marca)
  const normMods = Array.isArray(modelos)
    ? modelos.map(normalizeKey)
    : [normalizeKey(modelos)]
  const isTargetAllMods = normMods.includes('ALL') || normMods.length === 0

  const normVers = Array.isArray(versiones)
    ? versiones.map(normalizeKey)
    : [normalizeKey(versiones)]
  const isTargetAllVers = normVers.includes('ALL') || normVers.length === 0

  const found = allConfigs.find(c => {
    if (resolveBrandKey(c.marca) !== mBrand) return false
    const cMods = (c.modelos && c.modelos.length > 0 ? c.modelos : [c.modelo || 'ALL']).map(normalizeKey)
    const cVers = (c.versiones && c.versiones.length > 0 ? c.versiones : [c.version || 'ALL']).map(normalizeKey)

    const cIsAllMods = cMods.includes('ALL')
    const cIsAllVers = cVers.includes('ALL')

    if (isTargetAllMods !== cIsAllMods) return false
    if (isTargetAllVers !== cIsAllVers) return false

    if (!isTargetAllMods) {
      if (cMods.length !== normMods.length) return false
      if (!cMods.every(m => normMods.includes(m))) return false
    }

    if (!isTargetAllVers) {
      if (cVers.length !== normVers.length) return false
      if (!cVers.every(v => normVers.includes(v))) return false
    }

    return true
  })

  return found || null
}

/**
 * Busca la circular aplicable a un vehículo 0KM con soporte para excepciones de modelos y versiones.
 * Prioridad de resolución:
 * 1. Modelo específico + Versión específica (Excepción de versión, Score 40)
 * 2. Modelo específico + Todas las versiones (Score 30)
 * 3. Todos los modelos + Versión específica (Score 20)
 * 4. Todos los modelos + Todas las versiones (General de marca, Score 10)
 */
export function getCircularForVehicle(v: Vehicle | null): {
  circular: CircularConfig | null
  matchType: 'SPECIFIC_VERSION' | 'SPECIFIC_MODEL' | 'ALL_MODELS' | 'NONE'
} {
  if (!v || !v.Marca) return { circular: null, matchType: 'NONE' }

  const circulares = getAllCirculares()
  const allConfigs = Object.values(circulares)
  if (allConfigs.length === 0) return { circular: null, matchType: 'NONE' }

  const vBrand = resolveBrandKey(v.Marca)
  const vMod = normalizeKey(v.Modelo || '')
  const vVer = normalizeKey(v.Version || '')

  const modelsMatch = (cMod: string, targetMod: string) => {
    if (!cMod || !targetMod) return false
    return (
      cMod === targetMod ||
      targetMod.startsWith(cMod) ||
      cMod.startsWith(targetMod) ||
      targetMod.includes(cMod) ||
      cMod.includes(targetMod)
    )
  }

  const versionsMatch = (cVer: string, targetVer: string) => {
    if (!cVer || !targetVer) return false
    return (
      cVer === targetVer ||
      targetVer.includes(cVer) ||
      cVer.includes(targetVer)
    )
  }

  let bestConfig: CircularConfig | null = null
  let bestScore = 0
  let bestMatchType: 'SPECIFIC_VERSION' | 'SPECIFIC_MODEL' | 'ALL_MODELS' | 'NONE' = 'NONE'

  for (const c of allConfigs) {
    if (!c.rows || !c.rows.some(r => r.maxFinanciar > 0)) continue

    const cBrand = resolveBrandKey(c.marca)
    if (cBrand !== vBrand) continue

    const cMods = (c.modelos && c.modelos.length > 0 ? c.modelos : [c.modelo || 'ALL']).map(normalizeKey)
    const cVers = (c.versiones && c.versiones.length > 0 ? c.versiones : [c.version || 'ALL']).map(normalizeKey)

    const isAllModels = cMods.includes('ALL')
    const matchesModel = isAllModels || cMods.some(m => modelsMatch(m, vMod))

    if (!matchesModel) continue

    const isAllVersions = cVers.includes('ALL')
    const matchesVersion = isAllVersions || (vVer ? cVers.some(ver => versionsMatch(ver, vVer)) : false)

    if (!matchesVersion) continue

    let score = 0
    let matchType: 'SPECIFIC_VERSION' | 'SPECIFIC_MODEL' | 'ALL_MODELS' = 'ALL_MODELS'

    if (!isAllModels && !isAllVersions) {
      score = 40
      matchType = 'SPECIFIC_VERSION'
    } else if (!isAllModels && isAllVersions) {
      score = 30
      matchType = 'SPECIFIC_MODEL'
    } else if (isAllModels && !isAllVersions) {
      score = 20
      matchType = 'SPECIFIC_VERSION'
    } else {
      score = 10
      matchType = 'ALL_MODELS'
    }

    if (score > bestScore) {
      bestScore = score
      bestConfig = c
      bestMatchType = matchType
    }
  }

  return { circular: bestConfig, matchType: bestMatchType }
}

/**
 * Guarda una circular en localStorage y emite evento para sincronización reactiva
 */
export function saveCircular(config: CircularConfig): void {
  if (typeof window === 'undefined') return
  try {
    const circulares = getAllCirculares()
    const targetModelos = config.modelos && config.modelos.length > 0 ? config.modelos : config.modelo
    const targetVersiones = config.versiones && config.versiones.length > 0 ? config.versiones : config.version
    const key = buildCircularKey(config.marca, targetModelos, targetVersiones)

    circulares[key] = {
      ...config,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(circulares))

    // Disparar evento para que otros componentes se actualicen reactivamente
    window.dispatchEvent(new CustomEvent('circular-storage-updated', { detail: { key, config } }))
  } catch (err) {
    console.error('[CircularService] Error saving circular:', err)
  }
}

/**
 * Elimina una circular guardada
 */
export function deleteCircular(
  marca: string,
  modelos: string[] | string,
  versiones?: string[] | string
): void {
  if (typeof window === 'undefined') return
  try {
    const circulares = getAllCirculares()
    const key = buildCircularKey(marca, modelos, versiones)
    if (circulares[key]) {
      delete circulares[key]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(circulares))
      window.dispatchEvent(new CustomEvent('circular-storage-updated', { detail: { key, deleted: true } }))
    }
  } catch (err) {
    console.error('[CircularService] Error deleting circular:', err)
  }
}

/**
 * Calcula el costo de la cuota: max capital a financiar / cant cuotas
 */
export function calculateCostoCuota(maxFinanciar: number, cantCuotas: number): number {
  if (!cantCuotas || cantCuotas <= 0 || !maxFinanciar || maxFinanciar <= 0) return 0
  return Math.round(maxFinanciar / cantCuotas)
}

/**
 * Calcula la entrega mínima: precio de venta - max capital a financiar
 */
export function calculateEntrega(precioVenta: number, maxFinanciar: number): number {
  if (!precioVenta || precioVenta <= 0) return 0
  return Math.max(0, precioVenta - maxFinanciar)
}

/**
 * Formatea las cuotas para la publicación con el cálculo exacto de entrega sobre el precio del auto y el máx capital a financiar:
 * Precio de venta - max capital a financiar = entrega según cuotas
 * Ej:
 * - Entrega $45.900.000 + 24 cuotas de $690.000
 * - Entrega $43.700.000 + 18 cuotas de $1.090.000
 * - Entrega $26.800.000 + 12 cuotas de $3.090.000
 */
export function formatCuotasForPublication(
  circular: CircularConfig | null,
  precioVentaOrIndex?: number,
  _legacyIndex?: number
): string {
  if (!circular || !circular.rows || circular.rows.length === 0) return ''

  const validRows = circular.rows.filter(r => r.maxFinanciar > 0 && r.cantCuotas > 0)
  if (validRows.length === 0) return ''

  const isPrice = typeof precioVentaOrIndex === 'number' && precioVentaOrIndex > 100
  const pVenta = isPrice ? precioVentaOrIndex : 0

  return validRows
    .map(r => {
      const cuotaVal = r.costoCuota > 0 ? r.costoCuota : calculateCostoCuota(r.maxFinanciar, r.cantCuotas)
      const costoFormatted = formatNumberDots(cuotaVal)
      if (pVenta > 0) {
        const entrega = calculateEntrega(pVenta, r.maxFinanciar)
        const entregaFormatted = formatNumberDots(entrega)
        return `- Entrega $${entregaFormatted} + ${r.cantCuotas} cuotas de $${costoFormatted}`
      }
      return `- Financia hasta $${formatNumberDots(r.maxFinanciar)} en ${r.cantCuotas} cuotas de $${costoFormatted}`
    })
    .join('\n')
}

/**
 * Formatea todas las cuotas de la circular en renglones
 */
export function formatAllCuotasBulletList(
  circular: CircularConfig | null,
  precioVenta?: number
): string {
  return formatCuotasForPublication(circular, precioVenta)
}
