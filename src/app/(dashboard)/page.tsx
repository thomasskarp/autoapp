import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { DashboardMetrics } from '@/components/dashboard/metrics'
import { RecentStock } from '@/components/dashboard/recent-stock'
import { RecentLeads } from '@/components/dashboard/recent-leads'
import { StockByBrandChart } from '@/components/dashboard/stock-chart'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch all data in parallel
  const [stockRes, leadsRes, interRes] = await Promise.all([
    supabase.from('DB_STOCK').select('*').order('createdAt', { ascending: false }),
    supabase.from('DB_LEADS').select('*').order('created_at', { ascending: false }),
    supabase.from('DB_INTERACCIONES').select('*').order('created_at', { ascending: false }).limit(50),
  ])

  const vehicles = stockRes.data ?? []
  const leads = leadsRes.data ?? []

  const disponibles = vehicles.filter(v => v.Estado === 'DISPONIBLE')
  const reservados  = vehicles.filter(v => v.Estado === 'RESERVADO')
  const activeLeads = leads.filter(l => !['CERRADO', 'PERDIDO'].includes(l.Etapa ?? ''))
  const totalValor  = disponibles.reduce((acc, v) => acc + (v.Precio_Venta ?? 0), 0)

  // Stock by brand for chart
  const brandMap: Record<string, number> = {}
  disponibles.forEach(v => {
    if (v.Marca) brandMap[v.Marca] = (brandMap[v.Marca] ?? 0) + 1
  })
  const brandData = Object.entries(brandMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Header
        title="Dashboard"
        subtitle="Resumen general de tu agencia"
      />

      <div className="p-6 flex flex-col gap-6 animate-in">
        {/* Metric cards */}
        <DashboardMetrics
          stockTotal={disponibles.length}
          reservados={reservados.length}
          leadsActivos={activeLeads.length}
          valorStock={totalValor}
          totalVehicles={vehicles.length}
        />

        {/* Charts + Recent data */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <StockByBrandChart data={brandData} />
          </div>
          <div>
            <RecentLeads leads={leads.slice(0, 6)} />
          </div>
        </div>

        {/* Recent stock */}
        <RecentStock vehicles={vehicles.slice(0, 5)} />
      </div>
    </div>
  )
}
