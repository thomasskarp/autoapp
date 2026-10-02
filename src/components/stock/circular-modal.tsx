'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Vehicle } from '@/lib/supabase/types'
import {
  CircularConfig,
  CircularRow,
  EMPTY_CIRCULAR_ROWS,
  calculateCostoCuota,
  calculateEntrega,
  getCircularForVehicle,
  findCircular,
  saveCircular,
  getAllCirculares,
  getModelsForBrand,
  getVersionsForBrandAndModels,
} from '@/lib/services/circular-service'
import { formatNumberDots, parseNumberFromDots } from '@/lib/utils'
import {
  X,
  Calculator,
  Save,
  Layers,
  Plus,
  Trash2,
  Check,
  CheckCheck,
  Sparkles,
  Car,
  AlertCircle,
} from 'lucide-react'

interface CircularModalProps {
  vehicle: Vehicle | null
  isOpen: boolean
  onClose: () => void
  onApplyEntrega: (entregaCalculada: number, row: CircularRow, circular: CircularConfig) => void
}

export function CircularModal({
  vehicle,
  isOpen,
  onClose,
  onApplyEntrega,
}: CircularModalProps) {
  // ─── 1. ALL HOOKS UNCONDITIONALLY AT THE TOP ─────────────────────────
  const [mounted, setMounted] = useState(false)

  // Modelo: 'ALL' (todos los modelos), 'SINGLE' (un modelo específico), 'MULTI' (varios modelos)
  const [modelScope, setModelScope] = useState<'ALL' | 'SINGLE' | 'MULTI'>('SINGLE')
  const [selectedSingleModel, setSelectedSingleModel] = useState<string>('')
  const [selectedMultiModels, setSelectedMultiModels] = useState<string[]>([])
  const [customModelInput, setCustomModelInput] = useState<string>('')

  // Versiones: 'ALL' (todas las versiones) o 'SPECIFIC' (seleccionar varias versiones para excepciones)
  const [versionScope, setVersionScope] = useState<'ALL' | 'SPECIFIC'>('ALL')
  const [selectedVersions, setSelectedVersions] = useState<string[]>([])
  const [customVersionInput, setCustomVersionInput] = useState<string>('')

  // Renglones con 3 columnas (maxFinanciar, cantCuotas, costoCuota)
  const [rows, setRows] = useState<CircularRow[]>(EMPTY_CIRCULAR_ROWS)
  const [, setSelectedRowIdx] = useState<number>(0)
  const [savedStatus, setSavedStatus] = useState<boolean>(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Obtener circulares existentes guardadas
  const knownCirculares = useMemo(() => {
    return Object.values(getAllCirculares())
  }, [isOpen, savedStatus])

  // Catálogo completo de modelos para la marca en cuestión
  const availableModels = useMemo(() => {
    if (!vehicle?.Marca) return []
    const extraModels: string[] = []
    if (vehicle.Modelo) extraModels.push(vehicle.Modelo)
    knownCirculares.forEach(c => {
      if (c.marca?.toUpperCase() === vehicle.Marca?.toUpperCase()) {
        if (c.modelos) c.modelos.forEach(m => extraModels.push(m))
        else if (c.modelo) extraModels.push(c.modelo)
      }
    })
    return getModelsForBrand(vehicle.Marca, extraModels)
  }, [vehicle?.Marca, vehicle?.Modelo, knownCirculares])

  // Modelos activos según el alcance seleccionado
  const activeTargetModels = useMemo(() => {
    if (modelScope === 'ALL') return ['ALL']
    if (modelScope === 'SINGLE') {
      const m = selectedSingleModel.trim() || vehicle?.Modelo || 'ALL'
      return [m]
    }
    return selectedMultiModels.length > 0 ? selectedMultiModels : [vehicle?.Modelo || 'ALL']
  }, [modelScope, selectedSingleModel, selectedMultiModels, vehicle?.Modelo])

  // Catálogo de versiones para la marca y los modelos activos
  const availableVersions = useMemo(() => {
    if (!vehicle?.Marca) return []
    const extraVers: string[] = []
    if (vehicle.Version) extraVers.push(vehicle.Version)
    knownCirculares.forEach(c => {
      if (c.marca?.toUpperCase() === vehicle.Marca?.toUpperCase()) {
        if (c.versiones) c.versiones.forEach(v => extraVers.push(v))
        else if (c.version) extraVers.push(c.version)
      }
    })
    const mods = modelScope === 'ALL' ? availableModels : activeTargetModels
    return getVersionsForBrandAndModels(vehicle.Marca, mods, extraVers)
  }, [vehicle?.Marca, vehicle?.Version, modelScope, availableModels, activeTargetModels, knownCirculares])

  // Versiones activas según el alcance seleccionado
  const activeTargetVersions = useMemo(() => {
    if (versionScope === 'ALL') return ['ALL']
    return selectedVersions.length > 0 ? selectedVersions : ['ALL']
  }, [versionScope, selectedVersions])

  // Helper para buscar circular guardada para una combinación
  const checkSavedCircular = useCallback(
    (mods: string[], vers: string[]): CircularConfig | null => {
      if (!vehicle?.Marca) return null
      return findCircular(vehicle.Marca, mods, vers)
    },
    [vehicle?.Marca]
  )

  // Inicializar o cargar la circular al abrir el modal para el vehículo
  useEffect(() => {
    if (!isOpen || !vehicle) return

    const vehMod = vehicle.Modelo || ''
    const vehVer = (vehicle.Version || '').trim()

    setSelectedSingleModel(vehMod)
    setSelectedMultiModels(vehMod ? [vehMod] : [])
    setCustomModelInput('')
    setCustomVersionInput('')
    setSavedStatus(false)

    // Buscar si ya existe una circular que aplique a este vehículo
    const { circular, matchType } = getCircularForVehicle(vehicle)

    if (circular && circular.rows && circular.rows.some(r => r.maxFinanciar > 0)) {
      setRows(circular.rows)
      setSelectedRowIdx(circular.selectedRowIndex ?? 0)

      // Configurar modo de modelo
      const cMods = circular.modelos && circular.modelos.length > 0 ? circular.modelos : [circular.modelo || 'ALL']
      if (cMods.includes('ALL')) {
        setModelScope('ALL')
      } else if (cMods.length > 1) {
        setModelScope('MULTI')
        setSelectedMultiModels(cMods)
        setSelectedSingleModel(cMods[0] || vehMod)
      } else {
        setModelScope('SINGLE')
        setSelectedSingleModel(cMods[0] || vehMod)
        setSelectedMultiModels(cMods)
      }

      // Configurar modo de versiones
      const cVers = circular.versiones && circular.versiones.length > 0 ? circular.versiones : [circular.version || 'ALL']
      if (cVers.includes('ALL') || matchType === 'SPECIFIC_MODEL' || matchType === 'ALL_MODELS') {
        setVersionScope('ALL')
        setSelectedVersions(vehVer ? [vehVer] : [])
      } else {
        setVersionScope('SPECIFIC')
        setSelectedVersions(cVers.filter(v => v !== 'ALL'))
      }
    } else {
      // Para vehículos sin circular cargada: aparece completamente en blanco
      setRows(EMPTY_CIRCULAR_ROWS)
      setModelScope('SINGLE')
      setSelectedSingleModel(vehMod)
      setSelectedMultiModels(vehMod ? [vehMod] : [])
      setVersionScope('ALL')
      setSelectedVersions(vehVer ? [vehVer] : [])
      setSelectedRowIdx(0)
    }
  }, [isOpen, vehicle])

  // Cargar circular existente al cambiar la selección de modelos o versiones
  const updateRowsForSelection = useCallback(
    (targetMods: string[], targetVers: string[]) => {
      const circ = checkSavedCircular(targetMods, targetVers)
      if (circ && circ.rows && circ.rows.some(r => r.maxFinanciar > 0)) {
        setRows(circ.rows)
        setSelectedRowIdx(circ.selectedRowIndex ?? 0)
      } else {
        // Si no hay circular previa para esta combinación, mostrar en blanco
        setRows(EMPTY_CIRCULAR_ROWS)
        setSelectedRowIdx(0)
      }
    },
    [checkSavedCircular]
  )

  // Cambio de modo de modelo: ALL vs SINGLE vs MULTI
  const handleModelScopeChange = (newScope: 'ALL' | 'SINGLE' | 'MULTI') => {
    setModelScope(newScope)
    let newMods = ['ALL']
    if (newScope === 'SINGLE') {
      newMods = [selectedSingleModel || vehicle?.Modelo || 'ALL']
    } else if (newScope === 'MULTI') {
      newMods = selectedMultiModels.length > 0 ? selectedMultiModels : (vehicle?.Modelo ? [vehicle.Modelo] : [])
    }
    updateRowsForSelection(newMods, activeTargetVersions)
  }

  // Cambio de modelo en modo SINGLE
  const handleSingleModelChange = (model: string) => {
    setSelectedSingleModel(model)
    updateRowsForSelection([model], activeTargetVersions)
  }

  // Toggle de modelo en modo MULTI
  const handleToggleMultiModel = (model: string) => {
    const next = selectedMultiModels.includes(model)
      ? selectedMultiModels.filter(m => m !== model)
      : [...selectedMultiModels, model]
    setSelectedMultiModels(next)
    updateRowsForSelection(next.length > 0 ? next : ['ALL'], activeTargetVersions)
  }

  // Seleccionar todos los modelos en modo MULTI
  const handleSelectAllModels = () => {
    setSelectedMultiModels([...availableModels])
    updateRowsForSelection(availableModels, activeTargetVersions)
  }

  // Limpiar selección de modelos en modo MULTI
  const handleClearModels = () => {
    setSelectedMultiModels([])
    updateRowsForSelection([], activeTargetVersions)
  }

  // Agregar modelo personalizado
  const handleAddCustomModel = () => {
    const trimmed = customModelInput.trim()
    if (!trimmed) return
    if (!selectedMultiModels.includes(trimmed)) {
      const next = [...selectedMultiModels, trimmed]
      setSelectedMultiModels(next)
      updateRowsForSelection(next, activeTargetVersions)
    }
    setCustomModelInput('')
  }

  // Cambio de modo de versión: ALL vs SPECIFIC
  const handleVersionScopeChange = (newScope: 'ALL' | 'SPECIFIC') => {
    setVersionScope(newScope)
    const newVers = newScope === 'ALL'
      ? ['ALL']
      : (selectedVersions.length > 0 ? selectedVersions : (vehicle?.Version ? [vehicle.Version] : []))
    updateRowsForSelection(activeTargetModels, newVers)
  }

  // Toggle de versión en modo SPECIFIC
  const handleToggleVersion = (versionName: string) => {
    const next = selectedVersions.includes(versionName)
      ? selectedVersions.filter(v => v !== versionName)
      : [...selectedVersions, versionName]
    setSelectedVersions(next)
    updateRowsForSelection(activeTargetModels, next.length > 0 ? next : ['ALL'])
  }

  // Seleccionar todas las versiones disponibles
  const handleSelectAllVersions = () => {
    setSelectedVersions([...availableVersions])
    updateRowsForSelection(activeTargetModels, availableVersions)
  }

  // Limpiar selección de versiones
  const handleClearVersions = () => {
    setSelectedVersions([])
    updateRowsForSelection(activeTargetModels, [])
  }

  // Agregar versión personalizada
  const handleAddCustomVersion = () => {
    const trimmed = customVersionInput.trim()
    if (!trimmed) return
    if (!selectedVersions.includes(trimmed)) {
      const next = [...selectedVersions, trimmed]
      setSelectedVersions(next)
      updateRowsForSelection(activeTargetModels, next)
    }
    setCustomVersionInput('')
  }

  // Verificar si hay una circular guardada para la selección actual
  const isCurrentlySaved = useMemo(() => {
    if (!vehicle?.Marca) return false
    const circ = findCircular(vehicle.Marca, activeTargetModels, activeTargetVersions)
    return Boolean(circ && circ.rows && circ.rows.some(r => r.maxFinanciar > 0))
  }, [vehicle?.Marca, activeTargetModels, activeTargetVersions, rows, savedStatus])

  // Manejar cambio en "Máx a financiar"
  const handleMaxFinanciarChange = (index: number, rawVal: string) => {
    const parsed = parseNumberFromDots(rawVal)
    const num = typeof parsed === 'number' ? parsed : 0
    setRows(prev => {
      const next = [...prev]
      const current = { ...next[index], maxFinanciar: num }
      if (current.cantCuotas > 0) {
        current.costoCuota = calculateCostoCuota(num, current.cantCuotas)
      }
      next[index] = current
      return next
    })
  }

  // Manejar cambio en "Cant cuotas"
  const handleCantCuotasChange = (index: number, rawVal: string) => {
    const num = parseInt(rawVal.replace(/\D/g, ''), 10) || 0
    setRows(prev => {
      const next = [...prev]
      const current = { ...next[index], cantCuotas: num }
      if (num > 0 && current.maxFinanciar > 0) {
        current.costoCuota = calculateCostoCuota(current.maxFinanciar, num)
      }
      next[index] = current
      return next
    })
  }

  // Manejar cambio manual en "Costo cuota"
  const handleCostoCuotaChange = (index: number, rawVal: string) => {
    const parsed = parseNumberFromDots(rawVal)
    const num = typeof parsed === 'number' ? parsed : 0
    setRows(prev => {
      const next = [...prev]
      next[index] = { ...next[index], costoCuota: num }
      return next
    })
  }

  // Agregar un renglón nuevo a la tabla
  const handleAddRow = () => {
    setRows(prev => {
      const nextId = prev.length + 1
      const last = prev[prev.length - 1]
      const nextCuotas = last && last.cantCuotas > 0 ? Math.min(84, last.cantCuotas + 6) : 0
      const nextMax = last && last.maxFinanciar > 0 ? last.maxFinanciar + 3000000 : 0
      const nextCosto = calculateCostoCuota(nextMax, nextCuotas)
      return [
        ...prev,
        {
          id: nextId,
          maxFinanciar: nextMax,
          cantCuotas: nextCuotas,
          costoCuota: nextCosto,
        },
      ]
    })
  }

  // Eliminar un renglón puntual por su índice
  const handleDeleteRow = (indexToDelete: number) => {
    setRows(prev => {
      if (prev.length <= 1) return prev
      const updated = prev.filter((_, i) => i !== indexToDelete)
      return updated.map((r, i) => ({ ...r, id: i + 1 }))
    })
  }

  // Guardar circular y aplicar automáticamente al auto en ESA MISMA VISTA
  const handleSaveAndAutoApply = () => {
    if (!vehicle) return

    const validRows = rows.filter(r => r.maxFinanciar > 0)
    const activeRow =
      validRows.length > 0
        ? validRows.reduce((prev, curr) => (curr.maxFinanciar > prev.maxFinanciar ? curr : prev), validRows[0])
        : rows[0]

    const targetMods = activeTargetModels
    const targetVers = activeTargetVersions

    const circularToSave: CircularConfig = {
      marca: vehicle.Marca || '',
      modelos: targetMods,
      modelo: targetMods.includes('ALL') ? 'ALL' : targetMods.join(', '),
      versiones: targetVers,
      version: targetVers.includes('ALL') ? 'ALL' : targetVers.join(', '),
      selectedRowIndex: rows.findIndex(r => r.id === activeRow.id),
      rows,
      updatedAt: new Date().toISOString(),
    }

    // 1. Guardar en almacenamiento para este conjunto de modelos y versiones
    saveCircular(circularToSave)

    // 2. Aplicar cálculo de entrega al vehículo automáticamente si coincide
    const matchesModel =
      targetMods.includes('ALL') ||
      targetMods.some(m => m.toUpperCase() === (vehicle.Modelo || '').toUpperCase())
    const matchesVer =
      targetVers.includes('ALL') ||
      targetVers.some(v => v.toUpperCase() === (vehicle.Version || '').toUpperCase())

    if (matchesModel && matchesVer && activeRow && activeRow.maxFinanciar > 0) {
      const pVenta = typeof vehicle.Precio_Venta === 'number' ? vehicle.Precio_Venta : 0
      const calculatedEntrega = calculateEntrega(pVenta, activeRow.maxFinanciar)
      onApplyEntrega(calculatedEntrega, activeRow, circularToSave)
    }

    // 3. Feedback visual: permanecer en la misma vista sin cambiar de pantalla
    setSavedStatus(true)
    setTimeout(() => {
      setSavedStatus(false)
    }, 2500)
  }

  // Condición de render temprano segura DESPUÉS de todos los hooks
  if (!isOpen || !mounted || !vehicle) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[99999999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#0F1117] border border-[#2A2F45] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="px-5 py-4 border-b border-[#1F2337] flex items-center justify-between bg-[#131620]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FACC15]/15 border border-[#FACC15]/30 flex items-center justify-center text-[#FACC15]">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                  Circular de Financiación
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#FACC15]/20 text-[#FACC15] border border-[#FACC15]/30">
                  {vehicle.Marca || '0KM'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1F2337] text-[#A0A5BD] hover:text-white hover:bg-[#2A2F45] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Cuadrito: ASOCIAR FINANCIACIÓN A */}
          <div className="bg-[#141824] border border-[#252A3D] rounded-xl p-3.5 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#A0A5BD] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#FACC15]" />
                Asociar financiación a:
              </span>

              {/* Indicador de estado de la circular para la selección actual */}
              <div>
                {isCurrentlySaved ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Circular guardada para esta selección
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#1F2337] text-[#8B8FA8] border border-[#2A2F45]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8B8FA8]" />
                    Sin circular cargada (En blanco)
                  </span>
                )}
              </div>
            </div>

            {/* SELECCIÓN DE MODELO: Todos los modelos vs Un modelo vs Varios modelos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-[#FACC15]" />
                  Modelo 0KM:
                </label>
                <span className="text-[10px] text-[#8B8FA8]">
                  Marca: <strong className="text-white">{vehicle.Marca}</strong>
                </span>
              </div>

              {/* Selector de modo de modelos: 3 opciones */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0B0D13] border border-[#2A2F45] rounded-lg">
                <button
                  type="button"
                  onClick={() => handleModelScopeChange('ALL')}
                  className={`py-1.5 px-2 rounded text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                    modelScope === 'ALL'
                      ? 'bg-[#FACC15] text-black shadow-sm'
                      : 'text-[#8B8FA8] hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Todos los modelos</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleModelScopeChange('SINGLE')}
                  className={`py-1.5 px-2 rounded text-xs font-bold transition-all text-center cursor-pointer ${
                    modelScope === 'SINGLE'
                      ? 'bg-[#FACC15] text-black shadow-sm'
                      : 'text-[#8B8FA8] hover:text-white'
                  }`}
                >
                  Un modelo
                </button>
                <button
                  type="button"
                  onClick={() => handleModelScopeChange('MULTI')}
                  className={`py-1.5 px-2 rounded text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                    modelScope === 'MULTI'
                      ? 'bg-[#FACC15] text-black shadow-sm'
                      : 'text-[#8B8FA8] hover:text-white'
                  }`}
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>Varios modelos</span>
                </button>
              </div>

              {/* Vista para: Todos los modelos */}
              {modelScope === 'ALL' && (
                <div className="p-2.5 rounded-lg bg-[#0B0D13] border border-[#2A2F45] text-xs text-[#A0A5BD] flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#FACC15]/15 text-[#FACC15] flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    Aplica a <strong className="text-white">todos los modelos 0KM</strong> de{' '}
                    <strong className="text-[#FACC15]">{vehicle.Marca}</strong> ({availableModels.slice(0, 6).join(', ')}
                    {availableModels.length > 6 ? '...' : ''}).
                  </div>
                </div>
              )}

              {/* Vista para: Un modelo */}
              {modelScope === 'SINGLE' && (
                <div className="space-y-1.5">
                  <select
                    value={selectedSingleModel}
                    onChange={e => handleSingleModelChange(e.target.value)}
                    className="w-full bg-[#0B0D13] border border-[#2A2F45] focus:border-[#FACC15] rounded-lg px-3 py-2 text-white font-bold focus:outline-none transition-colors cursor-pointer text-xs sm:text-sm"
                  >
                    <option value="" disabled>
                      -- Seleccionar modelo de {vehicle.Marca} --
                    </option>
                    {availableModels.map(m => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Vista para: Varios modelos */}
              {modelScope === 'MULTI' && (
                <div className="space-y-2 p-2.5 rounded-lg bg-[#0B0D13] border border-[#2A2F45]">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#A0A5BD] font-semibold">
                      Modelos seleccionados ({selectedMultiModels.length}):
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllModels}
                        className="text-[10px] font-bold text-[#FACC15] hover:underline cursor-pointer"
                      >
                        Seleccionar todos
                      </button>
                      <span className="text-[#2A2F45]">|</span>
                      <button
                        type="button"
                        onClick={handleClearModels}
                        className="text-[10px] font-bold text-[#8B8FA8] hover:text-white cursor-pointer"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  {/* Chips de modelos de la marca */}
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {availableModels.map(m => {
                      const isSelected = selectedMultiModels.includes(m)
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleToggleMultiModel(m)}
                          className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-[#FACC15] text-black shadow-sm border border-[#FACC15]'
                              : 'bg-[#141824] text-[#8B8FA8] border border-[#252A3D] hover:border-[#FACC15]/40 hover:text-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          <span>{m}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Input para agregar modelo personalizado */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-[#1F2337]">
                    <input
                      type="text"
                      value={customModelInput}
                      onChange={e => setCustomModelInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddCustomModel()
                        }
                      }}
                      placeholder="+ Escribir otro modelo..."
                      className="bg-[#141824] border border-[#252A3D] focus:border-[#FACC15] rounded-md px-2.5 py-1 text-xs text-white placeholder:text-[#50556B] outline-none flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomModel}
                      disabled={!customModelInput.trim()}
                      className="px-2.5 py-1 bg-[#1F2337] hover:bg-[#FACC15] text-[#A0A5BD] hover:text-black rounded-md text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* SELECCIÓN DE VERSIONES / EXCEPCIONES: Todas las versiones vs Seleccionar versiones */}
            <div className="space-y-2 pt-2 border-t border-[#1F2337]">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  Alcance de versiones / Excepciones:
                </label>
              </div>

              {/* Selector de alcance de versiones */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#0B0D13] border border-[#2A2F45] rounded-lg">
                <button
                  type="button"
                  onClick={() => handleVersionScopeChange('ALL')}
                  className={`py-1.5 px-2 rounded text-xs font-bold transition-all text-center cursor-pointer ${
                    versionScope === 'ALL'
                      ? 'bg-[#FACC15] text-black shadow-sm'
                      : 'text-[#8B8FA8] hover:text-white'
                  }`}
                >
                  Todas las versiones
                </button>
                <button
                  type="button"
                  onClick={() => handleVersionScopeChange('SPECIFIC')}
                  className={`py-1.5 px-2 rounded text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                    versionScope === 'SPECIFIC'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-[#8B8FA8] hover:text-white'
                  }`}
                >
                  <AlertCircle className="w-3 h-3" />
                  <span>Seleccionar varias versiones (Excepciones)</span>
                </button>
              </div>

              {/* Si eligió Todas las versiones */}
              {versionScope === 'ALL' && (
                <div className="text-[11px] text-[#8B8FA8] px-1">
                  ✓ Aplica a <strong className="text-white">todas las versiones</strong> de los modelos seleccionados.
                </div>
              )}

              {/* Si eligió Seleccionar versiones para hacer excepciones */}
              {versionScope === 'SPECIFIC' && (
                <div className="space-y-2 p-2.5 rounded-lg bg-[#0B0D13] border border-[#252A3D]">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-400 font-bold">
                      Versiones con excepción ({selectedVersions.length}):
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllVersions}
                        className="text-[10px] font-bold text-emerald-400 hover:underline cursor-pointer"
                      >
                        Seleccionar todas
                      </button>
                      <span className="text-[#2A2F45]">|</span>
                      <button
                        type="button"
                        onClick={handleClearVersions}
                        className="text-[10px] font-bold text-[#8B8FA8] hover:text-white cursor-pointer"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  {/* Chips de versiones disponibles */}
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {availableVersions.map(v => {
                      const isSelected = selectedVersions.includes(v)
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => handleToggleVersion(v)}
                          className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500 text-slate-950 shadow-sm border border-emerald-400'
                              : 'bg-[#141824] text-[#8B8FA8] border border-[#252A3D] hover:border-emerald-500/40 hover:text-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          <span>{v}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Input para agregar versión personalizada */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-[#1F2337]">
                    <input
                      type="text"
                      value={customVersionInput}
                      onChange={e => setCustomVersionInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddCustomVersion()
                        }
                      }}
                      placeholder="+ Escribir otra versión (ej: Highline V6)..."
                      className="bg-[#141824] border border-[#252A3D] focus:border-emerald-500 rounded-md px-2.5 py-1 text-xs text-white placeholder:text-[#50556B] outline-none flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomVersion}
                      disabled={!customVersionInput.trim()}
                      className="px-2.5 py-1 bg-[#1F2337] hover:bg-emerald-500 text-[#A0A5BD] hover:text-slate-950 rounded-md text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Agregar
                    </button>
                  </div>

                  <div className="text-[10px] text-[#A0A5BD] bg-emerald-500/10 border border-emerald-500/20 rounded p-1.5">
                    💡 <strong>Excepción activa:</strong> Esta financiación se aplicará únicamente a las versiones seleccionadas. Las demás versiones usarán la circular general del modelo o quedarán en blanco.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tabla de Renglones con 3 Columnas y acción de eliminar */}
          <div className="bg-[#141824] border border-[#252A3D] rounded-xl p-3.5">
            {/* Cabecera de columnas */}
            <div className="grid grid-cols-12 gap-2 pb-2 border-b border-[#252A3D] text-[11px] font-bold text-[#8B8FA8] uppercase tracking-wider items-center">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-4">Máx. a Financiar</div>
              <div className="col-span-3 text-center">Cant. Cuotas</div>
              <div className="col-span-3">Costo Cuota</div>
              <div className="col-span-1 text-center"></div>
            </div>

            {/* Renglones (Completamente en blanco si no hay circular cargada) */}
            <div className="space-y-2.5 pt-2">
              {rows.map((row, idx) => (
                <div
                  key={row.id}
                  className="p-2.5 rounded-lg border bg-[#0B0D13] border-[#1F2337] transition-all hover:border-[#2A2F45]"
                >
                  <div className="grid grid-cols-12 gap-2 items-center">
                    {/* # Renglón */}
                    <div className="col-span-1 text-center">
                      <span className="w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs bg-[#1F2337] text-[#A0A5BD]">
                        {row.id}
                      </span>
                    </div>

                    {/* Columna 1: Máx a Financiar */}
                    <div className="col-span-4">
                      <div className="flex items-center gap-1 bg-[#141824] border border-[#2A2F45] focus-within:border-[#FACC15] rounded-md px-2.5 py-1.5 transition-colors">
                        <span className="text-[#FACC15] font-bold text-xs">$</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.maxFinanciar > 0 ? formatNumberDots(row.maxFinanciar) : ''}
                          onChange={e => handleMaxFinanciarChange(idx, e.target.value)}
                          placeholder="0"
                          className="bg-transparent text-white font-bold text-xs sm:text-sm w-full outline-none placeholder:text-[#50556B]"
                        />
                      </div>
                    </div>

                    {/* Columna 2: Cant Cuotas */}
                    <div className="col-span-3">
                      <div className="flex items-center justify-center bg-[#141824] border border-[#2A2F45] focus-within:border-[#FACC15] rounded-md px-2.5 py-1.5 transition-colors">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.cantCuotas > 0 ? row.cantCuotas : ''}
                          onChange={e => handleCantCuotasChange(idx, e.target.value)}
                          placeholder="12"
                          className="bg-transparent text-white font-bold text-xs sm:text-sm w-full text-center outline-none placeholder:text-[#50556B]"
                        />
                      </div>
                    </div>

                    {/* Columna 3: Costo Cuota */}
                    <div className="col-span-3">
                      <div className="flex items-center gap-1 bg-[#141824] border border-[#2A2F45] focus-within:border-[#FACC15] rounded-md px-2.5 py-1.5 transition-colors">
                        <span className="text-emerald-400 font-bold text-xs">$</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.costoCuota > 0 ? formatNumberDots(row.costoCuota) : ''}
                          onChange={e => handleCostoCuotaChange(idx, e.target.value)}
                          placeholder="0"
                          className="bg-transparent text-emerald-400 font-bold text-xs sm:text-sm w-full outline-none placeholder:text-[#50556B]"
                        />
                      </div>
                    </div>

                    {/* Columna 4: Basurero chiquito */}
                    <div className="col-span-1 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(idx)}
                        disabled={rows.length <= 1}
                        title="Eliminar este renglón"
                        className="w-7 h-7 rounded-lg text-[#8B8FA8] hover:text-rose-400 hover:bg-rose-500/15 flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Botón para agregar renglón (solo el +) */}
            <div className="flex items-center pt-3 mt-1 border-t border-[#1F2337]">
              <button
                type="button"
                onClick={handleAddRow}
                className="w-8 h-8 rounded-lg bg-[#1F2337] hover:bg-[#FACC15] text-[#A0A5BD] hover:text-black border border-[#2A2F45] flex items-center justify-center transition-all cursor-pointer shadow-sm"
                title="Agregar renglón"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Pie de la ventana: solo botón Guardar */}
        <div className="px-5 py-3.5 border-t border-[#1F2337] bg-[#131620] flex items-center justify-end">
          <button
            type="button"
            onClick={handleSaveAndAutoApply}
            className={`px-6 py-2.5 rounded-lg font-extrabold text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer ${
              savedStatus
                ? 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950 shadow-emerald-500/20'
                : 'bg-[#FACC15] hover:bg-[#EAB308] text-black shadow-[#FACC15]/20'
            }`}
          >
            {savedStatus ? (
              <>
                <Check className="w-4 h-4 text-emerald-950 stroke-[3]" />
                <span>¡Guardado!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-black" />
                <span>Guardar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
