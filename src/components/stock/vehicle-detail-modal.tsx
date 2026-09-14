'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import JSZip from 'jszip'
import { Vehicle } from '@/lib/supabase/types'
import { formatPrice, formatKm, vehicleName, getAllVehiclePhotos, getVehicleCoverImage, formatBodyType, formatNumberDots, parseNumberFromDots } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useInfoPrice } from '@/context/info-price-context'
import {
  X, Calendar, Gauge, Fuel, Sliders,
  Copy, Check, Image as ImageIcon, CheckCircle2, Star, Download, Loader2
} from 'lucide-react'

interface Props {
  vehicle: Vehicle | null
  onClose: () => void
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

const COMBUSTIBLE_OPTIONS = ['Nafta', 'Diésel', 'Híbrido', 'Eléctrico', 'GNC']
const TRANSMISION_OPTIONS = ['Manual', 'Automática']
const CARROCERIA_OPTIONS = ['Sedán', 'Hatchback', 'SUV', 'Camioneta', 'Camión', 'Coupé', 'Utilitario']

export function VehicleDetailModal({ vehicle, onClose }: Props) {
  const [mounted, setMounted] = useState(false)
  const [photosList, setPhotosList] = useState<string[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [savedIndicator, setSavedIndicator] = useState(false)

  // Drag and Drop state
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null)

  // Editable fields state
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [version, setVersion] = useState('')
  const [año, setAño] = useState<number | ''>('')
  const [km, setKm] = useState<number | ''>('')
  const [precioVenta, setPrecioVenta] = useState<number | ''>('')
  const [precioEntrega, setPrecioEntrega] = useState<number | ''>('')
  const [precioInfo, setPrecioInfo] = useState<number | ''>('')
  const [combustible, setCombustible] = useState('Nafta')
  const [transmision, setTransmision] = useState('Manual')
  const [carroceria, setCarroceria] = useState('Sedán')
  const [descripcion, setDescripcion] = useState('')

  const router = useRouter()
  const supabase = createClient()
  const { showInfoPrice } = useInfoPrice()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync state when vehicle prop changes
  useEffect(() => {
    if (vehicle) {
      setMarca(vehicle.Marca || '')
      setModelo(vehicle.Modelo || '')
      
      // Clean version if it just duplicates the vehicle year
      const rawVersion = (vehicle.Version || '').trim()
      const yearStr = vehicle.Año ? String(vehicle.Año) : ''
      if (rawVersion === yearStr || rawVersion === `(${yearStr})`) {
        setVersion('')
      } else {
        setVersion(rawVersion)
      }

      setAño(vehicle.Año ?? '')
      setKm(vehicle.Km ?? '')
      setPrecioVenta(vehicle.Precio_Venta ?? '')
      setPrecioEntrega(vehicle.Precio_entrega ?? '')
      setPrecioInfo(vehicle.Precio_Info ?? '')
      setCombustible(vehicle.Tipo_Combustible || 'Nafta')
      setTransmision(vehicle.Transmision || 'Manual')
      setCarroceria(formatBodyType(vehicle.Tipo_Carroceria) || 'Sedán')
      
      // Sanitize description to remove internal purchase cost lines if present
      const cleanDesc = (vehicle.Descripcion || '').replace(/Precio de compra:.*$/gmi, '').trim()
      setDescripcion(cleanDesc)

      const list = getAllVehiclePhotos(vehicle)
      setPhotosList(list)
      const cover = getVehicleCoverImage(vehicle)
      setSelectedPhoto(cover || list[0] || '')
    } else {
      setPhotosList([])
      setSelectedPhoto('')
    }
  }, [vehicle])

  useEffect(() => {
    if (vehicle) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [vehicle])

  if (!vehicle || !mounted) return null

  const isOkm = (vehicle.Tipo_Vehiculo || '').toLowerCase() === '0km'
  const tableName = isOkm ? 'DB_STOCK_OKM' : 'DB_STOCK'
  const showPatente = !isTempPatent(vehicle.Patente)

  // Automatic saving helper
  const autoSaveField = async (fieldsToUpdate: Partial<Vehicle>) => {
    try {
      await supabase.from(tableName).update(fieldsToUpdate).eq('ID', vehicle.ID)
      setSavedIndicator(true)
      setTimeout(() => setSavedIndicator(false), 2000)
      router.refresh()
    } catch (err) {
      console.error('Error guardando cambios automáticamente:', err)
    }
  }

  // Set specific photo index as cover (shifts to index 0)
  const handleSetPortada = (index: number) => {
    if (index === 0 || index >= photosList.length) return
    const targetPhoto = photosList[index]
    const remaining = photosList.filter((_, i) => i !== index)
    const newPhotos = [targetPhoto, ...remaining]

    setPhotosList(newPhotos)
    setSelectedPhoto(targetPhoto)

    autoSaveField({
      FOTO_PORTADA: newPhotos[0],
      FOTOS_EXTRA: JSON.stringify(newPhotos.slice(1))
    })
  }

  // Mouse Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dropTargetIdx !== index) {
      setDropTargetIdx(index)
    }
  }

