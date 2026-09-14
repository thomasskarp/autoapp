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
    gradient: 'linear-gradient(135deg, #FACC1520, #4F46E510)',
    accentColor: '#FACC15',
    glowColor: '#FACC15',
  },
  {
    key: 'reservados',
    label: 'Reservados',
    icon: Clock,
    gradient: 'linear-gradient(135deg, #F59E0B20, #D97706 10)',
    accentColor: '#F59E0B',
    glowColor: '#F59E0B',
  },
  {
    key: 'leads',
    label: 'Leads Activos',
    icon: Users,
    gradient: 'linear-gradient(135deg, #FDE04720, #00B49010)',
    accentColor: '#FDE047',
    glowColor: '#FDE047',
  },
  {
    key: 'valor',
    label: 'Valor del Stock',
    icon: DollarSign,
    gradient: 'linear-gradient(135deg, #FACC1520, #00A07810)',
    accentColor: '#FACC15',
    glowColor: '#FACC15',
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
      {cards.map(({ key, label, icon: Icon, gradient, accentColor }) => (
        <div key={key} className="card p-5 flex flex-col gap-3 relative overflow-hidden transition-all duration-200 hover:scale-[1.02]"
          style={{ background: gradient, border: `1px solid ${accentColor}25` }}>
          {/* Background glow */}
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 blur-xl"
            style={{ background: accentColor }} />

          {/* Icon */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#8B8FA8' }}>{label}</span>
            <div className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ background: `${accentColor}20` }}>
              <Icon size={16} style={{ color: accentColor }} />
            </div>
          </div>

          {/* Value */}
          <div>
            <p className="text-3xl font-bold" style={{ color: '#E8EAED' }}>{values[key]}</p>
            {key === 'stock' && (
              <p className="text-xs mt-1" style={{ color: '#8B8FA8' }}>
                {totalVehicles} total · {reservados} reservados
              </p>
            )}
            {key === 'leads' && (
              <p className="text-xs mt-1" style={{ color: '#8B8FA8' }}>Leads en seguimiento activo</p>
            )}
            {key === 'valor' && (
              <p className="text-xs mt-1" style={{ color: '#8B8FA8' }}>En {stockTotal} vehículos disponibles</p>
            )}
            {key === 'reservados' && (
              <p className="text-xs mt-1" style={{ color: '#8B8FA8' }}>Pendientes de cierre</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
