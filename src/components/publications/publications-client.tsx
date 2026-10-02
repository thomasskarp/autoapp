'use client'

import { useState, useMemo, useEffect, Fragment } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { Vehicle } from '@/lib/supabase/types'
import { formatPrice, vehicleName, getVehicleCoverImage, formatKm, formatNumberDots, parseNumberFromDots, formatDisplayPatent, compareVehiclesStable } from '@/lib/utils'
import { publishToFacebookMarketplace, publishToInstagramFeed, publishToMercadoLibre, publishToWhatsAppStatus, publishToFacebookPage, publishToInstagramGraphAPI, deleteInstagramPost, sendVehicleToWhatsAppChat, publishToTikTok } from '@/lib/publisher'
import dynamic from 'next/dynamic'
import { PublishModal } from '@/components/stock/publish-modal'
import { VehicleDetailModal } from '@/components/stock/vehicle-detail-modal'
import { Header } from '@/components/layout/header'
import { PlatformConnectionsModal } from '@/components/publications/platform-connections-modal'

const VideoReelModal = dynamic(
  () => import('@/components/publications/video-reel-modal').then((mod) => mod.VideoReelModal),
  { ssr: false }
)
import {
  ExternalLink, Loader2, Sparkles, Search, Check, Trash2, RefreshCw,
  Edit3, DollarSign, X, ChevronRight, Tag,
  Link2, ShieldCheck, Settings, Key, CheckCircle2, Zap, LogOut, Power, UserCheck,
  Pause, Play, Square, AlertCircle, MessageSquare, Send, Clock, Film, Video, Camera, Rocket,
  LayoutGrid, List
} from 'lucide-react'

