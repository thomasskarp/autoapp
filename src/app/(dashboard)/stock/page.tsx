import { getAllCachedVehicles } from '@/lib/services/vehicles-service'
import { Header } from '@/components/layout/header'
import { StockTable } from '@/components/stock/stock-table'
import { ExportExcelButton } from '@/components/stock/export-excel-button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export const revalidate = 30

export default async function StockPage() {
  const allVehicles = await getAllCachedVehicles()

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Header
        title="Stock"
        actions={
          <div className="flex items-center gap-2">
            <ExportExcelButton vehicles={allVehicles} />
            <Link href="/stock/nuevo" className="btn-primary">
              <Plus size={16} /> Nuevo Vehículo
            </Link>
          </div>
        }
      />
      <div className="p-6 animate-in">
        <StockTable vehicles={allVehicles} />
      </div>
    </div>
  )
}
