import { getAllCachedVehicles } from '@/lib/services/vehicles-service'
import { PublicationsClient } from '@/components/publications/publications-client'
import { createClient } from '@/lib/supabase/server'
import { getAccountContext } from '@/lib/services/account-context'
import { filterVehiclesForAgency } from '@/lib/services/agency-vehicles'

export const revalidate = 0

export default async function PublicacionesPage() {
  const supabase = await createClient()
  const context = await getAccountContext(supabase)
  const rawVehicles = await getAllCachedVehicles()

  const allVehicles = await filterVehiclesForAgency(
    supabase,
    rawVehicles,
    context.agencyId,
    context.isOkmAccount
  )

  const isAvailable = (estado?: string) => {
    if (!estado) return true
    const normalized = estado.trim().toUpperCase().replace('.', '')
    return normalized === 'DISPONIBLE' || normalized === 'AVAILABLE'
  }

  const availableVehicles = allVehicles.filter(v => isAvailable(v.Estado))

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <PublicationsClient vehicles={availableVehicles} />
    </div>
  )
}
