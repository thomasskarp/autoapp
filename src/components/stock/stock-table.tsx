'use client'

import { useState, useMemo, useEffect } from 'react'
import { Vehicle } from '@/lib/supabase/types'
import { formatPrice, formatKm, vehicleName, getVehicleCoverImage, compareVehiclesStable } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { VehicleDetailModal } from './vehicle-detail-modal'
import { PublishModal } from './publish-modal'
import { VehicleManagementModal } from './vehicle-management-modal'
import { VehicleCrmModal } from '@/components/crm/vehicle-crm-modal'
import { useInfoPrice } from '@/context/info-price-context'
import {
  Search, Car, Megaphone, Trash2, ChevronDown, ChevronRight,
  Sparkles, Check, Loader2, Settings, LayoutGrid, List, Users
} from 'lucide-react'

const ALL_STATES = ['Todos', 'DISPONIBLE', 'RESERVADO', 'SEÑADO', 'VENDIDO']
type TabType = 'TODOS' | 'USADOS' | '0KM'

function normalizeBrandName(b?: string | null): string {
  if (!b || !b.trim()) return 'SIN MARCA'
  return b.trim().toUpperCase()
}

function isTempPatent(p?: string | null): boolean {
  if (!p) return true
  const norm = p.trim().toUpperCase()
  return (
    norm.startsWith('TEMP') ||
    norm.includes('TEMP_') ||
    norm.startsWith('BULK') ||
    norm.includes('BULK_') ||
    norm === '0KM' ||
    norm === 'N/A' ||
    norm === 'SIN PATENTE'
  )
}

interface Props {
  vehicles: Vehicle[]
  initialIsAdmin?: boolean
  initialHiddenBrands?: string[]
  initialHiddenVehicles?: string[]
}

