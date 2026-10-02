'use client'

import { useState, useMemo, useEffect, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { Vehicle } from '@/lib/supabase/types'
import { formatPrice, vehicleName, getVehicleCoverImage, formatDisplayPatent, compareVehiclesStable } from '@/lib/utils'
import {
  Search,
  Users,
  X,
  ArrowLeft,
  Send,
  MessageSquare,
  MessageCircle,
  Video,
  Paperclip,
  Settings,
  LayoutGrid,
  List
} from 'lucide-react'
import { CRMConnectionsModal } from './crm-connections-modal'
import { VehicleCrmModal } from './vehicle-crm-modal'

type TabType = 'USADOS' | '0KM'

interface Props {
  vehicles: Vehicle[]
}

const CHANNELS = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    color: '#25D366',
    icon: MessageSquare,
  },
  {
    id: 'dms',
    name: 'DMs',
    color: '#E1306C',
    icon: Send,
  },
  {
    id: 'comentarios',
    name: 'Comentarios',
    color: '#3B82F6',
    icon: MessageCircle,
  },
  {
    id: 'grupos',
    name: 'Grupos',
    color: '#A855F7',
    icon: Users,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    color: '#00F2FE',
    icon: Video,
  },
]

export function CrmVehiclesClient({ vehicles }: Props) {
  const router = useRouter()
  const [selectedTab, setSelectedTab] = useState<TabType>('USADOS')
  const [search, setSearch] = useState('')
  const [selectedVehicleForCrm, setSelectedVehicleForCrm] = useState<Vehicle | null>(null)
  const [showConnectionsModal, setShowConnectionsModal] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

  useEffect(() => {
    const saved = localStorage.getItem('autoapp_vehicles_view_mode')
    if (saved === 'grid' || saved === 'list') {
      setViewMode(saved)
    }
  }, [])

  // Auto-open CRM cockpit if vehicleId is passed in URL query params (e.g. from Stock)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const vehicleId = params.get('vehicleId')
      if (vehicleId) {
        const found = vehicles.find(v => String(v.ID) === String(vehicleId))
        if (found) {
          const isOkm = checkIsOkm(found)
          setSelectedTab(isOkm ? '0KM' : 'USADOS')
          setSelectedVehicleForCrm(found)
        }
      }
    }
  }, [vehicles])

  const handleCloseCrmCockpit = () => {
    setSelectedVehicleForCrm(null)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('from') === 'stock') {
        router.push('/stock')
        return
      }
      const url = new URL(window.location.href)
      if (url.searchParams.has('vehicleId')) {
        url.searchParams.delete('vehicleId')
        url.searchParams.delete('from')
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''))
      }
    }
  }

  const handleViewChange = (mode: 'grid' | 'list') => {
    setViewMode(mode)
    localStorage.setItem('autoapp_vehicles_view_mode', mode)
  }

  // Helper check for 0KM vs Usado
  const checkIsOkm = (v: Vehicle) => v.is_okm_table ?? (v.Tipo_Vehiculo || '').toLowerCase() === '0km'

  // Counts by category
  const countUsados = useMemo(() => vehicles.filter(v => !checkIsOkm(v)).length, [vehicles])
  const countOkm = useMemo(() => vehicles.filter(v => checkIsOkm(v)).length, [vehicles])

  // Filtered list
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const isOkm = checkIsOkm(v)
      if (selectedTab === 'USADOS' && isOkm) return false
      if (selectedTab === '0KM' && !isOkm) return false

      const q = search.toLowerCase()
      if (!q) return true
      return (
        vehicleName(v).toLowerCase().includes(q) ||
        v.Patente?.toLowerCase().includes(q) ||
        v.Marca?.toLowerCase().includes(q) ||
        v.Modelo?.toLowerCase().includes(q)
      )
    })
  }, [vehicles, selectedTab, search])

  // Group by Brand
  const groupedVehicles = useMemo(() => {
    const groups: Record<string, Vehicle[]> = {}
    filteredVehicles.forEach(v => {
      const marca = (v.Marca || 'OTRA').toUpperCase()
      if (!groups[marca]) groups[marca] = []
      groups[marca].push(v)
    })
    // Ordenamiento determinista estable idéntico a Stock
    Object.keys(groups).forEach(marca => {
      groups[marca].sort(compareVehiclesStable)
    })
    return groups
  }, [filteredVehicles])

  const sortedMarcas = Object.keys(groupedVehicles).sort()

  return (
    <div className="flex flex-col gap-6">
      {/* Folder Navigation Tabs & Search (Usados vs 0KM) */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center flex-wrap gap-3">
          <div className="flex items-center gap-1 bg-[#0F1117] p-1.5 rounded-xl border border-[#1F2337]">
            <button
              onClick={() => setSelectedTab('USADOS')}
              className="px-5 py-2.5 rounded-lg text-xs sm:text-sm font-extrabold transition-all"
              style={{
                background: selectedTab === 'USADOS' ? '#FACC15' : 'transparent',
                color: selectedTab === 'USADOS' ? '#000000' : '#A0A5BD',
                border: 'none',
                cursor: 'pointer'
              }}>
              Usados ({countUsados})
            </button>
            <button
              onClick={() => setSelectedTab('0KM')}
              className="px-5 py-2.5 rounded-lg text-xs sm:text-sm font-extrabold transition-all"
              style={{
                background: selectedTab === '0KM' ? '#FDE047' : 'transparent',
                color: selectedTab === '0KM' ? '#000000' : '#A0A5BD',
                border: 'none',
                cursor: 'pointer'
              }}>
              0km ({countOkm})
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowConnectionsModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#141824] hover:bg-[#1F2337] border border-[#252A3D] text-[#A0A5BD] hover:text-white transition-all cursor-pointer"
            title="Configurar Cuentas y Canales CRM">
            <Settings size={15} className="text-[#FACC15]" />
            <span>Cuentas CRM</span>
          </button>
        </div>

        {/* Search & View Mode Toggle */}
        <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-lg justify-end">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#555870' }} />
            <input
              className="input pl-9 text-xs sm:text-sm font-medium w-full"
              placeholder="Buscar por marca, modelo, patente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Botones de selección de vista: Cuadros vs Lista */}
          <div className="flex items-center gap-0.5 bg-[#0F1117] p-1 rounded-xl border border-[#1F2337] shrink-0" title="Modo de visualización">
            <button
              type="button"
              onClick={() => handleViewChange('grid')}
              title="Vista Cuadros (Tarjetas)"
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#1A1D28] text-[#FACC15] shadow-sm'
                  : 'text-[#555870] hover:text-[#9CA3AF] hover:bg-[#1A1D28]/40'
              }`}>
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => handleViewChange('list')}
              title="Vista Lista (Tabla)"
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[#1A1D28] text-[#FACC15] shadow-sm'
                  : 'text-[#555870] hover:text-[#9CA3AF] hover:bg-[#1A1D28]/40'
              }`}>
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* CRM Vehicles View: Cuadros vs Lista */}
      {viewMode === 'grid' ? (
        <div className="flex flex-col gap-6">
          {filteredVehicles.length === 0 ? (
            <div className="card p-12 text-center text-sm font-medium" style={{ color: '#A0A5BD' }}>
              No hay vehículos disponibles en la categoría {selectedTab === 'USADOS' ? 'Usados' : '0km'}
            </div>
          ) : (
            sortedMarcas.map(marca => (
              <div key={marca} className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#1A1D28] border border-[#2A2F45]">
                  <span className="text-xs font-black text-[#A0A5BD] tracking-widest uppercase">{marca}</span>
                  <span className="text-xs font-extrabold text-[#FACC15] bg-[#0F1117] px-2 py-0.5 rounded-lg border border-[#1F2337]">
                    {groupedVehicles[marca].length} {groupedVehicles[marca].length === 1 ? 'auto' : 'autos'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {groupedVehicles[marca].map(v => {
                    const coverImg = getVehicleCoverImage(v)
                    const isOkm = checkIsOkm(v)

                    return (
                      <div
                        key={v.ID}
                        className="card group overflow-hidden flex flex-col transition-all duration-200 hover:border-[#FACC1580] hover:shadow-xl relative bg-[#13161F] border border-[#1F2337] rounded-2xl">
                        {/* Cover image container */}
                        <div className="aspect-video w-full relative bg-[#0B0D13] overflow-hidden">
                          {coverImg ? (
                            <img
                              src={coverImg}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              alt=""
                              onError={(e) => { e.currentTarget.style.display = 'none' }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[#555870]">
                              SIN FOTO
                            </div>
                          )}
                          {/* Badges */}
                          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                            {formatDisplayPatent(v.Patente) && (
                              <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-[#0F1117]/90 text-white backdrop-blur-md border border-[#2A2F45]">
                                {formatDisplayPatent(v.Patente)}
                              </span>
                            )}
                            {isOkm && (
                              <span className="text-[10px] font-extrabold text-black bg-[#FACC15] px-2 py-0.5 rounded-md shadow-sm">
                                0KM
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card body */}
                        <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                          <div>
                            <p className="text-sm font-extrabold uppercase text-white truncate" title={vehicleName(v)}>
                              {vehicleName(v)}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-[#8B8FA8] font-semibold">
                              {v.Año && <span>{v.Año}</span>}
                              {v.Año && !isOkm && v.Km !== undefined && <span>•</span>}
                              {!isOkm && v.Km !== undefined && <span>{Number(v.Km).toLocaleString('es-AR')} km</span>}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-[#1F2337] flex items-center justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold text-[#8B8FA8] block">Precio</span>
                              <span className="text-sm sm:text-base font-black text-[#FACC15]">
                                {formatPrice(v.Precio_Venta)}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedVehicleForCrm(v)}
                              title={`Acceder al CRM de ${vehicleName(v)}`}
                              className="text-xs font-extrabold px-3.5 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5 hover:scale-105 active:scale-95 cursor-pointer"
                              style={{
                                background: '#FACC15',
                                color: '#000000',
                                border: 'none'
                              }}>
                              <Users size={14} />
                              <span>CRM</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* CRM Vehicles Table (existing table) */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #1F2337', background: '#0F1117' }}>
                  <th className="text-left px-5 py-3.5 text-xs font-extrabold uppercase tracking-wider" style={{ color: '#A0A5BD' }}>
                    Vehículo
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-extrabold uppercase tracking-wider" style={{ color: '#A0A5BD' }}>
                    Precio
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-extrabold uppercase tracking-wider" style={{ color: '#A0A5BD' }}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-12 text-center text-sm font-medium" style={{ color: '#A0A5BD' }}>
                      No hay vehículos disponibles en la categoría {selectedTab === 'USADOS' ? 'Usados' : '0km'}
                    </td>
                  </tr>
                ) : (
                  sortedMarcas.map(marca => (
                    <Fragment key={marca}>
                      {/* Brand Banner Row */}
                      <tr className="bg-[#1A1D28]">
                        <td colSpan={3} className="px-5 py-2.5 border-y border-[#2A2F45]">
                          <span className="text-[11px] font-black text-[#A0A5BD] tracking-widest uppercase">{marca}</span>
                        </td>
                      </tr>
                      {groupedVehicles[marca].map(v => {
                        const coverImg = getVehicleCoverImage(v)

                        return (
                          <tr key={v.ID} className="table-row">
                            {/* Columna Vehículo */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-9 rounded-lg overflow-hidden bg-[#1A1D28] flex-shrink-0 flex items-center justify-center border border-[#2A2F45] relative">
                                  {coverImg ? (
                                    <img
                                      src={coverImg}
                                      loading="lazy"
                                      decoding="async"
                                      className="w-full h-full object-cover"
                                      alt=""
                                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                                    />
                                  ) : (
                                    <span className="text-[9px] font-bold text-[#555870]">SIN FOTO</span>
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-bold uppercase" style={{ color: '#FFFFFF' }}>
                                    {vehicleName(v)}
                                  </p>
                                  {formatDisplayPatent(v.Patente) && (
                                    <p className="text-xs font-mono font-bold" style={{ color: '#A0A5BD' }}>
                                      {formatDisplayPatent(v.Patente)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Columna Precio */}
                            <td className="px-5 py-3.5">
                              <span className="text-sm sm:text-base font-black text-[#FACC15]">
                                {formatPrice(v.Precio_Venta)}
                              </span>
                            </td>

                            {/* Columna Acciones: Botón CRM individual por auto */}
                            <td className="px-5 py-3.5">
                              <button
                                type="button"
                                onClick={() => setSelectedVehicleForCrm(v)}
                                title={`Acceder al CRM de ${vehicleName(v)}`}
                                className="text-xs sm:text-sm font-extrabold px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-2 min-w-[110px] justify-center hover:scale-105 active:scale-95"
                                style={{
                                  background: '#FACC15',
                                  color: '#000000',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}>
                                <Users size={15} />
                                <span>CRM</span>
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ventana Completa CRM Individual */}
      <VehicleCrmModal
        vehicle={selectedVehicleForCrm}
        onClose={() => setSelectedVehicleForCrm(null)}
      />

      {/* Modal de Conexión de Canales y Cuentas CRM */}
      <CRMConnectionsModal
        isOpen={showConnectionsModal}
        onClose={() => setShowConnectionsModal(false)}
      />
    </div>
  )
}
