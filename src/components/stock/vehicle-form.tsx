'use client'

import { useState, useEffect } from 'react'
import { Vehicle } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2, Image as ImageIcon, Sparkles, Check } from 'lucide-react'
import Link from 'next/link'
import { formatPrice, formatNumberDots, parseNumberFromDots } from '@/lib/utils'

interface Props {
  initialData?: Partial<Vehicle>
  isEditing?: boolean
}

export function VehicleForm({ initialData = {}, isEditing = false }: Props) {
  const [formData, setFormData] = useState<Partial<Vehicle>>({
    Patente: initialData.Patente ?? '',
    Marca: initialData.Marca ?? '',
    Modelo: initialData.Modelo ?? '',
    Version: initialData.Version ?? '',
    Año: initialData.Año ?? new Date().getFullYear(),
    Km: initialData.Km ?? 0,
    Precio_Venta: initialData.Precio_Venta ?? 0,
    Precio_entrega: initialData.Precio_entrega ?? 0,
    Precio_Compra: initialData.Precio_Compra ?? 0,
    Estado: initialData.Estado ?? 'DISPONIBLE',
    Tipo_Combustible: initialData.Tipo_Combustible ?? 'Nafta',
    Transmision: initialData.Transmision ?? 'Manual',
    Tipo_Carroceria: initialData.Tipo_Carroceria ?? 'Sedán',
    Estado_Vehiculo: initialData.Estado_Vehiculo ?? 'Excelente',
    Tipo_Vehiculo: initialData.Tipo_Vehiculo ?? 'Usado',
    Descripcion: initialData.Descripcion ?? '',
    FOTO_PORTADA: initialData.FOTO_PORTADA ?? '',
    FOTOS_EXTRA: initialData.FOTOS_EXTRA ?? '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [infoAutoVersions, setInfoAutoVersions] = useState<Array<{ version: string; precio: number; edicion: string }>>([])
  const [loadingInfoAuto, setLoadingInfoAuto] = useState(false)
  const [selectedInfoPrice, setSelectedInfoPrice] = useState<number | null>(null)

  const router = useRouter()
  const supabase = createClient()

  // Fetch InfoAuto matching versions dynamically
  useEffect(() => {
    if (!formData.Marca || !formData.Modelo || !formData.Año) {
      setInfoAutoVersions([])
      return
    }

    const timer = setTimeout(async () => {
      setLoadingInfoAuto(true)
      try {
        const res = await fetch(`/api/infoauto/versions?marca=${encodeURIComponent(formData.Marca || '')}&modelo=${encodeURIComponent(formData.Modelo || '')}&anio=${formData.Año}`)
        const data = await res.json()
        setInfoAutoVersions(data.versions || [])
      } catch (e) {
        setInfoAutoVersions([])
      } finally {
        setLoadingInfoAuto(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [formData.Marca, formData.Modelo, formData.Año])

  const handleChange = (key: keyof Vehicle, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!formData.Patente || !formData.Marca || !formData.Modelo) {
      setError('La patente, marca y modelo son campos obligatorios.')
      setLoading(false)
      return
    }

    try {
      if (isEditing && initialData.ID) {
        const { error: err } = await supabase
          .from('DB_STOCK')
          .update(formData)
          .eq('ID', initialData.ID)

        if (err) throw err
      } else {
        const newVehicle = {
          ...formData,
          ID: crypto.randomUUID(),
          agency_id: 'a1000000-0000-0000-0000-000000000001',
          createdAt: new Date().toISOString(),
        }

        const { error: err } = await supabase
          .from('DB_STOCK')
          .insert(newVehicle)

        if (err) throw err
      }

      router.push('/stock')
      router.refresh()
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar el vehículo')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl flex flex-col gap-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <Link href="/stock" className="btn-ghost">
          <ArrowLeft size={16} /> Volver al stock
        </Link>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {loading ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Vehículo')}
        </button>
      </div>

      {error && (
        <div className="card p-4 text-sm" style={{ background: '#EF444415', color: '#EF4444', borderColor: '#EF444430' }}>
          {error}
        </div>
      )}

      {/* Main Form Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Datos Principales */}
        <div className="card p-5 flex flex-col gap-4">
          <h3 className="text-base font-semibold" style={{ color: '#E8EAED' }}>🚗 Datos Principales</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#8B8FA8' }}>Patente / Dominio *</label>
              <input
                className="input uppercase tracking-wider font-mono font-bold"
                placeholder="ABC 123"
                value={formData.Patente ?? ''}
                onChange={e => handleChange('Patente', e.target.value.toUpperCase())}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#8B8FA8' }}>Estado de Stock</label>
              <select
                className="select w-full"
                value={formData.Estado ?? 'DISPONIBLE'}
                onChange={e => handleChange('Estado', e.target.value)}>
                <option value="DISPONIBLE">DISPONIBLE</option>
                <option value="RESERVADO">RESERVADO</option>
                <option value="SEÑADO">SEÑADO</option>
                <option value="VENDIDO">VENDIDO</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#8B8FA8' }}>Marca *</label>
              <input
                className="input"
                placeholder="Toyota"
                value={formData.Marca ?? ''}
                onChange={e => handleChange('Marca', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#8B8FA8' }}>Modelo *</label>
              <input
                className="input"
                placeholder="Corolla"
                value={formData.Modelo ?? ''}
                onChange={e => handleChange('Modelo', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#8B8FA8' }}>Año</label>
              <input
                type="number"
                className="input"
                placeholder="2022"
                value={formData.Año ?? ''}
                onChange={e => handleChange('Año', parseInt(e.target.value) || undefined)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#8B8FA8' }}>Kilometraje (Km)</label>
              <input
                type="number"
                className="input"
                placeholder="45000"
                value={formData.Km ?? ''}
                onChange={e => handleChange('Km', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#8B8FA8' }}>Versión</label>
            <input
              className="input"
              placeholder="1.8 XEI CVT"
              value={formData.Version ?? ''}
              onChange={e => handleChange('Version', e.target.value)}
            />
          </div>

          {/* InfoAuto Smart Selector Box */}
          {(loadingInfoAuto || infoAutoVersions.length > 0) && (
            <div className="p-3.5 rounded-xl flex flex-col gap-2 animate-in"
              style={{ background: 'linear-gradient(135deg, #FACC1515, #FDE04710)', border: '1px solid #FDE04740' }}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#FDE047' }}>
                  <Sparkles size={14} /> Selector InfoAuto (Septiembre 2026)
                </span>
                {loadingInfoAuto ? (
                  <span className="text-[10px]" style={{ color: '#8B8FA8' }}>Buscando versiones...</span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#FDE04720] text-[#FDE047]">
                    {infoAutoVersions.length} versiones encontradas
                  </span>
                )}
              </div>

              {infoAutoVersions.length > 0 ? (
                <select
                  className="select text-xs w-full font-medium"
                  style={{ background: '#0F1117', color: '#E8EAED', borderColor: '#2A2F45' }}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value, 10)
                    if (!isNaN(idx) && infoAutoVersions[idx]) {
                      const item = infoAutoVersions[idx]
                      handleChange('Version', item.version)
                      handleChange('Precio_Venta', item.precio)
                      setSelectedInfoPrice(item.precio)
                    }
                  }}>
                  <option value="">-- Seleccionar versión oficial InfoAuto --</option>
                  {infoAutoVersions.map((item, idx) => (
                    <option key={idx} value={idx}>
                      {item.version} — ${new Intl.NumberFormat('es-AR').format(item.precio)}
                    </option>
                  ))}
                </select>
              ) : null}

              {selectedInfoPrice ? (
                <p className="text-[11px] flex items-center gap-1.5 font-medium mt-0.5" style={{ color: '#FACC15' }}>
                  <Check size={13} /> Precio de referencia InfoAuto aplicado: {formatPrice(selectedInfoPrice)}
                </p>
              ) : null}
            </div>
          )}

        </div>

        {/* Card 2: Precios y Valores */}
        <div className="card p-5 flex flex-col gap-4">
          <h3 className="text-base font-semibold" style={{ color: '#E8EAED' }}>💰 Precios y Financiación</h3>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#8B8FA8' }}>Precio ($ ARS)</label>
            <input
              type="text"
              inputMode="numeric"
              className="input text-lg font-bold"
              style={{ color: '#FACC15' }}
              placeholder="18.500.000"
              value={formatNumberDots(formData.Precio_Venta)}
              onChange={e => handleChange('Precio_Venta', parseNumberFromDots(e.target.value) || 0)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#8B8FA8' }}>Anticipo / Mínimo de Entrega ($ ARS)</label>
            <input
              type="text"
              inputMode="numeric"
              className="input"
              placeholder="8.500.000"
              value={formatNumberDots(formData.Precio_entrega)}
              onChange={e => handleChange('Precio_entrega', parseNumberFromDots(e.target.value) || 0)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#8B8FA8' }}>Precio de Compra / Costo ($ ARS)</label>
            <input
              type="text"
              inputMode="numeric"
              className="input"
              placeholder="15.000.000"
              value={formatNumberDots(formData.Precio_Compra)}
              onChange={e => handleChange('Precio_Compra', parseNumberFromDots(e.target.value) || 0)}
            />
          </div>

          <div className="mt-2">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#8B8FA8' }}>Tipo de Vehículo</label>
              <select
                className="select w-full"
                value={formData.Tipo_Vehiculo ?? 'Usado'}
                onChange={e => handleChange('Tipo_Vehiculo', e.target.value)}>
                <option value="Usado">Usado</option>
                <option value="0km">0km</option>
              </select>
            </div>
          </div>
        </div>

        {/* Card 3: Especificaciones Técnicas */}
        <div className="card p-5 flex flex-col gap-4">
          <h3 className="text-base font-semibold" style={{ color: '#E8EAED' }}>⚙️ Especificaciones</h3>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#8B8FA8' }}>Combustible</label>
              <select
                className="select w-full"
                value={formData.Tipo_Combustible ?? 'Nafta'}
                onChange={e => handleChange('Tipo_Combustible', e.target.value)}>
                <option value="Nafta">Nafta</option>
                <option value="Diésel">Diésel</option>
                <option value="GNC">GNC</option>
                <option value="Híbrido">Híbrido</option>
                <option value="Eléctrico">Eléctrico</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#8B8FA8' }}>Transmisión</label>
              <select
                className="select w-full"
                value={formData.Transmision ?? 'Manual'}
                onChange={e => handleChange('Transmision', e.target.value)}>
                <option value="Manual">Manual</option>
                <option value="Automática">Automática</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#8B8FA8' }}>Carrocería</label>
              <select
                className="select w-full"
                value={formData.Tipo_Carroceria ?? 'Sedán'}
                onChange={e => handleChange('Tipo_Carroceria', e.target.value)}>
                <option value="Sedán">Sedán</option>
                <option value="Hatchback">Hatchback</option>
                <option value="SUV">SUV</option>
                <option value="Camioneta">Camioneta</option>
                <option value="Camión">Camión</option>
                <option value="Coupé">Coupé</option>
                <option value="Utilitario">Utilitario</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#8B8FA8' }}>Descripción Comercial</label>
            <textarea
              rows={4}
              className="input font-sans text-xs leading-relaxed"
              placeholder="Descripción del vehículo para las publicaciones en redes..."
              value={formData.Descripcion ?? ''}
              onChange={e => handleChange('Descripcion', e.target.value)}
            />
          </div>
        </div>

        {/* Card 4: Multimedia y Fotos */}
        <div className="card p-5 flex flex-col gap-4">
          <h3 className="text-base font-semibold" style={{ color: '#E8EAED' }}>🖼️ Fotos y Galería</h3>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#8B8FA8' }}>URL Foto de Portada</label>
            <input
              className="input"
              placeholder="https://..."
              value={formData.FOTO_PORTADA ?? ''}
              onChange={e => handleChange('FOTO_PORTADA', e.target.value)}
            />
          </div>

          {formData.FOTO_PORTADA && (
            <div className="w-full h-36 rounded-lg overflow-hidden border flex items-center justify-center"
              style={{ borderColor: '#1F2337', background: '#1A1D28' }}>
              <img src={formData.FOTO_PORTADA} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#8B8FA8' }}>URLs Fotos Adicionales (separadas por coma)</label>
            <textarea
              rows={3}
              className="input font-mono text-xs"
              placeholder="https://foto1.jpg, https://foto2.jpg..."
              value={formData.FOTOS_EXTRA ?? ''}
              onChange={e => handleChange('FOTOS_EXTRA', e.target.value)}
            />
          </div>
        </div>
      </div>
    </form>
  )
}
