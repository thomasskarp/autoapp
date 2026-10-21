'use client'

import { useState, useEffect, useRef } from 'react'
import { Vehicle } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2, Image as ImageIcon, Sparkles, Check, Upload, Trash2, Star } from 'lucide-react'
import Link from 'next/link'
import { formatPrice, formatNumberDots, parseNumberFromDots, getAllVehiclePhotos } from '@/lib/utils'
import { useUserRole } from '@/lib/hooks/use-user-role'

async function compressImage(file: File): Promise<File> {
  if (typeof window === 'undefined' || !file.type.startsWith('image/') || file.type.includes('svg') || file.type.includes('gif')) {
    return file
  }
  // Si pesa menos de 1MB, subir directo
  if (file.size < 1024 * 1024) {
    return file
  }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const maxDim = 1920
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(file)

        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              return resolve(file)
            }
            const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg'
            resolve(new File([blob], cleanName, { type: 'image/jpeg' }))
          },
          'image/jpeg',
          0.85
        )
      }
      img.onerror = () => resolve(file)
      img.src = e.target?.result as string
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}

interface Props {
  initialData?: Partial<Vehicle>
  isEditing?: boolean
}

export function VehicleForm({ initialData = {}, isEditing = false }: Props) {
  const { isAdmin } = useUserRole()
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

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<string[]>(() => getAllVehiclePhotos(initialData as any))
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>('')
  const [photoError, setPhotoError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  // Sincronizar fotos iniciales si cambia initialData
  useEffect(() => {
    if (initialData?.FOTO_PORTADA || initialData?.FOTOS_EXTRA) {
      const parsed = getAllVehiclePhotos(initialData as any)
      if (parsed.length > 0) {
        setPhotos(parsed)
      }
    }
  }, [initialData?.FOTO_PORTADA, initialData?.FOTOS_EXTRA])

  const updatePhotos = (newPhotos: string[]) => {
    setPhotos(newPhotos)
    setFormData(prev => ({
      ...prev,
      FOTO_PORTADA: newPhotos[0] || '',
      FOTOS_EXTRA: newPhotos.slice(1).join(', '),
    }))
  }

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return

    setUploadingPhotos(true)
    setPhotoError(null)

    const filesArray = Array.from(fileList)
    const total = filesArray.length
    const uploadedUrls: string[] = []

    try {
      for (let i = 0; i < total; i++) {
        setUploadProgress(`Cargando foto ${i + 1} de ${total}...`)
        const file = filesArray[i]
        const optimized = await compressImage(file)

        const uploadData = new FormData()
        uploadData.append('file', optimized)

        const res = await fetch('/api/vehicles/upload-photos', {
          method: 'POST',
          body: uploadData,
        })

        const data = await res.json()
        if (!res.ok || !data.success || !data.urls || data.urls.length === 0) {
          throw new Error(data.error || `Error al subir la imagen ${file.name}`)
        }

        uploadedUrls.push(...data.urls)
      }

      const combined = [...photos, ...uploadedUrls]
      updatePhotos(combined)
    } catch (err: any) {
      console.error('Error al subir fotos:', err)
      setPhotoError(err.message || 'Error al cargar fotos automáticamente.')
    } finally {
      setUploadingPhotos(false)
      setUploadProgress('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemovePhoto = (indexToRemove: number) => {
    const updated = photos.filter((_, idx) => idx !== indexToRemove)
    updatePhotos(updated)
  }

  const handleSetPortada = (index: number) => {
    if (index === 0 || index >= photos.length) return
    const target = photos[index]
    const remaining = photos.filter((_, idx) => idx !== index)
    const updated = [target, ...remaining]
    updatePhotos(updated)
  }

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

    if (!formData.Marca?.trim() || !formData.Modelo?.trim()) {
      setError('La marca y el modelo son campos obligatorios.')
      setLoading(false)
      return
    }

    try {
      const cleanPatente = formData.Patente?.trim() || ''

      if (isEditing && initialData.ID) {
        const updatePayload = {
          ...formData,
          Patente: cleanPatente,
        }
        delete (updatePayload as any).agency_id

        const { error: err } = await supabase
          .from('DB_STOCK')
          .update(updatePayload)
          .eq('ID', initialData.ID)

        if (err) throw err
      } else {
        const newId = crypto.randomUUID()
        const newVehicle = {
          ...formData,
          ID: newId,
          Patente: cleanPatente,
          createdAt: new Date().toISOString(),
        }
        delete (newVehicle as any).agency_id

        const { error: err } = await supabase
          .from('DB_STOCK')
          .insert(newVehicle)

        if (err) throw err

        // Asociar este vehículo a la agencia del usuario creador
        try {
          await fetch('/api/vehicles/register-agency', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vehicleId: newId })
          })
        } catch (e) {}
      }

      try {
        await fetch('/api/vehicles/cache/invalidate', { method: 'POST' })
      } catch (e) {}

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
        <button type="submit" className="btn-primary" disabled={loading || uploadingPhotos}>
          {loading || uploadingPhotos ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {uploadingPhotos ? 'Cargando fotos...' : loading ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Vehículo')}
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
              <label className="block text-xs font-medium mb-1" style={{ color: '#8B8FA8' }}>
                Patente / Dominio <span className="text-[10px] text-[#8B8FA8] font-normal">(Opcional)</span>
              </label>
              <input
                className="input uppercase tracking-wider font-mono font-bold"
                placeholder="Ej: ABC 123 (opcional)"
                value={formData.Patente ?? ''}
                onChange={e => handleChange('Patente', e.target.value.toUpperCase())}
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
            <label className="block text-xs font-medium mb-1" style={{ color: '#8B8FA8' }}>Anticipo / Mínimo de Entrega</label>
            <input
              type="text"
              className="input"
              placeholder="Ej: 20.000.000 + 12 cuotas"
              value={typeof formData.Precio_entrega === 'number' ? formatNumberDots(formData.Precio_entrega) : (formData.Precio_entrega || '')}
              onChange={e => handleChange('Precio_entrega', e.target.value)}
            />
          </div>

          {isAdmin && (
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
          )}

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
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold" style={{ color: '#E8EAED' }}>🖼️ Fotos y Galería</h3>
            {photos.length > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: '#1F2337', color: '#9CA3AF' }}>
                {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
              </span>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhotos}
            className="w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group"
            style={{
              borderColor: uploadingPhotos ? '#FACC15' : '#2A2F45',
              background: '#0F1117',
            }}
          >
            {uploadingPhotos ? (
              <>
                <Loader2 size={28} className="animate-spin" style={{ color: '#FACC15' }} />
                <span className="text-sm font-medium" style={{ color: '#FACC15' }}>
                  {uploadProgress || 'Cargando fotos automáticamente...'}
                </span>
                <span className="text-xs" style={{ color: '#8B8FA8' }}>
                  Aguardá un momento mientras se suben a la nube...
                </span>
              </>
            ) : (
              <>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ background: '#FACC1520', color: '#FACC15' }}
                >
                  <Upload size={22} />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm font-semibold" style={{ color: '#F3F4F6' }}>
                    {photos.length > 0 ? 'Seleccionar más fotos' : 'Seleccionar fotos'}
                  </span>
                  <span className="text-xs" style={{ color: '#8B8FA8' }}>
                    Abrir documentos o descargas para cargarlas automáticamente
                  </span>
                </div>
              </>
            )}
          </button>

          {photoError && (
            <div className="p-3 text-xs rounded-lg border" style={{ background: '#EF444415', color: '#EF4444', borderColor: '#EF444430' }}>
              {photoError}
            </div>
          )}

          {photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              {photos.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  className="group relative rounded-lg overflow-hidden border aspect-video flex items-center justify-center bg-black/40"
                  style={{ borderColor: idx === 0 ? '#FACC15' : '#1F2337' }}
                >
                  <img
                    src={url}
                    alt={`Foto ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {idx === 0 ? (
                    <span
                      className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1"
                      style={{ background: '#FACC15', color: '#000' }}
                    >
                      <Star size={10} className="fill-current" /> Portada
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetPortada(idx)}
                      className="absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded bg-black/75 hover:bg-black text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Hacer portada
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600/80 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Eliminar foto"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </form>
  )
}
