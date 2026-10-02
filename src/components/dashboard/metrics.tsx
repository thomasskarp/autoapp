'use client'

import { Car, Users, TrendingUp, DollarSign, Clock, CheckCircle } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface MetricsProps {
  stockTotal: number
  reservados: number
  leadsActivos: number
  valorStock: number
  totalVehicles: number
}

const cards = [
  {
    key: 'stock',
    label: 'Stock Disponible',
    icon: Car,
    cardBg: 'bg-gradient-to-br from-yellow-400/10 to-indigo-600/10 border-yellow-400/20',
    glowBg: 'bg-yellow-400',
    iconBg: 'bg-yellow-400/10',
    iconColor: 'text-yellow-400',
  },
  {
    key: 'reservados',
    label: 'Reservados',
    icon: Clock,
    cardBg: 'bg-gradient-to-br from-amber-500/10 to-amber-700/10 border-amber-500/20',
    glowBg: 'bg-amber-500',
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-500',
  },
  {
    key: 'leads',
    label: 'Leads Activos',
    icon: Users,
    cardBg: 'bg-gradient-to-br from-yellow-300/10 to-emerald-500/10 border-yellow-300/20',
    glowBg: 'bg-yellow-300',
    iconBg: 'bg-yellow-300/15',
    iconColor: 'text-yellow-300',
  },
  {
    key: 'valor',
    label: 'Valor del Stock',
    icon: DollarSign,
    cardBg: 'bg-gradient-to-br from-yellow-400/10 to-emerald-600/10 border-yellow-400/20',
    glowBg: 'bg-yellow-400',
    iconBg: 'bg-yellow-400/10',
    iconColor: 'text-yellow-400',
  },
]

export function DashboardMetrics({ stockTotal, reservados, leadsActivos, valorStock, totalVehicles }: MetricsProps) {
  const values: Record<string, string | number> = {
    stock: stockTotal,
    reservados: reservados,
    leads: leadsActivos,
    valor: formatPrice(valorStock),
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ key, label, icon: Icon, cardBg, glowBg, iconBg, iconColor }) => (
        <div key={key} className={`card p-5 flex flex-col gap-3 relative overflow-hidden transition-all duration-200 hover:scale-[1.02] border ${cardBg}`}>
          {/* Background glow */}
          <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 blur-xl ${glowBg}`} />

          {/* Icon */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-[#8B8FA8]">{label}</span>
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${iconBg}`}>
              <Icon size={16} className={iconColor} />
            </div>
          </div>

          {/* Value */}
          <div>
            <p className="text-3xl font-bold text-[#E8EAED]">{values[key]}</p>
            {key === 'stock' && (
              <p className="text-xs mt-1 text-[#8B8FA8]">
                {totalVehicles} total · {reservados} reservados
              </p>
            )}
            {key === 'leads' && (
              <p className="text-xs mt-1 text-[#8B8FA8]">Leads en seguimiento activo</p>
            )}
            {key === 'valor' && (
              <p className="text-xs mt-1 text-[#8B8FA8]">En {stockTotal} vehículos disponibles</p>
            )}
            {key === 'reservados' && (
              <p className="text-xs mt-1 text-[#8B8FA8]">Pendientes de cierre</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
