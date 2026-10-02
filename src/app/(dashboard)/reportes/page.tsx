import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { formatPrice } from '@/lib/utils'
import { TrendingUp, Package, Users, DollarSign } from 'lucide-react'

export default async function ReportesPage() {
  const supabase = await createClient()

  const [{ data: vehicles }, { data: leads }] = await Promise.all([
    supabase.from('DB_STOCK').select('Marca, Modelo, Estado, Precio_Venta, Precio_Compra, createdAt'),
    supabase.from('DB_LEADS').select('Etapa, created_at'),
  ])

  const vv = vehicles ?? []
  const ll = leads ?? []

  // Funnel data
  const stages = ['NUEVO', 'CONTACTADO', 'INTERESADO', 'PROPUESTA', 'CERRADO']
  const funnel = stages.map(s => ({
    stage: s,
    count: ll.filter(l => l.Etapa === s).length,
  }))

  // Stock por estado
  const byState = ['DISPONIBLE', 'RESERVADO', 'SEÑADO', 'VENDIDO'].map(s => ({
    estado: s,
    count: vv.filter(v => v.Estado === s).length,
  }))

  const totalValorDisponible = vv
    .filter(v => v.Estado === 'DISPONIBLE')
    .reduce((acc, v) => acc + (v.Precio_Venta ?? 0), 0)

  const totalVendidos = vv.filter(v => v.Estado === 'VENDIDO').length

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Header title="Reportes y Métricas" subtitle="Análisis del rendimiento de tu agencia" />

      <div className="p-6 animate-in flex flex-col gap-6">
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total en Stock', value: vv.length, icon: Package, iconBg: 'bg-yellow-400/10', iconColor: 'text-yellow-400' },
            { label: 'Vendidos', value: totalVendidos, icon: TrendingUp, iconBg: 'bg-yellow-400/10', iconColor: 'text-yellow-400' },
            { label: 'Total Leads', value: ll.length, icon: Users, iconBg: 'bg-yellow-300/10', iconColor: 'text-yellow-300' },
            { label: 'Valor Disponible', value: formatPrice(totalValorDisponible), icon: DollarSign, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500' },
          ].map(({ label, value, icon: Icon, iconBg, iconColor }) => (
            <div key={label} className="card p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                <Icon size={18} className={iconColor} />
              </div>
              <div>
                <p className="text-xs text-[#8B8FA8]">{label}</p>
                <p className="text-xl font-bold mt-0.5 text-[#E8EAED]">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Funnel + State */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lead funnel */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4 text-[#E8EAED]">Embudo de Ventas</h3>
            <div className="flex flex-col gap-2">
              {funnel.map(({ stage, count }) => {
                const max = Math.max(...funnel.map(f => f.count), 1)
                const pct = Math.round((count / max) * 100)
                const barColors: Record<string, string> = {
                  NUEVO: 'bg-yellow-300', CONTACTADO: 'bg-amber-500', INTERESADO: 'bg-orange-500',
                  PROPUESTA: 'bg-violet-500', CERRADO: 'bg-yellow-400',
                }
                return (
                  <div key={stage}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#8B8FA8]">{stage}</span>
                      <span className="font-semibold text-[#E8EAED]">{count}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden bg-[#1A1D28]">
                      <div className={`h-full rounded-full transition-all duration-700 ${barColors[stage] || 'bg-yellow-400'}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Stock by state */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4 text-[#E8EAED]">Stock por Estado</h3>
            <div className="flex flex-col gap-3">
              {byState.map(({ estado, count }) => {
                const dotColors: Record<string, string> = {
                  DISPONIBLE: 'bg-yellow-400', RESERVADO: 'bg-amber-500', SEÑADO: 'bg-violet-500', VENDIDO: 'bg-gray-500',
                }
                const total = Math.max(vv.length, 1)
                return (
                  <div key={estado} className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColors[estado] || 'bg-gray-500'}`} />
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#8B8FA8]">{estado}</span>
                        <span className="font-semibold text-[#E8EAED]">
                          {count} ({Math.round((count / total) * 100)}%)
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden bg-[#1A1D28]">
                        <div className={`h-full rounded-full ${dotColors[estado] || 'bg-gray-500'}`}
                          style={{ width: `${(count / total) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
