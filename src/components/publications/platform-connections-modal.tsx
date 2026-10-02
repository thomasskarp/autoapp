'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Check, ExternalLink, RefreshCw, Edit2, ShieldCheck,
  CheckCircle2, AlertCircle, ShoppingBag,
  Music2, MessageSquare, Store, Share2, Globe, Cpu,
  Info, ChevronDown, ChevronUp, CheckCircle, Zap
} from 'lucide-react'

function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}

function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  )
}

export interface ApiPlatform {
  id: 'mercadolibre' | 'facebook_page' | 'instagram' | 'tiktok'
  name: string
  subtitle: string
  techBadge: string
  accountName: string
  connected: boolean
  loading: boolean
  brandColor: string
  iconType: 'meli' | 'facebook' | 'instagram' | 'tiktok'
  connectUrl: string
  disconnectUrl: string
  details?: string
  profileUrl?: string
}

export interface ExtensionPlatform {
  id: 'fb_marketplace' | 'whatsapp' | 'tiktok_browser'
  name: string
  subtitle: string
  badge: string
  accountNotice: string
  brandColor: string
  iconType: 'marketplace' | 'whatsapp' | 'tiktok'
  activeUrl?: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function PlatformConnectionsModal({ isOpen, onClose }: Props) {
  const [mounted, setMounted] = useState(false)
  const [showFaq, setShowFaq] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // Estado de las APIs oficiales
  const [apiPlatforms, setApiPlatforms] = useState<ApiPlatform[]>([
    {
      id: 'mercadolibre',
      name: 'MercadoLibre',
      subtitle: 'API Oficial VIS Automotriz (OAuth 2.0)',
      techBadge: 'API Oficial',
      accountName: 'Consultando...',
      connected: false,
      loading: true,
      brandColor: '#FFE600',
      iconType: 'meli',
      connectUrl: '/api/mercadolibre/connect',
      disconnectUrl: '/api/mercadolibre/disconnect',
      details: 'Publica vehículos con atributos automotrices y sincroniza preguntas.'
    },
    {
      id: 'facebook_page',
      name: 'Facebook Fan Page',
      subtitle: 'Meta Graph API Comercial (Feed & Reels)',
      techBadge: 'API Oficial',
      accountName: 'Consultando...',
      connected: false,
      loading: true,
      brandColor: '#1877F2',
      iconType: 'facebook',
      connectUrl: '/api/facebook/connect',
      disconnectUrl: '/api/facebook/disconnect',
      details: 'Solo publica en Páginas de Facebook administradas (no en perfiles personales).'
    },
    {
      id: 'instagram',
      name: 'Instagram Comercial',
      subtitle: 'Meta Content Publishing API',
      techBadge: 'API Oficial',
      accountName: 'Consultando...',
      connected: false,
      loading: true,
      brandColor: '#E1306C',
      iconType: 'instagram',
      connectUrl: '/api/facebook/connect',
      disconnectUrl: '/api/instagram/disconnect',
      details: 'Requiere cuenta Profesional (Business o Creator) vinculada a tu Fan Page.'
    },
    {
      id: 'tiktok',
      name: 'TikTok Developers',
      subtitle: 'Content Posting API Oficial',
      techBadge: 'En Integración',
      accountName: 'No vinculado (Próxima App Oficial)',
      connected: false,
      loading: true,
      brandColor: '#00F2FE',
      iconType: 'tiktok',
      connectUrl: '/api/tiktok/connect',
      disconnectUrl: '/api/tiktok/disconnect',
      details: 'Subida automática de videos directamente a tu perfil vía TikTok Developers.'
    }
  ])

  // Estado de las plataformas por extensión
  const extensionPlatforms: ExtensionPlatform[] = [
    {
      id: 'fb_marketplace',
      name: 'Facebook Marketplace',
      subtitle: 'Vehículos en Marketplace Personal',
      badge: 'Extensión AutoCyborg',
      accountNotice: 'Publica en la cuenta de Facebook con sesión abierta en Chrome',
      brandColor: '#1877F2',
      iconType: 'marketplace',
      activeUrl: 'https://www.facebook.com/marketplace/create/vehicle'
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business / Web',
      subtitle: 'Estados, Catálogos y Chats Directos',
      badge: 'Extensión AutoCyborg',
      accountNotice: 'Envía desde la sesión activa de WhatsApp Web en este equipo',
      brandColor: '#25D366',
      iconType: 'whatsapp',
      activeUrl: 'https://web.whatsapp.com'
    }
  ]

  const loadRealStatuses = async () => {
    // 1. MercadoLibre Status
    fetch('/api/mercadolibre/status')
      .then(res => res.json())
      .then(data => {
        setApiPlatforms(prev => prev.map(p => {
          if (p.id === 'mercadolibre') {
            const isConn = !!data.connected
            const name = isConn ? (data.nickname ? `${data.nickname} (MLA ${data.userId || ''})` : 'Concesionaria Oficial MLA') : 'No conectado'
            return {
              ...p,
              connected: isConn,
              loading: false,
              accountName: name,
              profileUrl: data.permalink || undefined
            }
          }
          return p
        }))
      })
      .catch(() => {
        setApiPlatforms(prev => prev.map(p => p.id === 'mercadolibre' ? { ...p, loading: false } : p))
      })

    // 2. Facebook Status
    fetch('/api/facebook/status')
      .then(res => res.json())
      .then(data => {
        setApiPlatforms(prev => prev.map(p => {
          if (p.id === 'facebook_page') {
            const isConn = !!data.connected
            return {
              ...p,
              connected: isConn,
              loading: false,
              accountName: isConn ? `${data.pageName || 'Fan Page Oficial'} (ID: ${data.pageId || ''})` : 'No conectado',
              profileUrl: data.pageLink || undefined
            }
          }
          return p
        }))
      })
      .catch(() => {
        setApiPlatforms(prev => prev.map(p => p.id === 'facebook_page' ? { ...p, loading: false } : p))
      })

    // 3. Instagram Status
    fetch('/api/instagram/status')
      .then(res => res.json())
      .then(data => {
        setApiPlatforms(prev => prev.map(p => {
          if (p.id === 'instagram') {
            const isConn = !!data.connected
            return {
              ...p,
              connected: isConn,
              loading: false,
              accountName: isConn ? `@${data.username || 'okmmotors'} (${data.name || 'Perfil Profesional'})` : 'No conectado',
              profileUrl: data.profileUrl || undefined
            }
          }
          return p
        }))
      })
      .catch(() => {
        setApiPlatforms(prev => prev.map(p => p.id === 'instagram' ? { ...p, loading: false } : p))
      })

    // 4. TikTok Developers Status
    fetch('/api/tiktok/status')
      .then(res => res.json())
      .then(data => {
        setApiPlatforms(prev => prev.map(p => {
          if (p.id === 'tiktok') {
            const isConn = !!data.connected
            return {
              ...p,
              connected: isConn,
              loading: false,
              accountName: isConn ? `@${data.username || ''} (${data.displayName || 'TikTok'})` : 'Pendiente vinculación OAuth'
            }
          }
          return p
        }))
      })
      .catch(() => {
        setApiPlatforms(prev => prev.map(p => p.id === 'tiktok' ? { ...p, loading: false } : p))
      })
  }

  useEffect(() => {
    setMounted(true)
    if (isOpen) {
      loadRealStatuses()
    }
  }, [isOpen])

  const handleDisconnect = async (platform: ApiPlatform) => {
    if (!confirm(`¿Deseas desconectar ${platform.name}? Las publicaciones existentes se mantendrán en la plataforma.`)) {
      return
    }

    setActionLoadingId(platform.id)
    try {
      await fetch(platform.disconnectUrl, { method: 'POST' })
      await loadRealStatuses()
    } catch (e) {
      console.error('Error desconectando:', e)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleConnect = (platform: ApiPlatform) => {
    window.location.href = platform.connectUrl
  }

  if (!isOpen || !mounted) return null

  const connectedApiCount = apiPlatforms.filter(p => p.connected).length

  const renderIcon = (type: string, color: string) => {
    switch (type) {
      case 'meli':
        return <ShoppingBag size={18} className="text-black" />
      case 'facebook':
        return <FacebookIcon size={18} />
      case 'marketplace':
        return <Store size={18} className="text-white" />
      case 'instagram':
        return <InstagramIcon size={18} />
      case 'tiktok':
        return <Music2 size={18} className="text-black" />
      case 'whatsapp':
        return <MessageSquare size={18} className="text-white" />
      default:
        return <Share2 size={18} className="text-white" />
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-[#0F1117] border border-[#2A2F45] shadow-2xl p-6 flex flex-col gap-5 overflow-hidden max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1F2337] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400">
              <Share2 size={19} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white tracking-tight">Cuentas y Conexiones</h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {connectedApiCount}/{apiPlatforms.length} APIs Activas
                </span>
              </div>
              <p className="text-xs text-[#8B8FA8] mt-0.5">
                Separación entre conexiones oficiales vía API y automatizaciones de navegador
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8B8FA8] hover:text-white hover:bg-[#1A1D28] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="flex flex-col gap-6 overflow-y-auto pr-1">
          
          {/* FAQ / Explicación sobre Cuentas Privadas vs Páginas */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-3.5">
            <button
              type="button"
              onClick={() => setShowFaq(!showFaq)}
              className="w-full flex items-center justify-between text-left text-xs font-semibold text-blue-300 hover:text-blue-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Info size={15} className="text-blue-400 shrink-0" />
                <span>¿Por qué algunas van con API y otras con Extensión AutoCyborg?</span>
              </div>
              {showFaq ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            {showFaq && (
              <div className="mt-2.5 pt-2.5 border-t border-blue-500/20 text-[11px] text-[#A0A5BD] leading-relaxed flex flex-col gap-2 animate-in fade-in">
                <p>
                  <strong className="text-white">Meta (Facebook e Instagram)</strong> eliminó la posibilidad de publicar por API en perfiles personales o privados. Por eso:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li>
                    <strong className="text-emerald-400">APIs Oficiales:</strong> Solo funcionan para <strong>Páginas de Facebook (Fan Pages)</strong>, <strong>Instagram Comercial/Creador</strong> y <strong>MercadoLibre VIS</strong>. Se ejecutan automáticamente desde el servidor.
                  </li>
                  <li>
                    <strong className="text-purple-400">Extensión AutoCyborg:</strong> Es indispensable para <strong>Facebook Marketplace</strong> y <strong>WhatsApp</strong>, ya que publica simulando un usuario real sobre la cuenta que tengas abierta en ese momento en tu navegador Chrome.
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* GRUPO 1: CONEXIÓN REAL / VÍA API OFICIAL (OAUTH 2.0)     */}
          {/* ======================================================== */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Conexión Real vía API Oficial (OAuth 2.0)
                </h4>
              </div>
              <span className="text-[10px] text-[#8B8FA8] bg-[#161922] px-2 py-0.5 rounded border border-[#2A2F45]">
                Publicación directa por Servidor
              </span>
            </div>
            <p className="text-[11px] text-[#8B8FA8]">
              Los usuarios conectan sus cuentas formalmente. Las publicaciones se envían directo a su perfil o página verificada sin depender del navegador abierto.
            </p>

            <div className="flex flex-col gap-2 mt-1">
              {apiPlatforms.map(platform => {
                const isLoading = platform.loading || actionLoadingId === platform.id

                return (
                  <div
                    key={platform.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col gap-2 ${
                      platform.connected
                        ? 'bg-[#13161F] border-[#1F2337] hover:border-emerald-500/40'
                        : 'bg-[#10121A] border-[#1A1D28]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: Icon + Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                          style={{ background: platform.brandColor }}
                        >
                          {renderIcon(platform.iconType, platform.brandColor)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white truncate">{platform.name}</span>
                            {platform.connected ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Conectado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-gray-800/40 px-2 py-0.5 rounded-md border border-gray-700/50">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                                Desconectado
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#9CA3AF] truncate font-mono mt-0.5">
                            {platform.accountName}
                          </p>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {platform.connected ? (
                          <div className="flex items-center gap-1.5">
                            {platform.profileUrl && (
                              <a
                                href={platform.profileUrl}
                                target="_blank"
                                rel="noreferrer"
                                title="Ver página/perfil oficial"
                                className="p-1.5 rounded-lg text-[#8B8FA8] hover:text-white hover:bg-[#1E2130] transition-colors"
                              >
                                <ExternalLink size={13} />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDisconnect(platform)}
                              disabled={isLoading}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1E2130] hover:bg-red-500/20 text-[#A0A5BD] hover:text-red-400 border border-[#2A2F45] transition-all flex items-center gap-1.5"
                            >
                              {isLoading ? (
                                <RefreshCw size={12} className="animate-spin" />
                              ) : (
                                'Desconectar'
                              )}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleConnect(platform)}
                            disabled={isLoading}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-yellow-400 hover:bg-yellow-300 text-black flex items-center gap-1.5 transition-all shadow-sm"
                          >
                            <ExternalLink size={12} />
                            <span>Vincular Cuenta</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Detalle explicativo de la plataforma */}
                    <div className="flex items-center justify-between text-[10px] text-[#6B7280] pt-1 border-t border-[#1F2337]/40">
                      <span>{platform.subtitle}</span>
                      <span className="text-[#8B8FA8]">{platform.details}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ======================================================== */}
          {/* GRUPO 2: AUTOMATIZACIÓN POR EXTENSIÓN AUTOCYBORG 360     */}
          {/* ======================================================== */}
          <div className="flex flex-col gap-2.5 pt-2 border-t border-[#1F2337]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-purple-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Automatización de Navegador (Extensión AutoCyborg 360)
                </h4>
              </div>
              <span className="text-[10px] text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-500/30 flex items-center gap-1">
                <Zap size={11} className="text-purple-400" />
                Sesión Local en Chrome
              </span>
            </div>
            <p className="text-[11px] text-[#8B8FA8]">
              Funciona sin credenciales de API. Publica en la cuenta o número que el usuario tenga abierto en su navegador en ese instante.
            </p>

            <div className="flex flex-col gap-2 mt-1">
              {extensionPlatforms.map(platform => {
                return (
                  <div
                    key={platform.id}
                    className="p-3.5 rounded-xl border border-purple-500/20 bg-[#13111E]/70 hover:border-purple-500/40 transition-all flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: Icon + Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                          style={{ background: platform.brandColor }}
                        >
                          {renderIcon(platform.iconType, platform.brandColor)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white truncate">{platform.name}</span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                              Sesión del Navegador
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-300 mt-0.5">
                            {platform.accountNotice}
                          </p>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {platform.activeUrl && (
                          <a
                            href={platform.activeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1F1E2E] hover:bg-purple-900/40 text-purple-200 border border-purple-500/30 flex items-center gap-1.5 transition-all"
                          >
                            <ExternalLink size={12} />
                            <span>Abrir</span>
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#8B8FA8] pt-1 border-t border-purple-500/10">
                      <span>{platform.subtitle}</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle size={11} /> Listo para inyección automática
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#1F2337] mt-1">
          <span className="text-[11px] text-[#6B7280]">
            Las publicaciones saldrán según la modalidad correspondiente (API en la nube o Extensión en Chrome).
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[#1A1D28] hover:bg-[#2A2F45] text-white border border-[#2A2F45] transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