  const handleDragLeave = (e: React.DragEvent, index: number) => {
    if (dropTargetIdx === index) {
      setDropTargetIdx(null)
    }
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    setDropTargetIdx(null)

    if (draggedIdx === null || draggedIdx === targetIndex) {
      setDraggedIdx(null)
      return
    }

    const updatedPhotos = [...photosList]
    const [draggedPhoto] = updatedPhotos.splice(draggedIdx, 1)
    updatedPhotos.splice(targetIndex, 0, draggedPhoto)

    setPhotosList(updatedPhotos)
    setDraggedIdx(null)

    // Automatic saving: index 0 isPortada
    autoSaveField({
      FOTO_PORTADA: updatedPhotos[0],
      FOTOS_EXTRA: JSON.stringify(updatedPhotos.slice(1))
    })
  }

  const handleCopyFicha = () => {
    const pVenta = typeof precioVenta === 'number' ? precioVenta : 0
    const pEntregaCalc = (typeof precioEntrega === 'number' && precioEntrega > 0)
      ? precioEntrega
      : (pVenta > 0 ? pVenta * 0.5 : 0)

    const text = `🚗 *${marca} ${modelo} ${version}* (${año ?? ''})
Km: ${formatKm(typeof km === 'number' ? km : 0)}
💰 Precio de Venta: ${formatPrice(pVenta)}
💵 Anticipo mínimo: ${formatPrice(pEntregaCalc)}

⛽ Combustible: ${combustible || 'Nafta'} | Caja: ${transmision || 'Manual'}
📝 ${descripcion || ''}`.trim()

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadPhotos = async () => {
    if (!photosList || photosList.length === 0) {
      alert('Este vehículo no tiene fotos para descargar.')
      return
    }

    setDownloading(true)
    try {
      const zip = new JSZip()
      const cleanBrand = (marca || 'Auto').trim().replace(/[^a-zA-Z0-9]/g, '_')
      const cleanModel = (modelo || 'Vehiculo').trim().replace(/[^a-zA-Z0-9]/g, '_')
      const folderName = `Book_${cleanBrand}_${cleanModel}`

      for (let i = 0; i < photosList.length; i++) {
        const url = photosList[i].replace(/=s600$/, '=s1600')
        try {
          const response = await fetch(url)
          if (response.ok) {
            const blob = await response.blob()
            const filename = `${cleanBrand}_${cleanModel}_foto_${i + 1}.jpg`
            zip.file(filename, blob)
          }
        } catch (err) {
          console.warn(`Error al obtener la foto ${i + 1} para el ZIP:`, err)
        }
      }

      const zipContent = await zip.generateAsync({ type: 'blob' })
      const blobUrl = URL.createObjectURL(zipContent)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${folderName}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('Error al empaquetar el book de fotos:', err)
      alert('Ocurrió un error al generar la descarga del book.')
    } finally {
      setDownloading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in"
      onClick={onClose}>
      
      <div className="card w-full max-w-[1360px] max-h-[94vh] flex flex-col overflow-y-auto shadow-2xl rounded-2xl border"
        style={{ background: '#0F1117', borderColor: '#2A2F45', color: '#FFFFFF' }}
        onClick={e => e.stopPropagation()}>
        
        {/* Header Bar with larger & clearer Title */}
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10 border-b border-[#1F2337]"
          style={{ background: '#13161F' }}>
          
          <div className="flex items-center gap-3 flex-1 mr-4">
            {showPatente && (
              <span className="text-sm font-mono font-bold px-3 py-1 rounded bg-[#1A1D28] border border-[#2A2F45] text-[#FFFFFF]">
                {vehicle.Patente}
              </span>
            )}

            {/* Title / Brand / Model / Version Click-Editable Inputs */}
            <div className="flex flex-col gap-0.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  className="bg-transparent border border-transparent hover:border-[#2A2F45] focus:border-[#FACC15] focus:bg-[#1A1D28] rounded px-2 py-0.5 text-lg sm:text-xl font-black uppercase transition-all"
                  style={{ color: '#FFFFFF', outline: 'none' }}
                  value={marca}
                  onChange={e => setMarca(e.target.value)}
                  onBlur={() => autoSaveField({ Marca: marca })}
                  placeholder="MARCA"
                />
                <input
                  className="bg-transparent border border-transparent hover:border-[#2A2F45] focus:border-[#FACC15] focus:bg-[#1A1D28] rounded px-2 py-0.5 text-lg sm:text-xl font-black uppercase transition-all flex-1 min-w-[140px]"
                  style={{ color: '#FFFFFF', outline: 'none' }}
                  value={modelo}
                  onChange={e => setModelo(e.target.value)}
                  onBlur={() => autoSaveField({ Modelo: modelo })}
                  placeholder="MODELO"
                />
                <input
                  className="bg-transparent border border-transparent hover:border-[#2A2F45] focus:border-[#FACC15] focus:bg-[#1A1D28] rounded px-2 py-0.5 text-base font-bold transition-all flex-1 min-w-[120px]"
                  style={{ color: '#A0A5BD', outline: 'none' }}
                  value={version}
                  onChange={e => setVersion(e.target.value)}
                  onBlur={() => autoSaveField({ Version: version })}
                  placeholder="VERSIÓN"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {savedIndicator && (
              <span className="text-xs font-bold text-[#FACC15] flex items-center gap-1.5 animate-in bg-[#FACC1515] px-3 py-1 rounded-full border border-[#FACC1530]">
                <CheckCircle2 size={14} /> Guardado
              </span>
            )}

            <button onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
              style={{ color: '#A0A5BD', background: '#1E2130', border: 'none', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body - 3 Column Layout with Large Legible Typography */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Datos Técnicos / Ficha (lg:col-span-3) */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            <span className="text-xs sm:text-sm font-black uppercase tracking-widest px-1" style={{ color: '#A0A5BD' }}>
              Ficha Técnica
            </span>

            {/* 1. Año */}
            <div className="px-4 py-2.5 rounded-xl flex items-center justify-between gap-2" style={{ background: '#13161F', border: '1px solid #1F2337' }}>
              <div className="flex items-center gap-2.5 shrink-0">
                <Calendar size={20} style={{ color: '#FACC15' }} />
                <span className="text-sm sm:text-base font-bold" style={{ color: '#A0A5BD' }}>Año</span>
              </div>
              <input
                type="number"
                className="bg-transparent border border-transparent hover:border-[#2A2F45] focus:border-[#FACC15] focus:bg-[#1A1D28] rounded text-right text-lg sm:text-xl font-black w-28"
                style={{ color: '#FFFFFF', outline: 'none' }}
                value={año}
                onChange={e => setAño(e.target.value ? parseInt(e.target.value) : '')}
                onBlur={() => autoSaveField({ Año: typeof año === 'number' ? año : undefined })}
              />
            </div>

            {/* 2. Kilometraje */}
            <div className="px-4 py-2.5 rounded-xl flex items-center justify-between gap-2" style={{ background: '#13161F', border: '1px solid #1F2337' }}>
              <div className="flex items-center gap-2.5 shrink-0">
                <Gauge size={20} style={{ color: '#FDE047' }} />
                <span className="text-sm sm:text-base font-bold" style={{ color: '#A0A5BD' }}>Km</span>
              </div>
              <input
                type="number"
                className="bg-transparent border border-transparent hover:border-[#2A2F45] focus:border-[#FACC15] focus:bg-[#1A1D28] rounded text-right text-lg sm:text-xl font-black w-32"
                style={{ color: '#FFFFFF', outline: 'none' }}
                placeholder="0"
                value={km}
                onChange={e => setKm(e.target.value ? parseInt(e.target.value) : '')}
                onBlur={() => autoSaveField({ Km: typeof km === 'number' ? km : 0 })}
              />
            </div>

            {/* 3. Combustible */}
            <div className="px-4 py-2.5 rounded-xl flex items-center justify-between gap-2" style={{ background: '#13161F', border: '1px solid #1F2337' }}>
              <div className="flex items-center gap-2.5 shrink-0">
                <Fuel size={20} style={{ color: '#F59E0B' }} />
                <span className="text-sm sm:text-base font-bold" style={{ color: '#A0A5BD' }}>Combustible</span>
              </div>
              <select
                className="bg-transparent border border-transparent hover:border-[#2A2F45] focus:border-[#FACC15] focus:bg-[#1A1D28] rounded text-right text-lg sm:text-xl font-black cursor-pointer flex-1 min-w-0"
                style={{ color: '#FFFFFF', outline: 'none', textAlignLast: 'right' }}
                value={combustible}
                onChange={e => {
                  setCombustible(e.target.value)
                  autoSaveField({ Tipo_Combustible: e.target.value })
                }}>
                {COMBUSTIBLE_OPTIONS.map(opt => (
                  <option key={opt} value={opt} className="bg-[#13161F] text-[#FFFFFF]">{opt}</option>
                ))}
              </select>
            </div>

            {/* 4. Transmisión */}
            <div className="px-4 py-2.5 rounded-xl flex items-center justify-between gap-2" style={{ background: '#13161F', border: '1px solid #1F2337' }}>
              <div className="flex items-center gap-2.5 shrink-0">
                <Sliders size={20} style={{ color: '#FF6B35' }} />
                <span className="text-sm sm:text-base font-bold" style={{ color: '#A0A5BD' }}>Transmisión</span>
              </div>
              <select
                className="bg-transparent border border-transparent hover:border-[#2A2F45] focus:border-[#FACC15] focus:bg-[#1A1D28] rounded text-right text-lg sm:text-xl font-black cursor-pointer flex-1 min-w-0"
                style={{ color: '#FFFFFF', outline: 'none', textAlignLast: 'right' }}
                value={transmision}
                onChange={e => {
                  setTransmision(e.target.value)
                  autoSaveField({ Transmision: e.target.value })
                }}>
                {TRANSMISION_OPTIONS.map(opt => (
                  <option key={opt} value={opt} className="bg-[#13161F] text-[#FFFFFF]">{opt}</option>
                ))}
              </select>
            </div>

            {/* 5. Carrocería */}
            <div className="px-4 py-2.5 rounded-xl flex items-center justify-between gap-2" style={{ background: '#13161F', border: '1px solid #1F2337' }}>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-base">🏎️</span>
                <span className="text-sm sm:text-base font-bold" style={{ color: '#A0A5BD' }}>Carrocería</span>
              </div>
              <select
                className="bg-transparent border border-transparent hover:border-[#2A2F45] focus:border-[#FACC15] focus:bg-[#1A1D28] rounded text-right text-lg sm:text-xl font-black cursor-pointer flex-1 min-w-0"
                style={{ color: '#FFFFFF', outline: 'none', textAlignLast: 'right' }}
                value={carroceria}
                onChange={e => {
                  setCarroceria(e.target.value)
                  autoSaveField({ Tipo_Carroceria: e.target.value })
                }}>
                {CARROCERIA_OPTIONS.map(opt => (
                  <option key={opt} value={opt} className="bg-[#13161F] text-[#FFFFFF]">{opt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* CENTER COLUMN: Fotos del auto en el centro (lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {/* Main Featured Photo - TALLER & LARGER */}
            <div className="w-full h-80 sm:h-[375px] rounded-2xl overflow-hidden relative flex items-center justify-center shadow-lg"
              style={{ background: '#1A1D28', border: '1px solid #1F2337' }}>
              {selectedPhoto ? (
                <img
                  src={selectedPhoto}
                  alt={vehicleName(vehicle)}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-all duration-300"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              ) : (
                <div className="flex flex-col items-center gap-2" style={{ color: '#A0A5BD' }}>
                  <ImageIcon size={48} />
                  <span className="text-sm font-medium">Sin fotos registradas</span>
                </div>
              )}

              {/* Portada Badge / Button */}
              {selectedPhoto && photosList.length > 0 && (
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  {photosList[0] === selectedPhoto ? (
                    <span className="text-xs font-black px-3 py-1 rounded-full uppercase flex items-center gap-1 shadow-lg tracking-wider"
                      style={{ background: '#FACC15', color: '#000000' }}>
                      <Star size={13} fill="#000" /> Portada Principal
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        const idx = photosList.indexOf(selectedPhoto)
                        if (idx > 0) handleSetPortada(idx)
                      }}
                      className="text-xs font-black px-3 py-1.5 rounded-full uppercase flex items-center gap-1.5 shadow-lg transition-all hover:scale-105"
                      style={{ background: '#FACC15', color: '#FFFFFF', border: 'none', cursor: 'pointer' }}>
                      <Star size={13} fill="#FFFFFF" /> Usar como Portada
                    </button>
                  )}
                </div>
              )}

              {isOkm && (
                <span className="absolute top-3 left-3 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider"
                  style={{
                    background: '#FDE04720',
                    color: '#FDE047',
                    border: '1px solid #FDE04740'
                  }}>
                  ✨ 0KM
                </span>
              )}
            </div>

            {/* Mouse Drag & Drop Photo Gallery */}
            {photosList.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar justify-center">
                {photosList.map((photoUrl, idx) => {
                  const isPortada = idx === 0
                  const isSelected = selectedPhoto === photoUrl
                  const isDragging = draggedIdx === idx
                  const isDropTarget = dropTargetIdx === idx

                  return (
                    <div
                      key={idx}
                      draggable
                      onDragStart={e => handleDragStart(e, idx)}
                      onDragOver={e => handleDragOver(e, idx)}
                      onDragLeave={e => handleDragLeave(e, idx)}
                      onDrop={e => handleDrop(e, idx)}
                      onClick={() => setSelectedPhoto(photoUrl)}
                      title="Arrastrá con el mouse para reordenar"
                      className="relative flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all bg-[#1A1D28] group cursor-grab active:cursor-grabbing select-none"
                      style={{
                        width: '88px',
                        height: '62px',
                        borderColor: isDropTarget ? '#FACC15' : isSelected ? '#FACC15' : isPortada ? '#FACC15' : '#1F2337',
                        opacity: isDragging ? 0.35 : isSelected ? 1 : 0.75,
                        transform: isDropTarget ? 'scale(1.05)' : 'scale(1)'
                      }}>
                      
                      <img
                        src={photoUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover pointer-events-none"
                      />

                      {isPortada && (
                        <span className="absolute top-1 left-1 bg-[#FACC15] text-black font-black text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider shadow">
                          Portada
                        </span>
                      )}

                      {!isPortada && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSetPortada(idx)
                          }}
                          title="Hacer Portada"
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#0F1117]/80 hover:bg-[#FACC15] text-[#FACC15] hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow">
                          <Star size={10} fill="currentColor" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Precios, Descripción Comercial & Botones (lg:col-span-4) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            {/* Editable Top Price Banner */}
            <div className="p-4 rounded-2xl flex flex-col gap-3"
              style={{ background: 'linear-gradient(135deg, #FACC1515, #FDE04708)', border: '1px solid #FACC1530' }}>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: '#A0A5BD' }}>PRECIO</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-2xl sm:text-3xl font-black" style={{ color: '#FACC15' }}>$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="bg-transparent border border-transparent hover:border-[#FACC1540] focus:border-[#FACC15] focus:bg-[#1A1D28] rounded w-full text-2xl sm:text-3xl font-black"
                    style={{ color: '#FACC15', outline: 'none' }}
                    value={formatNumberDots(precioVenta)}
                    onChange={e => setPrecioVenta(parseNumberFromDots(e.target.value))}
                    onBlur={() => autoSaveField({ Precio_Venta: typeof precioVenta === 'number' ? precioVenta : 0 })}
                  />
                </div>
              </div>

              <div className={`grid ${showInfoPrice ? 'grid-cols-2' : 'grid-cols-1'} gap-3 border-t border-[#FACC1520] pt-2.5`}>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase truncate" style={{ color: '#A0A5BD' }}>Entrega Mínima</p>
                  <div className="flex items-center gap-1 mt-0.5 min-w-0">
                    <span className="text-sm font-bold shrink-0" style={{ color: '#FFFFFF' }}>$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="bg-transparent border border-transparent hover:border-[#2A2F45] focus:border-[#FACC15] focus:bg-[#1A1D28] rounded w-full text-sm sm:text-base lg:text-lg font-black min-w-0"
                      style={{ color: '#FFFFFF', outline: 'none' }}
                      placeholder={typeof precioVenta === 'number' && precioVenta > 0 ? formatNumberDots(precioVenta * 0.5) : '0'}
                      value={formatNumberDots(precioEntrega)}
                      onChange={e => setPrecioEntrega(parseNumberFromDots(e.target.value))}
                      onBlur={() => autoSaveField({ Precio_entrega: typeof precioEntrega === 'number' ? precioEntrega : undefined })}
                    />
                  </div>
                </div>

                {showInfoPrice && (
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase truncate" style={{ color: '#A0A5BD' }}>Precio Info</p>
                    <div className="flex items-center gap-1 mt-0.5 min-w-0">
                      <span className="text-sm font-bold shrink-0" style={{ color: '#FDE047' }}>$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="bg-transparent border border-transparent hover:border-[#2A2F45] focus:border-[#FDE047] focus:bg-[#1A1D28] rounded w-full text-sm sm:text-base lg:text-lg font-black min-w-0"
                        style={{ color: '#FDE047', outline: 'none' }}
                        placeholder="0"
                        value={formatNumberDots(precioInfo)}
                        onChange={e => setPrecioInfo(parseNumberFromDots(e.target.value))}
                        onBlur={() => autoSaveField({ Precio_Info: typeof precioInfo === 'number' ? precioInfo : undefined })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Editable Description Box */}
            <div className="p-4 rounded-2xl flex-1 flex flex-col gap-2"
              style={{ background: '#13161F', border: '1px solid #1F2337' }}>
              <p className="text-xs font-extrabold uppercase tracking-widest" style={{ color: '#A0A5BD' }}>
                DESCRIPCIÓN
              </p>
              <textarea
                className="w-full h-full min-h-[145px] bg-transparent border border-transparent hover:border-[#2A2F45] focus:border-[#FACC15] focus:bg-[#1A1D28] rounded p-2 text-sm leading-relaxed font-medium transition-all resize-none"
                style={{ color: '#D1D5DB', outline: 'none' }}
                placeholder="Escribe aquí la descripción del vehículo..."
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                onBlur={() => autoSaveField({ Descripcion: descripcion })}
              />
            </div>

            {/* Action Bar - 2 Clear Spacious Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1 w-full">
              <button
                onClick={handleCopyFicha}
                className="btn-primary h-12 w-full justify-center text-sm font-extrabold flex items-center gap-2 shadow-md rounded-xl transition-all min-w-0 px-3">
                {copied ? <Check size={18} style={{ color: '#000' }} /> : <Copy size={18} />}
                <span>{copied ? '¡Ficha Copiada!' : 'Copiar Ficha'}</span>
              </button>

              <button
                onClick={handleDownloadPhotos}
                disabled={downloading}
                title="Descargar el book completo de fotos en un archivo ZIP"
                className="h-12 w-full justify-center text-sm font-extrabold flex items-center gap-2 rounded-xl border transition-all shadow-md hover:bg-white/10 disabled:opacity-50 min-w-0 px-3"
                style={{ background: '#FFFFFF12', color: '#FFFFFF', borderColor: '#FFFFFF30', cursor: 'pointer' }}>
                {downloading ? <Loader2 size={18} className="animate-spin text-[#FACC15]" /> : <Download size={18} style={{ color: '#FACC15' }} />}
                <span>{downloading ? 'Guardando...' : 'Descargar Fotos'}</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>,
    document.body
  )
}