export function StockTable({
  vehicles,
  initialIsAdmin = false,
  initialHiddenBrands = [],
  initialHiddenVehicles = []
}: Props) {
  const { showInfoPrice } = useInfoPrice()
  const router = useRouter()
  const supabase = createClient()

  // Control de rol Administrador vs Vendedor
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin)
  const [hiddenBrands, setHiddenBrands] = useState<string[]>(initialHiddenBrands)
  const [hiddenVehicles, setHiddenVehicles] = useState<string[]>(initialHiddenVehicles)

  // Sincronizar en cliente estado de autenticación y visibilidad en tiempo real
  useEffect(() => {
    async function syncAuthAndVisibility() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const rawRole = user.user_metadata?.role?.toLowerCase()
          const admin =
            user.email === 'okmmotorschaco@gmail.com' ||
            user.email === 'tomas.skarp@gmail.com' ||
            rawRole === 'admin' ||
            rawRole === 'administrador' ||
            rawRole === 'superadmin' ||
            rawRole === 'owner'
          setIsAdmin(!!admin)
        } else {
          setIsAdmin(false)
        }
      } catch {}

      try {
        const res = await fetch('/api/stock/visibility')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.hiddenBrands)) {
            setHiddenBrands(data.hiddenBrands.map((b: string) => String(b).trim().toUpperCase()))
          }
          if (Array.isArray(data.hiddenVehicles)) {
            setHiddenVehicles(data.hiddenVehicles.map((id: any) => String(id)))
          }
        }
      } catch {}
    }

    syncAuthAndVisibility()
  }, [])

  // Alternar ocultar / mostrar marca (Solo Admin)
  const toggleHideBrand = async (brand: string) => {
    if (!isAdmin) return
    const norm = normalizeBrandName(brand)
    const isHidden = hiddenBrands.includes(norm)
    const updated = isHidden
      ? hiddenBrands.filter(b => b !== norm)
      : [...hiddenBrands, norm]

    setHiddenBrands(updated)

    try {
      await fetch('/api/stock/visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_brand', brand: norm })
      })
    } catch (err) {
      console.error('Error toggling brand visibility:', err)
    }
  }

  // Alternar ocultar / mostrar auto individual (Solo Admin)
  const toggleHideVehicle = async (id: string | number) => {
    if (!isAdmin) return
    const strId = String(id)
    const isHidden = hiddenVehicles.includes(strId)
    const updated = isHidden
      ? hiddenVehicles.filter(v => v !== strId)
      : [...hiddenVehicles, strId]

    setHiddenVehicles(updated)

    try {
      await fetch('/api/stock/visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_vehicle', id: strId })
      })
    } catch (err) {
      console.error('Error toggling vehicle visibility:', err)
    }
  }

  // Estado local sincronizado para actualización instantánea (0ms) sin saltos
  const [vehicleList, setVehicleList] = useState<Vehicle[]>(vehicles)
  useEffect(() => {
    setVehicleList(vehicles)
  }, [vehicles])

  // Vehículos efectivos:
  // Para VENDEDORES: autos ocultos y marcas ocultas NO aparecen jamás
  // Para ADMINS: se mantienen todos (los ocultos se verán en gris para poder administrarlos)
  const effectiveVehicles = useMemo(() => {
    if (isAdmin) return vehicleList
    return vehicleList.filter(v => {
      const isCarHidden = hiddenVehicles.includes(String(v.ID))
      const isBrandHidden = hiddenBrands.includes(normalizeBrandName(v.Marca))
      return !isCarHidden && !isBrandHidden
    })
  }, [vehicleList, isAdmin, hiddenVehicles, hiddenBrands])

  const [search, setSearch] = useState('')
  const [selectedTab, setSelectedTab] = useState<TabType>('USADOS')
  const [filterState, setFilterState] = useState('Todos')
  const [filterBrand, setFilterBrand] = useState('Todas')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  
  // Selected vehicle for Commercial Detail Modal
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  
  // Selected vehicle for Publish Modal
  const [publishingVehicle, setPublishingVehicle] = useState<Vehicle | null>(null)

  // Selected vehicle for Internal Management & Sale Modal
  const [managingVehicle, setManagingVehicle] = useState<Vehicle | null>(null)

  // Selected vehicle for CRM Cockpit Modal
  const [crmVehicle, setCrmVehicle] = useState<Vehicle | null>(null)

  // Collapsed brands state for grouped view
  const [collapsedBrands, setCollapsedBrands] = useState<Record<string, boolean>>({})

  // Modo de visualización: Cuadros (grid) o Lista (list)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    const saved = localStorage.getItem('autoapp_vehicles_view_mode') as 'grid' | 'list' | null
    if (saved === 'grid' || saved === 'list') {
      setViewMode(saved)
    }
  }, [])

  const handleViewChange = (mode: 'grid' | 'list') => {
    setViewMode(mode)
    localStorage.setItem('autoapp_vehicles_view_mode', mode)
  }
  
  // Pagination limit per brand to avoid rendering hundreds of cards at once
  const DEFAULT_PER_BRAND = 12
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({})

  const showMoreForBrand = (brand: string, step: number = 12) => {
    setVisibleCounts(prev => ({
      ...prev,
      [brand]: (prev[brand] || DEFAULT_PER_BRAND) + step
    }))
  }

  const showAllForBrand = (brand: string, total: number) => {
    setVisibleCounts(prev => ({
      ...prev,
      [brand]: total
    }))
  }

  const collapseAll = () => {
    const allCollapsed: Record<string, boolean> = {}
    groupedByBrand.forEach(([b]) => { allCollapsed[b] = true })
    setCollapsedBrands(allCollapsed)
  }

  const expandAll = () => {
    setCollapsedBrands({})
  }

  // Counts by tab (basados en vehículos efectivos)
  const countUsados = useMemo(() => effectiveVehicles.filter(v => (v.Tipo_Vehiculo || 'Usado').toLowerCase() !== '0km').length, [effectiveVehicles])
  const countOkm = useMemo(() => effectiveVehicles.filter(v => (v.Tipo_Vehiculo || '').toLowerCase() === '0km').length, [effectiveVehicles])

  // Vehículos del tab activo (USADOS o 0KM)
  const tabVehicles = useMemo(() => {
    return effectiveVehicles.filter(v => {
      const isOkm = (v.Tipo_Vehiculo || '').toLowerCase() === '0km'
      if (selectedTab === 'USADOS' && isOkm) return false
      if (selectedTab === '0KM' && !isOkm) return false
      return true
    })
  }, [effectiveVehicles, selectedTab])

  // Extract brands with counts para el tab activo (normalized case-insensitively)
  const brandStats = useMemo(() => {
    const map: Record<string, number> = {}
    tabVehicles.forEach(v => {
      if (v.Marca) {
        const norm = normalizeBrandName(v.Marca)
        map[norm] = (map[norm] || 0) + 1
      }
    })
    const list = Object.entries(map).map(([name, count]) => ({ name, count }))
    list.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    return list
  }, [tabVehicles])

  // Filtered vehicles
  const filtered = useMemo(() => tabVehicles.filter(v => {
    // 1. Search text
    const q = search.toLowerCase()
    const matchSearch = !q ||
      vehicleName(v).toLowerCase().includes(q) ||
      (!isTempPatent(v.Patente) && v.Patente?.toLowerCase().includes(q)) ||
      v.Marca?.toLowerCase().includes(q) ||
      v.Modelo?.toLowerCase().includes(q)

    // 2. Filters
    const matchState = filterState === 'Todos' || v.Estado === filterState
    const matchBrand = filterBrand === 'Todas' || normalizeBrandName(v.Marca) === normalizeBrandName(filterBrand)

    return matchSearch && matchState && matchBrand
  }), [tabVehicles, search, filterState, filterBrand])

  // Group vehicles by Brand with deterministic, rock-solid stable sorting:
  // Cars will NEVER jump or swap places when edited!
  const groupedByBrand = useMemo(() => {
    const groups: Record<string, Vehicle[]> = {}
    filtered.forEach(v => {
      const b = normalizeBrandName(v.Marca)
      if (!groups[b]) groups[b] = []
      groups[b].push(v)
    })

    // Ordenar los vehículos dentro de cada marca de manera totalmente determinista
    Object.keys(groups).forEach(b => {
      groups[b].sort(compareVehiclesStable)
    })

    // Ordenar las marcas por cantidad de vehículos y desempate alfabético estable
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
  }, [filtered])

  const toggleBrandCollapse = (brand: string) => {
    setCollapsedBrands(prev => ({ ...prev, [brand]: !prev[brand] }))
  }

  // Actualizador centralizado optimista y persistente con sincronización de caché en RAM
  const handleUpdateVehicle = async (id: string, fieldsToUpdate: Partial<Vehicle>, isOkm?: boolean) => {
    // 1. Actualización optimista instantánea (0ms) en la pantalla
    setVehicleList(prev => prev.map(v => (String(v.ID) === String(id) ? { ...v, ...fieldsToUpdate } : v)))

    // 2. Actualizar vehículo seleccionado si está abierto en modal
    setSelectedVehicle(prev => (prev && String(prev.ID) === String(id) ? { ...prev, ...fieldsToUpdate } : prev))

    // 3. Persistir en la API y en la memoria RAM del servidor
    try {
      const res = await fetch('/api/vehicles/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isOkm, fields: fieldsToUpdate }),
      })

      if (!res.ok) {
        throw new Error('Error al actualizar en el servidor')
      }
    } catch (err) {
      console.error('Error auto-saving vehicle:', err)
      // Fallback directo a Supabase
      const tableName = isOkm ? 'DB_STOCK_OKM' : 'DB_STOCK'
      await supabase.from(tableName).update(fieldsToUpdate).eq('ID', id)
    }
  }

  const handleDelete = async (id: string, patente: string, isOkm: boolean) => {
    if (!confirm(`¿Dar de baja el vehículo ${patente}? Esta acción no se puede deshacer.`)) return
    setLoadingId(id)
    setVehicleList(prev => prev.filter(v => String(v.ID) !== String(id)))
    const tableName = isOkm ? 'DB_STOCK_OKM' : 'DB_STOCK'
    await supabase.from(tableName).delete().eq('ID', id)
    try {
      await fetch('/api/vehicles/cache/invalidate', { method: 'POST' })
    } catch (e) {}
    router.refresh()
    setLoadingId(null)
  }

  return (
    <div className="flex flex-col gap-5">
      
      {/* Commercial Detail Modal */}
      <VehicleDetailModal
        vehicle={selectedVehicle}
        onClose={() => setSelectedVehicle(null)}
        onUpdateVehicle={handleUpdateVehicle}
        onDeleted={(id) => {
          setVehicleList(prev => prev.filter(v => String(v.ID) !== String(id)))
          setSelectedVehicle(null)
          router.refresh()
        }}
      />

      {/* Publish Selector Modal */}
      <PublishModal
        vehicle={publishingVehicle}
        onClose={() => setPublishingVehicle(null)}
      />

      {/* Internal Management & Sales Modal */}
      <VehicleManagementModal
        vehicle={managingVehicle}
        onClose={() => setManagingVehicle(null)}
      />

      {/* Individual Vehicle CRM Cockpit Modal */}
      <VehicleCrmModal
        vehicle={crmVehicle}
        onClose={() => setCrmVehicle(null)}
      />

      {/* Top Bar 1: Stock vs Usados tabs + Search bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 card p-3.5">
        <div className="flex items-center gap-1.5 bg-[#0F1117] p-1.5 rounded-xl border border-[#1F2337]">
          <button
            onClick={() => {
              setSelectedTab('USADOS')
              setFilterBrand('Todas')
            }}
            className="px-5 py-2 rounded-lg text-sm font-black transition-all flex items-center gap-2 tracking-wide"
            style={{
              background: selectedTab === 'USADOS' ? '#FACC15' : 'transparent',
              color: selectedTab === 'USADOS' ? '#000' : '#8B8FA8',
              border: 'none', cursor: 'pointer'
            }}>
            <Car size={15} /> Usados ({countUsados})
          </button>

          <button
            onClick={() => {
              setSelectedTab('0KM')
              setFilterBrand('Todas')
            }}
            className="px-5 py-2 rounded-lg text-sm font-black transition-all flex items-center gap-2 tracking-wide"
            style={{
              background: selectedTab === '0KM' ? '#FDE047' : 'transparent',
              color: selectedTab === '0KM' ? '#000' : '#8B8FA8',
              border: 'none', cursor: 'pointer'
            }}>
            <Sparkles size={15} /> 0KM ({countOkm})
          </button>
        </div>

        {/* Search input + View mode toggle */}
        <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-lg justify-end">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#8B8FA8' }} />
            <input
              className="input pl-10 text-sm font-semibold py-2 w-full"
              placeholder="Buscar por marca, modelo..."
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

      {/* Top Bar 2: Quick Brand Selector Pills & Expand/Collapse Controls */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1.5 no-scrollbar">
        <div className="flex items-center gap-2 flex-nowrap">
          <button
            onClick={() => setFilterBrand('Todas')}
            className="px-4 py-2 rounded-full text-xs sm:text-sm font-extrabold transition-all flex-shrink-0 tracking-wide"
            style={{
              background: filterBrand === 'Todas' ? '#FFFFFF20' : '#13161F',
              color: filterBrand === 'Todas' ? '#FFFFFF' : '#9CA3AF',
              border: `1px solid ${filterBrand === 'Todas' ? '#FFFFFF40' : '#1F2337'}`,
              cursor: 'pointer'
            }}>
            Todas las marcas ({tabVehicles.length})
          </button>

          {brandStats.map(({ name, count }) => {
            const isPillHidden = hiddenBrands.includes(name)
            return (
              <button
                key={name}
                onClick={() => setFilterBrand(name)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-extrabold transition-all flex-shrink-0 flex items-center gap-2 tracking-wide ${
                  isPillHidden ? 'opacity-40 grayscale' : ''
                }`}
                style={{
                  background: filterBrand === name ? '#FFFFFF20' : '#13161F',
                  color: filterBrand === name ? '#FFFFFF' : '#F3F4F6',
                  border: `1px solid ${filterBrand === name ? '#FFFFFF40' : '#1F2337'}`,
                  cursor: 'pointer'
                }}>
                <span>{name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#1A1D28] text-[#9CA3AF] font-bold">
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Global Collapse/Expand toggles */}
        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          <button
            onClick={expandAll}
            className="text-xs font-bold text-[#8B8FA8] hover:text-[#FFFFFF] transition-colors px-2 py-1 bg-[#13161F] rounded-lg border border-[#1F2337] cursor-pointer">
            Expandir todo
          </button>
          <button
            onClick={collapseAll}
            className="text-xs font-bold text-[#8B8FA8] hover:text-[#FFFFFF] transition-colors px-2 py-1 bg-[#13161F] rounded-lg border border-[#1F2337] cursor-pointer">
            Colapsar todo
          </button>
        </div>
      </div>

      {/* MAIN CONTENT: GROUPED BY BRAND WITH INLINE EDITABLE GRID CARDS */}
      <div className="flex flex-col gap-5">
        {groupedByBrand.length === 0 ? (
          <div className="card p-12 text-center text-base font-semibold" style={{ color: '#8B8FA8' }}>
            No hay vehículos para mostrar
          </div>
        ) : groupedByBrand.map(([brandName, brandVehicles]) => {
          const isCollapsed = collapsedBrands[brandName]
          const currentLimit = visibleCounts[brandName] || DEFAULT_PER_BRAND
          const visibleVehicles = brandVehicles.slice(0, currentLimit)
          const hasMore = brandVehicles.length > currentLimit
          const remaining = brandVehicles.length - currentLimit
          const normBrand = normalizeBrandName(brandName)
          const isBrandHidden = hiddenBrands.includes(normBrand)

          return (
            <div key={brandName} className={`card overflow-hidden transition-all duration-200 ${
              isBrandHidden ? 'opacity-40 grayscale contrast-75 bg-[#0e1017] border-[#252836]' : ''
            }`}>
              <div
                onClick={() => toggleBrandCollapse(brandName)}
                className="px-5 py-4 flex items-center justify-between cursor-pointer select-none transition-colors hover:bg-[#1A1D28]"
                style={{ background: '#13161F', borderBottom: isCollapsed ? 'none' : '1px solid #1F2337' }}>
                
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm"
                    style={{ background: '#FFFFFF15', color: '#FFFFFF', border: '1px solid #FFFFFF30' }}>
                    {brandName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-black text-base sm:text-lg tracking-wide uppercase" style={{ color: '#FFFFFF' }}>{brandName}</h3>
                    <p className="text-xs font-bold" style={{ color: '#9CA3AF' }}>
                      {brandVehicles.length} unidad{brandVehicles.length !== 1 ? 'es' : ''} {hasMore && `(mostrando ${visibleVehicles.length})`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 sm:gap-3">
                  {/* Botón minimalista '-' para Administrador: sin texto, oculta/habilita la marca */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleHideBrand(brandName)
                      }}
                      title={isBrandHidden ? "Habilitar marca" : "Ocultar marca"}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer font-black text-base select-none border ${
                        isBrandHidden
                          ? 'bg-white/20 hover:bg-white/30 text-white border-white/40'
                          : 'bg-[#1E2235] hover:bg-[#2A2F45] text-[#9CA3AF] hover:text-white border-[#2D334D]'
                      }`}>
                      <span className="leading-none pb-0.5">-</span>
                    </button>
                  )}

                  <span className="text-xs sm:text-sm font-extrabold px-3 py-1 rounded-full"
                    style={{ background: '#FFFFFF15', color: '#FFFFFF', border: '1px solid #FFFFFF30' }}>
                    {brandVehicles.length} autos
                  </span>
                  {isCollapsed ? <ChevronRight size={20} style={{ color: '#9CA3AF' }} /> : <ChevronDown size={20} style={{ color: '#9CA3AF' }} />}
                </div>
              </div>

              {!isCollapsed && (
                <div className="p-4 bg-[#0F1117]">
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {visibleVehicles.map(v => {
                        const isCarHidden = hiddenVehicles.includes(String(v.ID))
                        return (
                          <VehicleInteractiveCard
                            key={v.ID}
                            vehicle={v}
                            loadingId={loadingId}
                            isAdmin={isAdmin}
                            isCarHidden={isCarHidden || isBrandHidden}
                            isSpecificallyHidden={isCarHidden}
                            onToggleVisibility={() => toggleHideVehicle(v.ID)}
                            onSelectVehicle={setSelectedVehicle}
                            onPublishVehicle={setPublishingVehicle}
                            onManageVehicle={setManagingVehicle}
                            onOpenCrm={setCrmVehicle}
                            onUpdateVehicle={handleUpdateVehicle}
                          />
                        )
                      })}
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-[#1F2337] bg-[#0A0C13]">
                      <table className="w-full">
                        <thead>
                          <tr style={{ borderBottom: '1px solid #1F2337', background: '#0F1117' }}>
                            <th className="text-left px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-[#A0A5BD]">
                              Vehículo
                            </th>
                            <th className="text-left px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-[#A0A5BD]">
                              Precio
                            </th>
                            {showInfoPrice && (
                              <th className="text-left px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-[#FACC15]">
                                Precio Info
                              </th>
                            )}
                            <th className="text-left px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-[#A0A5BD]">
                              Estado
                            </th>
                            <th className="text-right px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-[#A0A5BD]">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleVehicles.map(v => {
                            const coverImg = getVehicleCoverImage(v)
                            const isOkm = (v.Tipo_Vehiculo || '').toLowerCase() === '0km'
                            const isCarHidden = hiddenVehicles.includes(String(v.ID))
                            const isRowHidden = isCarHidden || isBrandHidden

                            return (
                              <tr key={v.ID} className={`border-b border-[#1F2337]/60 transition-colors ${
                                isRowHidden ? 'opacity-40 grayscale contrast-75 bg-[#0D0F15]' : 'hover:bg-[#1A1D28]'
                              }`}>
                                {/* Columna Vehículo */}
                                <td className="px-5 py-3.5">
                                  <div
                                    className="flex items-center gap-3 cursor-pointer group"
                                    onClick={() => setSelectedVehicle(v)}>
                                    <div className="w-12 h-9 rounded-lg overflow-hidden bg-[#1A1D28] flex-shrink-0 flex items-center justify-center border border-[#2A2F45] relative">
                                      {coverImg ? (
                                        <img
                                          src={coverImg}
                                          loading="lazy"
                                          decoding="async"
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                          alt=""
                                          onError={e => { e.currentTarget.style.display = 'none' }}
                                        />
                                      ) : (
                                        <span className="text-[9px] font-bold text-[#555870]">SIN FOTO</span>
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold uppercase text-white group-hover:text-[#FACC15] transition-colors">
                                        {vehicleName(v)}
                                      </p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        {v.Patente && !isTempPatent(v.Patente) && (
                                          <span className="text-xs font-mono font-bold text-[#A0A5BD]">
                                            {v.Patente}
                                          </span>
                                        )}
                                        {isOkm ? (
                                          <span className="text-[10px] font-extrabold text-[#FACC15] bg-[#FACC1515] px-1.5 py-0.5 rounded">
                                            0KM
                                          </span>
                                        ) : (
                                          <span className="text-xs text-[#8B8FA8] font-semibold">
                                            {formatKm(v.Km)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Columna Precio */}
                                <td className="px-5 py-3.5">
                                  <span className="text-sm sm:text-base font-black text-[#FACC15]">
                                    {formatPrice(v.Precio_Venta)}
                                  </span>
                                </td>

                                {/* Columna Precio Info */}
                                {showInfoPrice && (
                                  <td className="px-5 py-3.5">
                                    <span className="text-xs sm:text-sm font-extrabold text-[#E5E7EB]">
                                      {v.Precio_Info ? formatPrice(v.Precio_Info) : '—'}
                                    </span>
                                  </td>
                                )}

                                {/* Columna Estado */}
                                <td className="px-5 py-3.5">
                                  <span className="text-xs font-bold text-[#A0A5BD] bg-[#1A1D28] px-2.5 py-1 rounded-md border border-[#2A2F45]">
                                    {v.Estado || 'DISPONIBLE'}
                                  </span>
                                </td>

                                {/* Columna Acciones */}
                                <td className="px-5 py-3.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* Botón minimalista '-' para Administrador en tabla: sin texto */}
                                    {isAdmin && (
                                      <button
                                        type="button"
                                        onClick={() => toggleHideVehicle(v.ID)}
                                        title={isCarHidden ? "Habilitar auto" : "Ocultar auto"}
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer font-black text-base select-none border ${
                                          isCarHidden
                                            ? 'bg-white/20 hover:bg-white/30 text-white border-white/40'
                                            : 'bg-[#141824] hover:bg-[#1F2337] border-[#252A3D] text-[#A0A5BD] hover:text-white'
                                        }`}>
                                        <span className="leading-none pb-0.5">-</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setManagingVehicle(v)}
                                      title="Ficha Interna / Editar"
                                      className="p-2 rounded-lg bg-[#141824] hover:bg-[#1F2337] border border-[#252A3D] text-[#A0A5BD] hover:text-white transition-all cursor-pointer">
                                      <Settings size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setPublishingVehicle(v)}
                                      title="Publicar en Redes y Portales"
                                      className="p-2 rounded-lg bg-[#141824] hover:bg-[#FACC1520] border border-[#252A3D] text-[#A0A5BD] hover:text-[#FACC15] transition-all cursor-pointer">
                                      <Megaphone size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setCrmVehicle(v)}
                                      title={`Acceder al CRM de ${vehicleName(v)}`}
                                      className="px-3 py-2 rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center gap-1.5 hover:scale-105 active:scale-95 cursor-pointer"
                                      style={{ background: '#FACC15', color: '#000000', border: 'none' }}>
                                      <Users size={14} />
                                      <span>CRM</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Smart Batch Pagination Controls */}
                  {hasMore && (
                    <div className="mt-4 pt-3 flex flex-wrap items-center justify-center gap-3 border-t border-[#1F2337]">
                      <button
                        onClick={() => showMoreForBrand(brandName, 12)}
                        className="px-4 py-2 rounded-lg text-xs font-bold transition-all bg-[#1F2337] hover:bg-[#2A2F45] text-[#E8EAED] border border-[#2D334D] cursor-pointer flex items-center gap-1.5 shadow-sm">
                        <span>Cargar 12 más</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0F1117] text-[#FACC15] font-extrabold">
                          +{remaining} restantes
                        </span>
                      </button>
                      <button
                        onClick={() => showAllForBrand(brandName, brandVehicles.length)}
                        className="px-3 py-2 rounded-lg text-xs font-bold transition-all bg-transparent hover:bg-[#FFFFFF10] text-[#9CA3AF] hover:text-[#FFFFFF] cursor-pointer">
                        Mostrar todos ({brandVehicles.length})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* INDIVIDUAL VEHICLE INTERACTIVE CARD COMPONENT WITH INSTANT INLINE AUTO-SAVE */
function VehicleInteractiveCard({
  vehicle: v,
  loadingId,
  isAdmin,
  isCarHidden,
  isSpecificallyHidden,
  onToggleVisibility,
  onSelectVehicle,
  onPublishVehicle,
  onManageVehicle,
  onOpenCrm,
  onUpdateVehicle,
  onDelete
}: {
  vehicle: Vehicle
  loadingId: string | null
  isAdmin?: boolean
  isCarHidden?: boolean
  isSpecificallyHidden?: boolean
  onToggleVisibility?: () => void
  onSelectVehicle: (v: Vehicle) => void
  onPublishVehicle: (v: Vehicle) => void
  onManageVehicle: (v: Vehicle) => void
  onOpenCrm: (v: Vehicle) => void
  onUpdateVehicle: (id: string, fields: Partial<Vehicle>, isOkm?: boolean) => Promise<void>
  onDelete?: (id: string, patente: string, isOkm: boolean) => void
}) {
  const router = useRouter()
  const { showInfoPrice } = useInfoPrice()

  const isOkm = (v.Tipo_Vehiculo || '').toLowerCase() === '0km'
  const coverImg = getVehicleCoverImage(v)
  const name = vehicleName(v)

  // Inline editing state
  const [editingField, setEditingField] = useState<'title' | 'year' | 'km' | 'price' | 'price_info' | null>(null)
  const [fieldValue, setFieldValue] = useState('')
  const [autoSaving, setAutoSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Trigger instant auto-save to Supabase & RAM cache on blur / Enter
  const saveFieldChange = async (fieldName: string, value: any) => {
    setAutoSaving(true)

    let updateData: Partial<Vehicle> = {}
    if (fieldName === 'price') {
      updateData.Precio_Venta = parseFloat(value.toString().replace(/[^0-9.]/g, '')) || 0
    } else if (fieldName === 'price_info') {
      updateData.Precio_Info = parseFloat(value.toString().replace(/[^0-9.]/g, '')) || 0
    } else if (fieldName === 'year') {
      updateData.Año = parseInt(value, 10) || 0
    } else if (fieldName === 'km') {
      updateData.Km = parseInt(value.toString().replace(/[^0-9]/g, ''), 10) || 0
    } else if (fieldName === 'title') {
      updateData.Modelo = value.trim()
    }

    try {
      await onUpdateVehicle(v.ID, updateData, isOkm)
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2000)
    } catch (err) {
      console.error('Error auto-saving vehicle inline edit:', err)
    } finally {
      setAutoSaving(false)
      setEditingField(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, fieldName: string) => {
    if (e.key === 'Enter') {
      saveFieldChange(fieldName, fieldValue)
    } else if (e.key === 'Escape') {
      setEditingField(null)
    }
  }

  return (
    <div
      className={`card group overflow-hidden flex flex-col transition-all duration-200 relative ${
        isCarHidden
          ? 'opacity-40 grayscale contrast-75 bg-[#0D0F15] border-[#2A2F45]'
          : 'hover:border-[#FACC1580] hover:shadow-xl bg-[#13161F] border-[#1F2337]'
      }`}
      style={{ opacity: loadingId === v.ID ? 0.5 : (isCarHidden ? 0.4 : 1) }}>

      {/* Saving / Saved Toast Indicator */}
      {(autoSaving || savedSuccess) && (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md shadow-lg"
          style={{ background: autoSaving ? '#FACC15dd' : '#FACC15dd', color: '#000' }}>
          {autoSaving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
          <span>{autoSaving ? 'Guardando...' : '¡Guardado!'}</span>
        </div>
      )}

      {/* 100% CLEAN PHOTO HEADER (NO CODE TAGS, NO EEA28625, NO BULK, NO TEMP) */}
      <div
        className="w-full h-44 relative overflow-hidden bg-[#1A1D28] flex items-center justify-center cursor-pointer"
        onClick={() => onSelectVehicle(v)}>
        {coverImg ? (
          <img
            src={coverImg}
            alt={name}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-[#555870]">
            <Car size={36} />
            <span className="text-[10px]">Sin foto</span>
          </div>
        )}

        {/* Botón minimalista '-' para Administrador en tarjeta: sin texto */}
        {isAdmin && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleVisibility?.()
            }}
            title={isSpecificallyHidden ? "Habilitar auto" : "Ocultar auto"}
            className={`absolute top-2.5 ${isOkm ? 'left-24' : 'left-2.5'} z-30 w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer font-black text-base select-none backdrop-blur-md shadow-md border ${
              isSpecificallyHidden
                ? 'bg-white/20 hover:bg-white/30 text-white border-white/40'
                : 'bg-[#000000b0] hover:bg-[#000000] text-[#CBD5E1] hover:text-white border-white/20'
            }`}>
            <span className="leading-none pb-0.5">-</span>
          </button>
        )}

        {/* 0KM Tag ONLY if applicable */}
        {isOkm && (
          <span className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase backdrop-blur-md shadow-sm"
            style={{
              background: 'rgba(250, 204, 21, 0.25)',
              color: '#FACC15',
              border: '1px solid #FACC1550'
            }}>
            ✨ 0KM
          </span>
        )}
      </div>

      {/* Card Body with Instant Direct Inline Editing */}
      <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
        <div>
          {/* Editable Title */}
          {editingField === 'title' ? (
            <input
              autoFocus
              className="input text-base py-1 px-2 font-bold w-full"
              value={fieldValue}
              onChange={e => setFieldValue(e.target.value)}
              onBlur={() => saveFieldChange('title', fieldValue)}
              onKeyDown={e => handleKeyDown(e, 'title')}
            />
          ) : (
            <h3
              className="font-extrabold text-base leading-tight cursor-pointer transition-colors hover:text-[#FACC15] line-clamp-1 flex items-center justify-between"
              style={{ color: '#F8FAFC' }}
              onClick={() => {
                setEditingField('title')
                setFieldValue(v.Modelo || '')
              }}
              title="Haz clic para modificar el título directamente">
              <span>{name}</span>
            </h3>
          )}

          {/* Year / Km Specs (Clickable to edit directly) */}
          <div className="flex items-center gap-2 text-sm font-semibold mt-1" style={{ color: '#94A3B8' }}>
            {editingField === 'year' ? (
              <input
                autoFocus
                type="number"
                className="input text-xs py-0.5 px-1.5 w-16"
                value={fieldValue}
                onChange={e => setFieldValue(e.target.value)}
                onBlur={() => saveFieldChange('year', fieldValue)}
                onKeyDown={e => handleKeyDown(e, 'year')}
              />
            ) : (
              <span
                className="cursor-pointer hover:underline hover:text-[#FACC15]"
                onClick={() => {
                  setEditingField('year')
                  setFieldValue((v.Año || 2025).toString())
                }}
                title="Haz clic para editar año">
                {v.Año || '2025'}
              </span>
            )}
            
            <span>•</span>

            {editingField === 'km' ? (
              <input
                autoFocus
                type="number"
                className="input text-xs py-0.5 px-1.5 w-20"
                value={fieldValue}
                onChange={e => setFieldValue(e.target.value)}
                onBlur={() => saveFieldChange('km', fieldValue)}
                onKeyDown={e => handleKeyDown(e, 'km')}
              />
            ) : (
              <span
                className="cursor-pointer hover:underline hover:text-[#FACC15]"
                onClick={() => {
                  setEditingField('km')
                  setFieldValue((v.Km || 0).toString())
                }}
                title="Haz clic para editar kilómetros">
                {formatKm(v.Km)}
              </span>
            )}

            {v.Tipo_Combustible && (
              <>
                <span>•</span>
                <span className="capitalize">{v.Tipo_Combustible}</span>
              </>
            )}
          </div>
        </div>

        {/* Price Row (PRECIO on Left, PRECIO INFO on Right if enabled) */}
        <div className="pt-2 border-t border-[#1F2337] flex items-baseline justify-between gap-3">
          {/* PRECIO */}
          <div className="flex-1 min-w-0">
            <span className="text-xs block font-extrabold uppercase tracking-wider" style={{ color: '#64748B' }}>PRECIO</span>
            {editingField === 'price' ? (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-sm font-bold text-[#FACC15]">$</span>
                <input
                  autoFocus
                  type="number"
                  className="input text-base py-1 px-2 font-bold w-full text-[#FACC15]"
                  value={fieldValue}
                  onChange={e => setFieldValue(e.target.value)}
                  onBlur={() => saveFieldChange('price', fieldValue)}
                  onKeyDown={e => handleKeyDown(e, 'price')}
                  placeholder="Ej: 31700000"
                />
              </div>
            ) : (
              <span
                className="text-lg font-black cursor-pointer transition-all hover:scale-105 inline-block hover:underline truncate max-w-full"
                style={{ color: '#FACC15' }}
                onClick={() => {
                  setEditingField('price')
                  setFieldValue((v.Precio_Venta || 0).toString())
                }}
                title="Haz clic para modificar el precio directamente">
                {formatPrice(v.Precio_Venta)}
              </span>
            )}
          </div>

          {/* PRECIO INFO (Condicional al Interruptor Rayo) */}
          {showInfoPrice && (
            <div className="text-right flex-shrink-0 min-w-0">
              <span className="text-xs block font-extrabold uppercase tracking-wider" style={{ color: '#64748B' }}>PRECIO INFO</span>
              {editingField === 'price_info' ? (
                <div className="flex items-center gap-1 mt-0.5 justify-end">
                  <span className="text-sm font-bold text-[#FDE047]">$</span>
                  <input
                    autoFocus
                    type="number"
                    className="input text-xs py-1 px-1.5 font-bold w-24 text-right text-[#FDE047]"
                    value={fieldValue}
                    onChange={e => setFieldValue(e.target.value)}
                    onBlur={() => saveFieldChange('price_info', fieldValue)}
                    onKeyDown={e => handleKeyDown(e, 'price_info')}
                    placeholder="0"
                  />
                </div>
              ) : (
                <span
                  className="text-base font-extrabold cursor-pointer transition-all hover:scale-105 inline-block hover:underline"
                  style={{ color: v.Precio_Info ? '#FDE047' : '#64748B' }}
                  onClick={() => {
                    setEditingField('price_info')
                    setFieldValue((v.Precio_Info || 0).toString())
                  }}
                  title="Haz clic para modificar el precio de InfoAuto directamente">
                  {v.Precio_Info ? formatPrice(v.Precio_Info) : '+ Agregar'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons Row (3 buttons: ⚙️ Gestión Interna & Venta, 📣 Publicar, 🗑️ Eliminar) */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <button
            onClick={() => onManageVehicle(v)}
            title="Gestión Interna & Registrar Venta"
            className="flex items-center justify-center p-2 rounded-lg text-xs font-semibold transition-all hover:bg-[#FFFFFF25]"
            style={{ background: '#FFFFFF15', color: '#FFFFFF', border: '1px solid #FFFFFF35' }}>
            <Settings size={15} />
          </button>

          <button
            onClick={() => onPublishVehicle(v)}
            title="Publicar en Redes (FB / IG / WA)"
            className="flex items-center justify-center p-2 rounded-lg text-xs font-semibold transition-all hover:bg-[#FFFFFF25]"
            style={{ background: '#FFFFFF15', color: '#FFFFFF', border: '1px solid #FFFFFF35' }}>
            <Megaphone size={15} />
          </button>

          <button
            onClick={() => onOpenCrm(v)}
            title={`Acceder al CRM de ${name}`}
            className="flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs font-black transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
            style={{ background: '#FACC15', color: '#000000', border: 'none' }}>
            <Users size={14} />
            <span className="text-[11px] font-black">CRM</span>
          </button>
        </div>
      </div>
    </div>
  )
}
