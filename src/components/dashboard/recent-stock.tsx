import Link from 'next/link'
import Image from 'next/image'
import { formatPrice, formatKm, vehicleName, statusConfig } from '@/lib/utils'
import { Vehicle } from '@/lib/supabase/types'
import { ArrowRight, Car } from 'lucide-react'

const statusBadgeClasses: Record<string, string> = {
  DISPONIBLE: 'bg-emerald-500/10 text-yellow-400 border-emerald-500/30',
  RESERVADO:  'bg-amber-500/10 text-amber-400 border-amber-500/30',
  SEÑADO:     'bg-violet-500/10 text-violet-400 border-violet-500/30',
  VENDIDO:    'bg-gray-500/10 text-gray-400 border-gray-500/30',
}

export function RecentStock({ vehicles }: { vehicles: Vehicle[] }) {
  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1F2337]">
        <div>
          <h3 className="font-semibold text-[#E8EAED]">Stock Reciente</h3>
          <p className="text-xs mt-0.5 text-[#8B8FA8]">Últimos vehículos ingresados</p>
        </div>
        <Link href="/stock" className="flex items-center gap-1 text-xs font-medium text-yellow-400 hover:text-yellow-300">
          Ver todo el stock <ArrowRight size={12} />
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1F2337]">
              {['Vehículo', 'Año', 'Km', 'Precio Venta', 'Estado'].map(col => (
                <th key={col} className="text-left px-5 py-3 text-xs font-medium uppercase tracking-wide text-[#555870]">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-[#555870]">
                  No hay vehículos en el stock
                </td>
              </tr>
            ) : vehicles.map(v => {
              const cfg = statusConfig[v.Estado ?? 'DISPONIBLE']
              return (
                <tr key={v.ID} className="table-row">
                  {/* Vehicle */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 bg-[#1A1D28]">
                        {v.FOTO_PORTADA ? (
                          <img src={v.FOTO_PORTADA} alt={vehicleName(v)} className="w-full h-full object-cover" />
                        ) : (
                          <Car size={16} className="text-[#555870]" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#E8EAED]">{vehicleName(v)}</p>
                        {v.Patente && !v.Patente.toUpperCase().startsWith('TEMP') && !v.Patente.toUpperCase().startsWith('BULK') && (
                          <p className="text-xs text-[#8B8FA8]">{v.Patente}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-[#8B8FA8]">{v.Año ?? '—'}</td>
                  <td className="px-5 py-3 text-sm text-[#8B8FA8]">{formatKm(v.Km)}</td>
                  <td className="px-5 py-3 text-sm font-medium text-[#E8EAED]">{formatPrice(v.Precio_Venta)}</td>
                  <td className="px-5 py-3">
                    <span className={`badge border ${statusBadgeClasses[v.Estado ?? 'DISPONIBLE'] || 'bg-gray-500/10 text-gray-400 border-gray-500/30'}`}>
                      {cfg?.label ?? v.Estado}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
