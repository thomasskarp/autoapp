'use client'

import { useState, useMemo, useEffect, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { Vehicle } from '@/lib/supabase/types'
import { formatPrice, vehicleName, getVehicleCoverImage, formatKm, formatNumberDots, parseNumberFromDots, formatDisplayPatent } from '@/lib/utils'
import { publishToFacebookMarketplace, publishToInstagramFeed, publishToMercadoLibre, publishToWhatsAppStatus } from '@/lib/publisher'
import { PublishModal } from '@/components/stock/publish-modal'
import { VehicleDetailModal } from '@/components/stock/vehicle-detail-modal'
import {
  ExternalLink, Loader2, Sparkles, Search, Check, Trash2, RefreshCw,
  Edit3, DollarSign, X, ChevronRight, Tag,
  Link2, ShieldCheck, Settings, Key, CheckCircle2, Zap, LogOut, Power, UserCheck,
  Pause, Play, Square, AlertCircle
} from 'lucide-react'

type TabType = 'USADOS' | '0KM'
type PlatformType = 'FB' | 'IG' | 'WA' | 'MELI' | 'TIKTOK' | 'AUTOCOSMOS'

interface PlatformOption {
  id: PlatformType
  name: string
  subtitle: string
  color: string
  textColor?: string
  defaultUrl: string
}

const PLATFORMS: PlatformOption[] = [
  { id: 'MELI',       name: 'MercadoLibre',         subtitle: 'Publicación API Oficial VIS',   color: '#FFE600', textColor: '#000000', defaultUrl: 'https://www.mercadolibre.com.ar/publicaciones/listado' },
  { id: 'FB',         name: 'Facebook Marketplace', subtitle: 'Autopublicación con extensión', color: '#1877F2', defaultUrl: 'https://www.facebook.com/marketplace/you/selling' },
  { id: 'IG',         name: 'Instagram Feed',       subtitle: 'Autopublicación con extensión', color: '#E1306C', defaultUrl: 'https://www.instagram.com/' },
  { id: 'WA',         name: 'WhatsApp Estado',       subtitle: 'Copia ficha & imágenes',        color: '#25D366', defaultUrl: 'https://web.whatsapp.com/' },
  { id: 'TIKTOK',     name: 'TikTok',               subtitle: 'Creación de video catálogo',    color: '#00f2fe', textColor: '#000000', defaultUrl: 'https://www.tiktok.com/' },
  { id: 'AUTOCOSMOS', name: 'Autocosmos/DeMotores', subtitle: 'Sincronización por Feed',        color: '#FF6B35', defaultUrl: 'https://www.autocosmos.com.ar/' },
]

interface PublicationRecord {
  published: boolean
  url?: string
  publishedAt?: string
  customPrice?: number
}

interface Props { vehicles: Vehicle[] }

export function PublicationsClient({ vehicles }: Props) {
  // MercadoLibre is configured as the default first platform view!
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>('MELI')
  const [selectedTab, setSelectedTab] = useState<TabType>('USADOS')
  const [search, setSearch] = useState('')
  
  // MercadoLibre Connection & API Credentials State
  const [isMeliConnected, setIsMeliConnected] = useState<boolean>(true)
  const [meliAccountName, setMeliAccountName] = useState<string>('TS20260204113246 (Oficial MLA)')
  const [showMeliAuthModal, setShowMeliAuthModal] = useState<boolean>(false)
  const [showDevConfig, setShowDevConfig] = useState<boolean>(false)
  const [meliClientId, setMeliClientId] = useState<string>('7284100481716968')
  const [meliClientSecret, setMeliClientSecret] = useState<string>('XnP5et9mgEGb0EWoU44JV9vCQgRtkk4f')
  const [meliListingType, setMeliListingType] = useState<string>('free') // Default 'free' for common accounts test

  // Modals state
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [detailVehicle, setDetailVehicle] = useState<Vehicle | null>(null) // Ficha técnica del auto
  const [priceModalVehicle, setPriceModalVehicle] = useState<Vehicle | null>(null) // Cambiar precio de publicación específica
  const [customPriceInput, setCustomPriceInput] = useState<string>('')

  const [activeTask, setActiveTask] = useState<{ id: string; platform: string } | null>(null)
  const [taskStatusMsg, setTaskStatusMsg] = useState<string | null>(null)

  // Map of publication state keyed by `${vehicleId}_${platformId}`
  const [pubStateMap, setPubStateMap] = useState<Record<string, PublicationRecord>>({})
  const [mounted, setMounted] = useState(false)

  // MercadoLibre Live API Items & Real Status State
  const [meliLiveItems, setMeliLiveItems] = useState<any[]>([])
  const [isSyncingMeli, setIsSyncingMeli] = useState<boolean>(false)
  const [lastMeliSync, setLastMeliSync] = useState<string | null>(null)

  // Sync state from localStorage & URL OAuth callbacks on mount
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('autoapp_publications_store')
    if (saved) {
      try {
        setPubStateMap(JSON.parse(saved))
      } catch (e) {}
    }
    const savedMeli = localStorage.getItem('autoapp_meli_connected')
    if (savedMeli === 'true') {
      setIsMeliConnected(true)
    }
    const savedName = localStorage.getItem('autoapp_meli_account_name')
    if (savedName) {
      setMeliAccountName(savedName)
    }
    const savedListingType = localStorage.getItem('autoapp_meli_listing_type')
    if (savedListingType) {
      setMeliListingType(savedListingType)
    }

    // Check URL search params for OAuth returns from MercadoLibre (Clean & Tokenless)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('meli_connected') === 'true') {
        setIsMeliConnected(true)
        localStorage.setItem('autoapp_meli_connected', 'true')
        const user = urlParams.get('meli_user') || 'Concesionaria Oficial (MLA)'
        setMeliAccountName(user)
        localStorage.setItem('autoapp_meli_account_name', user)
        // Clean URL cleanly without reload
        window.history.replaceState({}, document.title, window.location.pathname)
      } else if (urlParams.get('meli_error')) {
        alert('Aviso de conexión MercadoLibre: ' + urlParams.get('meli_error'))
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }
  }, [])

  const handleListingTypeChange = (type: string) => {
    setMeliListingType(type)
    localStorage.setItem('autoapp_meli_listing_type', type)
  }

  const handleConnectMeli = () => {
    setShowMeliAuthModal(false)
    window.location.href = '/api/mercadolibre/connect'
  }

  const handleDisconnectMeli = async () => {
    if (confirm('¿Deseas desconectar la cuenta de MercadoLibre? Las publicaciones activas continuarán en MercadoLibre pero se detendrá la sincronización automática.')) {
      try {
        setTaskStatusMsg('Desconectando cuenta de MercadoLibre...')
        await fetch('/api/mercadolibre/disconnect', { method: 'POST' })
      } catch (err) {
        console.warn('Error al desconectar en backend:', err)
      } finally {
        setIsMeliConnected(false)
        setMeliAccountName('')
        localStorage.removeItem('autoapp_meli_connected')
        localStorage.removeItem('autoapp_meli_account_name')
        localStorage.removeItem('autoapp_meli_access_token')
        setTaskStatusMsg(null)
      }
    }
  }

  const handleSwitchMeliAccount = async () => {
    setShowMeliAuthModal(false)
    try {
      await fetch('/api/mercadolibre/disconnect', { method: 'POST' })
    } catch (err) {}
    localStorage.removeItem('autoapp_meli_connected')
    localStorage.removeItem('autoapp_meli_account_name')
    localStorage.removeItem('autoapp_meli_access_token')
    window.location.href = '/api/mercadolibre/connect'
  }

  const handleCreateTestUser = async () => {
    try {
      setTaskStatusMsg('Generando cuenta de prueba MercadoLibre Sandbox (Concesionaria)...')
      const res = await fetch('/api/mercadolibre/test-user', { method: 'POST' })
      const data = await res.json()
      if (data.success && data.user) {
        setIsMeliConnected(true)
        setMeliAccountName(`${data.user.nickname} (Sandbox Test)`)
        localStorage.setItem('autoapp_meli_connected', 'true')
        localStorage.setItem('autoapp_meli_access_token', data.user.access_token || 'APP_USR_TEST_DEMO')
        setShowMeliAuthModal(false)
        alert(`¡Cuenta de prueba Sandbox (${data.user.nickname}) vinculada exitosamente!`)
      }
    } catch (e: any) {
      alert('Error al generar usuario de prueba: ' + e.message)
    } finally {
      setTimeout(() => setTaskStatusMsg(null), 3000)
    }
  }

  // ── Sincronización Real con MercadoLibre API ──────────────────────────────
  const syncMercadoLibre = async (silent: boolean = false) => {
    try {
      setIsSyncingMeli(true)
      if (!silent) setTaskStatusMsg('Sincronizando estado real de publicaciones con MercadoLibre...')
      const res = await fetch('/api/mercadolibre/sync')
      const data = await res.json()
      if (data.success && Array.isArray(data.items)) {
        setMeliLiveItems(data.items)
        setLastMeliSync(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }))
        if (!silent) setTaskStatusMsg(`Sincronización exitosa: ${data.items.length} publicaciones actualizadas en vivo.`)
      }
    } catch (err: any) {
      console.warn('Error al sincronizar MercadoLibre:', err)
      if (!silent) alert('Error al sincronizar con MercadoLibre: ' + err.message)
    } finally {
      setIsSyncingMeli(false)
      if (!silent) {
        setTimeout(() => setTaskStatusMsg(null), 3000)
      }
    }
  }

  const handleUpdateMeliStatus = async (itemId: string, newStatus: 'active' | 'paused' | 'closed' | 'deleted') => {
    const actionLabel = newStatus === 'paused' ? 'pausar' : newStatus === 'active' ? 'reactivar' : newStatus === 'deleted' ? 'eliminar' : 'finalizar'
    if (!confirm(`¿Confirmás ${actionLabel} la publicación en MercadoLibre?`)) return

    try {
      setTaskStatusMsg(`Actualizando estado en MercadoLibre a "${newStatus}"...`)
      const res = await fetch('/api/mercadolibre/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, status: newStatus })
      })
      const data = await res.json()
      if (data.success) {
        setTaskStatusMsg(`Publicación actualizada con éxito.`)
        await syncMercadoLibre(true)
      } else {
        alert('Aviso de MercadoLibre: ' + (data.error || 'No se pudo actualizar el estado.'))
      }
    } catch (err: any) {
      alert('Error al comunicar con MercadoLibre: ' + err.message)
    } finally {
      setTimeout(() => setTaskStatusMsg(null), 3000)
    }
  }

  // Matching automático de vehículo de stock con ítem verídico de MercadoLibre
  const findMeliItem = (v: Vehicle): any | null => {
    if (!v || meliLiveItems.length === 0) return null
    const vMarca = (v.Marca || '').toLowerCase().trim()
    const vModelo = (v.Modelo || '').toLowerCase().trim()
    const firstMarca = vMarca.split(' ')[0]
    const firstModelo = vModelo.split(' ')[0]

    return meliLiveItems.find(item => {
      const title = (item.title || '').toLowerCase()
      const hasMarca = firstMarca && title.includes(firstMarca)
      const hasModelo = firstModelo && title.includes(firstModelo)
      return hasMarca && hasModelo
    }) || null
  }

  // Auto-sincronizar al entrar en MercadoLibre
  useEffect(() => {
    if (mounted && selectedPlatform === 'MELI' && isMeliConnected) {
      syncMercadoLibre(true)
    }
  }, [mounted, selectedPlatform, isMeliConnected])

  const updatePublicationStatus = (vehicleId: string, platformId: PlatformType, record: Partial<PublicationRecord>) => {
    setPubStateMap(prev => {
      const key = `${vehicleId}_${platformId}`
      const existing = prev[key] || { published: false }
      const next = { ...prev, [key]: { ...existing, ...record } }
      localStorage.setItem('autoapp_publications_store', JSON.stringify(next))
      return next
    })
  }

  // Current active platform object
  const activePlatformObj = useMemo(() => {
    return PLATFORMS.find(p => p.id === selectedPlatform) || PLATFORMS[0]
  }, [selectedPlatform])

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

  // Open custom price modal for a publication
  const openPriceModal = (v: Vehicle) => {
    setPriceModalVehicle(v)
    const pubKey = `${v.ID}_${selectedPlatform}`
    const existingCustomPrice = pubStateMap[pubKey]?.customPrice
    const priceToDisplay = existingCustomPrice ?? v.Precio_Venta
    setCustomPriceInput(priceToDisplay ? formatNumberDots(priceToDisplay) : '')
  }

  // Save custom publication price
  const handleSaveCustomPrice = (publishNow = false) => {
    if (!priceModalVehicle) return
    const parsed = parseNumberFromDots(customPriceInput)
    const priceValue = typeof parsed === 'number' && parsed > 0 ? parsed : undefined

    updatePublicationStatus(priceModalVehicle.ID, selectedPlatform, {
      customPrice: priceValue
    })

    const targetV = priceModalVehicle
    setPriceModalVehicle(null)

    if (publishNow) {
      handlePublishSingle(targetV, priceValue)
    }
  }

  // Clear custom price (reset to stock price)
  const handleResetToStockPrice = () => {
    if (!priceModalVehicle) return
    updatePublicationStatus(priceModalVehicle.ID, selectedPlatform, {
      customPrice: undefined
    })
    setPriceModalVehicle(null)
  }

  // Trigger publication for active platform using effective price (custom publication price or stock price)
  const handlePublishSingle = async (v: Vehicle, overridePrice?: number) => {
    const pubKey = `${v.ID}_${selectedPlatform}`
    const customPrice = overridePrice ?? pubStateMap[pubKey]?.customPrice
    const effectivePrice = (customPrice && customPrice > 0) ? customPrice : (v.Precio_Venta || 0)

    // Cloned vehicle payload with custom publication price
    const vForPublish: Vehicle = {
      ...v,
      Precio_Venta: effectivePrice
    }

    if (selectedPlatform === 'FB') {
      try {
        setActiveTask({ id: v.ID, platform: 'FB' })
        setTaskStatusMsg(`Iniciando publicación en Facebook Marketplace con precio ${formatPrice(effectivePrice)}...`)
        await publishToFacebookMarketplace(vForPublish, (msg) => setTaskStatusMsg(msg))

        updatePublicationStatus(v.ID, 'FB', {
          published: true,
          url: 'https://www.facebook.com/marketplace/you/selling',
          publishedAt: new Date().toISOString()
        })
      } catch (err: any) {
        alert('Error al publicar en Facebook: ' + err.message)
      } finally {
        setTimeout(() => {
          setActiveTask(null)
          setTaskStatusMsg(null)
        }, 3000)
      }
    } else if (selectedPlatform === 'IG') {
      try {
        setActiveTask({ id: v.ID, platform: 'IG' })
        setTaskStatusMsg(`Iniciando publicación en Instagram Feed con precio ${formatPrice(effectivePrice)}...`)
        await publishToInstagramFeed(vForPublish, (msg) => setTaskStatusMsg(msg))

        updatePublicationStatus(v.ID, 'IG', {
          published: true,
          url: 'https://www.instagram.com/',
          publishedAt: new Date().toISOString()
        })
      } catch (err: any) {
        alert('Error al publicar en Instagram: ' + err.message)
      } finally {
        setTimeout(() => {
          setActiveTask(null)
          setTaskStatusMsg(null)
        }, 3000)
      }
    } else if (selectedPlatform === 'WA') {
      try {
        setActiveTask({ id: v.ID, platform: 'WA' })
        setTaskStatusMsg(`Procesando foto de portada y ficha para WhatsApp...`)
        await publishToWhatsAppStatus(vForPublish, (msg) => setTaskStatusMsg(msg))

        updatePublicationStatus(v.ID, 'WA', {
          published: true,
          url: 'https://web.whatsapp.com/',
          publishedAt: new Date().toISOString()
        })
      } catch (err: any) {
        alert('Error al procesar para WhatsApp: ' + err.message)
      } finally {
        setTimeout(() => {
          setActiveTask(null)
          setTaskStatusMsg(null)
        }, 3000)
      }
    } else if (selectedPlatform === 'MELI') {
      try {
        setActiveTask({ id: v.ID, platform: 'MELI' })
        setTaskStatusMsg(`Publicando automáticamente en MercadoLibre VIS API...`)
        const res = await publishToMercadoLibre(vForPublish, (msg) => setTaskStatusMsg(msg), meliListingType)

        updatePublicationStatus(v.ID, 'MELI', {
          published: true,
          url: res.url,
          publishedAt: new Date().toISOString()
        })
      } catch (err: any) {
        const errorMsg = err.message || ''
        if (errorMsg.includes('ya consumió tu única publicación gratuita') || errorMsg.includes('Listing type free is not available')) {
          if (confirm('MercadoLibre requiere tipo de publicación "Oro Premium" (recomendado para Sandbox/Demo) o "Plata" porque ya utilizaste tu publicación gratuita.\n\n¿Deseas cambiar a "Oro Premium" y reintentar ahora mismo?')) {
            handleListingTypeChange('gold_premium')
            try {
              setTaskStatusMsg('Reintentando publicación con Oro Premium...')
              const retryRes = await publishToMercadoLibre(vForPublish, (msg) => setTaskStatusMsg(msg), 'gold_premium')
              updatePublicationStatus(v.ID, 'MELI', {
                published: true,
                url: retryRes.url,
                publishedAt: new Date().toISOString()
              })
              return
            } catch (retryErr: any) {
              alert('Error al reintentar: ' + retryErr.message)
            }
          } else {
            setShowMeliAuthModal(true)
          }
        } else {
          // Si el error es un rechazo de API por cuenta particular o cuota
          alert(`Aviso de MercadoLibre:\n\n${errorMsg}\n\nNota: En cuentas particulares MercadoLibre permite únicamente 1 publicación de autos gratuita. Las siguientes requieren pagar el costo de publicación oficial para activarse.`)
        }
      } finally {
        setTimeout(() => {
          setActiveTask(null)
          setTaskStatusMsg(null)
        }, 3000)
      }
    } else {
      updatePublicationStatus(v.ID, selectedPlatform, {
        published: true,
        url: activePlatformObj.defaultUrl,
        publishedAt: new Date().toISOString()
      })
    }
  }

  // Delete publication handler: Opens direct publication URL to delete & resets status to NO PUBLICADO (Rojo)
  const handleDeletePublication = (v: Vehicle) => {
    const key = `${v.ID}_${selectedPlatform}`
    const record = pubStateMap[key]
    const targetUrl = record?.url || activePlatformObj.defaultUrl

    if (confirm(`Se abrirá la publicación en ${activePlatformObj.name} para eliminarla. ¿Continuar?`)) {
      window.open(targetUrl, '_blank')
      updatePublicationStatus(v.ID, selectedPlatform, { published: false })
    }
  }
  const groupedVehicles = useMemo(() => {
    const groups: Record<string, Vehicle[]> = {}
    filteredVehicles.forEach(v => {
      const marca = (v.Marca || 'OTRA').toUpperCase()
      if (!groups[marca]) groups[marca] = []
      groups[marca].push(v)
    })
    return groups
  }, [filteredVehicles])

  const sortedMarcas = Object.keys(groupedVehicles).sort()

  return (
    <div className="flex flex-col gap-6">
      
      {/* Modal for vehicle publishing details */}
      <PublishModal vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)} />

      {/* Modal for full vehicle spec sheet (Ficha del auto) */}
      <VehicleDetailModal vehicle={detailVehicle} onClose={() => setDetailVehicle(null)} />

      {/* Modal for editing custom publication price */}
      {mounted && priceModalVehicle && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
          onClick={() => setPriceModalVehicle(null)}>
          <div className="card w-full max-w-md p-6 flex flex-col gap-5 shadow-2xl relative overflow-hidden"
            style={{ background: '#0F1117', border: `1px solid ${activePlatformObj.color}80` }}
            onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
                  style={{ background: `${activePlatformObj.color}25`, color: activePlatformObj.color }}>
                  <Tag size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Cambiar Precio de Publicación</h3>
                  <p className="text-xs font-semibold text-[#8B8FA8]">Plataforma: {activePlatformObj.name}</p>
                </div>
              </div>
              <button onClick={() => setPriceModalVehicle(null)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#1E2130] text-[#8B8FA8]">
                <X size={18} />
              </button>
            </div>

            {/* Vehicle Box */}
            <div className="p-3.5 rounded-xl bg-[#13161F] border border-[#1F2337] flex items-center gap-3">
              <div className="w-14 h-10 rounded-lg overflow-hidden bg-[#1A1D28] flex-shrink-0 flex items-center justify-center">
                {getVehicleCoverImage(priceModalVehicle) ? (
                  <img src={getVehicleCoverImage(priceModalVehicle)!} className="w-full h-full object-cover" alt="" />
                ) : (
                  <span className="text-[9px] font-bold text-[#555870]">SIN FOTO</span>
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-white uppercase">{vehicleName(priceModalVehicle)}</p>
                {formatDisplayPatent(priceModalVehicle.Patente) && (
                  <p className="text-xs font-mono font-bold text-[#8B8FA8]">{formatDisplayPatent(priceModalVehicle.Patente)}</p>
                )}
              </div>
            </div>

            {/* Price Inputs */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#8B8FA8]">
                <span>Precio base en Stock:</span>
                <span className="text-white font-extrabold">{formatPrice(priceModalVehicle.Precio_Venta)}</span>
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#FACC15] block mb-1.5">
                  Precio solo para esta publicación (${activePlatformObj.name}):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#FACC15]">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="input pl-8 text-base font-black text-[#FACC15] bg-[#1A1D28] border-[#3A3F58] focus:border-[#FACC15]"
                    placeholder={formatNumberDots(priceModalVehicle.Precio_Venta)}
                    value={customPriceInput}
                    onChange={e => setCustomPriceInput(formatNumberDots(e.target.value))}
                  />
                </div>
                <p className="text-[11px] font-medium text-[#7E849B] mt-1.5">
                  💡 Este precio se usará <b>únicamente</b> para publicar en {activePlatformObj.name} y <b>NO</b> alterará el precio original del vehículo en Stock.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#1F2337]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSaveCustomPrice(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-extrabold text-black bg-[#FACC15] hover:bg-[#fde047] transition-all">
                  Guardar Precio Especial
                </button>
                <button
                  onClick={() => handleSaveCustomPrice(true)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-extrabold text-white transition-all flex items-center justify-center gap-1.5"
                  style={{ background: activePlatformObj.color }}>
                  <Sparkles size={14} />
                  <span>Guardar y Publicar</span>
                </button>
              </div>

              {pubStateMap[`${priceModalVehicle.ID}_${selectedPlatform}`]?.customPrice && (
                <button
                  onClick={handleResetToStockPrice}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#EF4444] bg-[#EF444415] hover:bg-[#EF444425] border border-[#EF444430] transition-all">
                  Restablecer a Precio de Stock ({formatPrice(priceModalVehicle.Precio_Venta)})
                </button>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Modal for MercadoLibre Account Connection & OAuth Setup - Centered in Viewport */}
      {mounted && showMeliAuthModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
          onClick={() => setShowMeliAuthModal(false)}>
          <div className="card w-full max-w-lg p-6 sm:p-7 flex flex-col gap-6 shadow-2xl relative overflow-hidden my-auto"
            style={{ background: '#0F1117', border: '1px solid #FFE600A0', boxShadow: '0 0 50px rgba(255, 230, 0, 0.25)' }}
            onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-[#000000] shadow-lg"
                  style={{ background: '#FFE600', boxShadow: '0 0 20px rgba(255, 230, 0, 0.5)' }}>
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    {isMeliConnected ? 'Gestionar MercadoLibre' : 'Conectar Cuenta MercadoLibre'}
                  </h3>
                </div>
              </div>
              <button onClick={() => setShowMeliAuthModal(false)} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#1E2130] text-[#8B8FA8] transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* If Connected: Show Account Details, Listing Type Selector & Quick Actions */}
            {isMeliConnected ? (
              <div className="flex flex-col gap-4">
                {/* Connected Account Card */}
                <div className="p-3.5 rounded-2xl bg-[#13161F] border border-[#22C55E40] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-pulse" />
                    <span className="text-xs font-extrabold text-white">
                      {meliAccountName || 'Cuenta Conectada'}
                    </span>
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#22C55E20] text-[#22C55E] border border-[#22C55E40]">
                    OFICIAL MLA
                  </span>
                </div>

                {/* Listing Type / Tier Selector */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#8B8FA8] flex items-center gap-1.5">
                      <Tag size={14} className="text-[#FFE600]" />
                      <span>Tipo de Exposición en MercadoLibre:</span>
                    </label>
                    <span className="text-[11px] font-mono text-[#FFE600] font-extrabold">{meliListingType}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'gold_premium', name: 'Oro Premium', badge: 'Recomendado Demo / Sandbox', note: 'Máxima visibilidad' },
                      { id: 'silver', name: 'Plata', badge: 'Económico', note: 'Buena exposición' },
                      { id: 'gold', name: 'Oro', badge: 'Media', note: 'Exposición intermedia' },
                      { id: 'free', name: 'Gratis', badge: '1 por cuenta', note: 'Solo si tenés cupo' },
                    ].map(tier => {
                      const isSelected = meliListingType === tier.id
                      return (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => handleListingTypeChange(tier.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'bg-[#FFE60015] border-[#FFE600] text-white shadow-lg'
                              : 'bg-[#13161F] border-[#1F2337] text-[#8B8FA8] hover:border-[#2A2F45] hover:text-white'
                          }`}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-black">{tier.name}</span>
                            {isSelected && <Check size={14} className="text-[#FFE600]" />}
                          </div>
                          <span className={`text-[10px] font-bold block ${isSelected ? 'text-[#FFE600]' : 'text-[#7E849B]'}`}>
                            {tier.badge}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Account Actions: Switch & Disconnect */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[#1F2337]">
                  <button
                    type="button"
                    onClick={handleSwitchMeliAccount}
                    className="w-full px-5 py-3 rounded-xl text-xs sm:text-sm font-extrabold text-black bg-[#FFE600] hover:bg-[#fde047] transition-all flex items-center justify-center gap-2 shadow-lg">
                    <RefreshCw size={16} />
                    <span>Cambiar de Cuenta de MercadoLibre</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleCreateTestUser}
                      className="px-3 py-2.5 rounded-xl text-xs font-extrabold text-white bg-[#1A1D28] hover:bg-[#252838] border border-[#2A2F45] transition-all flex items-center justify-center gap-1.5">
                      <Sparkles size={14} className="text-[#FFE600]" />
                      <span>Nueva Sandbox</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDisconnectMeli}
                      className="px-3 py-2.5 rounded-xl text-xs font-extrabold text-[#EF4444] bg-[#EF444415] hover:bg-[#EF444425] border border-[#EF444430] transition-all flex items-center justify-center gap-1.5">
                      <LogOut size={14} />
                      <span>Desconectar</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* If Disconnected: Show Connect & Benefits */
              <div className="flex flex-col gap-4">
                <div className="p-4.5 rounded-2xl bg-[#13161F] border border-[#2A2F45] flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#FFE600] flex items-center gap-1.5 uppercase tracking-wider">
                      <ShieldCheck size={16} /> Conexión Directa y Segura
                    </span>
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#FFE60020] text-[#FFE600] border border-[#FFE60040]">
                      OFICIAL MLA
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-[#D1D5DB] leading-relaxed">
                    Hacé clic en el botón de abajo para iniciar sesión en tu cuenta de MercadoLibre y autorizar a <b>AutoApp</b>.
                  </p>
                </div>

                {/* Main Action Buttons */}
                <div className="flex flex-col gap-3 pt-2 border-t border-[#1F2337]">
                  <button
                    onClick={handleConnectMeli}
                    className="w-full px-6 py-4 rounded-2xl text-sm sm:text-base font-black text-black bg-[#FFE600] hover:bg-[#fde047] transition-all flex items-center justify-center gap-2.5 shadow-2xl hover:scale-[1.02]">
                    <Link2 size={20} />
                    <span>Iniciar Sesión y Conectar MercadoLibre</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCreateTestUser}
                    className="w-full px-5 py-3 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-[#1A1D28] hover:bg-[#252838] border border-[#FFE60050] transition-all flex items-center justify-center gap-2">
                    <Sparkles size={16} className="text-[#FFE600]" />
                    <span>Generar y Vincular Cuenta Sandbox de Prueba</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>,
        document.body
      )}

      {/* Task status indicator floating pill */}
      {taskStatusMsg && (
        <div className="px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 animate-pulse shadow-lg self-start"
          style={{ background: 'rgba(250, 204, 21, 0.15)', color: '#FACC15', border: '1px solid rgba(250, 204, 21, 0.4)', backdropFilter: 'blur(12px)' }}>
          <Sparkles size={14} />
          <span>{taskStatusMsg}</span>
        </div>
      )}



      {/* Luminous & Translucent Platform Selector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLATFORMS.map((p) => {
          const isSelected = selectedPlatform === p.id

          return (
            <div
              key={p.id}
              onClick={() => setSelectedPlatform(p.id)}
              className="p-3.5 sm:p-4 rounded-2xl flex items-center justify-between transition-all duration-300 cursor-pointer select-none group relative overflow-hidden"
              style={{
                background: isSelected ? 'rgba(255, 255, 255, 0.05)' : '#13161F',
                backdropFilter: isSelected ? 'blur(16px)' : 'none',
                border: isSelected ? `1px solid ${p.color}` : '1px solid #1F2337',
                boxShadow: isSelected
                  ? `0 0 30px ${p.color}45, inset 0 0 20px ${p.color}20`
                  : 'none',
                opacity: isSelected ? 1 : 0.7
              }}>

              {/* Luminous glow bar on left */}
              {isSelected && (
                <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-r-full" style={{ background: p.color, boxShadow: `0 0 12px ${p.color}` }} />
              )}

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-bold flex-shrink-0 transition-transform group-hover:scale-105"
                  style={{
                    background: p.color,
                    boxShadow: isSelected ? `0 0 20px ${p.color}70` : 'none'
                  }}>
                  <ExternalLink size={18} style={{ color: p.textColor ?? '#FFFFFF' }} />
                </div>
                <span className="text-sm sm:text-base font-extrabold" style={{ color: '#FFFFFF' }}>{p.name}</span>
              </div>

              {/* Connection Indicator & Link Button for MercadoLibre */}
              {p.id === 'MELI' && (
                <div className="flex items-center gap-1.5 ml-2">
                  {isMeliConnected ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowMeliAuthModal(true)
                      }}
                      title="Cuenta MercadoLibre conectada. Haz clic para gestionar la conexión."
                      className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-[#22C55E20] text-[#22C55E] border border-[#22C55E40] hover:bg-[#22C55E30] transition-all flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                      <span>Conectado</span>
                      <ChevronRight size={12} />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowMeliAuthModal(true)
                      }}
                      title="Haz clic para vincular tu cuenta de MercadoLibre"
                      className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-[#FFE600] text-black hover:bg-[#fde047] transition-all flex items-center gap-1 shadow-md hover:scale-105">
                      <Link2 size={12} />
                      <span>Vincular</span>
                      <ChevronRight size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Folder Navigation Tabs & Search (Usados vs 0KM) + MercadoLibre Live Sync */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center flex-wrap gap-3">
          <div className="flex items-center gap-1 bg-[#0F1117] p-1.5 rounded-xl border border-[#1F2337]">
            <button
              onClick={() => setSelectedTab('USADOS')}
              className="px-5 py-2.5 rounded-lg text-xs sm:text-sm font-extrabold transition-all"
              style={{
                background: selectedTab === 'USADOS' ? '#FACC15' : 'transparent',
                color: selectedTab === 'USADOS' ? '#000000' : '#A0A5BD',
                border: 'none', cursor: 'pointer'
              }}>
              Usados ({countUsados})
            </button>
            <button
              onClick={() => setSelectedTab('0KM')}
              className="px-5 py-2.5 rounded-lg text-xs sm:text-sm font-extrabold transition-all"
              style={{
                background: selectedTab === '0KM' ? '#FDE047' : 'transparent',
                color: selectedTab === '0KM' ? '#000000' : '#A0A5BD',
                border: 'none', cursor: 'pointer'
              }}>
              0km ({countOkm})
            </button>
          </div>

          {selectedPlatform === 'MELI' && isMeliConnected && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => syncMercadoLibre(false)}
                disabled={isSyncingMeli}
                title="Consultar y sincronizar publicaciones reales en vivo desde MercadoLibre"
                className="px-3.5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-[#1A1D28] hover:bg-[#252838] border border-[#FFE60050] transition-all flex items-center gap-2 shadow-md hover:scale-105">
                <RefreshCw size={14} className={`text-[#FFE600] ${isSyncingMeli ? 'animate-spin' : ''}`} />
                <span>{isSyncingMeli ? 'Sincronizando...' : 'Sincronizar MeLi'}</span>
                {lastMeliSync && (
                  <span className="text-[10px] font-mono text-[#8B8FA8]">({lastMeliSync})</span>
                )}
              </button>
              <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-[#FFE60020] text-[#FFE600] border border-[#FFE60040]">
                {meliLiveItems.length} activas en MeLi
              </span>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#555870' }} />
          <input
            className="input pl-9 text-xs sm:text-sm font-medium"
            placeholder="Buscar por marca, modelo, patente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Publications Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #1F2337', background: '#0F1117' }}>
                {(selectedPlatform === 'MELI' 
                  ? ['Vehículo', 'Precio', 'Estado MercadoLibre', 'Acciones'] 
                  : ['Vehículo', 'Precio', 'Acciones']
                ).map(col => (
                  <th key={col} className="text-left px-5 py-3.5 text-xs font-extrabold uppercase tracking-wider"
                    style={{ color: '#A0A5BD' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-12 text-center text-sm font-medium" style={{ color: '#A0A5BD' }}>
                    No hay vehículos disponibles en la categoría {selectedTab === 'USADOS' ? 'Usados' : '0km'}
                  </td>
                </tr>
              ) : sortedMarcas.map(marca => (
                <Fragment key={marca}>
                  <tr className="bg-[#1A1D28]">
                    <td colSpan={3} className="px-5 py-2.5 border-y border-[#2A2F45]">
                      <span className="text-[11px] font-black text-[#A0A5BD] tracking-widest uppercase">{marca}</span>
                    </td>
                  </tr>
                  {groupedVehicles[marca].map(v => {
                    const isLoading = activeTask?.id === v.ID
                    const coverImg = getVehicleCoverImage(v)
                    const pubKey = `${v.ID}_${selectedPlatform}`
                    const customPrice = pubStateMap[pubKey]?.customPrice
    
                    return (
                      <tr key={v.ID} className="table-row">
                        {/* Vehicle: Click opens VehicleDetailModal (Ficha del auto) */}
                        <td className="px-5 py-3.5">
                          <div
                            onClick={() => setDetailVehicle(v)}
                            title="Hacé clic para ver la ficha técnica completa del auto"
                            className="flex items-center gap-3 cursor-pointer group rounded-xl p-1.5 -m-1.5 transition-all hover:bg-[#FFFFFF0F]">
                            <div className="w-12 h-9 rounded-lg overflow-hidden bg-[#1A1D28] flex-shrink-0 flex items-center justify-center border border-[#2A2F45] group-hover:border-[#FACC1580] transition-colors relative">
                              {coverImg ? (
                                <img
                                  src={coverImg}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                  alt=""
                                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                                />
                              ) : (
                                <span className="text-[9px] font-bold text-[#555870]">SIN FOTO</span>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold uppercase flex items-center gap-1 group-hover:text-[#FACC15] transition-colors" style={{ color: '#FFFFFF' }}>
                                {vehicleName(v)}
                                <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#FACC15]" />
                              </p>
                              {formatDisplayPatent(v.Patente) && (
                                <p className="text-xs font-mono font-bold" style={{ color: '#A0A5BD' }}>{formatDisplayPatent(v.Patente)}</p>
                              )}
                            </div>
                          </div>
                        </td>
    
                        {/* Price: Shows Custom Publication Price or Stock Price, click opens custom price editor */}
                        <td className="px-5 py-3.5">
                          {customPrice && customPrice > 0 ? (
                            <div
                              onClick={() => openPriceModal(v)}
                              title="Precio especial para esta publicación. Hacé clic para modificar."
                              className="cursor-pointer group flex flex-col w-fit">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm sm:text-base font-black text-[#FACC15]">
                                  {formatPrice(customPrice)}
                                </span>
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#FACC1520] text-[#FACC15] border border-[#FACC1540] uppercase">
                                  {selectedPlatform}
                                </span>
                                <Edit3 size={13} className="text-[#8B8FA8] group-hover:text-[#FACC15] transition-colors" />
                              </div>
                              <span className="text-[11px] font-medium text-[#7E849B] line-through">
                                Stock: {formatPrice(v.Precio_Venta)}
                              </span>
                            </div>
                          ) : (
                            <div
                              onClick={() => openPriceModal(v)}
                              title="Precio de Stock. Hacé clic para personalizar el precio de esta publicación específica."
                              className="cursor-pointer group flex items-center gap-1.5 w-fit">
                              <span className="text-sm sm:text-base font-black text-[#FACC15] group-hover:underline">
                                {formatPrice(v.Precio_Venta)}
                              </span>
                              <Edit3 size={13} className="text-[#8B8FA8] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </td>
    
                        {/* Columna Estado Real en MercadoLibre */}
                        {selectedPlatform === 'MELI' && (
                          <td className="px-5 py-3.5">
                            {(() => {
                              const meliItem = findMeliItem(v)
                              if (!meliItem) {
                                return (
                                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#1F2337] text-[#8B8FA8] border border-[#2A2F45]">
                                    No publicado
                                  </span>
                                )
                              }

                              if (meliItem.status === 'active') {
                                return (
                                  <div className="flex flex-col gap-1">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-[#22C55E15] text-[#22C55E] border border-[#22C55E30] w-fit shadow-sm">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                                      Activa
                                    </span>
                                    <span className="text-[10px] font-mono text-[#8B8FA8]">{meliItem.id}</span>
                                  </div>
                                )
                              }

                              if (meliItem.status === 'paused') {
                                return (
                                  <div className="flex flex-col gap-1">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-[#EAB30815] text-[#EAB308] border border-[#EAB30830] w-fit shadow-sm">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#EAB308]" />
                                      Pausada
                                    </span>
                                    <span className="text-[10px] font-mono text-[#8B8FA8]">{meliItem.id}</span>
                                  </div>
                                )
                              }

                              if (meliItem.status === 'payment_required') {
                                return (
                                  <div className="flex flex-col gap-1">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-[#3B82F615] text-[#3B82F6] border border-[#3B82F630] w-fit shadow-sm">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
                                      Pendiente Pago
                                    </span>
                                    <span className="text-[10px] font-mono text-[#8B8FA8]">{meliItem.id}</span>
                                  </div>
                                )
                              }

                              if (meliItem.status === 'closed') {
                                return (
                                  <div className="flex flex-col gap-1">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-[#6B728015] text-[#9CA3AF] border border-[#6B728030] w-fit">
                                      Finalizada
                                    </span>
                                    <span className="text-[10px] font-mono text-[#8B8FA8]">{meliItem.id}</span>
                                  </div>
                                )
                              }

                              return (
                                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#1F2337] text-[#8B8FA8]">
                                  {meliItem.status}
                                </span>
                              )
                            })()}
                          </td>
                        )}
    
                        {/* Actions: Dynamic Publicar & 1-Click Controls */}
                        <td className="px-5 py-3.5">
                          {selectedPlatform === 'MELI' ? (
                            (() => {
                              const meliItem = findMeliItem(v)

                              if (meliItem) {
                                return (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {/* Link oficial para ver publicación */}
                                    <a
                                      href={meliItem.permalink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Abrir publicación en MercadoLibre"
                                      className="p-2 rounded-xl bg-[#FFE60015] text-[#FFE600] border border-[#FFE60030] hover:bg-[#FFE60025] transition-all flex items-center justify-center">
                                      <ExternalLink size={15} />
                                    </a>

                                    {/* Botones de Pausar / Reactivar */}
                                    {meliItem.status === 'active' && (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateMeliStatus(meliItem.id, 'paused')}
                                        title="Pausar publicación en MercadoLibre (no consume visitas y se oculta de búsquedas)"
                                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#EAB308] bg-[#EAB30815] border border-[#EAB30830] hover:bg-[#EAB30825] transition-all flex items-center gap-1">
                                        <Pause size={13} />
                                        <span>Pausar</span>
                                      </button>
                                    )}

                                    {meliItem.status === 'paused' && (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateMeliStatus(meliItem.id, 'active')}
                                        title="Reactivar publicación en MercadoLibre (volverá a ser visible al público)"
                                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#22C55E] bg-[#22C55E15] border border-[#22C55E30] hover:bg-[#22C55E25] transition-all flex items-center gap-1">
                                        <Play size={13} />
                                        <span>Reactivar</span>
                                      </button>
                                    )}

                                    {/* Pendiente de Pago */}
                                    {meliItem.status === 'payment_required' && (
                                      <a
                                        href={meliItem.permalink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Completar activación o pago en MercadoLibre"
                                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#3B82F6] bg-[#3B82F615] border border-[#3B82F630] hover:bg-[#3B82F625] transition-all flex items-center gap-1">
                                        <ExternalLink size={13} />
                                        <span>Activar</span>
                                      </a>
                                    )}

                                    {/* Descartar / Eliminar */}
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateMeliStatus(meliItem.id, 'deleted')}
                                      title="Eliminar publicación de MercadoLibre"
                                      className="p-2 rounded-xl text-[#EF4444] bg-[#EF444410] border border-[#EF444425] hover:bg-[#EF444420] transition-all flex items-center justify-center">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                )
                              }

                              // Si no está publicado aún en MeLi
                              return (
                                <button
                                  type="button"
                                  onClick={() => handlePublishSingle(v)}
                                  disabled={activeTask !== null}
                                  className="text-xs sm:text-sm font-extrabold px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-2 min-w-[110px] justify-center hover:scale-105"
                                  style={{
                                    background: activePlatformObj.color,
                                    color: activePlatformObj.textColor ?? '#FFFFFF',
                                    border: 'none',
                                    cursor: 'pointer'
                                  }}>
                                  {isLoading ? (
                                    <Loader2 size={15} className="animate-spin" />
                                  ) : (
                                    <Sparkles size={15} />
                                  )}
                                  <span>{isLoading ? 'Publicando...' : 'Publicar'}</span>
                                </button>
                              )
                            })()
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handlePublishSingle(v)}
                                disabled={activeTask !== null}
                                className="text-xs sm:text-sm font-extrabold px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-2 min-w-[110px] justify-center hover:scale-105"
                                style={{
                                  background: activePlatformObj.color,
                                  color: activePlatformObj.textColor ?? '#FFFFFF',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}>
                                {isLoading ? (
                                  <Loader2 size={15} className="animate-spin" />
                                ) : (
                                  <Sparkles size={15} />
                                )}
                                <span>{isLoading ? 'Publicando...' : 'Publicar'}</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
