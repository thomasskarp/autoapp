import { createAdminClient } from '@/lib/supabase/server'

export interface VisibilityData {
  hiddenBrands: string[]
  hiddenVehicles: string[]
}

// In-memory cache for ultra-fast (0ms) response
let cachedVisibility: VisibilityData | null = null
let cacheTime = 0
const TTL = 30 * 1000 // 30 seconds

export async function getStoredVisibility(): Promise<VisibilityData> {
  const now = Date.now()
  if (cachedVisibility && now - cacheTime < TTL) {
    return cachedVisibility
  }

  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('APP_ENVIOS')
      .select('Observaciones')
      .eq('ID', 'CONFIG_VISIBILITY')
      .maybeSingle()

    if (data?.Observaciones) {
      const parsed = JSON.parse(data.Observaciones)
      cachedVisibility = {
        hiddenBrands: Array.isArray(parsed.hidden_brands) 
          ? parsed.hidden_brands.map((b: string) => String(b).trim().toUpperCase()) 
          : [],
        hiddenVehicles: Array.isArray(parsed.hidden_vehicles) 
          ? parsed.hidden_vehicles.map((id: any) => String(id)) 
          : []
      }
      cacheTime = now
      return cachedVisibility
    }
  } catch (err) {
    console.error('[VisibilityService] Error reading visibility config:', err)
  }

  return cachedVisibility || { hiddenBrands: [], hiddenVehicles: [] }
}

export async function saveStoredVisibility(data: VisibilityData): Promise<boolean> {
  cachedVisibility = {
    hiddenBrands: data.hiddenBrands.map(b => b.trim().toUpperCase()),
    hiddenVehicles: data.hiddenVehicles.map(id => String(id))
  }
  cacheTime = Date.now()

  try {
    const supabase = createAdminClient()
    await supabase.from('APP_ENVIOS').upsert({
      ID: 'CONFIG_VISIBILITY',
      Patente: 'CONFIG',
      Vehiculo: 'SYSTEM',
      Cliente_Nombre: 'ADMIN_VISIBILITY',
      Observaciones: JSON.stringify({
        hidden_brands: cachedVisibility.hiddenBrands,
        hidden_vehicles: cachedVisibility.hiddenVehicles
      })
    })
    return true
  } catch (err) {
    console.error('[VisibilityService] Error saving visibility config:', err)
    return false
  }
}
