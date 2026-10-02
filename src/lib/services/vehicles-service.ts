import { createAdminClient } from '@/lib/supabase/server'
import { Vehicle } from '@/lib/supabase/types'

interface CacheEntry {
  vehicles: Vehicle[]
  timestamp: number
}

// Global in-memory cache shared across all pages (/crm, /stock, /publicaciones)
let memoryCache: CacheEntry | null = null

// Cache time-to-live: 60 seconds
const CACHE_TTL_MS = 60 * 1000

import { compareVehiclesStable } from '@/lib/utils'
export { compareVehiclesStable }


/**
 * Obtiene el inventario unificado de vehículos (Usados + 0KM con fotos mapeadas)
 * Servido directamente desde la memoria RAM del servidor (< 1ms)
 */
export async function getAllCachedVehicles(options?: { forceRefresh?: boolean }): Promise<Vehicle[]> {
  const now = Date.now()

  if (!options?.forceRefresh && memoryCache && (now - memoryCache.timestamp < CACHE_TTL_MS)) {
    return memoryCache.vehicles
  }

  const supabase = createAdminClient()

  const [usadosRes, okmRes] = await Promise.all([
    supabase.from('DB_STOCK').select('*').order('createdAt', { ascending: false }).order('ID', { ascending: true }),
    supabase.from('DB_STOCK_OKM').select('*').order('createdAt', { ascending: false }).order('ID', { ascending: true }),
  ])

  const rawUsados = usadosRes.data ?? []
  const rawOkm = okmRes.data ?? []

  // Filtrar autos que realmente necesiten fotos de las tablas secundarias
  const missingUsadosIds = rawUsados
    .filter((v: any) => !v.FOTO_PORTADA && !v.FOTOS_EXTRA)
    .map((v: any) => v.ID)
    .filter(Boolean)

  const missingOkmIds = rawOkm
    .filter((v: any) => !v.FOTO_PORTADA && !v.FOTOS_EXTRA)
    .map((v: any) => v.ID)
    .filter(Boolean)

  const [fotosRes, fotosOkmRes] = await Promise.all([
    missingUsadosIds.length > 0
      ? supabase.from('DB_FOTOS').select('ID_AUTO, FOTO_ARCHIVO').in('ID_AUTO', missingUsadosIds)
      : Promise.resolve({ data: [] }),
    missingOkmIds.length > 0
      ? supabase.from('DB_FOTOS_OKM').select('ID_AUTO, FOTO_ARCHIVO').in('ID_AUTO', missingOkmIds)
      : Promise.resolve({ data: [] }),
  ])

  const photoMap: Record<string, string[]> = {}
  ;(fotosRes.data ?? []).forEach((f: any) => {
    if (f.ID_AUTO && f.FOTO_ARCHIVO) {
      if (!photoMap[f.ID_AUTO]) photoMap[f.ID_AUTO] = []
      if (!photoMap[f.ID_AUTO].includes(f.FOTO_ARCHIVO)) photoMap[f.ID_AUTO].push(f.FOTO_ARCHIVO)
    }
  })
  ;(fotosOkmRes.data ?? []).forEach((f: any) => {
    if (f.ID_AUTO && f.FOTO_ARCHIVO) {
      if (!photoMap[f.ID_AUTO]) photoMap[f.ID_AUTO] = []
      if (!photoMap[f.ID_AUTO].includes(f.FOTO_ARCHIVO)) photoMap[f.ID_AUTO].push(f.FOTO_ARCHIVO)
    }
  })

  const mergeVehiclePhotos = (v: any, isOkm: boolean): Vehicle => {
    const carId = v.ID
    const dbFotos = photoMap[carId] || []
    const rawPortada = v.FOTO_PORTADA?.trim() || ''

    const existingExtra: string[] = []
    if (v.FOTOS_EXTRA) {
      if (typeof v.FOTOS_EXTRA === 'string' && v.FOTOS_EXTRA.trim()) {
        const str = v.FOTOS_EXTRA.trim()
        if (str.startsWith('[') && str.endsWith(']')) {
          try {
            const parsed = JSON.parse(str)
            if (Array.isArray(parsed)) {
              parsed.forEach((u: string) => {
                if (typeof u === 'string' && u.trim()) existingExtra.push(u.trim())
              })
            }
          } catch (e) {}
        }
        if (existingExtra.length === 0) {
          str.split(/[,;\n\r]+/).forEach((u: string) => {
            if (u.trim()) existingExtra.push(u.trim())
          })
        }
      }
    }

    const mergedList: string[] = []
    if (rawPortada) mergedList.push(rawPortada)
    existingExtra.forEach(u => {
      if (!mergedList.includes(u)) mergedList.push(u)
    })
    dbFotos.forEach(u => {
      if (!mergedList.includes(u)) mergedList.push(u)
    })

    const portada = mergedList.length > 0 ? mergedList[0] : null
    const extraList = mergedList.length > 1 ? mergedList.slice(1) : []

    return {
      ...v,
      FOTO_PORTADA: portada,
      FOTOS_EXTRA: extraList.length > 0 ? JSON.stringify(extraList) : null,
      Tipo_Vehiculo: isOkm ? '0km' : 'Usado',
      is_okm_table: isOkm,
      Km: isOkm ? (v.Km ?? 0) : v.Km,
    }
  }

  const usados = rawUsados.map((v: any) => mergeVehiclePhotos(v, false))
  const okm = rawOkm.map((v: any) => mergeVehiclePhotos(v, true))
  
  // Ordenamiento determinista estable
  const vehicles = [...usados, ...okm].sort(compareVehiclesStable)

  memoryCache = {
    vehicles,
    timestamp: now,
  }

  return vehicles
}

/**
 * Actualiza los campos de un vehículo directamente en la caché RAM.
 * Evita cualquier desfase de 60s y garantiza que router.refresh() retorne los datos nuevos al instante.
 */
export function updateVehicleInCache(id: string, updatedFields: Partial<Vehicle>) {
  if (memoryCache && memoryCache.vehicles) {
    const idx = memoryCache.vehicles.findIndex(v => String(v.ID) === String(id))
    if (idx !== -1) {
      memoryCache.vehicles[idx] = {
        ...memoryCache.vehicles[idx],
        ...updatedFields,
      }
      // Re-ordenar de forma estable
      memoryCache.vehicles.sort(compareVehiclesStable)
    }
  }
}

/**
 * Remueve un vehículo de la caché en RAM cuando es eliminado
 */
export function removeVehicleFromCache(id: string) {
  if (memoryCache && memoryCache.vehicles) {
    memoryCache.vehicles = memoryCache.vehicles.filter(v => String(v.ID) !== String(id))
  }
}

/**
 * Agrega un nuevo vehículo a la caché en RAM
 */
export function addVehicleToCache(vehicle: Vehicle) {
  if (memoryCache && memoryCache.vehicles) {
    memoryCache.vehicles.push(vehicle)
    memoryCache.vehicles.sort(compareVehiclesStable)
  }
}

/**
 * Invalida la caché en memoria cuando se crea, edita o elimina un vehículo
 */
export function invalidateVehiclesCache() {
  memoryCache = null
}
