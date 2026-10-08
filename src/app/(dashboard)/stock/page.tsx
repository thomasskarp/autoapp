import { getAllCachedVehicles } from '@/lib/services/vehicles-service'
import { getStoredVisibility } from '@/lib/services/visibility-service'
import { Header } from '@/components/layout/header'
import { StockTable } from '@/components/stock/stock-table'
import { ExportExcelButton } from '@/components/stock/export-excel-button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 0

export default async function StockPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const rawRole = user?.user_metadata?.role?.toLowerCase()
  const isAdmin = user?.email === 'okmmotorschaco@gmail.com' ||
                  user?.email === 'tomas.skarp@gmail.com' ||
                  rawRole === 'admin' ||
                  rawRole === 'administrador' ||
                  rawRole === 'superadmin' ||
                  rawRole === 'owner'

  const [allVehicles, visibility] = await Promise.all([
    getAllCachedVehicles(),
    getStoredVisibility()
  ])

  // Si es vendedor, solo exporta los vehículos que no estén ocultos
  const exportVehicles = isAdmin
    ? allVehicles
    : allVehicles.filter(v => {
        const isCarHidden = visibility.hiddenVehicles.includes(String(v.ID))
        const isBrandHidden = visibility.hiddenBrands.includes((v.Marca || '').trim().toUpperCase())
        return !isCarHidden && !isBrandHidden
      })

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Header
        title="Stock"
        actions={
          <div className="flex items-center gap-2">
            <ExportExcelButton vehicles={exportVehicles} />
            <Link href="/stock/nuevo" className="btn-primary">
              <Plus size={16} /> Nuevo Vehículo
            </Link>
          </div>
        }
      />
      <div className="p-6 animate-in">
        <StockTable 
          vehicles={allVehicles}
          initialIsAdmin={!!isAdmin}
          initialHiddenBrands={visibility.hiddenBrands}
          initialHiddenVehicles={visibility.hiddenVehicles}
        />
      </div>
    </div>
  )
}
