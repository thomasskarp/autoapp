import { getAllCachedVehicles } from '@/lib/services/vehicles-service'
import { PublicationsClient } from '@/components/publications/publications-client'

export const revalidate = 30

export default async function PublicacionesPage() {
  const allVehicles = await getAllCachedVehicles()

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
