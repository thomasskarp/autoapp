import { getAllCachedVehicles } from '@/lib/services/vehicles-service'
import { Header } from '@/components/layout/header'
import { CrmVehiclesClient } from '@/components/crm/crm-vehicles-client'
import { Settings } from 'lucide-react'

export const revalidate = 30

export default async function CRMPage() {
  const allVehicles = await getAllCachedVehicles()

  const isAvailable = (estado?: string) => {
    if (!estado) return true
    const normalized = estado.trim().toUpperCase().replace('.', '')
    return normalized === 'DISPONIBLE' || normalized === 'AVAILABLE'
  }

  const availableVehicles = allVehicles.filter(v => isAvailable(v.Estado))

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Header
        title="CRM"
        titleAddon={
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1A1D28] border border-[#2A2F45] text-[#8B8FA8] hover:text-white transition-colors cursor-pointer">
            <Settings size={14} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
          </div>
        }
      />

      <div className="p-6 animate-in flex flex-col gap-6">
        <CrmVehiclesClient vehicles={availableVehicles} />
      </div>
    </div>
  )
}
