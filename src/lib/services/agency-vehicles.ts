import { SupabaseClient } from '@supabase/supabase-js'
import { Vehicle } from '@/lib/supabase/types'
import { OKM_AGENCY_ID } from '@/lib/services/account-context'

/**
 * Obtiene los IDs de vehículos asignados a una agencia independiente desde APP_ENVIOS
 */
export async function getAgencyVehicleIds(
  supabase: SupabaseClient,
  agencyId: string
): Promise<string[]> {
  if (agencyId === OKM_AGENCY_ID) {
    return []
  }

  try {
    const rowId = `CONFIG_AGENCY_STOCK_${agencyId}`
    const { data, error } = await supabase
      .from('APP_ENVIOS')
      .select('Observaciones')
      .eq('ID', rowId)
      .maybeSingle()

    if (!error && data?.Observaciones) {
      const parsed = JSON.parse(data.Observaciones)
      if (Array.isArray(parsed)) {
        return parsed.map(String)
      }
    }
  } catch (e) {
    console.warn(`[Agency Vehicles] Error loading vehicle IDs for ${agencyId}:`, e)
  }

  return []
}

/**
 * Obtiene todos los IDs de vehículos creados por agencias independientes (para no mostrárselos a OKM)
 */
export async function getAllIndependentVehicleIds(
  supabase: SupabaseClient
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('APP_ENVIOS')
      .select('Observaciones')
      .like('ID', 'CONFIG_AGENCY_STOCK_%')

    if (!error && data) {
      const allIds = new Set<string>()
      for (const row of data) {
        if (row.Observaciones) {
          try {
            const arr = JSON.parse(row.Observaciones)
            if (Array.isArray(arr)) {
              arr.forEach((id: any) => allIds.add(String(id)))
            }
          } catch (e) {}
        }
      }
      return Array.from(allIds)
    }
  } catch (e) {}

  return []
}

/**
 * Registra un nuevo vehículo a la agencia propietaria
 */
export async function registerVehicleToAgency(
  supabase: SupabaseClient,
  agencyId: string,
  vehicleId: string
): Promise<boolean> {
  if (agencyId === OKM_AGENCY_ID) {
    return true // Pertenece automáticamente al pool principal de OKM
  }

  try {
    const rowId = `CONFIG_AGENCY_STOCK_${agencyId}`
    const currentIds = await getAgencyVehicleIds(supabase, agencyId)
    const strId = String(vehicleId).trim()

    if (!currentIds.includes(strId)) {
      currentIds.push(strId)
    }

    const { error } = await supabase
      .from('APP_ENVIOS')
      .upsert({
        ID: rowId,
        Patente: 'CONFIG',
        Vehiculo: 'STOCK_INDEX',
        Cliente_Nombre: agencyId,
        Fecha_Envio: new Date().toISOString(),
        Estado_Envio: 'ACTIVO',
        Observaciones: JSON.stringify(currentIds),
      }, { onConflict: 'ID' })

    return !error
  } catch (e) {
    console.error(`[Agency Vehicles] Error registering vehicle ${vehicleId} to ${agencyId}:`, e)
    return false
  }
}

/**
 * Desvincula un vehículo de la agencia propietaria (al ser eliminado)
 */
export async function unregisterVehicleFromAgency(
  supabase: SupabaseClient,
  agencyId: string,
  vehicleId: string
): Promise<boolean> {
  if (agencyId === OKM_AGENCY_ID) {
    return true
  }

  try {
    const rowId = `CONFIG_AGENCY_STOCK_${agencyId}`
    const currentIds = await getAgencyVehicleIds(supabase, agencyId)
    const strId = String(vehicleId).trim()
    const filtered = currentIds.filter(id => id !== strId)

    const { error } = await supabase
      .from('APP_ENVIOS')
      .upsert({
        ID: rowId,
        Patente: 'CONFIG',
        Vehiculo: 'STOCK_INDEX',
        Cliente_Nombre: agencyId,
        Fecha_Envio: new Date().toISOString(),
        Estado_Envio: 'ACTIVO',
        Observaciones: JSON.stringify(filtered),
      }, { onConflict: 'ID' })

    return !error
  } catch (e) {
    return false
  }
}

/**
 * Filtra la lista de vehículos unificados según la agencia del usuario autenticado
 */
export async function filterVehiclesForAgency(
  supabase: SupabaseClient,
  allVehicles: Vehicle[],
  agencyId: string,
  isOkmAccount: boolean
): Promise<Vehicle[]> {
  // Si pertenece a OKM Motors (Admin o sus vendedores)
  if (isOkmAccount) {
    const foreignIds = await getAllIndependentVehicleIds(supabase)
    if (foreignIds.length === 0) {
      return allVehicles
    }
    const foreignSet = new Set(foreignIds)
    return allVehicles.filter(v => !foreignSet.has(String(v.ID)))
  }

  // Si es un usuario independiente o vendedor de agencia independiente
  const agencyVehicleIds = await getAgencyVehicleIds(supabase, agencyId)
  if (agencyVehicleIds.length === 0) {
    return [] // Usuario nuevo independiente inicia con 0 vehículos
  }

  const idSet = new Set(agencyVehicleIds)
  return allVehicles.filter(v => idSet.has(String(v.ID)))
}
