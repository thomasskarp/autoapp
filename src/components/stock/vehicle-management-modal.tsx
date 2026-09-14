'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Vehicle } from '@/lib/supabase/types'
import { formatPrice, vehicleName } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  X, Wrench, Plus, Trash2, CheckCircle2, ShoppingBag, DollarSign,
  Sparkles, TrendingUp, ShieldCheck, Zap, Loader2, ArrowRight
} from 'lucide-react'

interface Props {
  vehicle: Vehicle | null
  onClose: () => void
}

interface GastoItem {
  id: string
  concepto: string
  monto: number
}

export function VehicleManagementModal({ vehicle, onClose }: Props) {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'GASTOS' | 'VENTA' | 'TASACION_IA'>('GASTOS')
  
  // Smart Appraisal IA State
  const [appraisalLoading, setAppraisalLoading] = useState(false)
  const [appraisalResult, setAppraisalResult] = useState<any | null>(null)
  const [appraisalQuery, setAppraisalQuery] = useState('')
  const [appraisalPriceRef, setAppraisalPriceRef] = useState<number>(0)
  const [appraisalApplied, setAppraisalApplied] = useState(false)

  // Internal Costs State (Gastos Tab)
  const [precioCompra, setPrecioCompra] = useState<number>(0)
  const [gastos, setGastos] = useState<GastoItem[]>([])

  // New Expense Inputs
  const [nuevoConcepto, setNuevoConcepto] = useState('')
  const [nuevoMonto, setNuevoMonto] = useState('')

  // Sales Registration State (Ventas Tab)
  const [precioVentaFinal, setPrecioVentaFinal] = useState<number>(0)
  const [comision, setComision] = useState<number>(0)
  const [metodoVenta, setMetodoVenta] = useState<string>('Contado')
  const [vendedor, setVendedor] = useState<string>('Propia Agencia / Dueño')
  
  // Permuta State
  const [permutaMarca, setPermutaMarca] = useState('')
  const [permutaModelo, setPermutaModelo] = useState('')
  const [permutaAño, setPermutaAño] = useState('')
  const [permutaKm, setPermutaKm] = useState('')
  const [permutaValor, setPermutaValor] = useState<number>(0)

  // Report & Saving State
  const [saving, setSaving] = useState(false)
  const [reporteGenerado, setReporteGenerado] = useState<any | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync vehicle initial data
  useEffect(() => {
    if (vehicle) {
      setPrecioCompra(vehicle.Precio_Compra || 0)
      setPrecioVentaFinal(vehicle.Precio_Venta || 0)
      setAppraisalQuery(`${vehicle.Marca || ''} ${vehicle.Modelo || ''} ${vehicle.Version || ''} ${vehicle.Año || ''}`.trim())
      setAppraisalPriceRef(vehicle.Precio_Venta || 0)
      
      // Load saved expenses from localStorage
      try {
        const savedGastos = localStorage.getItem(`gastos_auto_${vehicle.ID}`)
        if (savedGastos) {
          setGastos(JSON.parse(savedGastos))
        } else {
          setGastos([])
        }
      } catch (e) {
        setGastos([])
      }
    }
  }, [vehicle])

  const handleRunSmartAppraisal = async () => {
    try {
      setAppraisalLoading(true)
      const res = await fetch('/api/ai/smart-appraisal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: appraisalQuery,
          declaredPrice: appraisalPriceRef
        })
      })
      const data = await res.json()
      if (data.success && data.appraisal) {
        setAppraisalResult(data.appraisal)
      } else {
        alert('Aviso de tasación: ' + (data.error || 'No se pudo generar la tasación'))
      }
    } catch (err: any) {
      alert('Error en tasación con IA: ' + err.message)
    } finally {
      setAppraisalLoading(false)
    }
  }

  const handleApplyAppraisalPrice = async (priceType: 'sale' | 'table') => {
    if (!vehicle || !appraisalResult) return
    const isOkm = (vehicle.Tipo_Vehiculo || '').toLowerCase() === '0km'
    const priceToApply = priceType === 'sale' 
      ? appraisalResult.suggested_sale_price 
      : appraisalResult.estimated_table_price

    const tableName = isOkm ? 'DB_STOCK_OKM' : 'DB_STOCK'
    const updatePayload: any = {}
    if (priceType === 'sale') {
      updatePayload.Precio_Venta = priceToApply
    } else {
      updatePayload.Precio_Info = priceToApply
    }

    try {
      await supabase.from(tableName).update(updatePayload).eq('ID', vehicle.ID)
      setAppraisalApplied(true)
      setTimeout(() => setAppraisalApplied(false), 2500)
      router.refresh()
    } catch (err) {
      console.error('Error aplicando precio sugerido:', err)
    }
  }

  // Calculate totals dynamically
  const totalGastos = useMemo(() => {
    return gastos.reduce((acc, item) => acc + item.monto, 0)
  }, [gastos])

  const inversionTotal = useMemo(() => {
    return (precioCompra || 0) + totalGastos
  }, [precioCompra, totalGastos])

  const gananciaEstimada = useMemo(() => {
    return (precioVentaFinal || 0) - (inversionTotal + (comision || 0))
  }, [precioVentaFinal, inversionTotal, comision])

  if (!vehicle || !mounted) return null

  const isOkm = (vehicle.Tipo_Vehiculo || '').toLowerCase() === '0km'

  // Add Expense Item
  const handleAddGasto = () => {
    if (!nuevoConcepto.trim() || !nuevoMonto) return
    const item: GastoItem = {
      id: Date.now().toString(),
      concepto: nuevoConcepto.trim(),
      monto: parseFloat(nuevoMonto) || 0
    }
    const updated = [...gastos, item]
    setGastos(updated)
    localStorage.setItem(`gastos_auto_${vehicle.ID}`, JSON.stringify(updated))
    setNuevoConcepto('')
    setNuevoMonto('')
  }

  // Remove Expense Item
  const handleRemoveGasto = (id: string) => {
    const updated = gastos.filter(g => g.id !== id)
    setGastos(updated)
    localStorage.setItem(`gastos_auto_${vehicle.ID}`, JSON.stringify(updated))
  }

  // Save Internal Expenses Data
  const handleSaveInternal = async () => {
    setSaving(true)
    const tableName = isOkm ? 'DB_STOCK_OKM' : 'DB_STOCK'
    try {
      await supabase.from(tableName).update({
        Precio_Compra: precioCompra
      }).eq('ID', vehicle.ID)

      localStorage.setItem(`gastos_auto_${vehicle.ID}`, JSON.stringify(gastos))
      alert('¡Información de gastos e inversión guardada!')
      router.refresh()
    } catch (err) {
      console.error('Error guardando gastos:', err)
    } finally {
      setSaving(false)
    }
  }

  // Register Sale & Generate Single Vehicle Report
  const handleRegistrarVenta = async () => {
    setSaving(true)
    const tableName = isOkm ? 'DB_STOCK_OKM' : 'DB_STOCK'
    
    const costoTotalConComision = inversionTotal + comision
    const gananciaNeta = precioVentaFinal - costoTotalConComision

    const reporte = {
      auto: vehicleName(vehicle),
      id: vehicle.ID,
      patente: vehicle.Patente || 'SIN PATENTE',
      año: vehicle.Año,
      km: vehicle.Km,
      precioCompra: precioCompra,
      totalGastos: totalGastos,
      listaGastos: gastos,
      comisionVendedor: comision,
      inversionTotal: inversionTotal,
      precioVentaFinal: precioVentaFinal,
      gananciaNeta: gananciaNeta,
      metodoVenta: metodoVenta,
      vendedor: vendedor,
      permuta: metodoVenta.includes('Permuta') ? {
        marca: permutaMarca,
        modelo: permutaModelo,
        año: permutaAño,
        km: permutaKm,
        valorTomado: permutaValor
      } : null,
      fechaVenta: new Date().toLocaleDateString('es-AR')
    }

    try {
      // 1. Update vehicle status to VENDIDO and set final sale price
      await supabase.from(tableName).update({
        Estado: 'VENDIDO',
        Precio_Venta: precioVentaFinal,
        Precio_Compra: precioCompra
      }).eq('ID', vehicle.ID)

      // 2. Register sale interaction in DB_INTERACCIONES for Dashboard Ventas metrics
      await supabase.from('DB_INTERACCIONES').insert({
        Tipo_Interaccion: 'VENTA_REGISTRADA',
        Vendedor: vendedor,
        Detalle_Conversacion: `Venta de ${vehicleName(vehicle)} por $${new Intl.NumberFormat('es-AR').format(precioVentaFinal)} (Ganancia Neta: $${new Intl.NumberFormat('es-AR').format(gananciaNeta)}). Método: ${metodoVenta}`
      })

      // 3. Save report locally
      localStorage.setItem(`reporte_venta_${vehicle.ID}`, JSON.stringify(reporte))
      setReporteGenerado(reporte)
      router.refresh()
    } catch (err) {
      console.error('Error registrando venta:', err)
      alert('Error registrando la venta. Intente nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in"
      onClick={onClose}>
      
      <div className="card w-full max-w-2xl max-h-[90vh] flex flex-col overflow-y-auto shadow-2xl rounded-2xl border"
        style={{ background: '#0F1117', borderColor: '#2A2F45', color: '#E8EAED' }}
        onClick={e => e.stopPropagation()}>
        
        {/* Top Clean Bar with Tabs & Close button */}
        <div className="px-6 py-2 flex items-center justify-between sticky top-0 z-10 border-b border-[#1F2337]" style={{ background: '#13161F' }}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('GASTOS')}
              className="px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-2"
              style={{
                borderColor: activeTab === 'GASTOS' ? '#FACC15' : 'transparent',
                color: activeTab === 'GASTOS' ? '#FACC15' : '#8B8FA8',
                background: 'transparent', cursor: 'pointer'
              }}>
              <Wrench size={14} /> Gastos
            </button>

            <button
              onClick={() => setActiveTab('VENTA')}
              className="px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-2"
              style={{
                borderColor: activeTab === 'VENTA' ? '#FACC15' : 'transparent',
                color: activeTab === 'VENTA' ? '#FACC15' : '#8B8FA8',
                background: 'transparent', cursor: 'pointer'
              }}>
              <ShoppingBag size={14} /> Venta
            </button>

            <button
              onClick={() => setActiveTab('TASACION_IA')}
              className="px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-2"
              style={{
                borderColor: activeTab === 'TASACION_IA' ? '#FACC15' : 'transparent',
                color: activeTab === 'TASACION_IA' ? '#FACC15' : '#8B8FA8',
                background: 'transparent', cursor: 'pointer'
              }}>
              <Sparkles size={14} /> Tasador IA
            </button>
          </div>

          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: '#8B8FA8', background: '#1E2130', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-5">

          {/* VISTA 1: GASTOS */}
          {activeTab === 'GASTOS' && (
            <div className="flex flex-col gap-5">
              
              {/* 1. Registro de Gastos */}
              <div className="card p-4 flex flex-col gap-3" style={{ background: '#13161F', border: '1px solid #1F2337' }}>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#E8EAED' }}>
                    Registro de Gastos del Vehículo
                  </h4>
                  <span className="text-xs font-extrabold text-[#F59E0B]">
                    Total Gastos: {formatPrice(totalGastos)}
                  </span>
                </div>

                {/* Form para agregar gasto */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-1">
                  <input
                    className="input text-xs flex-1 min-w-[140px]"
                    placeholder="Concepto (ej: Chapa, Mecánica, Gestoría)"
                    value={nuevoConcepto}
                    onChange={e => setNuevoConcepto(e.target.value)}
                  />
                  <input
                    type="number"
                    className="input text-xs w-32"
                    placeholder="Monto ($)"
                    value={nuevoMonto}
                    onChange={e => setNuevoMonto(e.target.value)}
                  />
                  <button
                    onClick={handleAddGasto}
                    className="btn-primary text-xs py-2 px-3 flex items-center gap-1">
                    <Plus size={14} /> Agregar
                  </button>
                </div>

                {/* Lista de gastos */}
                <div className="mt-2 overflow-x-auto">
                  {gastos.length === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color: '#555870' }}>
                      No hay gastos registrados para este vehículo.
                    </p>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: '1px solid #1F2337' }}>
                          <th className="text-left py-2 text-[10px] font-semibold uppercase" style={{ color: '#555870' }}>Concepto</th>
                          <th className="text-right py-2 text-[10px] font-semibold uppercase" style={{ color: '#555870' }}>Monto</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {gastos.map(g => (
                          <tr key={g.id} style={{ borderBottom: '1px solid #1F2337' }}>
                            <td className="py-2 text-xs" style={{ color: '#E8EAED' }}>{g.concepto}</td>
                            <td className="py-2 text-xs text-right font-bold" style={{ color: '#F59E0B' }}>
                              {formatPrice(g.monto)}
                            </td>
                            <td className="py-2 text-right">
                              <button
                                onClick={() => handleRemoveGasto(g.id)}
                                className="p-1 hover:text-red-400 transition-colors"
                                style={{ color: '#555870', background: 'none', border: 'none', cursor: 'pointer' }}>
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* 2. Precio de Compra (Abajo de Gastos) */}
              <div className="card p-4 flex flex-col gap-1.5" style={{ background: '#13161F', border: '1px solid #1F2337' }}>
                <label className="text-xs font-semibold" style={{ color: '#8B8FA8' }}>
                  Precio de Compra ($ ARS)
                </label>
                <input
                  type="number"
                  className="input text-sm font-bold"
                  placeholder="Ej: 18000000"
                  value={precioCompra || ''}
                  onChange={e => setPrecioCompra(parseFloat(e.target.value) || 0)}
                />
                <span className="text-[10px]" style={{ color: '#555870' }}>Costo original de adquisición del vehículo</span>
              </div>

              {/* Inversión Total Acumulada */}
              <div className="p-4 rounded-xl flex items-center justify-between"
                style={{ background: '#13161F', border: '1px solid #FACC1540' }}>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: '#8B8FA8' }}>
                    INVERSIÓN TOTAL (COMPRA + GASTOS)
                  </span>
                  <span className="text-xl font-extrabold" style={{ color: '#FACC15' }}>
                    {formatPrice(inversionTotal)}
                  </span>
                </div>
                <button
                  onClick={handleSaveInternal}
                  disabled={saving}
                  className="btn-primary text-xs py-2.5 px-4">
                  {saving ? 'Guardando...' : 'Guardar Gastos'}
                </button>
              </div>

            </div>
          )}

          {/* VISTA 2: VENTA */}
          {activeTab === 'VENTA' && (
            <div className="flex flex-col gap-5">
              
              {reporteGenerado ? (
                /* REPORTE DE VENTA GENERADO */
                <div className="flex flex-col gap-4 animate-in">
                  <div className="p-4 rounded-xl flex items-center gap-3"
                    style={{ background: 'rgba(0, 200, 150, 0.15)', border: '1px solid #FACC1540', color: '#FACC15' }}>
                    <CheckCircle2 size={22} />
                    <div>
                      <h3 className="font-bold text-sm">¡Venta Registrada Exitosamente!</h3>
                      <p className="text-xs opacity-90">El vehículo ha sido marcado como VENDIDO en el stock.</p>
                    </div>
                  </div>

                  <div className="card p-5 flex flex-col gap-4" style={{ background: '#13161F', border: '1px solid #1F2337' }}>
                    <div className="flex items-center justify-between border-b border-[#1F2337] pb-3">
                      <div>
                        <h4 className="font-bold text-sm">{reporteGenerado.auto}</h4>
                        <p className="text-xs" style={{ color: '#8B8FA8' }}>Fecha de Venta: {reporteGenerado.fechaVenta}</p>
                      </div>
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FACC1520] text-[#FACC15] border border-[#FACC1540]">
                        VENDIDO
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="block text-[10px]" style={{ color: '#555870' }}>PRECIO VENTA FINAL</span>
                        <span className="font-bold text-sm text-[#FACC15]">{formatPrice(reporteGenerado.precioVentaFinal)}</span>
                      </div>

                      <div>
                        <span className="block text-[10px]" style={{ color: '#555870' }}>COMISIÓN VENDEDOR</span>
                        <span className="font-bold text-sm text-[#F59E0B]">{formatPrice(reporteGenerado.comisionVendedor)}</span>
                      </div>

                      <div>
                        <span className="block text-[10px]" style={{ color: '#555870' }}>GANANCIA NETA</span>
                        <span className="font-extrabold text-sm text-[#FACC15]">{formatPrice(reporteGenerado.gananciaNeta)}</span>
                      </div>

                      <div>
                        <span className="block text-[10px]" style={{ color: '#555870' }}>MÉTODO</span>
                        <span className="font-semibold">{reporteGenerado.metodoVenta}</span>
                      </div>

                      <div>
                        <span className="block text-[10px]" style={{ color: '#555870' }}>VENDEDOR</span>
                        <span className="font-semibold">{reporteGenerado.vendedor}</span>
                      </div>
                    </div>

                    {reporteGenerado.permuta && (
                      <div className="p-3 rounded-lg flex flex-col gap-1" style={{ background: '#1A1D28', border: '1px solid #2A2F45' }}>
                        <span className="text-[10px] font-bold uppercase text-[#FDE047]">Vehículo Ingresado en Permuta:</span>
                        <p className="text-xs font-medium">
                          {reporteGenerado.permuta.marca} {reporteGenerado.permuta.modelo} ({reporteGenerado.permuta.año})
                        </p>
                        <p className="text-xs" style={{ color: '#8B8FA8' }}>
                          Valor tomado: <strong className="text-[#FACC15]">{formatPrice(reporteGenerado.permuta.valorTomado)}</strong>
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={onClose}
                    className="btn-primary justify-center text-xs py-2.5">
                    Cerrar y Volver al Inventario
                  </button>
                </div>
              ) : (
                /* FORMULARIO DE VENTA */
                <div className="flex flex-col gap-4">
                  
                  {/* Precio de Venta & Comisión */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="card p-4 flex flex-col gap-1.5" style={{ background: '#13161F', border: '1px solid #1F2337' }}>
                      <label className="text-xs font-semibold" style={{ color: '#8B8FA8' }}>
                        Precio de Venta Final ($ ARS)
                      </label>
                      <input
                        type="number"
                        className="input text-sm font-bold text-[#FACC15]"
                        value={precioVentaFinal || ''}
                        onChange={e => setPrecioVentaFinal(parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    {/* COMISIÓN EN VISTAS DE VENTAS (MOVED HERE AS REQUESTED) */}
                    <div className="card p-4 flex flex-col gap-1.5" style={{ background: '#13161F', border: '1px solid #1F2337' }}>
                      <label className="text-xs font-semibold" style={{ color: '#8B8FA8' }}>
                        Comisión a Pagar por Venta ($ ARS)
                      </label>
                      <input
                        type="number"
                        className="input text-sm font-bold text-[#F59E0B]"
                        placeholder="Ej: 300000"
                        value={comision || ''}
                        onChange={e => setComision(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  {/* Método de Pago */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="card p-4 flex flex-col gap-1.5" style={{ background: '#13161F', border: '1px solid #1F2337' }}>
                      <label className="text-xs font-semibold" style={{ color: '#8B8FA8' }}>
                        Método de Pago / Operación
                      </label>
                      <select
                        className="select text-xs font-bold"
                        value={metodoVenta}
                        onChange={e => setMetodoVenta(e.target.value)}>
                        <option value="Contado">Contado</option>
                        <option value="Financiado">Financiado</option>
                        <option value="Permuta">Permuta</option>
                        <option value="Contado + Permuta">Contado + Permuta</option>
                      </select>
                    </div>

                    <div className="card p-4 flex flex-col gap-1.5" style={{ background: '#13161F', border: '1px solid #1F2337' }}>
                      <label className="text-xs font-semibold" style={{ color: '#8B8FA8' }}>
                        Vendedor / Operador Encargado
                      </label>
                      <input
                        className="input text-xs font-medium"
                        placeholder="Nombre del vendedor o agencia"
                        value={vendedor}
                        onChange={e => setVendedor(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Permuta (Si aplica) */}
                  {metodoVenta.includes('Permuta') && (
                    <div className="card p-4 flex flex-col gap-3" style={{ background: '#1A1D28', border: '1px solid #FDE04740' }}>
                      <h4 className="text-xs font-bold text-[#FDE047] flex items-center gap-1.5">
                        🔄 Información del Vehículo Recibido en Permuta
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <input
                          className="input text-xs"
                          placeholder="Marca (ej: Ford)"
                          value={permutaMarca}
                          onChange={e => setPermutaMarca(e.target.value)}
                        />
                        <input
                          className="input text-xs"
                          placeholder="Modelo (ej: Ka)"
                          value={permutaModelo}
                          onChange={e => setPermutaModelo(e.target.value)}
                        />
                        <input
                          type="number"
                          className="input text-xs"
                          placeholder="Año (ej: 2018)"
                          value={permutaAño}
                          onChange={e => setPermutaAño(e.target.value)}
                        />
                        <input
                          type="number"
                          className="input text-xs"
                          placeholder="Kilómetros"
                          value={permutaKm}
                          onChange={e => setPermutaKm(e.target.value)}
                        />
                        <input
                          type="number"
                          className="input text-xs font-bold text-[#FACC15] col-span-2 sm:col-span-1"
                          placeholder="Valor Tomado ($ ARS)"
                          value={permutaValor || ''}
                          onChange={e => setPermutaValor(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Ganancia Neta Estimada & Botón Registrar */}
                  <div className="p-4 rounded-xl flex items-center justify-between"
                    style={{ background: 'linear-gradient(135deg, #FACC1515, #FACC1515)', border: '1px solid #FACC1540' }}>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#555870' }}>
                        GANANCIA NETA ESTIMADA DEL AUTO
                      </span>
                      <p className="text-2xl font-extrabold" style={{ color: gananciaEstimada >= 0 ? '#FACC15' : '#EF4444' }}>
                        {formatPrice(gananciaEstimada)}
                      </p>
                    </div>

                    <button
                      onClick={handleRegistrarVenta}
                      disabled={saving}
                      className="btn-primary text-xs py-3 px-5 font-bold flex items-center gap-2">
                      <ShoppingBag size={16} />
                      {saving ? 'Registrando...' : 'Registrar Venta & Generar Reporte'}
                    </button>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* VISTA 3: TASACION INTELIGENTE CON IA */}
          {activeTab === 'TASACION_IA' && (
            <div className="flex flex-col gap-5 animate-in">
              {/* Card de Configuración de Tasación */}
              <div className="card p-4 flex flex-col gap-3 rounded-xl border border-[#FACC1540] bg-gradient-to-r from-[#FACC1508] to-[#13161F]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#FACC1520] text-[#FACC15]">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#E8EAED] flex items-center gap-2">
                      <span>Tasador Automotriz Inteligente</span>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#FACC1520] text-[#FACC15]">GEMINI + INFOAUTO</span>
                    </h4>
                    <p className="text-[10px] text-[#8B8FA8]">
                      Calcula instantáneamente el valor de mercado oficial, precio de compra y margen comercial
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-2">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] font-bold text-[#8B8FA8] uppercase block mb-1">Modelo / Versión / Año</label>
                    <input
                      className="input text-xs w-full font-medium"
                      placeholder="Ej: Gol Trend MSI 2018 5p..."
                      value={appraisalQuery}
                      onChange={e => setAppraisalQuery(e.target.value)}
                    />
                  </div>
                  <div className="w-40">
                    <label className="text-[10px] font-bold text-[#8B8FA8] uppercase block mb-1">Precio Referencia ($)</label>
                    <input
                      type="number"
                      className="input text-xs w-full font-bold text-[#FACC15]"
                      placeholder="0"
                      value={appraisalPriceRef || ''}
                      onChange={e => setAppraisalPriceRef(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleRunSmartAppraisal}
                      disabled={appraisalLoading || !appraisalQuery.trim()}
                      className="btn-primary text-xs py-2 px-4 font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                      {appraisalLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      <span>{appraisalLoading ? 'Tasando...' : 'Tasar con IA'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Toast de éxito al aplicar precio */}
              {appraisalApplied && (
                <div className="p-3 rounded-lg text-xs font-bold flex items-center gap-2 bg-[#22C55E15] text-[#22C55E] border border-[#22C55E40] animate-in">
                  <CheckCircle2 size={16} />
                  <span>¡Precio aplicado exitosamente a la ficha del vehículo en la base de datos!</span>
                </div>
              )}

              {/* Resultados del Appraisal */}
              {appraisalResult && (
                <div className="flex flex-col gap-4 animate-in">
                  {/* Header con Match */}
                  <div className="p-3.5 rounded-xl bg-[#13161F] border border-[#1F2337] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-[#555870] uppercase">Unidad Identificada:</span>
                      <h4 className="text-sm font-black text-white">
                        {appraisalResult.matched_brand} {appraisalResult.matched_model} {appraisalResult.matched_version} ({appraisalResult.year})
                      </h4>
                    </div>
                    <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full ${
                      appraisalResult.liquidity_rating === 'ALTA' 
                        ? 'bg-[#22C55E20] text-[#22C55E] border border-[#22C55E40]' 
                        : appraisalResult.liquidity_rating === 'MEDIA'
                        ? 'bg-[#FACC1520] text-[#FACC15] border border-[#FACC1540]'
                        : 'bg-[#EF444420] text-[#EF4444] border border-[#EF444440]'
                    }`}>
                      ⚡ Rotación: {appraisalResult.liquidity_rating}
                    </span>
                  </div>

                  {/* 4 Cards de Métricas */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-[#13161F] border border-[#1F2337]">
                      <span className="text-[10px] font-bold text-[#8B8FA8] uppercase block mb-1">Tabla InfoAuto</span>
                      <p className="text-sm sm:text-base font-black text-white">
                        {formatPrice(appraisalResult.estimated_table_price)}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#13161F] border border-[#FACC1540]">
                      <span className="text-[10px] font-bold text-[#FACC15] uppercase block mb-1">Venta Sugerida</span>
                      <p className="text-sm sm:text-base font-black text-[#FACC15]">
                        {formatPrice(appraisalResult.suggested_sale_price)}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#13161F] border border-[#1F2337]">
                      <span className="text-[10px] font-bold text-[#8B8FA8] uppercase block mb-1">Toma / Compra</span>
                      <p className="text-sm sm:text-base font-black text-[#22C55E]">
                        {formatPrice(appraisalResult.suggested_purchase_price)}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#13161F] border border-[#1F2337]">
                      <span className="text-[10px] font-bold text-[#8B8FA8] uppercase block mb-1">Margen Bruto</span>
                      <p className="text-sm sm:text-base font-black text-[#60A5FA]">
                        {appraisalResult.estimated_margin_percentage}%
                      </p>
                    </div>
                  </div>

                  {/* Rationale Comercial */}
                  <div className="p-3.5 rounded-xl bg-[#0B0D13] border border-[#1F2337] text-xs text-[#C5C9D6]">
                    <div className="font-bold text-white text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <TrendingUp size={13} className="text-[#FACC15]" />
                      <span>Análisis Técnico de Mercado:</span>
                    </div>
                    <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
                      {appraisalResult.commercial_rationale}
                    </p>
                  </div>

                  {/* Botones para aplicar precios al vehículo */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleApplyAppraisalPrice('table')}
                      className="btn-ghost text-xs py-2 px-3 flex items-center gap-1.5 cursor-pointer">
                      <span>Asignar Precio InfoAuto</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyAppraisalPrice('sale')}
                      className="btn-primary text-xs py-2 px-4 font-bold flex items-center gap-1.5 cursor-pointer bg-[#FACC15] text-black hover:bg-[#FDE047]">
                      <ArrowRight size={14} />
                      <span>Aplicar Precio de Venta Sugerido ({formatPrice(appraisalResult.suggested_sale_price)})</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>,
    document.body
  )
}