type TabType = 'USADOS' | '0KM'
type PlatformType = 'MELI' | 'FB_PAGE' | 'FB' | 'IG' | 'WA' | 'TIKTOK' | 'AUTOCOSMOS' | 'FB_MARKETPLACE'

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
  { id: 'FB',         name: 'Facebook',             subtitle: 'Feed (Fan Page) & Marketplace', color: '#1877F2', defaultUrl: 'https://www.facebook.com/' },
  { id: 'IG',         name: 'Instagram Oficial',    subtitle: 'API Oficial Graph (@okmmotors)', color: '#E1306C', defaultUrl: 'https://www.instagram.com/okmmotors/' },
  { id: 'WA',         name: 'WhatsApp Estado',       subtitle: 'Copia ficha & imágenes',        color: '#25D366', defaultUrl: 'https://web.whatsapp.com/' },
  { id: 'TIKTOK',     name: 'TikTok',               subtitle: 'Creación de video catálogo',    color: '#00f2fe', textColor: '#000000', defaultUrl: 'https://www.tiktok.com/' },
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
  const [showConnectionsModal, setShowConnectionsModal] = useState<boolean>(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

  useEffect(() => {
    const saved = localStorage.getItem('autoapp_vehicles_view_mode')
    if (saved === 'grid' || saved === 'list') {
      setViewMode(saved)
    }
  }, [])

  const handleViewChange = (mode: 'grid' | 'list') => {
    setViewMode(mode)
    localStorage.setItem('autoapp_vehicles_view_mode', mode)
  }
  
  // MercadoLibre Connection & API Credentials State
  const [isMeliConnected, setIsMeliConnected] = useState<boolean>(true)
  const [meliAccountName, setMeliAccountName] = useState<string>('TS20260204113246 (Oficial MLA)')
  const [showMeliAuthModal, setShowMeliAuthModal] = useState<boolean>(false)
  const [showDevConfig, setShowDevConfig] = useState<boolean>(false)
  const [meliClientId, setMeliClientId] = useState<string>('7284100481716968')
  const [meliClientSecret, setMeliClientSecret] = useState<string>('XnP5et9mgEGb0EWoU44JV9vCQgRtkk4f')
  const [meliListingType, setMeliListingType] = useState<string>('free') // Default 'free' for common accounts test

  // Facebook Fan Page Connection State
  const [isFbConnected, setIsFbConnected] = useState<boolean>(false)
  const [fbPageName, setFbPageName] = useState<string>('')
  const [fbPageId, setFbPageId] = useState<string>('')
  const [fbPageLink, setFbPageLink] = useState<string>('')
  const [showFbAuthModal, setShowFbAuthModal] = useState<boolean>(false)

  // Facebook Live Feed Posts State
  const [fbLiveItems, setFbLiveItems] = useState<any[]>([])
  const [isSyncingFb, setIsSyncingFb] = useState<boolean>(false)
  const [lastFbSync, setLastFbSync] = useState<string | null>(null)

  // Facebook Comments State
  const [showFbCommentsModal, setShowFbCommentsModal] = useState<boolean>(false)
  const [fbComments, setFbComments] = useState<any[]>([])
  const [isLoadingFbComments, setIsLoadingFbComments] = useState<boolean>(false)
  const [fbAnswerDraftMap, setFbAnswerDraftMap] = useState<Record<string, string>>({})
  const [isSendingFbAnswer, setIsSendingFbAnswer] = useState<string | null>(null)

  // Instagram Business (@okmmotors) State
  const [isIgConnected, setIsIgConnected] = useState<boolean>(true) // Verified live in Graph API
  const [igUsername, setIgUsername] = useState<string>('okmmotors')
  const [igName, setIgName] = useState<string>('okm motors')
  const [igProfilePic, setIgProfilePic] = useState<string | null>(null)
  const [igFollowers, setIgFollowers] = useState<number>(0)
  const [igProfileUrl, setIgProfileUrl] = useState<string>('https://www.instagram.com/okmmotors/')
  const [showIgAuthModal, setShowIgAuthModal] = useState<boolean>(false)
  const [igLiveItems, setIgLiveItems] = useState<any[]>([])
  const [isSyncingIg, setIsSyncingIg] = useState<boolean>(false)
  const [lastIgSync, setLastIgSync] = useState<string | null>(null)

  // Instagram Comments State
  const [showIgCommentsModal, setShowIgCommentsModal] = useState<boolean>(false)
  const [igComments, setIgComments] = useState<any[]>([])
  const [isLoadingIgComments, setIsLoadingIgComments] = useState<boolean>(false)
  const [igAnswerDraftMap, setIgAnswerDraftMap] = useState<Record<string, string>>({})
  const [isSendingIgAnswer, setIsSendingIgAnswer] = useState<string | null>(null)

  // Meta Direct Messages (Instagram DMs + Facebook Messenger)
  const [showDirectMessagesModal, setShowDirectMessagesModal] = useState<boolean>(false)
  const [directConversations, setDirectConversations] = useState<any[]>([])
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [isLoadingDMs, setIsLoadingDMs] = useState<boolean>(false)
  const [dmPlatformFilter, setDmPlatformFilter] = useState<'all' | 'instagram' | 'facebook'>('all')
  const [dmReplyDraft, setDmReplyDraft] = useState<string>('')
  const [isSendingDM, setIsSendingDM] = useState<boolean>(false)
  const [isGeneratingDMAI, setIsGeneratingDMAI] = useState<boolean>(false)
  const [dmWarnings, setDmWarnings] = useState<string[]>([])

  // Modals state

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [selectedPublishPlatform, setSelectedPublishPlatform] = useState<string | null>(null)
  const [detailVehicle, setDetailVehicle] = useState<Vehicle | null>(null) // Ficha técnica del auto
  const [priceModalVehicle, setPriceModalVehicle] = useState<Vehicle | null>(null) // Cambiar precio de publicación específica
  const [customPriceInput, setCustomPriceInput] = useState<string>('')
  const [reelModalVehicle, setReelModalVehicle] = useState<Vehicle | null>(null) // Estudio de Reels y Stories 9:16

  const openPublishModal = (v: Vehicle, platform?: string) => {
    setSelectedVehicle(v)
    setSelectedPublishPlatform(platform || 'FB_MARKETPLACE')
  }

  const [activeTask, setActiveTask] = useState<{ id: string; platform: string } | null>(null)
  const [taskStatusMsg, setTaskStatusMsg] = useState<string | null>(null)

  // Map of publication state keyed by `${vehicleId}_${platformId}`
  const [pubStateMap, setPubStateMap] = useState<Record<string, PublicationRecord>>({})
  const [mounted, setMounted] = useState(false)

  // MercadoLibre Live API Items & Real Status State
  const [meliLiveItems, setMeliLiveItems] = useState<any[]>([])
  const [isSyncingMeli, setIsSyncingMeli] = useState<boolean>(false)
  const [lastMeliSync, setLastMeliSync] = useState<string | null>(null)

  // MercadoLibre Questions & Answers State
  const [showQuestionsModal, setShowQuestionsModal] = useState(false)
  const [meliQuestions, setMeliQuestions] = useState<any[]>([])
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false)
  const [answerDraftMap, setAnswerDraftMap] = useState<Record<number, string>>({})
  const [isSendingAnswer, setIsSendingAnswer] = useState<number | null>(null)

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

    // Check Facebook Fan Page connection status in real-time
    fetch('/api/facebook/status')
      .then(res => res.json())
      .then(data => {
        if (data.connected) {
          setIsFbConnected(true)
          setFbPageName(data.pageName || 'Fan Page Oficial')
          setFbPageId(data.pageId || '')
          setFbPageLink(data.pageLink || '')
        }
      })
      .catch(() => {})

    // Check Instagram Business connection status in real-time
    fetch('/api/instagram/status')
      .then(res => res.json())
      .then(data => {
        if (data.connected) {
          setIsIgConnected(true)
          setIgUsername(data.username || 'okmmotors')
          setIgName(data.name || 'okm motors')
          setIgProfilePic(data.profilePic || null)
          setIgFollowers(data.followersCount || 0)
          setIgProfileUrl(data.profileUrl || `https://www.instagram.com/${data.username || 'okmmotors'}/`)
        } else {
          setIsIgConnected(false)
        }
      })
      .catch(() => {
        setIsIgConnected(false)
      })

    // Check URL search params for OAuth returns from MercadoLibre & Facebook & Instagram
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('meli_connected') === 'true') {
        setIsMeliConnected(true)
        localStorage.setItem('autoapp_meli_connected', 'true')
        const user = urlParams.get('meli_user') || 'Concesionaria Oficial (MLA)'
        setMeliAccountName(user)
        localStorage.setItem('autoapp_meli_account_name', user)
        window.history.replaceState({}, document.title, window.location.pathname)
      } else if (urlParams.get('meli_error')) {
        alert('Aviso de conexión MercadoLibre: ' + urlParams.get('meli_error'))
        window.history.replaceState({}, document.title, window.location.pathname)
      }

      if (urlParams.get('facebook_connected') === 'true') {
        setIsFbConnected(true)
        const pName = urlParams.get('page_name') || 'Fan Page Oficial'
        setFbPageName(pName)
        const pId = urlParams.get('page_id') || ''
        setFbPageId(pId)
        if (urlParams.get('instagram_connected') === 'true') {
          setIsIgConnected(true)
          const igU = urlParams.get('ig_username') || 'okmmotors'
          setIgUsername(igU)
        }
        window.history.replaceState({}, document.title, window.location.pathname)
      } else if (urlParams.get('facebook_error')) {
        alert('Aviso de conexión Facebook: ' + urlParams.get('facebook_error'))
        window.history.replaceState({}, document.title, window.location.pathname)
      }

      if (urlParams.get('tiktok_connected') === 'true') {
        const u = urlParams.get('username') || 'TikTok'
        alert(`¡Cuenta de TikTok (@${u}) conectada exitosamente vía API Oficial!`)
        window.history.replaceState({}, document.title, window.location.pathname)
      } else if (urlParams.get('tiktok_notice') === 'TIKTOK_DEV_APP_REQUIRED') {
        alert('Configuración de TikTok Developers requerida:\n\n1. Registrá la App en developers.tiktok.com\n2. Configurá TIKTOK_CLIENT_KEY y TIKTOK_CLIENT_SECRET en .env.local\n3. Habilitá Content Posting API y Login Kit.')
        window.history.replaceState({}, document.title, window.location.pathname)
      } else if (urlParams.get('tiktok_error')) {
        alert('Aviso de conexión TikTok: ' + urlParams.get('tiktok_error'))
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

  const handleConnectFacebook = () => {
    setShowFbAuthModal(false)
    window.location.href = '/api/facebook/connect'
  }

  const handleDisconnectFacebook = async () => {
    if (confirm('¿Deseas desconectar la Fan Page de Facebook? Las publicaciones existentes permanecerán en tu página.')) {
      try {
        setTaskStatusMsg('Desconectando Fan Page de Facebook...')
        await fetch('/api/facebook/disconnect', { method: 'POST' })
      } catch (e) {
      } finally {
        setIsFbConnected(false)
        setFbPageName('')
        setFbPageId('')
        setShowFbAuthModal(false)
        setTaskStatusMsg(null)
      }
    }
  }

  const handleConnectInstagram = () => {
    setShowIgAuthModal(false)
    window.location.href = '/api/facebook/connect'
  }

  const handleDisconnectInstagram = async () => {
    if (confirm(`¿Deseas desconectar la cuenta de Instagram (@${igUsername})? Las publicaciones existentes continuarán en tu perfil de Instagram.`)) {
      try {
        setTaskStatusMsg('Desconectando cuenta de Instagram...')
        await fetch('/api/instagram/disconnect', { method: 'POST' })
      } catch (e) {
      } finally {
        setIsIgConnected(false)
        setShowIgAuthModal(false)
        setTaskStatusMsg(null)
      }
    }
  }

  const [isTestingWebhook, setIsTestingWebhook] = useState(false)

  const handleTriggerTestWebhook = async (platform: 'instagram' | 'facebook' | 'instagram_dm' | 'facebook_messenger') => {
    try {
      setIsTestingWebhook(true)
      const label = platform === 'instagram_dm' ? 'Instagram DM' : platform === 'facebook_messenger' ? 'Facebook Messenger' : platform
      setTaskStatusMsg(`Simulando evento de ${label} para enviar alerta a Telegram...`)
      const res = await fetch('/api/meta/webhook/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform })
      })
      const data = await res.json()
      if (data.success) {
        alert(`¡Alerta de ${platform} enviada con éxito! Revisá tu Telegram para ver la notificación en tiempo real con la respuesta sugerida por IA.`)
      } else {
        alert('Aviso al simular webhook: ' + (data.error || 'Error desconocido'))
      }
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setIsTestingWebhook(false)
      setTimeout(() => setTaskStatusMsg(null), 3000)
    }
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

  // ── Gestión de Preguntas de MercadoLibre ──────────────────────────────
  const fetchMeliQuestions = async () => {
    try {
      setIsLoadingQuestions(true)
      const res = await fetch('/api/mercadolibre/questions')
      const data = await res.json()
      if (data.success && Array.isArray(data.questions)) {
        setMeliQuestions(data.questions)
      }
    } catch (e) {
      console.warn('Error al cargar preguntas de MeLi:', e)
    } finally {
      setIsLoadingQuestions(false)
    }
  }

  const handleSendAnswer = async (questionId: number) => {
    const draft = answerDraftMap[questionId]?.trim()
    if (!draft) {
      alert('Por favor escribe una respuesta antes de enviar.')
      return
    }
    try {
      setIsSendingAnswer(questionId)
      const res = await fetch('/api/mercadolibre/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, text: draft })
      })
      const data = await res.json()
      if (data.success) {
        alert('¡Respuesta enviada exitosamente al comprador en MercadoLibre!')
        setAnswerDraftMap(prev => ({ ...prev, [questionId]: '' }))
        await fetchMeliQuestions()
      } else {
        alert('Aviso de MercadoLibre: ' + (data.error || 'No se pudo enviar la respuesta.'))
      }
    } catch (err: any) {
      alert('Error al enviar respuesta: ' + err.message)
    } finally {
      setIsSendingAnswer(null)
    }
  }

  const handleSuggestAIAnswer = (q: any) => {
    const vName = q.item_title || 'el vehículo'
    const priceText = q.item_price ? `$${Number(q.item_price).toLocaleString('es-AR')}` : ''
    let suggested = `Hola, buenas tardes! Gracias por tu consulta por ${vName}. Sí, la unidad está disponible en salón para verla y probarla.`
    if (priceText) suggested += ` El precio publicado es de ${priceText}.`
    suggested += ` Tomamos permutas de menor o mayor valor y contamos con financiación a sola firma. ¿Te gustaría coordinar una visita hoy? Saludos, Sarmiento Automotores.`
    setAnswerDraftMap(prev => ({ ...prev, [q.id]: suggested }))
  }

  const handleSyncPriceToMeli = async (itemId: string, newPrice: number) => {
    if (!confirm(`¿Confirmás actualizar el precio de este aviso en MercadoLibre a $${newPrice.toLocaleString('es-AR')}?`)) return
    try {
      setTaskStatusMsg('Actualizando precio en MercadoLibre...')
      const res = await fetch('/api/mercadolibre/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, price: newPrice })
      })
      const data = await res.json()
      if (data.success) {
        setTaskStatusMsg('¡Precio actualizado con éxito en MercadoLibre!')
        await syncMercadoLibre(true)
      } else {
        alert('Aviso de MercadoLibre: ' + (data.error || 'No se pudo actualizar el precio.'))
      }
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setTimeout(() => setTaskStatusMsg(null), 3000)
    }
  }

  // Auto-sincronizar publicaciones y preguntas al entrar en MercadoLibre
  useEffect(() => {
    if (mounted && selectedPlatform === 'MELI' && isMeliConnected) {
      syncMercadoLibre(true)
      fetchMeliQuestions()
    }
  }, [mounted, selectedPlatform, isMeliConnected])

  // ── Sincronización y Comentarios de Facebook Fan Page ──────────────────────────────
  const syncFacebook = async (silent: boolean = false) => {
    try {
      setIsSyncingFb(true)
      if (!silent) setTaskStatusMsg('Sincronizando publicaciones y métricas de Facebook Fan Page...')
      const res = await fetch('/api/facebook/sync')
      const data = await res.json()
      if (data.success && Array.isArray(data.items)) {
        setFbLiveItems(data.items)
        setLastFbSync(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }))
        if (!silent) setTaskStatusMsg(`Sincronización exitosa: ${data.items.length} publicaciones sincronizadas con Facebook.`)
      }
    } catch (e: any) {
      console.warn('Error al sincronizar Facebook:', e)
      if (!silent) alert('Error al sincronizar con Facebook: ' + e.message)
    } finally {
      setIsSyncingFb(false)
      if (!silent) {
        setTimeout(() => setTaskStatusMsg(null), 3000)
      }
    }
  }

  const fetchFbComments = async () => {
    try {
      setIsLoadingFbComments(true)
      const res = await fetch('/api/facebook/comments')
      const data = await res.json()
      if (data.success && Array.isArray(data.comments)) {
        setFbComments(data.comments)
      }
    } catch (e) {
      console.warn('Error al cargar comentarios de Facebook:', e)
    } finally {
      setIsLoadingFbComments(false)
    }
  }

  const handleSendFbReply = async (commentId: string, authorName: string, postTitle: string) => {
    const draft = fbAnswerDraftMap[commentId]?.trim()
    if (!draft) {
      alert('Por favor escribe una respuesta antes de enviar.')
      return
    }
    try {
      setIsSendingFbAnswer(commentId)
      const res = await fetch('/api/facebook/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, text: draft, authorName, postTitle })
      })
      const data = await res.json()
      if (data.success) {
        alert('¡Respuesta enviada exitosamente al usuario en Facebook!')
        setFbAnswerDraftMap(prev => ({ ...prev, [commentId]: '' }))
        await fetchFbComments()
      } else {
        alert('Aviso de Facebook: ' + (data.error || 'No se pudo enviar la respuesta.'))
      }
    } catch (err: any) {
      alert('Error al enviar respuesta: ' + err.message)
    } finally {
      setIsSendingFbAnswer(null)
    }
  }

  const handleSuggestAIFbReply = (c: any) => {
    const vName = c.postTitle || 'el vehículo'
    const suggested = `¡Hola ${c.authorName || ''}! Gracias por consultar por ${vName}. Sí, la unidad está disponible en salón para coordinar tu visita o prueba de manejo. Tomamos tu usado en parte de pago. Escribinos a nuestro WhatsApp oficial para enviarte la ficha técnica completa. ¡Saludos de SK automotores!`
    setFbAnswerDraftMap(prev => ({ ...prev, [c.id]: suggested }))
  }

  // Matching de vehículo de stock con publicación en muro de Facebook Fan Page
  const findFbItem = (v: Vehicle): any | null => {
    if (!v || fbLiveItems.length === 0) return null
    const vMarca = (v.Marca || '').toLowerCase().trim()
    const vModelo = (v.Modelo || '').toLowerCase().trim()
    const vPatente = (v.Patente || '').toLowerCase().trim()
    const firstMarca = vMarca.split(' ')[0]
    const firstModelo = vModelo.split(' ')[0]

    return fbLiveItems.find(item => {
      const msg = (item.message || '').toLowerCase()
      if (vPatente && vPatente.length >= 5 && msg.includes(vPatente)) return true
      const hasMarca = firstMarca && msg.includes(firstMarca)
      const hasModelo = firstModelo && msg.includes(firstModelo)
      return hasMarca && hasModelo
    }) || null
  }

  const handleDeleteFbPost = async (postId: string) => {
    if (!confirm('¿Confirmás eliminar esta publicación directamente del muro de tu Facebook Fan Page?')) return
    try {
      setTaskStatusMsg('Eliminando publicación de Facebook Fan Page...')
      const res = await fetch('/api/facebook/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId })
      })
      const data = await res.json()
      if (data.success) {
        setTaskStatusMsg('¡Publicación eliminada exitosamente del muro de Facebook!')
        await syncFacebook(true)
      } else {
        alert('Aviso de Facebook: ' + (data.error || 'No se pudo eliminar el post.'))
      }
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setTimeout(() => setTaskStatusMsg(null), 3000)
    }
  }

  // Auto-sincronizar publicaciones, comentarios y mensajes al entrar en Facebook
  useEffect(() => {
    if (mounted && (selectedPlatform === 'FB' || (selectedPlatform as any) === 'FB_PAGE') && isFbConnected) {
      syncFacebook(true)
      fetchFbComments()
      fetchDirectMessages('facebook')
    }
  }, [mounted, selectedPlatform, isFbConnected])

  // ── Sincronización y Comentarios de Instagram Graph API (@okmmotors) ──────────────
  const syncInstagram = async (silent: boolean = false) => {
    try {
      setIsSyncingIg(true)
      if (!silent) setTaskStatusMsg('Sincronizando publicaciones y métricas en vivo de Instagram (@okmmotors)...')
      const res = await fetch('/api/instagram/sync')
      const data = await res.json()
      if (data.success && Array.isArray(data.items)) {
        setIgLiveItems(data.items)
        setLastIgSync(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }))
        if (!silent) setTaskStatusMsg(`Sincronización exitosa: ${data.items.length} publicaciones sincronizadas con Instagram.`)
      }
    } catch (e: any) {
      console.warn('Error al sincronizar Instagram:', e)
      if (!silent) alert('Error al sincronizar con Instagram: ' + e.message)
    } finally {
      setIsSyncingIg(false)
      if (!silent) {
        setTimeout(() => setTaskStatusMsg(null), 3000)
      }
    }
  }

  const fetchIgComments = async () => {
    try {
      setIsLoadingIgComments(true)
      const res = await fetch('/api/instagram/comments')
      const data = await res.json()
      if (data.success && Array.isArray(data.comments)) {
        setIgComments(data.comments)
      }
    } catch (e) {
      console.warn('Error al cargar comentarios de Instagram:', e)
    } finally {
      setIsLoadingIgComments(false)
    }
  }

  const handleSendIgReply = async (commentId: string, authorName: string, postTitle: string) => {
    const draft = igAnswerDraftMap[commentId]?.trim()
    if (!draft) {
      alert('Por favor escribe una respuesta antes de enviar.')
      return
    }
    try {
      setIsSendingIgAnswer(commentId)
      const res = await fetch('/api/instagram/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, text: draft, authorName, postTitle })
      })
      const data = await res.json()
      if (data.success) {
        alert('¡Respuesta enviada exitosamente en Instagram!')
        setIgAnswerDraftMap(prev => ({ ...prev, [commentId]: '' }))
        await fetchIgComments()
      } else {
        alert('Aviso de Instagram: ' + (data.error || 'No se pudo enviar la respuesta.'))
      }
    } catch (err: any) {
      alert('Error al enviar respuesta: ' + err.message)
    } finally {
      setIsSendingIgAnswer(null)
    }
  }

  const handleSuggestAIIgReply = (c: any) => {
    const vName = c.postTitle || 'el vehículo'
    const suggested = `¡Hola @${c.authorName || ''}! Muchas gracias por tu consulta por ${vName}. Sí, la unidad está disponible en salón. Tomamos usados y financiamos. Envianos un MD o escribinos a nuestro WhatsApp del link en bio para coordinar tu prueba de manejo. ¡Saludos de @okmmotors!`
    setIgAnswerDraftMap(prev => ({ ...prev, [c.id]: suggested }))
  }

  const findIgItem = (v: Vehicle): any | null => {
    if (!v || igLiveItems.length === 0) return null
    const vMarca = (v.Marca || '').toLowerCase().trim()
    const vModelo = (v.Modelo || '').toLowerCase().trim()
    const vPatente = (v.Patente || '').toLowerCase().trim()
    const firstMarca = vMarca.split(' ')[0]
    const firstModelo = vModelo.split(' ')[0]

    return igLiveItems.find(item => {
      const cap = (item.caption || '').toLowerCase()
      if (vPatente && vPatente.length >= 5 && cap.includes(vPatente)) return true
      const hasMarca = firstMarca && cap.includes(firstMarca)
      const hasModelo = firstModelo && cap.includes(firstModelo)
      return hasMarca && hasModelo
    }) || null
  }

  const handleDeleteIgPost = async (mediaId: string) => {
    if (!confirm('¿Confirmás eliminar esta publicación directamente de tu cuenta de Instagram (@okmmotors)?')) return
    try {
      setTaskStatusMsg('Eliminando publicación de Instagram...')
      const res = await fetch('/api/instagram/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId })
      })
      const data = await res.json()
      if (data.success) {
        setTaskStatusMsg('¡Publicación eliminada exitosamente de Instagram!')
        await syncInstagram(true)
      } else {
        alert('Aviso de Instagram: ' + (data.error || 'No se pudo eliminar la publicación.'))
      }
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setTimeout(() => setTaskStatusMsg(null), 3000)
    }
  }

  // Auto-sincronizar publicaciones y comentarios al entrar en Instagram
  useEffect(() => {
    if (mounted && selectedPlatform === 'IG' && isIgConnected) {
      syncInstagram(true)
      fetchIgComments()
    }
  }, [mounted, selectedPlatform, isIgConnected])

  // ── Bandeja Unificada de Mensajes Directos (Instagram DMs + Facebook Messenger) ──
  const fetchDirectMessages = async (filter: 'all' | 'instagram' | 'facebook' = dmPlatformFilter) => {
    try {
      setIsLoadingDMs(true)
      const res = await fetch(`/api/meta/messages?platform=${filter}`)
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        setDirectConversations(data.data)
        if (data.warnings) setDmWarnings(data.warnings)
        if (data.data.length > 0) {
          setSelectedConvId((prev) => (prev && data.data.some((c: any) => c.id === prev) ? prev : data.data[0].id))
        }
      }
    } catch (e: any) {
      console.warn('Error al cargar mensajes directos:', e)
    } finally {
      setIsLoadingDMs(false)
    }
  }

  const handleSendDirectMessage = async () => {
    const activeConv = directConversations.find(c => c.id === selectedConvId)
    if (!activeConv || !dmReplyDraft.trim()) return

    try {
      setIsSendingDM(true)
      const res = await fetch('/api/meta/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: activeConv.platform,
          recipientId: activeConv.participant.id,
          message: dmReplyDraft.trim(),
          conversationId: activeConv.id
        })
      })
      const data = await res.json()
      if (data.success) {
        // Añadir mensaje de la agencia optimista al hilo de chat
        const newMsg = {
          id: data.messageId || 'local_' + Date.now(),
          text: dmReplyDraft.trim(),
          createdAt: new Date().toISOString(),
          fromId: 'agency',
          fromName: activeConv.platform === 'instagram' ? '@okmmotors' : 'SK automotores',
          isFromAgency: true
        }
        setDirectConversations(prev => prev.map(c => {
          if (c.id === activeConv.id) {
            return {
              ...c,
              lastMessage: newMsg.text,
              updatedAt: newMsg.createdAt,
              messages: [...c.messages, newMsg]
            }
          }
          return c
        }))
        setDmReplyDraft('')
      } else {
        alert('Aviso de Meta: ' + (data.error || 'No se pudo enviar el mensaje directo.'))
      }
    } catch (err: any) {
      alert('Error al enviar mensaje: ' + err.message)
    } finally {
      setIsSendingDM(false)
    }
  }

  const handleSuggestAIDirectMessage = async () => {
    const activeConv = directConversations.find(c => c.id === selectedConvId)
    if (!activeConv) return

    try {
      setIsGeneratingDMAI(true)
      const lastCustMsg = [...activeConv.messages].reverse().find(m => !m.isFromAgency)?.text || activeConv.lastMessage
      const res = await fetch('/api/meta/messages/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: activeConv.participant.name,
          messageHistory: activeConv.messages,
          lastMessage: lastCustMsg
        })
      })
      const data = await res.json()
      if (data.success && data.suggestion) {
        setDmReplyDraft(data.suggestion)
      }
    } catch (e: any) {
      alert('No se pudo generar la sugerencia: ' + e.message)
    } finally {
      setIsGeneratingDMAI(false)
    }
  }


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

  // Publicar en Facebook Feed (Fan Page) vía API Oficial
  const handlePublishFBFeed = async (veh: Vehicle, overrideP?: number) => {
    const key = `${veh.ID}_FB`
    const cPrice = overrideP ?? pubStateMap[key]?.customPrice
    const effPrice = (cPrice && cPrice > 0) ? cPrice : (veh.Precio_Venta || 0)
    const vehPayload: Vehicle = { ...veh, Precio_Venta: effPrice }

    try {
      setActiveTask({ id: veh.ID, platform: 'FB_FEED' })
      setTaskStatusMsg(`Publicando automáticamente en Facebook Feed (API Oficial)...`)
      const res = await publishToFacebookPage(vehPayload, (msg) => setTaskStatusMsg(msg))

      updatePublicationStatus(veh.ID, 'FB', {
        published: true,
        url: res.url,
        publishedAt: new Date().toISOString()
      })
      updatePublicationStatus(veh.ID, 'FB_PAGE', {
        published: true,
        url: res.url,
        publishedAt: new Date().toISOString()
      })
      await syncFacebook(true)
    } catch (err: any) {
      alert('Error al publicar en Facebook Feed: ' + err.message)
    } finally {
      setTimeout(() => {
        setActiveTask(null)
        setTaskStatusMsg(null)
      }, 3000)
    }
  }

  // Publicar en Facebook Marketplace vía Extensión
  const handlePublishFBMarketplace = async (veh: Vehicle, overrideP?: number) => {
    const key = `${veh.ID}_FB`
    const cPrice = overrideP ?? pubStateMap[key]?.customPrice
    const effPrice = (cPrice && cPrice > 0) ? cPrice : (veh.Precio_Venta || 0)
    const vehPayload: Vehicle = { ...veh, Precio_Venta: effPrice }

    try {
      setActiveTask({ id: veh.ID, platform: 'FB_MARKETPLACE' })
      setTaskStatusMsg(`Iniciando publicación en Facebook Marketplace con precio ${formatPrice(effPrice)}...`)
      await publishToFacebookMarketplace(vehPayload, (msg) => setTaskStatusMsg(msg))

      updatePublicationStatus(veh.ID, 'FB_MARKETPLACE', {
        published: true,
        url: 'https://www.facebook.com/marketplace/you/selling',
        publishedAt: new Date().toISOString()
      })
    } catch (err: any) {
      alert('Error al publicar en Facebook Marketplace: ' + err.message)
    } finally {
      setTimeout(() => {
        setActiveTask(null)
        setTaskStatusMsg(null)
      }, 3000)
    }
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

    if (selectedPlatform === 'FB_PAGE') {
      try {
        setActiveTask({ id: v.ID, platform: 'FB_PAGE' })
        setTaskStatusMsg(`Publicando automáticamente en Facebook Fan Page (API Oficial)...`)
        const res = await publishToFacebookPage(vForPublish, (msg) => setTaskStatusMsg(msg))

        updatePublicationStatus(v.ID, 'FB_PAGE', {
          published: true,
          url: res.url,
          publishedAt: new Date().toISOString()
        })
      } catch (err: any) {
        alert('Error al publicar en Facebook Fan Page: ' + err.message)
      } finally {
        setTimeout(() => {
          setActiveTask(null)
          setTaskStatusMsg(null)
        }, 3000)
      }
    } else if (selectedPlatform === 'FB') {
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
        setTaskStatusMsg(`Publicando carrusel oficial en Instagram (@okmmotors)...`)
        let postUrl = 'https://www.instagram.com/okmmotors/'
        try {
          const res = await publishToInstagramGraphAPI(vForPublish, (msg) => setTaskStatusMsg(msg))
          postUrl = res.url
        } catch (apiErr: any) {
          console.warn('Fallo en API directa, usando extensión:', apiErr)
          await publishToInstagramFeed(vForPublish, (msg) => setTaskStatusMsg(msg))
        }

        updatePublicationStatus(v.ID, 'IG', {
          published: true,
          url: postUrl,
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
    } else if (selectedPlatform === 'TIKTOK') {
      try {
        setActiveTask({ id: v.ID, platform: 'TIKTOK' })
        setTaskStatusMsg(`Preparando fotos y ficha técnica para TikTok...`)
        const res = await publishToTikTok(vForPublish, (msg) => setTaskStatusMsg(msg))

        updatePublicationStatus(v.ID, 'TIKTOK', {
          published: true,
          url: res.url || 'https://www.tiktok.com/',
          publishedAt: new Date().toISOString()
        })
      } catch (err: any) {
        alert('Error al procesar para TikTok: ' + err.message)
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

  // Enviar a chat / contacto de WhatsApp directo (foto + ficha en 1 sola acción)
  const handleSendChatWA = async (v: Vehicle) => {
    const pubKey = `${v.ID}_WA`
    const customPrice = pubStateMap[pubKey]?.customPrice
    const effectivePrice = (customPrice && customPrice > 0) ? customPrice : (v.Precio_Venta || 0)
    const vForPublish: Vehicle = {
      ...v,
      Precio_Venta: effectivePrice
    }
    try {
      setActiveTask({ id: `${v.ID}_chat`, platform: 'WA' })
      setTaskStatusMsg(`Preparando foto y ficha técnica para enviar a chat...`)
      await sendVehicleToWhatsAppChat(vForPublish, (msg) => setTaskStatusMsg(msg))
    } catch (err: any) {
      alert('Error al enviar a chat de WhatsApp: ' + err.message)
    } finally {
      setTimeout(() => {
        setActiveTask(null)
        setTaskStatusMsg(null)
      }, 3000)
    }
  }

  // Delete publication handler: Opens direct publication URL to delete & resets status to NO PUBLICADO (Rojo)
  const handleDeletePublication = (v: Vehicle) => {
    const key = `${v.ID}_${selectedPlatform}`
    const record = pubStateMap[key]
    const targetUrl = record?.url || activePlatformObj.defaultUrl

    if (selectedPlatform === 'FB' || selectedPlatform === 'FB_PAGE') {
      const postId = record?.url?.split('/').pop() || ''
      if (confirm(`¿Confirmás eliminar la publicación de ${vehicleName(v)} directamente de Facebook Fan Page?`)) {
        if (postId) {
          setTaskStatusMsg('Eliminando publicación de Facebook Fan Page...')
          fetch('/api/facebook/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId })
          }).then(r => r.json()).then(res => {
            if (res.success) {
              setTaskStatusMsg('Publicación eliminada correctamente de Facebook.')
              syncFacebook(true)
            } else {
              alert('Aviso de Facebook: ' + (res.error || 'No se pudo eliminar'))
            }
          }).catch(err => {
            alert('Error: ' + err.message)
          }).finally(() => {
            setTimeout(() => setTaskStatusMsg(null), 3000)
          })
        }
        updatePublicationStatus(v.ID, 'FB_PAGE', { published: false })
      }
      return
    }

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
    // Ordenamiento determinista estable idéntico a Stock y CRM
    Object.keys(groups).forEach(marca => {
      groups[marca].sort(compareVehiclesStable)
    })
    return groups
  }, [filteredVehicles])

  const sortedMarcas = Object.keys(groupedVehicles).sort()

  return (
    <>
      <Header
        title="Publicaciones"
        titleExtra={
          <button
            type="button"
            onClick={() => setShowConnectionsModal(true)}
            title="Conexiones de plataformas"
            className="p-1.5 px-2.5 rounded-xl bg-[#1A1D28] hover:bg-[#2A2F45] text-[#A0A5BD] hover:text-[#FACC15] border border-[#2A2F45] hover:border-[#FACC1550] transition-all flex items-center gap-2 shadow-sm group cursor-pointer"
          >
            <Settings size={17} className="transition-transform group-hover:rotate-45" />
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        }
      />

      <div className="p-6 animate-in flex flex-col gap-6">
        {/* Modal de Conexiones de Plataformas */}
        <PlatformConnectionsModal
          isOpen={showConnectionsModal}
          onClose={() => setShowConnectionsModal(false)}
        />

        {/* Modal for vehicle publishing details */}
        <PublishModal
        vehicle={selectedVehicle}
        initialPlatform={selectedPublishPlatform}
        onClose={() => {
          setSelectedVehicle(null)
          setSelectedPublishPlatform(null)
        }}
      />

      {/* Modal for full vehicle spec sheet (Ficha del auto) */}
      <VehicleDetailModal vehicle={detailVehicle} onClose={() => setDetailVehicle(null)} />

      {/* Modal Estudio de Reels y Stories 9:16 con IA */}
      <VideoReelModal
        vehicle={reelModalVehicle}
        platform={selectedPlatform}
        onClose={() => setReelModalVehicle(null)}
        onSuccess={() => {
          if (selectedPlatform === 'IG') syncInstagram(true)
          if (selectedPlatform === 'FB' || (selectedPlatform as any) === 'FB_PAGE') syncFacebook(true)
        }}
      />

      {/* Modal Bandeja de Consultas de MercadoLibre */}
      {mounted && showQuestionsModal && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
          onClick={() => setShowQuestionsModal(false)}>
          <div
            className="card w-full max-w-3xl max-h-[90vh] p-6 flex flex-col gap-5 shadow-2xl relative overflow-hidden bg-[#0F1117] border border-[#3B82F680]"
            onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#1F2337] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#3B82F620] text-[#3B82F6] flex items-center justify-center">
                  <MessageSquare size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Consultas y Preguntas de MercadoLibre</h3>
                  <p className="text-xs font-semibold text-[#8B8FA8]">
                    {meliQuestions.filter(q => q.status === 'UNANSWERED').length} pendientes de respuesta • {meliQuestions.length} en total
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchMeliQuestions}
                  disabled={isLoadingQuestions}
                  title="Actualizar preguntas"
                  className="p-2 rounded-lg bg-[#1F2337] hover:bg-[#2A2F45] text-white transition-all">
                  <RefreshCw size={16} className={isLoadingQuestions ? 'animate-spin text-[#3B82F6]' : ''} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuestionsModal(false)}
                  className="p-2 rounded-lg hover:bg-[#1F2337] text-[#8B8FA8] transition-all">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 max-h-[60vh]">
              {isLoadingQuestions && meliQuestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#8B8FA8]">
                  <Loader2 size={28} className="animate-spin text-[#3B82F6]" />
                  <span className="text-sm font-semibold">Cargando preguntas oficiales desde MercadoLibre...</span>
                </div>
              ) : meliQuestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#8B8FA8]">
                  <CheckCircle2 size={36} className="text-[#22C55E]" />
                  <span className="text-sm font-bold text-white">¡No hay preguntas registradas!</span>
                  <p className="text-xs text-[#8B8FA8] text-center max-w-sm">
                    Las preguntas que hagan los compradores en tus publicaciones aparecerán aquí y en Telegram automáticamente.
                  </p>
                </div>
              ) : (
                meliQuestions.map(q => {
                  const isUnanswered = q.status === 'UNANSWERED'
                  const isClosed = q.status === 'CLOSED_UNANSWERED'
                  const isSending = isSendingAnswer === q.id
                  const draft = answerDraftMap[q.id] || ''

                  return (
                    <div
                      key={q.id}
                      className="p-4 rounded-xl bg-[#13161F] border border-[#1F2337] flex flex-col gap-3 transition-all hover:border-[#3B82F640]">
                      
                      {/* Top bar: Item info & status */}
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          {q.item_thumbnail && (
                            <img src={q.item_thumbnail} alt="" className="w-10 h-8 rounded object-cover border border-[#2A2F45]" />
                          )}
                          <div>
                            <a
                              href={q.item_permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-black text-white hover:text-[#3B82F6] transition-colors flex items-center gap-1">
                              <span>{q.item_title}</span>
                              <ExternalLink size={11} className="text-[#8B8FA8]" />
                            </a>
                            <div className="flex items-center gap-2 text-[10px] text-[#8B8FA8]">
                              <span>ID MeLi: {q.item_id}</span>
                              {q.item_price > 0 && (
                                <span className="font-bold text-[#FACC15]">${Number(q.item_price).toLocaleString('es-AR')}</span>
                              )}
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock size={10} />
                                {q.date_created ? new Date(q.date_created).toLocaleString('es-AR') : 'Reciente'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          {isUnanswered ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-[#EF444415] text-[#EF4444] border border-[#EF444430] flex items-center gap-1 shadow-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                              Sin Responder
                            </span>
                          ) : isClosed ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#6B728015] text-[#9CA3AF] border border-[#6B728030]">
                              Cerrada sin respuesta
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-[#22C55E15] text-[#22C55E] border border-[#22C55E30]">
                              Respondida
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Buyer question box */}
                      <div className="p-3 rounded-lg bg-[#0F1117] border border-[#1F2337] flex items-start gap-2.5">
                        <MessageSquare size={16} className="text-[#3B82F6] flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-white">"{q.text}"</p>
                        </div>
                      </div>

                      {/* Answer section */}
                      {q.answer ? (
                        <div className="p-3 rounded-lg bg-[#22C55E08] border border-[#22C55E20] flex flex-col gap-1">
                          <div className="flex items-center justify-between text-[10px] text-[#22C55E] font-bold">
                            <span>Respuesta enviada:</span>
                            {q.answer.date_created && (
                              <span className="text-[#8B8FA8] font-normal">{new Date(q.answer.date_created).toLocaleString('es-AR')}</span>
                            )}
                          </div>
                          <p className="text-xs text-[#E2E8F0] font-medium">"{q.answer.text}"</p>
                        </div>
                      ) : isUnanswered ? (
                        <div className="flex flex-col gap-2 pt-1">
                          <textarea
                            rows={2}
                            placeholder="Escribe la respuesta oficial para MercadoLibre..."
                            value={draft}
                            onChange={e => setAnswerDraftMap(prev => ({ ...prev, [q.id]: e.target.value }))}
                            className="input w-full p-2.5 text-xs font-medium resize-none bg-[#0B0D13]"
                          />
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleSuggestAIAnswer(q)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#FACC15] bg-[#FACC1510] border border-[#FACC1530] hover:bg-[#FACC1520] transition-all flex items-center gap-1.5">
                              <Sparkles size={12} />
                              <span>Sugerir con IA</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSendAnswer(q.id)}
                              disabled={isSending || !draft.trim()}
                              className="px-4 py-1.5 rounded-lg text-xs font-black text-white bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-md">
                              {isSending ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Send size={13} />
                              )}
                              <span>{isSending ? 'Enviando...' : 'Enviar Respuesta'}</span>
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Bandeja de Comentarios de Facebook Fan Page */}
      {mounted && showFbCommentsModal && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
          onClick={() => setShowFbCommentsModal(false)}>
          <div
            className="card w-full max-w-3xl max-h-[90vh] p-6 flex flex-col gap-5 shadow-2xl relative overflow-hidden bg-[#0F1117] border border-[#1877F280]"
            onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#1F2337] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1877F220] text-[#1877F2] flex items-center justify-center">
                  <MessageSquare size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Comentarios y Consultas de Facebook Fan Page</h3>
                  <p className="text-xs font-semibold text-[#8B8FA8]">
                    {fbComments.filter(c => !c.isAnswered).length} pendientes de respuesta • {fbComments.length} en total
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchFbComments}
                  disabled={isLoadingFbComments}
                  title="Actualizar comentarios"
                  className="p-2 rounded-lg bg-[#1F2337] hover:bg-[#2A2F45] text-white transition-all">
                  <RefreshCw size={16} className={isLoadingFbComments ? 'animate-spin text-[#1877F2]' : ''} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowFbCommentsModal(false)}
                  className="p-2 rounded-lg hover:bg-[#1F2337] text-[#8B8FA8] transition-all">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 max-h-[60vh]">
              {isLoadingFbComments && fbComments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#8B8FA8]">
                  <Loader2 size={28} className="animate-spin text-[#1877F2]" />
                  <span className="text-sm font-semibold">Cargando comentarios desde Facebook Fan Page...</span>
                </div>
              ) : fbComments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#8B8FA8]">
                  <CheckCircle2 size={36} className="text-[#22C55E]" />
                  <span className="text-sm font-bold text-white">¡No hay comentarios pendientes!</span>
                  <p className="text-xs text-[#8B8FA8] text-center max-w-sm">
                    Cuando los compradores comenten en tus fotos de Facebook, aparecerán aquí para responderles al instante.
                  </p>
                </div>
              ) : (
                fbComments.map(c => {
                  const isUnanswered = !c.isAnswered
                  const isSending = isSendingFbAnswer === c.id
                  const draft = fbAnswerDraftMap[c.id] || ''

                  return (
                    <div
                      key={c.id}
                      className="p-4 rounded-xl bg-[#13161F] border border-[#1F2337] flex flex-col gap-3 transition-all hover:border-[#1877F240]">
                      
                      {/* Top bar: Author & post info */}
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          {c.postThumbnail && (
                            <img src={c.postThumbnail} alt="" className="w-10 h-8 rounded object-cover border border-[#2A2F45]" />
                          )}
                          <div>
                            <a
                              href={c.postPermalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-black text-white hover:text-[#1877F2] transition-colors flex items-center gap-1">
                              <span>{c.postTitle}</span>
                              <ExternalLink size={11} className="text-[#8B8FA8]" />
                            </a>
                            <div className="flex items-center gap-2 text-[10px] text-[#8B8FA8]">
                              <span className="font-bold text-white">{c.authorName}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock size={10} />
                                {c.created_time ? new Date(c.created_time).toLocaleString('es-AR') : 'Reciente'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          {isUnanswered ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-[#EF444415] text-[#EF4444] border border-[#EF444430] flex items-center gap-1 shadow-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                              Sin Responder
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-[#22C55E15] text-[#22C55E] border border-[#22C55E30]">
                              Respondido
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Comment body */}
                      <div className="p-3 rounded-lg bg-[#0F1117] border border-[#1F2337] flex items-start gap-2.5">
                        <MessageSquare size={16} className="text-[#1877F2] flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-white">&quot;{c.message}&quot;</p>
                        </div>
                      </div>

                      {/* Reply section */}
                      {c.reply ? (
                        <div className="p-3 rounded-lg bg-[#22C55E08] border border-[#22C55E20] flex flex-col gap-1">
                          <div className="flex items-center justify-between text-[10px] text-[#22C55E] font-bold">
                            <span>Respuesta oficial enviada:</span>
                            {c.reply.date && (
                              <span className="text-[#8B8FA8] font-normal">{new Date(c.reply.date).toLocaleString('es-AR')}</span>
                            )}
                          </div>
                          <p className="text-xs text-[#E2E8F0] font-medium">&quot;{c.reply.text}&quot;</p>
                        </div>
                      ) : isUnanswered ? (
                        <div className="flex flex-col gap-2 pt-1">
                          <textarea
                            rows={2}
                            placeholder="Escribe la respuesta oficial para Facebook..."
                            value={draft}
                            onChange={e => setFbAnswerDraftMap(prev => ({ ...prev, [c.id]: e.target.value }))}
                            className="input w-full p-2.5 text-xs font-medium resize-none bg-[#0B0D13]"
                          />
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleSuggestAIFbReply(c)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#FACC15] bg-[#FACC1510] border border-[#FACC1530] hover:bg-[#FACC1520] transition-all flex items-center gap-1.5">
                              <Sparkles size={12} />
                              <span>Sugerir con IA</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSendFbReply(c.id, c.authorName, c.postTitle)}
                              disabled={isSending || !draft.trim()}
                              className="px-4 py-1.5 rounded-lg text-xs font-black text-white bg-[#1877F2] hover:bg-[#166fe5] disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-md">
                              {isSending ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Send size={13} />
                              )}
                              <span>{isSending ? 'Enviando...' : 'Enviar Respuesta'}</span>
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal for Instagram Comments & In-Feed Leads (@okmmotors) - Centered in Viewport */}
      {mounted && showIgCommentsModal && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
          onClick={() => setShowIgCommentsModal(false)}>
          <div
            className="card w-full max-w-3xl max-h-[90vh] p-6 flex flex-col gap-5 shadow-2xl relative overflow-hidden bg-[#0F1117] border border-[#E1306C80]"
            onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#1F2337] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E1306C20] text-[#E1306C] flex items-center justify-center">
                  <MessageSquare size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Comentarios y Consultas de Instagram (@okmmotors)</h3>
                  <p className="text-xs font-semibold text-[#8B8FA8]">
                    {igComments.filter(c => !c.isAnswered).length} pendientes de respuesta • {igComments.length} en total
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchIgComments}
                  disabled={isLoadingIgComments}
                  title="Actualizar comentarios"
                  className="p-2 rounded-lg bg-[#1F2337] hover:bg-[#2A2F45] text-white transition-all">
                  <RefreshCw size={16} className={isLoadingIgComments ? 'animate-spin text-[#E1306C]' : ''} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowIgCommentsModal(false)}
                  className="p-2 rounded-lg hover:bg-[#1F2337] text-[#8B8FA8] transition-all">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 min-h-[300px]">
              {isLoadingIgComments ? (
                <div className="flex flex-col items-center justify-center py-16 text-[#8B8FA8] gap-3">
                  <Loader2 size={32} className="animate-spin text-[#E1306C]" />
                  <span className="text-xs font-bold">Consultando comentarios en Instagram...</span>
                </div>
              ) : igComments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-[#8B8FA8] gap-2">
                  <MessageSquare size={36} className="text-[#3A3F58]" />
                  <p className="text-sm font-bold text-white">No hay comentarios en publicaciones recientes</p>
                  <p className="text-xs max-w-sm">
                    Cuando los usuarios consulten en tus publicaciones de Instagram (@okmmotors), aparecerán aquí para que respondas con IA y enlaces a WhatsApp.
                  </p>
                </div>
              ) : (
                igComments.map((c) => {
                  const draft = igAnswerDraftMap[c.id] || ''
                  const isSending = isSendingIgAnswer === c.id
                  const isUnanswered = !c.isAnswered

                  return (
                    <div
                      key={c.id}
                      className="p-4 rounded-xl bg-[#13161F] border border-[#1F2337] flex flex-col gap-3 transition-all hover:border-[#E1306C40]">
                      
                      {/* Top bar: Author & post info */}
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          {c.postThumbnail && (
                            <img src={c.postThumbnail} alt="" className="w-10 h-8 rounded object-cover border border-[#2A2F45]" />
                          )}
                          <div>
                            <a
                              href={c.postPermalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-black text-white hover:text-[#E1306C] transition-colors flex items-center gap-1">
                              <span>{c.postTitle}</span>
                              <ExternalLink size={11} className="text-[#8B8FA8]" />
                            </a>
                            <div className="flex items-center gap-2 text-[10px] text-[#8B8FA8]">
                              <span className="font-bold text-white">@{c.authorName}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock size={10} />
                                {c.created_time ? new Date(c.created_time).toLocaleString('es-AR') : 'Reciente'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          {isUnanswered ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-[#EF444415] text-[#EF4444] border border-[#EF444430] flex items-center gap-1 shadow-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                              Sin Responder
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-[#22C55E15] text-[#22C55E] border border-[#22C55E30]">
                              Respondido
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Comment body */}
                      <div className="p-3 rounded-lg bg-[#0F1117] border border-[#1F2337] flex items-start gap-2.5">
                        <MessageSquare size={16} className="text-[#E1306C] flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-white">&quot;{c.message}&quot;</p>
                        </div>
                      </div>

                      {/* Reply section */}
                      {c.reply ? (
                        <div className="p-3 rounded-lg bg-[#22C55E08] border border-[#22C55E20] flex flex-col gap-1">
                          <div className="flex items-center justify-between text-[10px] text-[#22C55E] font-bold">
                            <span>Respuesta oficial en Instagram:</span>
                            {c.reply.date && (
                              <span className="text-[#8B8FA8] font-normal">{new Date(c.reply.date).toLocaleString('es-AR')}</span>
                            )}
                          </div>
                          <p className="text-xs text-[#E2E8F0] font-medium">&quot;{c.reply.text}&quot;</p>
                        </div>
                      ) : isUnanswered ? (
                        <div className="flex flex-col gap-2 pt-1">
                          <textarea
                            rows={2}
                            placeholder="Escribe la respuesta oficial para Instagram..."
                            value={draft}
                            onChange={e => setIgAnswerDraftMap(prev => ({ ...prev, [c.id]: e.target.value }))}
                            className="input w-full p-2.5 text-xs font-medium resize-none bg-[#0B0D13]"
                          />
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleSuggestAIIgReply(c)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#FACC15] bg-[#FACC1510] border border-[#FACC1530] hover:bg-[#FACC1520] transition-all flex items-center gap-1.5">
                              <Sparkles size={12} />
                              <span>Sugerir con IA</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSendIgReply(c.id, c.authorName, c.postTitle)}
                              disabled={isSending || !draft.trim()}
                              className="px-4 py-1.5 rounded-lg text-xs font-black text-white bg-[#E1306C] hover:bg-[#d02460] disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-md">
                              {isSending ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Send size={13} />
                              )}
                              <span>{isSending ? 'Enviando...' : 'Enviar Respuesta'}</span>
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal for Meta Direct Messages (Instagram DMs & Facebook Messenger) */}
      {mounted && showDirectMessagesModal && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
          onClick={() => setShowDirectMessagesModal(false)}>
          <div
            className="card w-full max-w-5xl h-[90vh] max-h-[850px] flex flex-col shadow-2xl relative overflow-hidden bg-[#0A0C10] border border-[#38bdf860] rounded-3xl"
            onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#1F2337] flex flex-wrap items-center justify-between gap-3 bg-[#0F1117]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #1877F2 0%, #E1306C 100%)' }}>
                  <Send size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>Bandeja Unificada de Mensajes Directos</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#22C55E20] text-[#22C55E] border border-[#22C55E40]">
                      META GRAPH API
                    </span>
                  </h3>
                  <p className="text-xs font-semibold text-[#8B8FA8]">
                    Instagram DMs (@okmmotors) & Facebook Messenger • Respuestas oficiales con IA
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                {/* Platform Filters */}
                <div className="flex items-center gap-1 bg-[#13161F] p-1 rounded-xl border border-[#1F2337]">
                  <button
                    type="button"
                    onClick={() => {
                      setDmPlatformFilter('all')
                      fetchDirectMessages('all')
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      dmPlatformFilter === 'all'
                        ? 'bg-[#38bdf8] text-black shadow-md'
                        : 'text-[#8B8FA8] hover:text-white'
                    }`}>
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDmPlatformFilter('instagram')
                      fetchDirectMessages('instagram')
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      dmPlatformFilter === 'instagram'
                        ? 'bg-[#E1306C] text-white shadow-md'
                        : 'text-[#8B8FA8] hover:text-white'
                    }`}>
                    📸 Instagram
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDmPlatformFilter('facebook')
                      fetchDirectMessages('facebook')
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      dmPlatformFilter === 'facebook'
                        ? 'bg-[#1877F2] text-white shadow-md'
                        : 'text-[#8B8FA8] hover:text-white'
                    }`}>
                    📘 Facebook
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => fetchDirectMessages(dmPlatformFilter)}
                  disabled={isLoadingDMs}
                  title="Actualizar conversaciones"
                  className="p-2 rounded-xl bg-[#1F2337] hover:bg-[#2A2F45] text-white transition-all">
                  <RefreshCw size={16} className={isLoadingDMs ? 'animate-spin text-[#38bdf8]' : ''} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowDirectMessagesModal(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#1E2130] text-[#8B8FA8] hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Warnings Bar if any */}
            {dmWarnings.length > 0 && (
              <div className="px-4 py-2 bg-[#FACC1510] border-b border-[#FACC1530] flex items-center justify-between text-xs text-[#FACC15]">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{dmWarnings[0]}</span>
                </div>
                <a
                  href="/api/facebook/connect"
                  className="text-[11px] font-bold underline hover:text-white">
                  Reconectar permisos
                </a>
              </div>
            )}

            {/* Split View: Left (Conversations List) & Right (Chat Stream + Composer) */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left Column: List of Threads */}
              <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-[#1F2337] flex flex-col bg-[#0B0D13]">
                <div className="p-3 border-b border-[#1F2337] flex items-center justify-between">
                  <span className="text-xs font-black text-[#8B8FA8] uppercase tracking-wider">
                    Conversaciones ({directConversations.length})
                  </span>
                  {isLoadingDMs && <Loader2 size={13} className="animate-spin text-[#38bdf8]" />}
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {directConversations.length === 0 ? (
                    <div className="p-6 text-center flex flex-col items-center justify-center gap-3 text-[#8B8FA8]">
                      <div className="w-12 h-12 rounded-2xl bg-[#13161F] border border-[#1F2337] flex items-center justify-center text-[#555870]">
                        <MessageSquare size={22} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white mb-1">Sin chats activos en este momento</p>
                        <p className="text-[11px] leading-relaxed text-[#7E849B]">
                          Los mensajes que te envíen tus clientes a Instagram o Messenger se sincronizarán aquí y te avisarán por Telegram.
                        </p>
                      </div>

                      {/* Test Action Buttons */}
                      <div className="w-full flex flex-col gap-1.5 mt-2 pt-2 border-t border-[#1F2337]">
                        <button
                          type="button"
                          onClick={() => handleTriggerTestWebhook('instagram_dm')}
                          className="w-full py-2 px-3 rounded-xl bg-[#E1306C15] hover:bg-[#E1306C25] border border-[#E1306C30] text-[11px] font-bold text-[#E1306C] transition-all flex items-center justify-center gap-1.5">
                          <Zap size={12} />
                          <span>⚡ Probar DM Instagram con IA</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTriggerTestWebhook('facebook_messenger')}
                          className="w-full py-2 px-3 rounded-xl bg-[#1877F215] hover:bg-[#1877F225] border border-[#1877F230] text-[11px] font-bold text-[#60A5FA] transition-all flex items-center justify-center gap-1.5">
                          <Zap size={12} />
                          <span>⚡ Probar Messenger con IA</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    directConversations.map(conv => {
                      const isSelected = conv.id === selectedConvId
                      const isIg = conv.platform === 'instagram'

                      return (
                        <div
                          key={conv.id}
                          onClick={() => setSelectedConvId(conv.id)}
                          className={`p-3 rounded-xl cursor-pointer transition-all border ${
                            isSelected
                              ? 'bg-[#1877F215] border-[#1877F260] shadow-md'
                              : 'bg-[#13161F] border-[#1F2337] hover:border-[#2E354F]'
                          }`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 text-white"
                                style={{
                                  background: isIg
                                    ? 'linear-gradient(45deg, #f09433 0%, #dc2743 50%, #bc1888 100%)'
                                    : '#1877F2'
                                }}>
                                {isIg ? 'IG' : 'FB'}
                              </span>
                              <span className="text-xs font-black text-white truncate">
                                {conv.participant.name}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-[#8B8FA8] flex-shrink-0">
                              {new Date(conv.updatedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#A0A5BD] truncate pl-8">
                            {conv.lastMessage}
                          </p>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Chat Stream & Message Composer */}
              <div className="flex-1 flex flex-col bg-[#07090E]">
                {(() => {
                  const activeConv = directConversations.find(c => c.id === selectedConvId)

                  if (!activeConv) {
                    return (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#8B8FA8]">
                        <div className="w-16 h-16 rounded-3xl bg-[#13161F] border border-[#1F2337] flex items-center justify-center text-[#555870] mb-3">
                          <Send size={28} />
                        </div>
                        <h4 className="text-sm font-black text-white mb-1">Bandeja de Mensajes Directos</h4>
                        <p className="text-xs max-w-sm text-[#7E849B]">
                          Seleccioná una conversación en el panel izquierdo para ver el historial y responder directamente al cliente.
                        </p>
                      </div>
                    )
                  }

                  const isIg = activeConv.platform === 'instagram'

                  return (
                    <div className="flex-1 flex flex-col h-full">
                      {/* Chat Header */}
                      <div className="p-3.5 px-5 border-b border-[#1F2337] bg-[#0E1017] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-md"
                            style={{
                              background: isIg
                                ? 'linear-gradient(45deg, #f09433 0%, #dc2743 50%, #bc1888 100%)'
                                : '#1877F2'
                            }}>
                            {isIg ? 'IG' : 'FB'}
                          </div>
                          <div>
                            <span className="text-xs sm:text-sm font-black text-white block">
                              {activeConv.participant.name}
                            </span>
                            <span className="text-[10px] font-mono text-[#8B8FA8]">
                              {isIg ? 'Instagram Direct (@okmmotors)' : 'Facebook Messenger (SK automotores)'} • ID: {activeConv.participant.id}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#22C55E15] text-[#22C55E] border border-[#22C55E30]">
                          EN VIVO
                        </span>
                      </div>

                      {/* Chat Messages Scrollable Stream */}
                      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
                        {activeConv.messages.length === 0 ? (
                          <div className="p-4 rounded-xl bg-[#13161F] border border-[#1F2337] text-xs text-[#8B8FA8] text-center">
                            Conversación abierta. Podés redactar y enviar un mensaje a continuación.
                          </div>
                        ) : (
                          activeConv.messages.map((m: any, idx: number) => {
                            const isAgency = m.isFromAgency

                            return (
                              <div
                                key={m.id || idx}
                                className={`flex flex-col ${isAgency ? 'items-end' : 'items-start'}`}>
                                <span className="text-[10px] text-[#7E849B] mb-1 px-1 font-mono">
                                  {isAgency ? (isIg ? '@okmmotors' : 'SK automotores') : activeConv.participant.name} • {new Date(m.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <div
                                  className={`max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed ${
                                    isAgency
                                      ? isIg
                                        ? 'bg-[#E1306C18] border border-[#E1306C40] text-white rounded-br-none'
                                        : 'bg-[#1877F218] border border-[#1877F240] text-white rounded-br-none'
                                      : 'bg-[#161924] border border-[#242A3D] text-[#F1F5F9] rounded-bl-none'
                                  }`}>
                                  {m.text}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>

                      {/* Chat Composer & AI Suggester */}
                      <div className="p-3.5 sm:p-4 border-t border-[#1F2337] bg-[#0E1017] flex flex-col gap-2.5">
                        {/* AI Suggest Button */}
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={handleSuggestAIDirectMessage}
                            disabled={isGeneratingDMAI}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#FACC15] bg-[#FACC1510] hover:bg-[#FACC1520] border border-[#FACC1530] transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50">
                            {isGeneratingDMAI ? (
                              <>
                                <Loader2 size={13} className="animate-spin" />
                                <span>Analizando conversación con Gemini...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles size={13} />
                                <span>⚡ Sugerir Respuesta Comercial con IA</span>
                              </>
                            )}
                          </button>
                          <span className="text-[10px] text-[#8B8FA8] font-mono">
                            Envío oficial vía Meta Graph API
                          </span>
                        </div>

                        {/* Input Row */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={dmReplyDraft}
                            onChange={e => setDmReplyDraft(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSendDirectMessage()
                              }
                            }}
                            placeholder="Escribe un mensaje directo para enviar al cliente..."
                            className="input flex-1 p-3 text-xs sm:text-sm font-medium bg-[#13161F]"
                          />

                          <button
                            type="button"
                            onClick={handleSendDirectMessage}
                            disabled={isSendingDM || !dmReplyDraft.trim()}
                            className="px-5 py-3 rounded-xl text-xs sm:text-sm font-black text-white disabled:opacity-40 transition-all flex items-center gap-2 shadow-lg hover:scale-105"
                            style={{
                              background: isIg
                                ? 'linear-gradient(45deg, #f09433 0%, #dc2743 50%, #bc1888 100%)'
                                : '#1877F2'
                            }}>
                            {isSendingDM ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Send size={16} />
                            )}
                            <span className="hidden sm:inline">{isSendingDM ? 'Enviando...' : 'Enviar'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

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

      {/* Modal for Facebook Fan Page Connection & OAuth Setup - Centered in Viewport */}
      {mounted && showFbAuthModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
          onClick={() => setShowFbAuthModal(false)}>
          <div className="card w-full max-w-lg p-6 sm:p-7 flex flex-col gap-6 shadow-2xl relative overflow-hidden my-auto"
            style={{ background: '#0F1117', border: '1px solid #1877F2A0', boxShadow: '0 0 50px rgba(24, 119, 242, 0.25)' }}
            onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-lg"
                  style={{ background: '#1877F2', boxShadow: '0 0 20px rgba(24, 119, 242, 0.5)' }}>
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    {isFbConnected ? 'Gestionar Facebook Fan Page' : 'Conectar Facebook Fan Page'}
                  </h3>
                  <p className="text-xs font-semibold text-[#8B8FA8]">Meta Graph API Oficial • Costo $0</p>
                </div>
              </div>
              <button onClick={() => setShowFbAuthModal(false)} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#1E2130] text-[#8B8FA8] transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* If Connected: Show Fan Page Details & Actions */}
            {isFbConnected ? (
              <div className="flex flex-col gap-4">
                {/* Connected Fan Page Card */}
                <div className="p-4 rounded-2xl bg-[#13161F] border border-[#22C55E40] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-[#22C55E] animate-pulse" />
                    <div>
                      <span className="text-sm font-black text-white block">
                        {fbPageName || 'Fan Page Conectada'}
                      </span>
                      {fbPageId && (
                        <span className="text-[10px] font-mono text-[#8B8FA8]">ID: {fbPageId}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#22C55E20] text-[#22C55E] border border-[#22C55E40]">
                    OFICIAL META
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0B0D13] border border-[#1F2337] flex flex-col gap-1.5 text-xs text-[#9CA3AF]">
                  <p className="text-white font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-[#22C55E]" />
                    <span>Publicación automática activa</span>
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    Tus vehículos se publicarán como álbumes multi-foto respetando el orden estricto de swipe (3/4 perfil, tablero, confort, mecánica y baúl) y con copys optimizados para el gatillo &quot;Ver más&quot;.
                  </p>
                </div>

                {/* Webhooks en Tiempo Real & Telegram */}
                <div className="p-3.5 rounded-xl bg-[#0088cc10] border border-[#0088cc30] flex flex-col gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[#0088cc20] text-[#0088cc] flex items-center justify-center font-bold">
                        <Send size={13} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">Webhooks & Alertas Telegram</span>
                        <span className="text-[10px] text-[#8B8FA8]">Notificación push instantánea ante comentarios</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#22C55E20] text-[#22C55E] border border-[#22C55E40]">
                      ACTIVO
                    </span>
                  </div>
                  <p className="text-[11px] text-[#A0A5BD] leading-relaxed">
                    Cuando un usuario comenta una publicación de Facebook, el sistema genera una sugerencia con IA, te envía una alerta al Telegram y registra el lead en el CRM.
                  </p>
                  <button
                    type="button"
                    disabled={isTestingWebhook}
                    onClick={() => handleTriggerTestWebhook('facebook')}
                    className="w-full mt-1 py-2 px-3 rounded-lg bg-[#0088cc20] hover:bg-[#0088cc35] text-[#38bdf8] border border-[#0088cc40] text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {isTestingWebhook ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Enviando prueba a Telegram...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={13} className="text-[#38bdf8]" />
                        <span>⚡ Probar Notificación en Telegram</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#1F2337]">
                  {fbPageLink && (
                    <a
                      href={fbPageLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#1A1D28] hover:bg-[#252838] border border-[#1877F240] transition-all flex items-center justify-center gap-1.5">
                      <ExternalLink size={14} />
                      <span>Ver Fan Page</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleDisconnectFacebook}
                    className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-[#EF4444] bg-[#EF444415] hover:bg-[#EF444425] border border-[#EF444430] transition-all flex items-center justify-center gap-1.5">
                    <Power size={14} />
                    <span>Desconectar</span>
                  </button>
                </div>
              </div>
            ) : (
              /* If Not Connected: Explanation & Connect OAuth Button */
              <div className="flex flex-col gap-4">
                <div className="p-4 rounded-2xl bg-[#13161F] border border-[#1F2337] flex flex-col gap-2 text-xs text-[#8B8FA8]">
                  <p className="text-white font-bold text-sm flex items-center gap-1.5">
                    <Sparkles size={16} className="text-[#1877F2]" />
                    <span>Conexión Oficial con Meta Graph API</span>
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    Al hacer clic en el botón de abajo, iniciarás sesión de forma segura con tu cuenta de Facebook administradora para seleccionar qué Fan Page vincular.
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#A0A5BD] mt-1">
                    <li>Publicación 100% directa en la Fan Page oficial sin extensiones.</li>
                    <li>Fotos en secuencia de retención y dwell time.</li>
                    <li>Costo operativo $0 de por vida (ofrecido por Meta).</li>
                  </ul>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleConnectFacebook}
                    className="w-full px-5 py-3.5 rounded-xl text-sm font-black text-white bg-[#1877F2] hover:bg-[#166fe5] shadow-lg transition-all flex items-center justify-center gap-2 hover:scale-[1.02] cursor-pointer"
                    style={{ boxShadow: '0 0 25px rgba(24, 119, 242, 0.4)' }}>
                    <Link2 size={18} />
                    <span>Conectar Fan Page con Facebook</span>
                  </button>

                  <p className="text-[10px] text-center text-[#555870] font-mono">
                    App ID: 698965819554650 (Automotores.s.a.)
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>,
        document.body
      )}

      {/* Modal for Instagram Business Connection & Management - Centered in Viewport */}
      {mounted && showIgAuthModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
          onClick={() => setShowIgAuthModal(false)}>
          <div className="card w-full max-w-lg p-6 sm:p-7 flex flex-col gap-6 shadow-2xl relative overflow-hidden my-auto"
            style={{ background: '#0F1117', border: '1px solid #E1306CA0', boxShadow: '0 0 50px rgba(225, 48, 108, 0.25)' }}
            onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-lg"
                  style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', boxShadow: '0 0 20px rgba(225, 48, 108, 0.5)' }}>
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    {isIgConnected ? 'Gestionar Instagram Oficial' : 'Conectar Instagram Oficial'}
                  </h3>
                  <p className="text-xs font-semibold text-[#8B8FA8]">Instagram Graph API Oficial • Costo $0</p>
                </div>
              </div>
              <button onClick={() => setShowIgAuthModal(false)} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#1E2130] text-[#8B8FA8] transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* If Connected: Show Instagram Details & Actions */}
            {isIgConnected ? (
              <div className="flex flex-col gap-4">
                {/* Connected Instagram Profile Card */}
                <div className="p-4 rounded-2xl bg-[#13161F] border border-[#22C55E40] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {igProfilePic ? (
                      <img
                        src={igProfilePic}
                        alt=""
                        className="w-10 h-10 rounded-full border border-[#E1306C60] object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-sm"
                        style={{ background: 'linear-gradient(45deg, #f09433 0%, #dc2743 50%, #bc1888 100%)' }}>
                        IG
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-black text-white block">
                        @{igUsername || 'okmmotors'}
                      </span>
                      <span className="text-[10px] font-mono text-[#8B8FA8]">
                        {igFollowers > 0 ? `${igFollowers.toLocaleString('es-AR')} seguidores • ` : ''}ID: 17841474277477470
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#22C55E20] text-[#22C55E] border border-[#22C55E40]">
                    OFICIAL META
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0B0D13] border border-[#1F2337] flex flex-col gap-1.5 text-xs text-[#9CA3AF]">
                  <p className="text-white font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-[#22C55E]" />
                    <span>Publicación automática de carruseles activa</span>
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    Tus vehículos se publican en carrusel swipe directamente al feed de Instagram con copy estructurado, valor del anticipo mínimo y hashtags automáticos de automotor.
                  </p>
                </div>

                {/* Webhooks en Tiempo Real & Telegram */}
                <div className="p-3.5 rounded-xl bg-[#0088cc10] border border-[#0088cc30] flex flex-col gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[#0088cc20] text-[#0088cc] flex items-center justify-center font-bold">
                        <Send size={13} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">Webhooks & Alertas Telegram</span>
                        <span className="text-[10px] text-[#8B8FA8]">Notificación push instantánea ante comentarios y menciones</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#22C55E20] text-[#22C55E] border border-[#22C55E40]">
                      ACTIVO
                    </span>
                  </div>
                  <p className="text-[11px] text-[#A0A5BD] leading-relaxed">
                    Cuando un usuario comenta un post o reel en Instagram, el sistema genera una sugerencia con IA, te envía una alerta al Telegram y registra el lead en el CRM.
                  </p>
                  <button
                    type="button"
                    disabled={isTestingWebhook}
                    onClick={() => handleTriggerTestWebhook('instagram')}
                    className="w-full mt-1 py-2 px-3 rounded-lg bg-[#0088cc20] hover:bg-[#0088cc35] text-[#38bdf8] border border-[#0088cc40] text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {isTestingWebhook ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Enviando prueba a Telegram...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={13} className="text-[#38bdf8]" />
                        <span>⚡ Probar Notificación en Telegram</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#1F2337]">
                  <a
                    href={igProfileUrl || `https://www.instagram.com/${igUsername || 'okmmotors'}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#1A1D28] hover:bg-[#252838] border border-[#E1306C40] transition-all flex items-center justify-center gap-1.5">
                    <ExternalLink size={14} />
                    <span>Ver Perfil (@{igUsername})</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleDisconnectInstagram}
                    className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-[#EF4444] bg-[#EF444415] hover:bg-[#EF444425] border border-[#EF444430] transition-all flex items-center justify-center gap-1.5">
                    <Power size={14} />
                    <span>Desconectar</span>
                  </button>
                </div>
              </div>
            ) : (
              /* If Not Connected: Explanation & Connect OAuth Button */
              <div className="flex flex-col gap-4">
                <div className="p-4 rounded-2xl bg-[#13161F] border border-[#1F2337] flex flex-col gap-2 text-xs text-[#8B8FA8]">
                  <p className="text-white font-bold text-sm flex items-center gap-1.5">
                    <Sparkles size={16} className="text-[#E1306C]" />
                    <span>Conexión Oficial con Instagram Graph API</span>
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    Vinculá tu cuenta de Instagram Business para publicar álbumes multi-foto y responder consultas automáticamente con Inteligencia Artificial.
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#A0A5BD] mt-1">
                    <li>Publicación oficial de carruseles de fotos en el Feed de Instagram.</li>
                    <li>Sincronización en vivo de likes y comentarios de clientes.</li>
                    <li>Respuestas inteligentes con IA y guardado de leads en CRM.</li>
                    <li>Costo operativo $0 (API oficial de Meta Developers).</li>
                  </ul>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleConnectInstagram}
                    className="w-full px-5 py-3.5 rounded-xl text-sm font-black text-white shadow-lg transition-all flex items-center justify-center gap-2 hover:scale-[1.02] cursor-pointer"
                    style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', boxShadow: '0 0 25px rgba(225, 48, 108, 0.4)' }}>
                    <Link2 size={18} />
                    <span>Conectar Instagram con Meta</span>
                  </button>

                  <p className="text-[10px] text-center text-[#555870] font-mono">
                    Cuenta objetivo: @okmmotors (17841474277477470)
                  </p>
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

      {/* Publications View: Cuadros vs Lista */}
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
                    const isLoading = activeTask?.id === v.ID
                    const coverImg = getVehicleCoverImage(v)
                    const isOkm = (v.Tipo_Vehiculo || '').toLowerCase() === '0km'
                    const pubKey = `${v.ID}_${selectedPlatform}`
                    const customPrice = pubStateMap[pubKey]?.customPrice

                    return (
                      <div
                        key={v.ID}
                        className="card group overflow-hidden flex flex-col transition-all duration-200 hover:border-[#3B82F680] hover:shadow-xl relative bg-[#13161F] border border-[#1F2337] rounded-2xl">
                        {/* Cover image container */}
                        <div
                          onClick={() => setDetailVehicle(v)}
                          title="Hacé clic para ver la ficha técnica completa del auto"
                          className="aspect-video w-full relative bg-[#0B0D13] overflow-hidden cursor-pointer">
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
                          <div
                            onClick={() => setDetailVehicle(v)}
                            title="Hacé clic para ver ficha técnica"
                            className="cursor-pointer">
                            <p className="text-sm font-extrabold uppercase text-white group-hover:text-[#3B82F6] transition-colors truncate">
                              {vehicleName(v)}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-[#8B8FA8] font-semibold">
                              {v.Año && <span>{v.Año}</span>}
                              {v.Año && !isOkm && v.Km !== undefined && <span>•</span>}
                              {!isOkm && v.Km !== undefined && <span>{Number(v.Km).toLocaleString('es-AR')} km</span>}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-[#1F2337] flex items-center justify-between gap-2">
                            {customPrice && customPrice > 0 ? (
                              <div
                                onClick={() => openPriceModal(v)}
                                title="Precio personalizado para esta publicación. Clic para editar."
                                className="cursor-pointer group/price flex flex-col">
                                <div className="flex items-center gap-1">
                                  <span className="text-sm sm:text-base font-black text-[#FACC15]">
                                    {formatPrice(customPrice)}
                                  </span>
                                  <Edit3 size={11} className="text-[#8B8FA8] group-hover/price:text-[#FACC15] transition-colors" />
                                </div>
                                <span className="text-[10px] font-medium text-[#7E849B] line-through">
                                  Stock: {formatPrice(v.Precio_Venta)}
                                </span>
                              </div>
                            ) : (
                              <div
                                onClick={() => openPriceModal(v)}
                                title="Precio de Stock. Clic para personalizar."
                                className="cursor-pointer group/price flex flex-col">
                                <span className="text-[10px] font-bold text-[#8B8FA8] flex items-center gap-1">
                                  <span>Precio</span>
                                  <Edit3 size={10} className="opacity-0 group-hover/price:opacity-100 transition-opacity" />
                                </span>
                                <span className="text-sm sm:text-base font-black text-[#FACC15] group-hover/price:underline">
                                  {formatPrice(v.Precio_Venta)}
                                </span>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => openPublishModal(v)}
                              disabled={activeTask !== null}
                              title="Publicar vehículo"
                              className="btn-primary text-xs font-extrabold px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5 justify-center hover:scale-105 cursor-pointer bg-[#2563EB] hover:bg-[#1D4ED8] text-white">
                              {isLoading ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Rocket size={13} />
                              )}
                              <span>{isLoading ? '...' : 'PUBLICAR'}</span>
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
        /* Publications Table (Vista Lista) */
        <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #1F2337', background: '#0F1117' }}>
                {['Vehículo', 'Precio', 'Acciones'].map(col => (
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
    
                        {/* Acciones: Botón Único y Centralizado PUBLICAR */}
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            onClick={() => openPublishModal(v)}
                            disabled={activeTask !== null}
                            title="Publicar vehículo (todas las plataformas y formatos)"
                            className="btn-primary text-xs sm:text-sm font-extrabold px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 justify-center hover:scale-105 cursor-pointer bg-[#2563EB] hover:bg-[#1D4ED8] text-white">
                            {isLoading ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <Rocket size={15} />
                            )}
                            <span>{isLoading ? 'Publicando...' : 'PUBLICAR'}</span>
                          </button>
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
      )}

      </div>
    </>
  )
}
