'use client'

import React, { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { Vehicle } from '@/lib/supabase/types'
import { vehicleName, formatPrice, formatKm, getAllVehiclePhotos } from '@/lib/utils'
import { CarReelComposition } from '@/components/reels/compositions/CarReelComposition'
import { ReelTemplateId } from '@/components/reels/types'
import {
  X, Play, Pause, RotateCcw, Download, Sparkles, Send, CheckCircle2,
  AlertCircle, Loader2, ExternalLink, Film, Smartphone, Video, Check, Image as ImageIcon,
  Maximize2, Minimize2, Sliders, Move, RotateCw, Eye, EyeOff, Plus, Minus, Pencil, Trash2,
  Bookmark, Copy, Bot, Music, Share2, Crown, Zap, Tag, FileText
} from 'lucide-react'
import { setExtensionStorage, isMobileDevice } from '@/lib/publisher'



// ─── DYNAMIC COPY & TEMPLATE SYSTEM FOR VEHICLE PUBLICATIONS ───────────────────
export const DEFAULT_CAPTION_TEMPLATE = `🔥 {TITULO} 🔥

📍 Año: {ANIO} | Kilometraje: {KM}
💰 Precio: {PRECIO}
💵 Anticipo desde {ANTICIPO} + Cuotas!
⚙️ Caja: {TRANSMISION} | Motor: {COMBUSTIBLE}
📍 Resistencia, chaco

📲 WhatsApp directo: https://wa.me/5493624750716

{HASHTAGS}`

export function getVehicleAnticipo(v: Vehicle | null): string {
  if (!v) return ''
  const rawEntrega = v.Precio_entrega ?? (v as any).precio_entrega ?? (v as any).Precio_Entrega
  if (typeof rawEntrega === 'string' && rawEntrega.trim() !== '') {
    return rawEntrega.trim().startsWith('$') ? rawEntrega.trim() : `$${rawEntrega.trim()}`
  }
  const numEntrega = typeof rawEntrega === 'number'
    ? rawEntrega
    : (parseFloat(String(rawEntrega || '0').replace(/[^0-9.-]/g, '')) || 0)

  if (numEntrega > 0) {
    return `$${Math.round(numEntrega).toLocaleString('es-AR')}`
  }

  // Fallback: 50% del precio de venta si no tiene Precio_entrega cargado
  const rawPrice = v.Precio_Venta ?? (v as any).precio ?? (v as any).Precio
  const numPrice = typeof rawPrice === 'number'
    ? rawPrice
    : (parseFloat(String(rawPrice || '0').replace(/[^0-9.-]/g, '')) || 0)

  if (numPrice > 0) {
    return `$${Math.round(numPrice * 0.5).toLocaleString('es-AR')}`
  }

  return ''
}

export function generateVehicleHashtags(v: Vehicle | null): string {
  if (!v) return '#resistencia #chaco'
  const cleanTag = (str?: string) => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
  const marcaTag = cleanTag(v.Marca)
  const modeloTag = cleanTag(v.Modelo)
  const versionTags = (v.Version || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .map(w => w.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean)
    .map(w => `#${w}`)

  return [
    marcaTag ? `#${marcaTag}` : '',
    modeloTag ? `#${modeloTag}` : '',
    ...(versionTags.length > 0 ? versionTags : []),
    '#resistencia',
    '#chaco'
  ].filter(Boolean).join(' ')
}

export function buildCaptionFromTemplate(template: string, v: Vehicle | null): string {
  if (!v) return template

  const vTitle = vehicleName(v).toUpperCase()
  const rawPrice = v.Precio_Venta ?? (v as any).precio ?? (v as any).Precio
  const numPrice = typeof rawPrice === 'number'
    ? rawPrice
    : (parseFloat(String(rawPrice || '0').replace(/[^0-9.-]/g, '')) || 0)
  const fPrice = numPrice > 0 ? `$${Math.round(numPrice).toLocaleString('es-AR')}` : 'Consultar'
  
  // Precio_entrega específico de este auto
  const antVal = getVehicleAnticipo(v)

  const vAnio = String(v.Año || (v as any).Anio || (v as any).anio || '2026')
  const rKm = v.Km !== undefined && v.Km !== null ? Number(v.Km) : null
  const is0 = rKm === 0 || (v as any)?.Condicion?.toLowerCase().includes('nuevo') || (v as any)?.Condicion?.toLowerCase().includes('0km') || (v as any)?.Es_0km
  const vKms = is0 ? '0km' : (rKm && rKm > 0 ? `${rKm.toLocaleString('es-AR')} km` : (v.Km ? formatKm(v.Km) : '0km'))
  const vTrans = v.Transmision || 'Automática'
  const vComb = v.Tipo_Combustible || 'Nafta'
  const vTags = generateVehicleHashtags(v)
  const anticipoLine = antVal ? `\n💵 Anticipo desde ${antVal} + Cuotas!` : ''

  // 1. Normalizar cualquier número fijo guardado en la línea de anticipo/entrega para que siempre use {ANTICIPO}
  // Esto destraba automáticamente cualquier plantilla que haya quedado guardada con un número fijo (como $34.800.000)
  let normalizedTpl = template
    .replace(/((?:Anticipo|Entrega)\s*(?:desde)?\s*:?\s*)\$[\d\.\,]+/gi, `$1{ANTICIPO}`)
    .replace(/(Precio\s*:?\s*)\$[\d\.\,]+/gi, `$1{PRECIO}`)

  return normalizedTpl
    .replace(/{TITULO}/g, vTitle)
    .replace(/{ANIO}/g, vAnio)
    .replace(/{KM}/g, vKms)
    .replace(/{PRECIO}/g, fPrice)
    .replace(/{ANTICIPO_LINE}/g, anticipoLine)
    .replace(/{ANTICIPO}/g, antVal)
    .replace(/{TRANSMISION}/g, vTrans)
    .replace(/{COMBUSTIBLE}/g, vComb)
    .replace(/{WHATSAPP_LINK}/g, 'https://wa.me/5493624750716')
    .replace(/{HASHTAGS}/g, vTags)
}

export function convertCaptionToTemplate(text: string, v: Vehicle | null): string {
  if (!v) return text

  let tpl = text

  // 1. Reemplazar cualquier importe numérico en la línea de anticipo/entrega con el comodín {ANTICIPO}
  tpl = tpl.replace(
    /((?:Anticipo|Entrega)\s*(?:desde)?\s*:?\s*)\$[\d\.\,]+/gi,
    `$1{ANTICIPO}`
  )

  // 2. Reemplazar precio con {PRECIO}
  tpl = tpl.replace(/(Precio\s*:?\s*)\$[\d\.\,]+/gi, `$1{PRECIO}`)

  // 3. Reemplazar año y km
  tpl = tpl.replace(/(Año\s*:?\s*)[0-9]{4}/gi, '$1{ANIO}')
  tpl = tpl.replace(/(Kilometraje\s*:?\s*)[^|\n]+/gi, '$1{KM} ')

  // 4. Reemplazar título
  if (v) {
    const vTitle = vehicleName(v).toUpperCase()
    if (vTitle && tpl.includes(vTitle)) {
      tpl = tpl.replace(vTitle, '{TITULO}')
    }
  }
  tpl = tpl.replace(/🔥\s*[^🔥\n]+\s*🔥/, '🔥 {TITULO} 🔥')

  // 5. Reemplazar hashtags
  const lines = tpl.split('\n')
  const replacedLines = lines.map(line => {
    if (line.includes('#resistencia') && line.includes('#chaco')) {
      return '{HASHTAGS}'
    }
    return line
  })
  tpl = replacedLines.join('\n')

  return tpl
}

export interface ParsedCaptionInfo {
  title?: string
  year?: string
  km?: string
  price?: string
  anticipo?: string
  transmission?: string
  fuel?: string
}

export function parseCaptionDetails(captionText: string): ParsedCaptionInfo {
  const info: ParsedCaptionInfo = {}
  if (!captionText) return info

  const lines = captionText.split('\n').map(l => l.trim()).filter(Boolean)

  for (const line of lines) {
    // 1. Título principal (con fuego 🔥 o primer renglón)
    if (line.includes('🔥')) {
      const cleanTitle = line.replace(/🔥/g, '').trim()
      if (cleanTitle) {
        info.title = cleanTitle
      }
    }

    // 2. Año y Kilometraje: 📍 Año: 2026 | Kilometraje: 1.000 km
    if (line.includes('Año:') || line.includes('Kilometraje:')) {
      const yearMatch = line.match(/Año:\s*([0-9]{4})/i)
      if (yearMatch) info.year = yearMatch[1]

      const kmMatch = line.match(/Kilometraje:\s*([^|#\n]+)/i)
      if (kmMatch) info.km = kmMatch[1].trim()
    }

    // 3. Precio: 💰 Precio: $30.500.000
    if (line.includes('Precio:')) {
      const priceMatch = line.match(/Precio:\s*([^|\n#]+)/i)
      if (priceMatch) info.price = priceMatch[1].trim()
    }

    // 4. Anticipo / Entrega: 💵 Anticipo desde $15.250.000 + Cuotas!
    if (line.includes('Anticipo') || line.includes('anticipo') || line.includes('💵') || line.includes('Entrega') || line.includes('entrega')) {
      let cleanAnt = line
        .replace(/^[💵\s*•\-\*]+/g, '')
        .replace(/^anticipo\s*(desde)?\s*:?\s*/i, '')
        .replace(/^entrega\s*(desde)?\s*:?\s*/i, '')
        .trim()
      if (cleanAnt.includes('|')) {
        cleanAnt = cleanAnt.split('|')[0].trim()
      }
      if (cleanAnt) {
        info.anticipo = cleanAnt
      }
    }

    // 5. Caja y Motor: ⚙️ Caja: Transmisión automática | Motor: Diésel
    if (line.includes('Caja:') || line.includes('Transmisión:') || line.includes('Motor:')) {
      const transMatch = line.match(/(?:Caja|Transmisi[óo]n):\s*([^|#\n]+)/i)
      if (transMatch) info.transmission = transMatch[1].trim()

      const fuelMatch = line.match(/Motor:\s*([^|#\n]+)/i)
      if (fuelMatch) info.fuel = fuelMatch[1].trim()
    }
  }

  return info
}

export interface VideoReelModalHandle {
  publish: (destination?: PublishDestination) => Promise<void>
}

export interface VideoReelModalProps {
  vehicle: Vehicle | null
  platform?: string | null
  onClose?: () => void
  onSuccess?: () => void
  inline?: boolean
  selectedPhotos?: string[]
}

export type PublishDestination = 'ig_reel' | 'ig_story' | 'fb_reel' | 'fb_story' | 'fb_feed' | 'wa_story' | 'tiktok' | 'download' | 'audio_redirect'

export const VideoReelModal = forwardRef<VideoReelModalHandle, VideoReelModalProps>(
  function VideoReelModal({ vehicle, platform, onClose, onSuccess, inline = false, selectedPhotos }: VideoReelModalProps, ref) {
  const isFacebook = platform === 'FB' || (platform as any) === 'FB_PAGE' || (platform as any) === 'FB_REEL'
  const isWhatsApp = platform === 'WA' || platform === 'WHATSAPP' || (platform as any) === 'WHATSAPP_STATUS'
  const isTikTok = platform === 'TIKTOK' || (platform as any) === 'TT'
  const [mounted, setMounted] = useState<boolean>(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameId = useRef<number | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Lock body, html, and background scroll containers so no scrollbar remains when modal is open
  useEffect(() => {
    if (inline || !vehicle) return

    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlOverflow = document.documentElement.style.overflow

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    // Disable overflow on any background scroll containers in the dashboard
    const scrollContainers = Array.from(
      document.querySelectorAll<HTMLElement>('.overflow-y-auto, [data-scroll-container]')
    )
    const prevContainerStyles: { el: HTMLElement; overflow: string }[] = []

    scrollContainers.forEach(el => {
      if (!el.closest('.video-reel-modal-container')) {
        prevContainerStyles.push({ el, overflow: el.style.overflow })
        el.style.overflow = 'hidden'
      }
    })

    return () => {
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.overflow = prevHtmlOverflow
      prevContainerStyles.forEach(({ el, overflow }) => {
        el.style.overflow = overflow
      })
    }
  }, [vehicle])

  // Player & Generation states
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const currentTimeRef = useRef<number>(0) // ref para leer sin stale closures en RAF
  const [duration, setDuration] = useState<number>(6) // 1s per photo + outro
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [isPublishing, setIsPublishing] = useState<boolean>(false)
  const [recordingProgress, setRecordingProgress] = useState<number>(0)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)
  const [publishedType, setPublishedType] = useState<string | null>(null)
  const [showAudioRedirectModal, setShowAudioRedirectModal] = useState<boolean>(false)
  const [audioRedirectVideoUrl, setAudioRedirectVideoUrl] = useState<string | null>(null)
  const [audioRedirectFileName, setAudioRedirectFileName] = useState<string>('')
  const [copiedCaptionSuccess, setCopiedCaptionSuccess] = useState<boolean>(false)

  // Mantener currentTimeRef sincronizado para evitar stale closures en el loop RAF
  useEffect(() => { currentTimeRef.current = currentTime }, [currentTime])

  // Reset publication and notification states whenever vehicle changes or modal opens
  useEffect(() => {
    setStatusMessage('')
    setErrorMessage(null)
    setPublishedUrl(null)
    setPublishedType(null)
    setIsPublishing(false)
    setIsRecording(false)
    setShowAudioRedirectModal(false)
    setAudioRedirectVideoUrl(null)
    setAudioRedirectFileName('')
    setCopiedCaptionSuccess(false)
  }, [vehicle])

  const handleClose = () => {
    setStatusMessage('')
    setErrorMessage(null)
    setPublishedUrl(null)
    setPublishedType(null)
    setIsPublishing(false)
    setIsRecording(false)
    setShowAudioRedirectModal(false)
    setAudioRedirectVideoUrl(null)
    setAudioRedirectFileName('')
    setCopiedCaptionSuccess(false)
    onClose?.()
  }

  // Copywriting state & Auto-sync across vehicles
  const [caption, setCaption] = useState<string>('')
  const [isGeneratingCopy, setIsGeneratingCopy] = useState<boolean>(false)
  const [hasSavedTemplateNotice, setHasSavedTemplateNotice] = useState<boolean>(false)
  const savedNoticeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleCaptionChange = (newText: string) => {
    setCaption(newText)
    if (vehicle && newText.includes('\n')) {
      const tpl = convertCaptionToTemplate(newText, vehicle)
      try {
        localStorage.setItem('okm_custom_caption_template_v1', tpl)
        setHasSavedTemplateNotice(true)
        if (savedNoticeTimeoutRef.current) clearTimeout(savedNoticeTimeoutRef.current)
        savedNoticeTimeoutRef.current = setTimeout(() => setHasSavedTemplateNotice(false), 2200)
      } catch (e) {}
    }
  }

  const handleResetCaptionTemplate = () => {
    try {
      localStorage.removeItem('okm_custom_caption_template_v1')
    } catch (e) {}
    if (vehicle) {
      const defaultText = buildCaptionFromTemplate(DEFAULT_CAPTION_TEMPLATE, vehicle)
      setCaption(defaultText)
      setHasSavedTemplateNotice(false)
    }
  }

  // Fit mode state: 'contain' (full vehicle with cinematic ambient blur) vs 'cover' (full-bleed crop)
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain')


  // Loaded images cache
  const loadedImagesRef = useRef<HTMLImageElement[]>([])
  const [imagesReady, setImagesReady] = useState<boolean>(false)

  // ✅ Cache de fondos blureados pre-renderizados a escala reducida (72×128 → se escala al dibujar)
  // El blur hace invisible la diferencia de resolución, pero es 100x más rápido de pre-renderizar
  const blurredBgCacheRef = useRef<HTMLCanvasElement[]>([])

  const preRenderBlurredBg = (imgs: HTMLImageElement[]) => {
    // Usar escala de alta fidelidad 180×320 con filtro bicúbico
    const SW = 180
    const SH = 320
    blurredBgCacheRef.current = imgs.map(img => {
      const offscreen = document.createElement('canvas')
      offscreen.width = SW
      offscreen.height = SH
      const octx = offscreen.getContext('2d')
      if (!octx || !img.naturalWidth) return offscreen
      octx.imageSmoothingEnabled = true
      octx.imageSmoothingQuality = 'high'
      const imgRatio = img.naturalWidth / img.naturalHeight
      let bgW = SW
      let bgH = SW / imgRatio
      if (bgH < SH) { bgH = SH; bgW = SH * imgRatio }
      if ('filter' in octx) {
        octx.filter = 'blur(10px) brightness(0.68) saturate(1.2)'
      }
      octx.drawImage(img, (SW - bgW) / 2, (SH - bgH) / 2, bgW, bgH)
      if ('filter' in octx) { octx.filter = 'none' }
      return offscreen
    })
  }

  // Preloaded Okmmotors official oval emblem
  const logoImageRef = useRef<HTMLImageElement | null>(null)
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = '/okmmotors_oval_logo.png'
    img.onload = () => {
      logoImageRef.current = img
    }
  }, [])

  // Active settings tab in right column ('editor' vs 'copy')
  const [activeRightTab, setActiveRightTab] = useState<'editor' | 'copy'>('editor')

  // Editable content states for Vehicle Details Card
  const [customTitle, setCustomTitle] = useState<string>('')
  const [customBadge1, setCustomBadge1] = useState<string>('')
  const [customBadge2, setCustomBadge2] = useState<string>('')
  const [customBadge3, setCustomBadge3] = useState<string>('')
  const [customPriceText, setCustomPriceText] = useState<string>('')
  const [customAnticipoText, setCustomAnticipoText] = useState<string>('')
  const [showAnticipoBanner, setShowAnticipoBanner] = useState<boolean>(true)

  // Editable content states for Outro Slide
  const [customOutroTitle, setCustomOutroTitle] = useState<string>('¡TU PRÓXIMO AUTO ESTÁ ACÁ!')
  const [customOutroBullet1, setCustomOutroBullet1] = useState<string>('✨ Unidades seleccionadas y peritadas')
  const [customOutroBullet2, setCustomOutroBullet2] = useState<string>('📄 Documentación 100% al día')
  const [customOutroBullet3, setCustomOutroBullet3] = useState<string>('🤝 Tomamos tu vehículo usado')
  const [customOutroBullet4, setCustomOutroBullet4] = useState<string>('⚡ Financiación a medida en el acto')
  const [customOutroCTA, setCustomOutroCTA] = useState<string>('💬 ENVIANOS UN MENSAJE DIRECTO')
  const [customOutroContact, setCustomOutroContact] = useState<string>(isFacebook ? 'Seguinos en Facebook: Okmmotors' : 'Seguinos en Instagram: @okmmotors')
  const [customOutroAddress, setCustomOutroAddress] = useState<string>('')

  useEffect(() => {
    if (isFacebook) {
      setCustomOutroContact('Seguinos en Facebook: Okmmotors')
    } else {
      setCustomOutroContact('Seguinos en Instagram: @okmmotors')
    }
  }, [isFacebook, vehicle])

  // Size, Location and Scale states for INDEPENDENT elements
  interface ElementTransform {
    x: number
    y: number
    scale: number
    visible: boolean
  }

  interface ReelTemplate {
    id: string
    name: string
    isSystem?: boolean
    badge1Template?: string
    badge2Template?: string
    badge3Template?: string
    anticipoTemplate?: string
    priceTemplate?: string
    showAnticipo: boolean
    titleTransform: ElementTransform
    badge1Transform: ElementTransform
    badge2Transform: ElementTransform
    badge3Transform: ElementTransform
    anticipoTransform: ElementTransform
    priceTransform: ElementTransform
    outroBgStyle?: OutroBgStyle
    priceBtnStyle?: PriceButtonStyle
    customOutroTitle?: string
    customOutroBullet1?: string
    customOutroBullet2?: string
    customOutroBullet3?: string
    customOutroBullet4?: string
    customOutroCTA?: string
    customOutroContact?: string
    customOutroAddress?: string
    customLayers?: CustomLayer[]
    activeTheme?: string
    slideDuration?: number
  }

  interface CustomLayer {
    id: string
    type: 'ribbon' | 'badge' | 'banner' | 'text'
    text: string
    position?: 'top-right' | 'top-center' | 'top-left' | 'bottom-banner' | 'above-price' | 'custom'
    x?: number
    y?: number
    bgColor?: string
    textColor?: string
    borderColor?: string
    fontSize?: number
    showOn?: 'photos' | 'outro' | 'all'
  }

  interface ChatMessage {
    id: string
    role: 'user' | 'assistant'
    text: string
    copy?: string | null
    actionsApplied?: string[]
  }

  interface OutroBgStyle {
    type: 'gradient' | 'solid'
    c1: string
    c2?: string
    isLight: boolean
    label?: string
  }

  interface PriceButtonStyle {
    from: string
    via: string
    to: string
    border: string
    label?: string
  }

  const [outroBgStyle, setOutroBgStyle] = useState<OutroBgStyle>({
    type: 'gradient',
    c1: '#0F172A',
    c2: '#020617',
    isLight: false
  })

  const [priceBtnStyle, setPriceBtnStyle] = useState<PriceButtonStyle>({
    from: '#1E3A8A',
    via: '#2563EB',
    to: '#1D4ED8',
    border: '#93C5FD'
  })

  const [videoFilter, setVideoFilter] = useState<string>('none')
  const [slideDuration, setSlideDuration] = useState<number>(1.0)
  const [customLayers, setCustomLayers] = useState<CustomLayer[]>([])
  const [activeTheme, setActiveTheme] = useState<string>('default')

  const applyTheme = (themeName: string) => {
    setActiveTheme(themeName)
    if (themeName === 'sport-red') {
      setOutroBgStyle({ type: 'gradient', c1: '#450A0A', c2: '#0F0F1A', isLight: false, label: 'deportivo rojo' })
      setPriceBtnStyle({ from: '#DC2626', via: '#B91C1C', to: '#7F1D1D', border: '#FCA5A5', label: 'rojo sport' })
      setVideoFilter('contrast(115%) saturate(125%)')
    } else if (themeName === 'luxury-gold') {
      setOutroBgStyle({ type: 'gradient', c1: '#1C1917', c2: '#0C0A09', isLight: false, label: 'dorado premium' })
      setPriceBtnStyle({ from: '#F59E0B', via: '#D97706', to: '#78350F', border: '#FDE68A', label: 'dorado' })
      setVideoFilter('sepia(20%) saturate(120%)')
    } else if (themeName === 'dark-stealth') {
      setOutroBgStyle({ type: 'gradient', c1: '#0F172A', c2: '#020617', isLight: false, label: 'negro stealth' })
      setPriceBtnStyle({ from: '#0284C7', via: '#0369A1', to: '#0C4A6E', border: '#38BDF8', label: 'azul neón' })
      setVideoFilter('contrast(120%) brightness(0.95)')
    } else if (themeName === 'clean-white') {
      setOutroBgStyle({ type: 'solid', c1: '#F8FAFC', isLight: true, label: 'blanco puro' })
      setPriceBtnStyle({ from: '#2563EB', via: '#1D4ED8', to: '#1E3A8A', border: '#93C5FD', label: 'azul royal' })
      setVideoFilter('none')
    } else if (themeName === 'electric-cyan') {
      setOutroBgStyle({ type: 'gradient', c1: '#082F49', c2: '#020617', isLight: false, label: 'celeste eléctrico' })
      setPriceBtnStyle({ from: '#06B6D4', via: '#0891B2', to: '#164E63', border: '#67E8F9', label: 'cyan' })
      setVideoFilter('saturate(130%)')
    }
  }

  const [titleTransform, setTitleTransform] = useState<ElementTransform>({ x: 0, y: 0, scale: 1.0, visible: true })
  const [badge1Transform, setBadge1Transform] = useState<ElementTransform>({ x: 0, y: 0, scale: 1.0, visible: true })
  const [badge2Transform, setBadge2Transform] = useState<ElementTransform>({ x: 0, y: 0, scale: 1.0, visible: true })
  const [badge3Transform, setBadge3Transform] = useState<ElementTransform>({ x: 0, y: 0, scale: 1.0, visible: true })
  const [priceTransform, setPriceTransform] = useState<ElementTransform>({ x: 0, y: 0, scale: 1.0, visible: true })
  const [anticipoTransform, setAnticipoTransform] = useState<ElementTransform>({ x: 0, y: 0, scale: 1.0, visible: true })

  // Currently selected element on canvas ('title' | 'badge1' | 'badge2' | 'badge3' | 'price' | 'anticipo')
  type ReelElementId = 'title' | 'badge1' | 'badge2' | 'badge3' | 'price' | 'anticipo'
  const [selectedElement, setSelectedElement] = useState<ReelElementId | null>(null)

  // Active inline field being edited directly on the reel (WYSIWYG)
  type EditingField = 'title' | 'price' | 'anticipo' | 'badge1' | 'badge2' | 'badge3' | 'outroTitle' | 'outroCTA' | 'outroContact' | null
  const [editingField, setEditingField] = useState<EditingField>(null)

  // Dragging state
  const [isDraggingCard, setIsDraggingCard] = useState<boolean>(false)
  const activeDraggedElemRef = useRef<ReelElementId | null>(null)
  const dragStartMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const dragStartTransformRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const hasDraggedRef = useRef<boolean>(false)

  // Vehicle data preparation
  const title = vehicle ? vehicleName(vehicle) : 'Vehículo Seleccionado'
  const numericPrice = vehicle
    ? (typeof vehicle.Precio_Venta === 'number'
        ? vehicle.Precio_Venta
        : parseFloat(vehicle.Precio_Venta || '0') || 0)
    : 0

  const formattedPrice = numericPrice > 0 ? `$${numericPrice.toLocaleString('es-AR')}` : 'Consultar'
  const entrega50 = vehicle?.Precio_entrega
    ? (typeof vehicle.Precio_entrega === 'string' && vehicle.Precio_entrega.trim() !== ''
        ? (vehicle.Precio_entrega.trim().startsWith('$') ? vehicle.Precio_entrega.trim() : `$${vehicle.Precio_entrega.trim()}`)
        : (Number(vehicle.Precio_entrega) > 0 ? `$${Number(vehicle.Precio_entrega).toLocaleString('es-AR')}` : null))
    : (numericPrice > 0 ? `$${Math.round(numericPrice * 0.5).toLocaleString('es-AR')}` : null)

  const anio = vehicle?.Año || (vehicle as any)?.Anio || '2026'
  const rawKm = vehicle?.Km !== undefined && vehicle?.Km !== null ? Number(vehicle.Km) : null
  const is0km = rawKm === 0 || (vehicle as any)?.Condicion?.toLowerCase().includes('nuevo') || (vehicle as any)?.Condicion?.toLowerCase().includes('0km') || (vehicle as any)?.Es_0km
  const kms = is0km ? '0km' : (rawKm && rawKm > 0 ? `${rawKm.toLocaleString('es-AR')} km` : (vehicle?.Km ? formatKm(vehicle.Km) : '0km'))
  const transmision = vehicle?.Transmision || 'Automática'
  const combustible = vehicle?.Tipo_Combustible || 'Nafta'

  // Helper to measure text width accurately for dynamic box sizing ("acorde a la letra")
  const measureTextWidth = (text: string, font: string, padding: number = 0): number => {
    if (!text) return 30 + padding
    try {
      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.font = font
          return Math.round(ctx.measureText(text).width + padding)
        }
      }
    } catch (e) {}
    return Math.round(text.length * 11 + padding)
  }

  // Card coordinates for drawing & inline click-to-edit overlay
  const activeTitle = (customTitle || title).toUpperCase()
  const titleWords = activeTitle.split(' ')
  let titleLine1 = ''
  let titleLine2 = ''
  titleWords.forEach(word => {
    if ((titleLine1 + ' ' + word).trim().length < 23) {
      titleLine1 = (titleLine1 + ' ' + word).trim()
    } else {
      titleLine2 = (titleLine2 + ' ' + word).trim()
    }
  })

  // 1. Título del vehículo
  const titleTop = 792
  const titleBoxW = 660
  const titleBoxH = titleLine2 ? 98 : 54

  // 2. Insignias: Año más grande, Km ("0km" o "XX km"), Transmisión más grande (22px font, 48px alto)
  const badgeY = 740
  const badgeH = 48
  const maxRowW = 660
  const minBadgeGap = 12

  const rawB1 = measureTextWidth(customBadge1, 'bold 22px system-ui, sans-serif', 34)
  const rawB2 = measureTextWidth(customBadge2, 'bold 22px system-ui, sans-serif', 34)
  const rawB3 = measureTextWidth(customBadge3, 'bold 22px system-ui, sans-serif', 34)
  const totalBadgesW = rawB1 + rawB2 + rawB3 + minBadgeGap * 2

  let b1W = rawB1
  let b2W = rawB2
  let b3W = rawB3
  let actualGap = minBadgeGap
  if (totalBadgesW > maxRowW) {
    const ratio = (maxRowW - 16) / (rawB1 + rawB2 + rawB3)
    b1W = Math.floor(rawB1 * ratio)
    b2W = Math.floor(rawB2 * ratio)
    b3W = Math.floor(rawB3 * ratio)
    actualGap = 8
  }
  const b1BaseX = 30
  const b2BaseX = b1BaseX + b1W + actualGap
  const b3BaseX = b2BaseX + b2W + actualGap

  // ── Extraer en tiempo real los datos editados en el cuadro de publicación ──
  const parsedFromCaption = parseCaptionDetails(caption)

  // 1. Título y Marcas/Modelos del Video
  const videoTitle = parsedFromCaption.title || customTitle || title
  const rawBrand = (vehicle?.Marca && vehicle.Marca.toLowerCase() !== 'vehículo' && vehicle.Marca.toLowerCase() !== 'vehiculo')
    ? vehicle.Marca.trim().toUpperCase()
    : (videoTitle.split(' ')[0] || '').toUpperCase()
  const videoBrand = rawBrand
  let restModel = videoTitle.toUpperCase()
  if (rawBrand) {
    restModel = restModel.replace(new RegExp(`^${rawBrand}\\s*`, 'i'), '').trim()
  }
  const videoModelAndVersion = restModel || videoTitle.toUpperCase()

  // 2. Badges de Año, Km y Transmisión
  const videoYear = parsedFromCaption.year || String(anio)
  const videoKm = parsedFromCaption.km || kms
  const videoTransmission = parsedFromCaption.transmission || transmision
  const videoFuel = parsedFromCaption.fuel || combustible
  const transBadgeClean = videoTransmission.toUpperCase().replace(/^TRANSMISI[ÓO]N\s*/i, '').trim()
  const videoBadge1 = customBadge1 || `📅 ${videoYear}`
  const videoBadge2 = customBadge2 || videoKm
  const videoBadge3 = customBadge3 || `⚙️ TRANSMISIÓN ${transBadgeClean}`

  // 3. Anticipo / Usado Banner (EN EL MEDIO: entre insignias y precio. Prioridad a lo escrito en el cuadro)
  const activeAnticipo = parsedFromCaption.anticipo || customAnticipoText || (entrega50 ? `ANTICIPO DESDE ${entrega50} + cuotas tasa 0%` : '')
  const hasAnticipo = showAnticipoBanner && anticipoTransform.visible && Boolean(activeAnticipo)
  const anticipoY = badgeY + badgeH + 14
  const anticipoBoxW = 660
  const anticipoBoxH = 54
  const anticipoBaseX = 30

  // 4. Precio Contado Banner (ABAJO DE TODO: debajo de anticipo)
  const activePrice = parsedFromCaption.price ? `PRECIO CONTADO: ${parsedFromCaption.price}` : (customPriceText || `PRECIO CONTADO: ${formattedPrice}`)
  const priceY = hasAnticipo ? (anticipoY + anticipoBoxH + 14) : anticipoY
  const priceBoxW = 660
  const priceBoxH = 72
  const priceBaseX = 30

  // Helper to hit test which element was clicked/touched in 720x1280 coords
  const hitTest = (x: number, y: number): ReelElementId | null => {
    // 1. Price (Abajo)
    if (priceTransform.visible) {
      const pX = priceBaseX + priceTransform.x
      const pY = priceY + priceTransform.y
      if (x >= pX - 10 && x <= pX + priceBoxW + 10 && y >= pY - 10 && y <= pY + priceBoxH + 10) {
        return 'price'
      }
    }

    // 2. Anticipo (En el medio)
    if (hasAnticipo) {
      const aX = anticipoBaseX + anticipoTransform.x
      const aY = anticipoY + anticipoTransform.y
      if (x >= aX - 10 && x <= aX + anticipoBoxW + 10 && y >= aY - 10 && y <= aY + anticipoBoxH + 10) {
        return 'anticipo'
      }
    }

    // 3. Badges: 3 bloquecitos separados e independientes acorde a su texto
    // 3.1 Badge 1 (Año)
    if (badge1Transform.visible && customBadge1) {
      const b1X = b1BaseX + badge1Transform.x
      const b1Y = badgeY + badge1Transform.y
      if (x >= b1X - 10 && x <= b1X + b1W + 10 && y >= b1Y - 10 && y <= b1Y + badgeH + 10) {
        return 'badge1'
      }
    }

    // 3.2 Badge 2 (Km)
    if (badge2Transform.visible && customBadge2) {
      const b2X = b2BaseX + badge2Transform.x
      const b2Y = badgeY + badge2Transform.y
      if (x >= b2X - 10 && x <= b2X + b2W + 10 && y >= b2Y - 10 && y <= b2Y + badgeH + 10) {
        return 'badge2'
      }
    }

    // 3.3 Badge 3 (Transmisión)
    if (badge3Transform.visible && customBadge3) {
      const b3X = b3BaseX + badge3Transform.x
      const b3Y = badgeY + badge3Transform.y
      if (x >= b3X - 10 && x <= b3X + b3W + 10 && y >= b3Y - 10 && y <= b3Y + badgeH + 10) {
        return 'badge3'
      }
    }

    // 4. Title
    if (titleTransform.visible) {
      const tX = 30 + titleTransform.x
      const tY = titleTop + titleTransform.y
      if (x >= tX - 10 && x <= tX + titleBoxW + 10 && y >= tY - 10 && y <= tY + titleBoxH + 10) {
        return 'title'
      }
    }

    return null
  }

  // Mouse drag & drop handlers for moving elements INDEPENDENTLY
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = 720 / rect.width
    const scaleY = 1280 / rect.height
    const clickX = (e.clientX - rect.left) * scaleX
    const clickY = (e.clientY - rect.top) * scaleY

    const hit = hitTest(clickX, clickY)
    if (hit) {
      setIsDraggingCard(true)
      activeDraggedElemRef.current = hit
      setSelectedElement(hit)
      dragStartMousePosRef.current = { x: e.clientX, y: e.clientY }
      
      let cur = { x: 0, y: 0 }
      if (hit === 'title') cur = { x: titleTransform.x, y: titleTransform.y }
      else if (hit === 'badge1') cur = { x: badge1Transform.x, y: badge1Transform.y }
      else if (hit === 'badge2') cur = { x: badge2Transform.x, y: badge2Transform.y }
      else if (hit === 'badge3') cur = { x: badge3Transform.x, y: badge3Transform.y }
      else if (hit === 'price') cur = { x: priceTransform.x, y: priceTransform.y }
      else if (hit === 'anticipo') cur = { x: anticipoTransform.x, y: anticipoTransform.y }
      dragStartTransformRef.current = cur
      hasDraggedRef.current = false
    } else {
      setSelectedElement(null)
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const activeHit = activeDraggedElemRef.current
    if (!isDraggingCard || !activeHit) return

    const factorX = 720 / (canvasRef.current?.clientWidth || 270)
    const factorY = 1280 / (canvasRef.current?.clientHeight || 480)
    const deltaX = (e.clientX - dragStartMousePosRef.current.x) * factorX
    const deltaY = (e.clientY - dragStartMousePosRef.current.y) * factorY

    if (Math.hypot(deltaX, deltaY) > 4) {
      hasDraggedRef.current = true
    }

    const newX = Math.max(-280, Math.min(280, Math.round(dragStartTransformRef.current.x + deltaX)))
    const newY = Math.max(-600, Math.min(300, Math.round(dragStartTransformRef.current.y + deltaY)))

    if (activeHit === 'title') {
      setTitleTransform(prev => ({ ...prev, x: newX, y: newY }))
    } else if (activeHit === 'badge1') {
      setBadge1Transform(prev => ({ ...prev, x: newX, y: newY }))
    } else if (activeHit === 'badge2') {
      setBadge2Transform(prev => ({ ...prev, x: newX, y: newY }))
    } else if (activeHit === 'badge3') {
      setBadge3Transform(prev => ({ ...prev, x: newX, y: newY }))
    } else if (activeHit === 'price') {
      setPriceTransform(prev => ({ ...prev, x: newX, y: newY }))
    } else if (activeHit === 'anticipo') {
      setAnticipoTransform(prev => ({ ...prev, x: newX, y: newY }))
    }
  }

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const activeHit = activeDraggedElemRef.current
    setIsDraggingCard(false)
    activeDraggedElemRef.current = null

    if (!hasDraggedRef.current && activeHit) {
      setIsPlaying(false) // Frena la reproducción al hacer clic

      // Si ya estaba seleccionado, abrir editor directamente
      if (selectedElement === activeHit) {
        setEditingField(activeHit)
      } else {
        setSelectedElement(activeHit)
      }
    }
  }

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0 || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = 720 / rect.width
    const scaleY = 1280 / rect.height
    const clickX = (e.touches[0].clientX - rect.left) * scaleX
    const clickY = (e.touches[0].clientY - rect.top) * scaleY

    const hit = hitTest(clickX, clickY)
    if (hit) {
      setIsDraggingCard(true)
      activeDraggedElemRef.current = hit
      setSelectedElement(hit)
      dragStartMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      
      let cur = { x: 0, y: 0 }
      if (hit === 'title') cur = { x: titleTransform.x, y: titleTransform.y }
      else if (hit === 'badge1') cur = { x: badge1Transform.x, y: badge1Transform.y }
      else if (hit === 'badge2') cur = { x: badge2Transform.x, y: badge2Transform.y }
      else if (hit === 'badge3') cur = { x: badge3Transform.x, y: badge3Transform.y }
      else if (hit === 'price') cur = { x: priceTransform.x, y: priceTransform.y }
      else if (hit === 'anticipo') cur = { x: anticipoTransform.x, y: anticipoTransform.y }
      dragStartTransformRef.current = cur
      hasDraggedRef.current = false
    }
  }

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const activeHit = activeDraggedElemRef.current
    if (!isDraggingCard || !activeHit || e.touches.length === 0) return

    const factorX = 720 / (canvasRef.current?.clientWidth || 270)
    const factorY = 1280 / (canvasRef.current?.clientHeight || 480)
    const deltaX = (e.touches[0].clientX - dragStartMousePosRef.current.x) * factorX
    const deltaY = (e.touches[0].clientY - dragStartMousePosRef.current.y) * factorY

    if (Math.hypot(deltaX, deltaY) > 4) {
      hasDraggedRef.current = true
    }

    const newX = Math.max(-280, Math.min(280, Math.round(dragStartTransformRef.current.x + deltaX)))
    const newY = Math.max(-600, Math.min(300, Math.round(dragStartTransformRef.current.y + deltaY)))

    if (activeHit === 'title') {
      setTitleTransform(prev => ({ ...prev, x: newX, y: newY }))
    } else if (activeHit === 'badge1') {
      setBadge1Transform(prev => ({ ...prev, x: newX, y: newY }))
    } else if (activeHit === 'badge2') {
      setBadge2Transform(prev => ({ ...prev, x: newX, y: newY }))
    } else if (activeHit === 'badge3') {
      setBadge3Transform(prev => ({ ...prev, x: newX, y: newY }))
    } else if (activeHit === 'price') {
      setPriceTransform(prev => ({ ...prev, x: newX, y: newY }))
    } else if (activeHit === 'anticipo') {
      setAnticipoTransform(prev => ({ ...prev, x: newX, y: newY }))
    }
  }

  const handleCanvasTouchEnd = () => {
    const activeHit = activeDraggedElemRef.current
    setIsDraggingCard(false)
    activeDraggedElemRef.current = null

    if (!hasDraggedRef.current && activeHit) {
      setIsPlaying(false)
      setSelectedElement(activeHit)
    }
  }

  // ----------------------------------------------------
  // TEMPLATES SYSTEM (Book de Plantillas Automotrices)
  // ----------------------------------------------------
  const DEFAULT_TEMPLATES: ReelTemplate[] = [
    {
      id: 'tasa-0',
      name: '🏷️ Oportunidad Tasa 0%',
      isSystem: true,
      badge1Template: '📅 {ANIO}',
      badge2Template: '{KM}',
      badge3Template: '⚙️ TRANSMISIÓN {TRANSMISION}',
      anticipoTemplate: 'ANTICIPO DESDE {ANTICIPO} + cuotas tasa 0%',
      priceTemplate: 'PRECIO CONTADO: {PRECIO}',
      showAnticipo: true,
      titleTransform: { x: 0, y: 0, scale: 1.0, visible: true },
      badge1Transform: { x: 0, y: 0, scale: 1.0, visible: true },
      badge2Transform: { x: 0, y: 0, scale: 1.0, visible: true },
      badge3Transform: { x: 0, y: 0, scale: 1.0, visible: true },
      anticipoTransform: { x: 0, y: 0, scale: 1.0, visible: true },
      priceTransform: { x: 0, y: 0, scale: 1.0, visible: true },
      slideDuration: 1.4,
      activeTheme: 'default',
      priceBtnStyle: { from: '#059669', via: '#10B981', to: '#047857', border: '#6EE7B7' },
    },
    {
      id: 'cinematic-broll',
      name: '🏎️ Cinematic Showroom B-Roll',
      isSystem: true,
      badge1Template: '{ANIO}',
      badge2Template: '{KM}',
      badge3Template: '{TRANSMISION}',
      anticipoTemplate: 'Anticipo desde {ANTICIPO}',
      priceTemplate: '{PRECIO}',
      showAnticipo: false,
      titleTransform: { x: 0, y: 0, scale: 1.0, visible: true },
      badge1Transform: { x: 0, y: 0, scale: 1.0, visible: true },
      badge2Transform: { x: 0, y: 0, scale: 1.0, visible: true },
      badge3Transform: { x: 0, y: 0, scale: 1.0, visible: true },
      anticipoTransform: { x: 0, y: 0, scale: 1.0, visible: false },
      priceTransform: { x: 0, y: 0, scale: 1.0, visible: true },
      slideDuration: 2.2,
      activeTheme: 'cinematic',
      priceBtnStyle: { from: '#1E293B', via: '#0F172A', to: '#020617', border: '#475569' },
    },
    {
      id: 'cinematic-panoramic',
      name: '🎬 Cinematic Panorama 360°',
      isSystem: true,
      badge1Template: '{ANIO}',
      badge2Template: '{KM}',
      badge3Template: '{TRANSMISION}',
      anticipoTemplate: 'Anticipo desde {ANTICIPO}',
      priceTemplate: '{PRECIO}',
      showAnticipo: false,
      titleTransform: { x: 0, y: 0, scale: 1.0, visible: true },
      badge1Transform: { x: 0, y: 0, scale: 1.0, visible: true },
      badge2Transform: { x: 0, y: 0, scale: 1.0, visible: true },
      badge3Transform: { x: 0, y: 0, scale: 1.0, visible: true },
      anticipoTransform: { x: 0, y: 0, scale: 1.0, visible: false },
      priceTransform: { x: 0, y: 0, scale: 1.0, visible: true },
      slideDuration: 3.0,
      activeTheme: 'cinematic-panoramic',
      priceBtnStyle: { from: '#1E293B', via: '#0F172A', to: '#020617', border: '#475569' },
    },
    {
      id: 'cinematic-panoramic-clean',
      name: '🖼️ Cinematic Panorama 360° (Solo Imágenes)',
      isSystem: true,
      badge1Template: '{ANIO}',
      badge2Template: '{KM}',
      badge3Template: '{TRANSMISION}',
      anticipoTemplate: 'Anticipo desde {ANTICIPO}',
      priceTemplate: '{PRECIO}',
      showAnticipo: false,
      titleTransform: { x: 0, y: 0, scale: 1.0, visible: false },
      badge1Transform: { x: 0, y: 0, scale: 1.0, visible: false },
      badge2Transform: { x: 0, y: 0, scale: 1.0, visible: false },
      badge3Transform: { x: 0, y: 0, scale: 1.0, visible: false },
      anticipoTransform: { x: 0, y: 0, scale: 1.0, visible: false },
      priceTransform: { x: 0, y: 0, scale: 1.0, visible: false },
      slideDuration: 3.0,
      activeTheme: 'cinematic-panoramic-clean',
      priceBtnStyle: { from: '#1E293B', via: '#0F172A', to: '#020617', border: '#475569' },
    }
  ]

  const [templates, setTemplates] = useState<ReelTemplate[]>(DEFAULT_TEMPLATES)
  const [activeTemplateId, setActiveTemplateId] = useState<string>('tasa-0')

  useEffect(() => {
    try {
      localStorage.removeItem('okm_reel_templates')
      localStorage.removeItem('okm_reel_templates_v1')
      localStorage.removeItem('okm_reel_templates_v2')
      localStorage.removeItem('okm_reel_templates_v3')
    } catch (e) {}
    setTemplates(DEFAULT_TEMPLATES)
    setActiveTemplateId('tasa-0')
  }, [])

  const resolveTemplateText = (tplStr?: string) => {
    if (!tplStr) return ''
    const antVal = entrega50 || (numericPrice > 0 ? `$${Math.round(numericPrice * 0.5).toLocaleString('es-AR')}` : '')
    const transClean = transmision.toUpperCase().replace(/^TRANSMISI[ÓO]N\s*/i, '').trim()
    return tplStr
      .replace(/{MARCA_MODELO}/gi, vehicle ? vehicleName(vehicle) : '')
      .replace(/{ANIO}/gi, String(anio))
      .replace(/{KM}/gi, kms)
      .replace(/{TRANSMISION}/gi, transClean)
      .replace(/{ANTICIPO}/gi, antVal)
      .replace(/{PRECIO}/gi, formattedPrice)
  }

  const applyTemplate = (tpl: ReelTemplate) => {
    if (!vehicle) return
    setActiveTemplateId(tpl.id)

    setCustomTitle(vehicleName(vehicle))
    setCustomBadge1(resolveTemplateText(tpl.badge1Template) || `📅 ${anio}`)
    setCustomBadge2(resolveTemplateText(tpl.badge2Template) || kms)
    const transClean = transmision.toUpperCase().replace(/^TRANSMISI[ÓO]N\s*/i, '').trim()
    setCustomBadge3(resolveTemplateText(tpl.badge3Template) || `⚙️ TRANSMISIÓN ${transClean}`)

    const antRes = resolveTemplateText(tpl.anticipoTemplate)
    setCustomAnticipoText(antRes || (entrega50 ? `ANTICIPO DESDE ${entrega50} + cuotas tasa 0%` : ''))

    const priceRes = resolveTemplateText(tpl.priceTemplate)
    setCustomPriceText(priceRes || `PRECIO CONTADO: ${formattedPrice}`)

    setShowAnticipoBanner(tpl.showAnticipo)
    if (tpl.titleTransform) setTitleTransform({ ...tpl.titleTransform })
    if (tpl.badge1Transform) setBadge1Transform({ ...tpl.badge1Transform })
    if (tpl.badge2Transform) setBadge2Transform({ ...tpl.badge2Transform })
    if (tpl.badge3Transform) setBadge3Transform({ ...tpl.badge3Transform })
    if (tpl.anticipoTransform) setAnticipoTransform({ ...tpl.anticipoTransform })
    if (tpl.priceTransform) setPriceTransform({ ...tpl.priceTransform })
    if (tpl.outroBgStyle) setOutroBgStyle(tpl.outroBgStyle)
    if (tpl.priceBtnStyle) setPriceBtnStyle(tpl.priceBtnStyle)
    if (tpl.customOutroTitle) setCustomOutroTitle(tpl.customOutroTitle)
    if (tpl.customOutroBullet1) setCustomOutroBullet1(tpl.customOutroBullet1)
    if (tpl.customOutroBullet2) setCustomOutroBullet2(tpl.customOutroBullet2)
    if (tpl.customOutroBullet3) setCustomOutroBullet3(tpl.customOutroBullet3)
    if (tpl.customOutroBullet4) setCustomOutroBullet4(tpl.customOutroBullet4)
    if (tpl.customOutroCTA) setCustomOutroCTA(tpl.customOutroCTA)
    if (tpl.customOutroContact) setCustomOutroContact(tpl.customOutroContact)
    if (tpl.customOutroAddress !== undefined) setCustomOutroAddress(tpl.customOutroAddress)
    if (tpl.customLayers) setCustomLayers(tpl.customLayers)
    if (tpl.activeTheme) setActiveTheme(tpl.activeTheme)
    if (tpl.slideDuration) setSlideDuration(tpl.slideDuration)
    setSelectedElement(null)
  }

  const handleSaveCurrentTemplate = () => {
    const name = window.prompt('Nombre de la plantilla:', `Plantilla ${templates.length + 1}`)
    if (!name || !name.trim()) return

    const antVal = entrega50 || ''
    const transClean = transmision.toUpperCase().replace(/^TRANSMISI[ÓO]N\s*/i, '').trim()

    let antTpl = customAnticipoText
    if (antVal && antTpl.includes(antVal)) {
      antTpl = antTpl.replace(antVal, '{ANTICIPO}')
    }

    let priceTpl = customPriceText
    if (formattedPrice && priceTpl.includes(formattedPrice)) {
      priceTpl = priceTpl.replace(formattedPrice, '{PRECIO}')
    }

    let b1Tpl = customBadge1
    if (b1Tpl.includes(String(anio))) {
      b1Tpl = b1Tpl.replace(String(anio), '{ANIO}')
    }

    let b2Tpl = customBadge2
    if (b2Tpl.includes(kms)) {
      b2Tpl = b2Tpl.replace(kms, '{KM}')
    }

    let b3Tpl = customBadge3
    if (b3Tpl.includes(transClean)) {
      b3Tpl = b3Tpl.replace(transClean, '{TRANSMISION}')
    }

    const newTpl: ReelTemplate = {
      id: 'tpl_' + Date.now(),
      name: name.trim(),
      isSystem: false,
      badge1Template: b1Tpl,
      badge2Template: b2Tpl,
      badge3Template: b3Tpl,
      anticipoTemplate: antTpl,
      priceTemplate: priceTpl,
      showAnticipo: showAnticipoBanner && anticipoTransform.visible,
      titleTransform: { ...titleTransform },
      badge1Transform: { ...badge1Transform },
      badge2Transform: { ...badge2Transform },
      badge3Transform: { ...badge3Transform },
      anticipoTransform: { ...anticipoTransform },
      priceTransform: { ...priceTransform },
      outroBgStyle: { ...outroBgStyle },
      priceBtnStyle: { ...priceBtnStyle },
      customOutroTitle,
      customOutroBullet1,
      customOutroBullet2,
      customOutroBullet3,
      customOutroBullet4,
      customOutroCTA,
      customOutroContact,
      customOutroAddress,
      customLayers: [...customLayers],
      activeTheme,
    }

    const next = [...templates, newTpl]
    setTemplates(next)
    setActiveTemplateId(newTpl.id)
    try {
      localStorage.setItem('okm_reel_templates_v1', JSON.stringify(next))
    } catch (e) {}
  }

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const targetTpl = templates.find(t => t.id === id)
    if (targetTpl?.isSystem || id === 'tasa-0' || id === 'cinematic-broll' || id === 'cinematic-panoramic' || id === 'cinematic-panoramic-clean') return
    const next = templates.filter(t => t.id !== id)
    setTemplates(next)
    if (activeTemplateId === id) {
      setActiveTemplateId('tasa-0')
      applyTemplate(DEFAULT_TEMPLATES[0])
    }
    try {
      localStorage.setItem('okm_reel_templates_v1', JSON.stringify(next))
    } catch (e) {}
  }

  const handleResetDefaults = () => {
    if (!vehicle) return
    applyTemplate(DEFAULT_TEMPLATES[0])
    setCustomLayers([])
    setActiveTheme('default')
    setOutroBgStyle({
      type: 'gradient',
      c1: '#0F172A',
      c2: '#020617',
      isLight: false
    })
    setPriceBtnStyle({
      from: '#1E3A8A',
      via: '#2563EB',
      to: '#1D4ED8',
      border: '#93C5FD'
    })
    setVideoFilter('none')
    setSlideDuration(1.0)
    setCustomOutroTitle('¡TU PRÓXIMO AUTO ESTÁ ACÁ!')
    setCustomOutroBullet1('✨ Unidades seleccionadas y peritadas')
    setCustomOutroBullet2('📄 Documentación 100% al día')
    setCustomOutroBullet3('🤝 Tomamos tu vehículo usado')
    setCustomOutroBullet4('⚡ Financiación a medida en el acto')
    setCustomOutroCTA('💬 ENVIANOS UN MENSAJE DIRECTO')
    setCustomOutroContact(isFacebook ? 'Seguinos en Facebook: Okmmotors' : 'Seguinos en Instagram: @okmmotors')
    setCustomOutroAddress('')
  }

  const parseColorFromText = (text: string): OutroBgStyle | null => {
    const t = text.toLowerCase()
    if (t.includes('gris azulado claro') || t.includes('azul grisáceo claro') || t.includes('celeste grisáceo') || t.includes('gris azulado') || t.includes('gris azul')) {
      return { type: 'gradient', c1: '#64748B', c2: '#334155', isLight: false, label: 'gris azulado claro' }
    }
    if (t.includes('gris claro') || t.includes('plateado claro') || t.includes('plata') || t.includes('plateado')) {
      return { type: 'gradient', c1: '#E2E8F0', c2: '#94A3B8', isLight: true, label: 'gris plateado claro' }
    }
    if (t.includes('gris oscuro') || t.includes('grafito') || t.includes('plomo')) {
      return { type: 'gradient', c1: '#334155', c2: '#0F172A', isLight: false, label: 'gris grafito oscuro' }
    }
    if (t.includes('gris')) {
      return { type: 'gradient', c1: '#64748B', c2: '#334155', isLight: false, label: 'gris titanio' }
    }
    if (t.includes('negro') || t.includes('black') || t.includes('total dark') || t.includes('oscuro')) {
      return { type: 'solid', c1: '#05070D', isLight: false, label: 'negro profundo' }
    }
    if (t.includes('blanco') || t.includes('white') || t.includes('claro')) {
      return { type: 'solid', c1: '#F8FAFC', isLight: true, label: 'blanco puro' }
    }
    if (t.includes('azul marino') || t.includes('marino') || t.includes('navy')) {
      return { type: 'gradient', c1: '#1E3A8A', c2: '#0A0F1D', isLight: false, label: 'azul marino' }
    }
    if (t.includes('celeste') || t.includes('cyan') || t.includes('azul cielo')) {
      return { type: 'gradient', c1: '#38BDF8', c2: '#0284C7', isLight: false, label: 'celeste eléctrico' }
    }
    if (t.includes('azul')) {
      return { type: 'gradient', c1: '#2563EB', c2: '#1E3A8A', isLight: false, label: 'azul royal' }
    }
    if (t.includes('rojo') || t.includes('carmín') || t.includes('bordo') || t.includes('rojo ferrari')) {
      return { type: 'gradient', c1: '#DC2626', c2: '#7F1D1D', isLight: false, label: 'rojo intenso' }
    }
    if (t.includes('verde') || t.includes('esmeralda')) {
      return { type: 'gradient', c1: '#16A34A', c2: '#14532D', isLight: false, label: 'verde premium' }
    }
    if (t.includes('dorado') || t.includes('oro') || t.includes('amarillo')) {
      return { type: 'gradient', c1: '#F59E0B', c2: '#78350F', isLight: false, label: 'dorado' }
    }
    if (t.includes('violeta') || t.includes('morado') || t.includes('púrpura')) {
      return { type: 'gradient', c1: '#7C3AED', c2: '#4C1D95', isLight: false, label: 'púrpura' }
    }
    const hexMatch = t.match(/#([0-9a-f]{3,6})/i)
    if (hexMatch) {
      return { type: 'solid', c1: '#' + hexMatch[1], isLight: false, label: '#' + hexMatch[1] }
    }
    return null
  }

  // ----------------------------------------------------
  // ASISTENTE IA CHAT (Copies, Hashtags & Edición)
  // ----------------------------------------------------
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState<string>('')
  const [isChatThinking, setIsChatThinking] = useState<boolean>(false)
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)

  useEffect(() => {
    if (!vehicle) return
    const vName = vehicleName(vehicle)
    setChatMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: `¡Hola! Preparé el video de ${vName}. Podés pedirme copies virales con hashtags para ${isFacebook ? 'Facebook' : 'TikTok/Instagram'}, o cualquier cambio visual, estilo, colores, temas o textos.`,
        copy: null
      }
    ])
  }, [vehicle, isFacebook])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, isChatThinking])

  const handleSendChatMessage = async (presetText?: string) => {
    const query = (presetText || chatInput).trim()
    if (!query || isChatThinking) return

    if (!presetText) setChatInput('')

    const userMsgId = 'user_' + Date.now()
    setChatMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', text: query }
    ])
    setIsChatThinking(true)

    try {
      const lower = query.toLowerCase()
      const actionsApplied: string[] = []

      const jumpToOutro = () => {
        const totalPhotos = Math.max(selectedPhotoUrls.length, 1)
        setCurrentTime(totalPhotos * (slideDuration || 1.0) + 0.1)
        setIsPlaying(false)
      }

      // 0. Temas de diseño integral
      if (lower.includes('estilo deportivo') || lower.includes('deportivo') || lower.includes('sport')) {
        applyTheme('sport-red')
        actionsApplied.push('Estilo deportivo M-Sport')
      } else if (lower.includes('estilo oscuro') || lower.includes('stealth') || lower.includes('black edition')) {
        applyTheme('dark-stealth')
        actionsApplied.push('Estilo oscuro Stealth')
      } else if (lower.includes('estilo dorado') || lower.includes('luxury') || lower.includes('premium')) {
        applyTheme('luxury-gold')
        actionsApplied.push('Estilo Luxury Gold')
      } else if (lower.includes('estilo blanco') || lower.includes('minimalista') || lower.includes('clean')) {
        applyTheme('clean-white')
        actionsApplied.push('Estilo Clean White')
      }

      // 0.1 Franjas / Ribbons / Sellos especiales
      const ribbonMatch = query.match(/(?:franja|banner|sello|etiqueta|ribbon|cinta)\s*(?:dorada|roja|azul|verde|negra|blanca)?\s*(?:que\s+diga|con\s+el\s+texto|:)?\s*([A-Za-z0-9\s\!\¡\?¿\%\$\.\-]{3,40})/i)
      if (ribbonMatch && ribbonMatch[1]) {
        const text = ribbonMatch[1].trim().toUpperCase()
        const isGold = lower.includes('dorad') || lower.includes('oro')
        const isRed = lower.includes('roj')
        const isGreen = lower.includes('verd')
        const newLayer: CustomLayer = {
          id: 'layer_' + Date.now(),
          type: 'ribbon',
          text: text.startsWith('🔥') || text.startsWith('✨') ? text : `🔥 ${text}`,
          position: lower.includes('arriba') ? 'top-right' : 'top-center',
          bgColor: isGold ? '#D97706' : (isRed ? '#DC2626' : (isGreen ? '#16A34A' : '#2563EB')),
          textColor: '#FFFFFF',
          borderColor: isGold ? '#FDE68A' : '#FFFFFF'
        }
        setCustomLayers(prev => [...prev, newLayer])
        actionsApplied.push(`Franja: "${text}"`)
      }

      // 1. Color de fondo de la última imagen / outro / pantalla final de agencia y logo
      const isOutro = lower.includes('ultima imagen') || lower.includes('última imagen') || lower.includes('final') || lower.includes('agencia') || lower.includes('logo') || lower.includes('cierre') || lower.includes('outro') || lower.includes('pantalla final')
      const detectedColor = parseColorFromText(lower)

      if (detectedColor && (isOutro || (!lower.includes('precio') && !lower.includes('boton') && !lower.includes('botón')))) {
        setOutroBgStyle(detectedColor)
        actionsApplied.push(`Fondo final: ${detectedColor.label}`)
        jumpToOutro()
      }

      // 2. Color del botón de precio
      if ((lower.includes('precio') || lower.includes('boton') || lower.includes('botón')) && (lower.includes('color') || detectedColor)) {
        const color = detectedColor || { type: 'gradient', c1: '#DC2626', c2: '#7F1D1D', isLight: false, label: 'rojo' }
        setPriceBtnStyle({
          from: color.c1,
          via: color.c1,
          to: color.c2 || color.c1,
          border: color.isLight ? '#334155' : '#FFFFFF',
          label: color.label
        })
        actionsApplied.push(`Color precio: ${color.label}`)
      }

      // 3. Dirección / Ubicación (Address)
      const addrRegex = /(?:direcci[oó]n|ubicaci[oó]n|sucursal|estamos en|local(?:\s+en)?)\s*(?:es|:|en)?\s*([A-Za-z0-9\.\,\s\-º°]{3,60})/i
      const addrMatch = query.match(addrRegex)
      if (addrMatch && addrMatch[1]) {
        let clean = addrMatch[1].trim().replace(/^[:\-\s]+/, '').replace(/[\.\,\s]+$/, '')
        clean = clean.split(/\s+y\s+(?:whatsapp|wsp|tel|contacto|agrega|pone|instagram)/i)[0].trim()
        if (clean.length >= 3) {
          const val = clean.startsWith('📍') ? clean : `📍 ${clean}`
          setCustomOutroAddress(val)
          jumpToOutro()
          actionsApplied.push(`Dirección: ${val}`)
        }
      } else {
        const streetMatch = query.match(/(?:av\.?|avenida|calle|ruta|km)\s+[A-Za-z0-9\.\,\s\-º°]{3,45}/i)
        if (streetMatch && streetMatch[0] && !lower.includes('0km') && !lower.includes('0 km')) {
          let clean = streetMatch[0].trim().split(/\s+y\s+(?:whatsapp|wsp|tel|contacto|agrega|pone)/i)[0].trim()
          const val = `📍 ${clean}`
          setCustomOutroAddress(val)
          jumpToOutro()
          actionsApplied.push(`Dirección: ${val}`)
        }
      }

      // 4. Teléfono / WhatsApp / Contacto
      const wpRegex = /(?:whatsapp|wsp|wpp|tel[eé]fono|celular|cel|tel|contacto)\s*(?:es|:|al|de)?\s*([+\d\s\-\(\)]{6,22})/i
      const wpMatch = query.match(wpRegex)
      if (wpMatch && wpMatch[1]) {
        const num = wpMatch[1].trim().replace(/^[:\-\s]+/, '')
        const isWp = /w(hats)?app|wsp|wpp/i.test(query)
        const val = isWp ? `📲 WhatsApp: ${num}` : `📞 Tel: ${num}`
        setCustomOutroContact(val)
        jumpToOutro()
        actionsApplied.push(`Contacto: ${val}`)
      } else {
        const rawPhone = query.match(/(\+?54\s*9?\s*\d[\d\s\-]{7,14}\d)/)
        if (rawPhone && rawPhone[1]) {
          const val = `📲 WhatsApp: ${rawPhone[1].trim()}`
          setCustomOutroContact(val)
          jumpToOutro()
          actionsApplied.push(`Contacto: ${val}`)
        }
      }

      // 5. Instagram / Redes / Web
      const igMatch = query.match(/(?:instagram|ig|redes)\s*(?:es|:|en)?\s*(@[a-zA-Z0-9_\.]+|[a-zA-Z0-9_\.]{3,30})/i)
      if (igMatch && igMatch[1]) {
        const handle = igMatch[1].trim().startsWith('@') ? igMatch[1].trim() : `@${igMatch[1].trim()}`
        const val = `Seguinos en Instagram: ${handle}`
        setCustomOutroContact(val)
        jumpToOutro()
        actionsApplied.push(`Instagram: ${handle}`)
      }

      const webMatch = query.match(/(?:web|sitio|p[aá]gina)\s*(?:es|:|en)?\s*(www\.[a-zA-Z0-9_\-\.]+\.[a-zA-Z]{2,}|[a-zA-Z0-9_\-]+\.com(?:\.ar)?)/i)
      if (webMatch && webMatch[1]) {
        const val = `🌐 ${webMatch[1].trim()}`
        setCustomOutroAddress(val)
        jumpToOutro()
        actionsApplied.push(`Web: ${val}`)
      }

      // 6. Beneficios / Viñetas en la pantalla final
      if (/permuta|usado|llave contra llave/i.test(lower) && /agrega|pone|suma|tomamos|aceptamos|inclui|incluí/i.test(lower)) {
        const val = '🤝 Aceptamos permutas y tu usado'
        setCustomOutroBullet3(val)
        jumpToOutro()
        actionsApplied.push(`Viñeta: "${val}"`)
      }
      if (/garant[ií]a/i.test(lower) && /agrega|pone|suma|inclui|incluí|ofrecemos/i.test(lower)) {
        const gMatch = query.match(/garant[ií]a\s*(?:mec[aá]nica)?\s*(?:de\s+)?([A-Za-z0-9\s]+)/i)
        const gText = gMatch ? gMatch[0].trim() : 'Garantía mecánica de 1 año'
        const val = `🛡️ ${gText.charAt(0).toUpperCase() + gText.slice(1)}`
        setCustomOutroBullet4(val)
        jumpToOutro()
        actionsApplied.push(`Viñeta: "${val}"`)
      }
      if ((/financiaci[oó]n|cuotas?\s*fijas?|cr[eé]dito|tasa\s*0/i.test(lower)) && /agrega|pone|suma|inclui|incluí/i.test(lower)) {
        const fMatch = query.match(/(?:financiaci[oó]n|cuotas?\s*fijas?|cr[eé]ditos?)\s*([A-Za-z0-9\%\$\s]+)/i)
        const fText = fMatch ? fMatch[0].trim() : 'Financiación a medida en el acto'
        const val = `⚡ ${fText.charAt(0).toUpperCase() + fText.slice(1)}`
        setCustomOutroBullet4(val)
        jumpToOutro()
        actionsApplied.push(`Viñeta: "${val}"`)
      }
      if (/entrega inmediata|entrega en el acto/i.test(lower) && /agrega|pone|suma|inclui|incluí/i.test(lower)) {
        const val = '⚡ Entrega inmediata garantizada'
        setCustomOutroBullet4(val)
        jumpToOutro()
        actionsApplied.push(`Viñeta: "${val}"`)
      }

      // Explicit bullet: "agrega viñeta / punto / beneficio [texto]"
      const bulletMatch = query.match(/(?:vi[ñn]eta|punto|beneficio)\s*(?:que\s+diga|:)?\s*([A-Za-z0-9\s\$\%\,\.\-]{3,50})/i)
      if (bulletMatch && bulletMatch[1]) {
        const val = `✨ ${bulletMatch[1].trim()}`
        setCustomOutroBullet4(val)
        jumpToOutro()
        actionsApplied.push(`Viñeta: "${val}"`)
      }

      // 7. Título de la pantalla final
      const outroTitleMatch = query.match(/(?:t[ií]tulo)\s*(?:de\s+la\s+u[lú]ltima\s+imagen|de\s+la\s+pantalla\s+final|final)?\s*(?:por|a|:|que diga)\s*([A-Za-z0-9\s\!\¡\?¿\-]{3,50})/i)
      if (outroTitleMatch && outroTitleMatch[1] && (isOutro || /final|outro|cierre/i.test(lower))) {
        const val = outroTitleMatch[1].trim().toUpperCase()
        setCustomOutroTitle(val)
        jumpToOutro()
        actionsApplied.push(`Título final: "${val}"`)
      }

      // 8. Botón CTA de la pantalla final
      const ctaMatch = query.match(/(?:bot[oó]n|cta)\s*(?:del\s+final|de\s+contacto|azul)?\s*(?:por|a|:|que diga)\s*([A-Za-z0-9\s\!\¡\?¿\-]{3,40})/i)
      if (ctaMatch && ctaMatch[1] && (isOutro || /contacto|mensaje|final/i.test(lower))) {
        const val = `💬 ${ctaMatch[1].trim().toUpperCase().replace(/^[💬\s]+/, '')}`
        setCustomOutroCTA(val)
        jumpToOutro()
        actionsApplied.push(`Botón final: "${val}"`)
      }

      // 9. Generic "agrega [info]" on the outro / final screen if nothing was extracted yet
      if (actionsApplied.length === 0 || (isOutro && !actionsApplied.some(a => a.startsWith('Dirección') || a.startsWith('Contacto') || a.startsWith('Viñeta') || a.startsWith('Título')))) {
        const genericAdd = query.match(/(?:agrega|pone|sum[aá]|inclu[ií])\s+(?:la\s+info(?:\s+de)?\s+|el\s+texto\s+|que\s+)?([A-Za-z0-9\s\.\,\:\-\@\/\$]+?)(?:\s+en\s+la\s+u[lú]ltima|\s+en\s+el\s+final|\s+en\s+la\s+pantalla\s+final|\s+al\s+final|$)/i)
        if (genericAdd && genericAdd[1]) {
          const raw = genericAdd[1].trim()
          if (!raw.toLowerCase().startsWith('color') && !raw.toLowerCase().startsWith('fondo') && raw.length > 2) {
            if (/\d{4,}|\@|av\.|calle|km/i.test(raw)) {
              const val = `📍 ${raw}`
              setCustomOutroAddress(val)
              jumpToOutro()
              actionsApplied.push(`Información: "${val}"`)
            } else {
              const val = `✨ ${raw}`
              setCustomOutroBullet4(val)
              jumpToOutro()
              actionsApplied.push(`Información: "${val}"`)
            }
          }
        }
      }

      // 10. Filtros cinematográficos de imagen
      if (lower.includes('blanco y negro') || lower.includes('escala de grises') || lower.includes('monocrom')) {
        setVideoFilter('grayscale(100%)')
        actionsApplied.push('Filtro B&N')
      } else if (lower.includes('calido') || lower.includes('cálido') || lower.includes('vintage')) {
        setVideoFilter('sepia(25%) saturate(125%)')
        actionsApplied.push('Tono cálido')
      } else if (lower.includes('color normal') || lower.includes('sin filtro') || lower.includes('quitar filtro')) {
        setVideoFilter('none')
        actionsApplied.push('Colores naturales')
      }

      // 11. Velocidad y ritmo
      if (lower.includes('mas rapido') || lower.includes('más rápido') || lower.includes('rapido')) {
        setSlideDuration(0.7)
        actionsApplied.push('Velocidad rápida (0.7s)')
      } else if (lower.includes('mas lento') || lower.includes('más lento') || lower.includes('despacio')) {
        setSlideDuration(1.5)
        actionsApplied.push('Velocidad pausada (1.5s)')
      }

      // 12. Modo de pantalla (contain vs cover)
      if (lower.includes('llenar pantalla') || lower.includes('cover')) {
        setFitMode('cover')
        actionsApplied.push('Llenar pantalla')
      } else if (lower.includes('auto completo') || lower.includes('contain')) {
        setFitMode('contain')
        actionsApplied.push('Auto completo')
      }

      // 13. Ocultar / Mostrar elementos
      if (lower.includes('ocultar anticipo') || lower.includes('sacar anticipo') || lower.includes('sin anticipo')) {
        setAnticipoTransform(prev => ({ ...prev, visible: false }))
        setShowAnticipoBanner(false)
        actionsApplied.push('Anticipo ocultado')
      } else if (lower.includes('mostrar anticipo') || lower.includes('activar anticipo')) {
        setAnticipoTransform(prev => ({ ...prev, visible: true }))
        setShowAnticipoBanner(true)
        actionsApplied.push('Anticipo visible')
      }

      if (lower.includes('ocultar km') || lower.includes('sacar km') || lower.includes('ocultar kilometraje')) {
        setBadge2Transform(prev => ({ ...prev, visible: false }))
        actionsApplied.push('Km ocultado')
      } else if (lower.includes('mostrar km')) {
        setBadge2Transform(prev => ({ ...prev, visible: true }))
        actionsApplied.push('Km visible')
      }

      if (lower.includes('ocultar caja') || lower.includes('ocultar transmision') || lower.includes('sacar caja')) {
        setBadge3Transform(prev => ({ ...prev, visible: false }))
        actionsApplied.push('Transmisión ocultada')
      } else if (lower.includes('mostrar caja') || lower.includes('mostrar transmision')) {
        setBadge3Transform(prev => ({ ...prev, visible: true }))
        actionsApplied.push('Transmisión visible')
      }

      if (lower.includes('agrandar precio')) {
        setPriceTransform(prev => ({ ...prev, scale: Math.min(2.0, Math.round((prev.scale + 0.15) * 100) / 100) }))
        actionsApplied.push('Precio agrandado')
      } else if (lower.includes('achicar precio')) {
        setPriceTransform(prev => ({ ...prev, scale: Math.max(0.5, Math.round((prev.scale - 0.15) * 100) / 100) }))
        actionsApplied.push('Precio reducido')
      }

      if (lower.includes('reiniciar') || lower.includes('restablecer') || lower.includes('original')) {
        handleResetDefaults()
        actionsApplied.push('Reel restablecido')
      }

      const antMatch = query.match(/anticipo(?:\s+desde|\s+de|\s*:)?\s*(\$[\d\.\,]+(?:\s*\+\s*cuotas\s*tasa\s*0%)?)/i)
      if (antMatch && antMatch[1]) {
        const v = antMatch[1].trim()
        const finalText = v.toUpperCase().startsWith('ANTICIPO') ? v : `ANTICIPO DESDE ${v} + cuotas tasa 0%`
        setCustomAnticipoText(finalText)
        setAnticipoTransform(prev => ({ ...prev, visible: true }))
        setShowAnticipoBanner(true)
        actionsApplied.push(`Anticipo: ${v}`)
      }

      const prMatch = query.match(/precio(?:\s+contado|\s+de|\s*:)?\s*(\$[\d\.\,]+)/i)
      if (prMatch && prMatch[1]) {
        const v = prMatch[1].trim()
        setCustomPriceText(`PRECIO CONTADO: ${v}`)
        setPriceTransform(prev => ({ ...prev, visible: true }))
        actionsApplied.push(`Precio: ${v}`)
      }

      let aiReply = ''
      let aiCopy: string | null = null

      try {
        const res = await fetch('/api/ai/reel-assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: query,
            vehicle: {
              marca: vehicle?.Marca,
              modelo: vehicle?.Modelo,
              version: vehicle?.Version,
              anio,
              km: rawKm !== null ? rawKm : kms,
              precio: formattedPrice,
              anticipo: entrega50,
              combustible,
              transmision
            },
            reelState: {
              title: customTitle,
              badge1: customBadge1,
              badge2: customBadge2,
              badge3: customBadge3,
              anticipo: customAnticipoText,
              price: customPriceText,
              outroBg: outroBgStyle.label || outroBgStyle.c1,
              customLayers: customLayers
            }
          })
        })
        const data = await res.json()
        if (data.success) {
          aiReply = data.reply
          if (data.copy) {
            aiCopy = data.copy
            setCaption(data.copy)
          }
          if (Array.isArray(data.actions)) {
            data.actions.forEach((act: any) => {
              if (act.type === 'SET_THEME' && act.value) {
                applyTheme(act.value)
              } else if (act.type === 'ADD_CUSTOM_LAYER' && act.value) {
                setCustomLayers(prev => [...prev.filter(l => l.id !== act.value.id), act.value])
              } else if (act.type === 'REMOVE_CUSTOM_LAYER' && act.value) {
                if (act.value === 'all') setCustomLayers([])
                else setCustomLayers(prev => prev.filter(l => l.id !== act.value))
              } else if (act.type === 'SET_OUTRO_BG' && act.value) {
                setOutroBgStyle(act.value)
                jumpToOutro()
              } else if (act.type === 'SET_OUTRO_ADDRESS' && act.value) {
                setCustomOutroAddress(act.value)
                jumpToOutro()
              } else if (act.type === 'SET_OUTRO_CONTACT' && act.value) {
                setCustomOutroContact(act.value)
                jumpToOutro()
              } else if (act.type === 'SET_OUTRO_TITLE' && act.value) {
                setCustomOutroTitle(act.value)
                jumpToOutro()
              } else if (act.type === 'SET_OUTRO_CTA' && act.value) {
                setCustomOutroCTA(act.value)
                jumpToOutro()
              } else if (act.type === 'ADD_OUTRO_BULLET' && act.value) {
                setCustomOutroBullet4(act.value)
                jumpToOutro()
              } else if (act.type === 'SET_OUTRO_BULLET' && act.value) {
                if (act.index === 1) setCustomOutroBullet1(act.value)
                else if (act.index === 2) setCustomOutroBullet2(act.value)
                else if (act.index === 3) setCustomOutroBullet3(act.value)
                else setCustomOutroBullet4(act.value)
                jumpToOutro()
              } else if (act.type === 'SET_PRICE_COLOR' && act.value) {
                setPriceBtnStyle(act.value)
              } else if (act.type === 'SET_FILTER' && act.value) {
                setVideoFilter(act.value)
              } else if (act.type === 'SET_SLIDE_DURATION' && act.value) {
                setSlideDuration(act.value)
              } else if (act.type === 'SET_FIT_MODE' && act.value) {
                setFitMode(act.value)
              } else if (act.type === 'JUMP_TO_SLIDE') {
                if (act.value === 'outro') {
                  jumpToOutro()
                }
              } else if (act.type === 'SET_ANTICIPO' && act.value) {
                setCustomAnticipoText(act.value)
                setAnticipoTransform(p => ({ ...p, visible: true }))
                setShowAnticipoBanner(true)
              } else if (act.type === 'SET_PRICE' && act.value) {
                setCustomPriceText(act.value)
                setPriceTransform(p => ({ ...p, visible: true }))
              } else if (act.type === 'SET_TITLE' && act.value) {
                setCustomTitle(act.value)
              } else if (act.type === 'SET_BADGE1' && act.value) {
                setCustomBadge1(act.value)
              } else if (act.type === 'SET_BADGE2' && act.value) {
                setCustomBadge2(act.value)
              } else if (act.type === 'SET_BADGE3' && act.value) {
                setCustomBadge3(act.value)
              } else if (act.type === 'TOGGLE_ELEMENT') {
                const vis = Boolean(act.visible)
                if (act.element === 'anticipo') {
                  setAnticipoTransform(p => ({ ...p, visible: vis }))
                  setShowAnticipoBanner(vis)
                } else if (act.element === 'badge1') setBadge1Transform(p => ({ ...p, visible: vis }))
                else if (act.element === 'badge2') setBadge2Transform(p => ({ ...p, visible: vis }))
                else if (act.element === 'badge3') setBadge3Transform(p => ({ ...p, visible: vis }))
                else if (act.element === 'price') setPriceTransform(p => ({ ...p, visible: vis }))
                else if (act.element === 'title') setTitleTransform(p => ({ ...p, visible: vis }))
              } else if (act.type === 'SCALE_ELEMENT' && act.delta) {
                if (act.element === 'price') setPriceTransform(p => ({ ...p, scale: Math.max(0.5, Math.min(2.0, p.scale + act.delta)) }))
                else if (act.element === 'anticipo') setAnticipoTransform(p => ({ ...p, scale: Math.max(0.5, Math.min(2.0, p.scale + act.delta)) }))
              } else if (act.type === 'RESET') {
                handleResetDefaults()
              }
            })
          }
        }
      } catch (e) {
        console.warn('Reel Assistant API fallback:', e)
      }

      if (!aiReply) {
        if (actionsApplied.length > 0) {
          aiReply = `¡Listo! Apliqué los cambios visuales: ${actionsApplied.join(', ')}.`
        } else {
          aiReply = 'Entendido, cambios aplicados en el video.'
        }
      }

      setChatMessages(prev => [
        ...prev,
        {
          id: 'asst_' + Date.now(),
          role: 'assistant',
          text: aiReply,
          copy: aiCopy,
          actionsApplied: actionsApplied.length > 0 ? actionsApplied : undefined
        }
      ])
    } finally {
      setIsChatThinking(false)
    }
  }

  // Photos state for custom reel selection
  const [allAvailablePhotos, setAllAvailablePhotos] = useState<string[]>([])
  const [selectedPhotoUrls, setSelectedPhotoUrls] = useState<string[]>([])

  // Extract all photos when vehicle opens
  useEffect(() => {
    if (!vehicle) return

    const photos = getAllVehiclePhotos(vehicle)
    const validPhotos = photos.filter(u => typeof u === 'string' && u.startsWith('http'))
    setAllAvailablePhotos(validPhotos)

    const initialSelected = (selectedPhotos && selectedPhotos.length > 0)
      ? selectedPhotos.filter(u => typeof u === 'string' && u.startsWith('http'))
      : validPhotos.slice(0, 4)
    setSelectedPhotoUrls(initialSelected.length > 0 ? initialSelected : validPhotos.slice(0, 4))
  }, [vehicle])

  // Sync photos when selectedPhotos prop changes in inline mode
  useEffect(() => {
    if (inline && selectedPhotos && selectedPhotos.length > 0) {
      const valid = selectedPhotos.filter(u => typeof u === 'string' && u.startsWith('http'))
      if (valid.length > 0) {
        setSelectedPhotoUrls(valid)
      }
    }
  }, [inline, selectedPhotos])

  // Initialize custom texts when vehicle changes
  useEffect(() => {
    if (!vehicle) return
    const tName = vehicleName(vehicle)
    const transText = transmision.toUpperCase().includes('TRANSMISI') ? `⚙️ ${transmision.toUpperCase()}` : `⚙️ TRANSMISIÓN ${transmision.toUpperCase()}`
    const antText = entrega50 ? `ANTICIPO DESDE ${entrega50} + cuotas tasa 0%` : ''

    setCustomTitle(tName)
    setCustomBadge1(`📅 ${anio}`)
    setCustomBadge2(kms)
    setCustomBadge3(transText)
    setCustomPriceText(`PRECIO CONTADO: ${formattedPrice}`)
    setCustomAnticipoText(antText)
    setShowAnticipoBanner(Boolean(entrega50))
    setTitleTransform({ x: 0, y: 0, scale: 1.0, visible: true })
    setBadge1Transform({ x: 0, y: 0, scale: 1.0, visible: true })
    setBadge2Transform({ x: 0, y: 0, scale: 1.0, visible: true })
    setBadge3Transform({ x: 0, y: 0, scale: 1.0, visible: true })
    setPriceTransform({ x: 0, y: 0, scale: 1.0, visible: true })
    setAnticipoTransform({ x: 0, y: 0, scale: 1.0, visible: true })
    setSelectedElement(null)

    // Cargar plantilla dinámica con formato completo
    let activeTemplate = DEFAULT_CAPTION_TEMPLATE
    try {
      const savedTpl = localStorage.getItem('okm_custom_caption_template_v1')
      if (savedTpl && savedTpl.trim() && savedTpl.includes('\n') && !savedTpl.includes('| Km:')) {
        activeTemplate = savedTpl
      }
    } catch (e) {}

    const dynamicCopy = buildCaptionFromTemplate(activeTemplate, vehicle)
    setCaption(dynamicCopy)

    // Si la plantilla en el navegador tenía un número congelado (ej: 34.800.000), se reescribe normalizada con {ANTICIPO}
    try {
      if (vehicle && dynamicCopy.includes('\n')) {
        const cleanedTpl = convertCaptionToTemplate(dynamicCopy, vehicle)
        localStorage.setItem('okm_custom_caption_template_v1', cleanedTpl)
      }
    } catch (e) {}
  }, [vehicle])

  // Preload selected images, pre-render blurred backgrounds offscreen, and update reel duration
  useEffect(() => {
    if (selectedPhotoUrls.length === 0) {
      loadedImagesRef.current = []
      blurredBgCacheRef.current = [] // limpiar cache al quitar fotos
      setImagesReady(true)
      return
    }

    // Set duration dynamically: slideDuration per photo + 3.0s outro
    const curSlideDur = slideDuration || 1.4
    const newDuration = selectedPhotoUrls.length * curSlideDur + 3.0
    setDuration(newDuration)

    // Limpiar cache del auto anterior para evitar backgrounds incorrectos
    blurredBgCacheRef.current = []
    loadedImagesRef.current = []

    // ✅ FIX: flag para cancelar cargas antiguas y evitar race condition
    let cancelled = false
    let loadedCount = 0
    const imgElements: HTMLImageElement[] = new Array(selectedPhotoUrls.length).fill(null)
    setImagesReady(false)

    const tryComplete = () => {
      if (cancelled) return
      loadedCount++
      if (loadedCount >= selectedPhotoUrls.length) {
        // Pre-renderizar fondos blureados OFFLINE (una sola vez por imagen)
        const validImgs = imgElements.filter(Boolean) as HTMLImageElement[]
        preRenderBlurredBg(validImgs)
        loadedImagesRef.current = validImgs

        // Calcular duración exacta dinámica sumando el tiempo real de recorrido de cada foto (ritmo panorámico fluido y elegante)
        const isPano = activeTemplateId === 'cinematic-panoramic' || activeTemplateId === 'cinematic-panoramic-clean' || activeTheme === 'cinematic-panoramic' || activeTheme === 'cinematic-panoramic-clean'
        let totalTime = 0
        for (const im of validImgs) {
          let d = slideDuration || 2.4
          if (isPano && im && im.naturalWidth > 0) {
            const cScale = Math.max(720 / im.naturalWidth, 1280 / im.naturalHeight)
            const fW = im.naturalWidth * cScale
            const fH = im.naturalHeight * cScale
            const pDist = Math.max(fW - 720, fH - 1280)
            d = Math.max(2.0, Math.min(3.8, 1.8 + pDist / 190))
          }
          totalTime += d
        }
        setDuration(totalTime + 3.0)
        setImagesReady(true)
      }
    }

    selectedPhotoUrls.forEach((url, idx) => {
      const safeUrl = (url.startsWith('http://') || url.startsWith('https://'))
        ? `/api/proxy-image?url=${encodeURIComponent(url)}`
        : url

      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = safeUrl
      img.onload = () => {
        if (cancelled) return
        imgElements[idx] = img
        tryComplete()
      }
      img.onerror = () => {
        if (cancelled) return
        // Fallback to direct URL if proxy is unavailable
        const directImg = new Image()
        directImg.crossOrigin = 'anonymous'
        directImg.src = url
        directImg.onload = () => {
          if (cancelled) return
          imgElements[idx] = directImg
          tryComplete()
        }
        directImg.onerror = () => {
          if (cancelled) return
          tryComplete() // contar aunque falle para no bloquear
        }
      }
    })

    return () => { cancelled = true }
  }, [selectedPhotoUrls])

  // URLs seguras pasadas por proxy para el reproductor Remotion (evita CORS y trabas de red)
  const safeRemotionPhotos = useMemo(() => {
    if (loadedImagesRef.current.length > 0) {
      return loadedImagesRef.current.map(img => img.src)
    }
    return selectedPhotoUrls.map(url =>
      (url.startsWith('http://') || url.startsWith('https://'))
        ? `/api/proxy-image?url=${encodeURIComponent(url)}`
        : url
    )
  }, [selectedPhotoUrls, imagesReady])

  // Toggle photo selection
  const togglePhotoSelection = (url: string) => {
    if (selectedPhotoUrls.includes(url)) {
      if (selectedPhotoUrls.length <= 1) return // Keep at least 1 photo
      setSelectedPhotoUrls(prev => prev.filter(u => u !== url))
    } else {
      setSelectedPhotoUrls(prev => [...prev, url])
    }
  }

  // AI Copy Generator
  const handleGenerateAICopy = async () => {
    if (!vehicle) return
    setIsGeneratingCopy(true)
    try {
      const res = await fetch('/api/ai/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle: {
            marca: vehicle.Marca || 'Vehículo',
            modelo: vehicle.Modelo || '',
            version: vehicle.Version || '',
            anio: vehicle.Año || (vehicle as any).Anio || 2023,
            km: vehicle.Km || 0,
            precio: numericPrice,
            combustible,
            transmision
          }
        })
      })
      const data = await res.json()
      if (data.success && data.copy?.instagram) {
        const ig = data.copy.instagram
        const tags = Array.isArray(ig.hashtags) ? ig.hashtags.map((h: string) => h.startsWith('#') ? h : `#${h}`).join(' ') : ''
        const generated = `${ig.hook}\n\n${ig.caption}\n\n${tags}`
        setCaption(generated)
      }
    } catch (e) {
      console.warn('Error al generar copy con IA:', e)
    } finally {
      setIsGeneratingCopy(false)
    }
  }

  // Helper for drawing rounded rectangles with cross-browser fallback
  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    ctx.beginPath()
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r)
    } else {
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + w - r, y)
      ctx.arcTo(x + w, y, x + w, y + r, r)
      ctx.lineTo(x + w, y + h - r)
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
      ctx.lineTo(x + r, y + h)
      ctx.arcTo(x, y + h, x, y + h - r, r)
      ctx.lineTo(x, y + r)
      ctx.arcTo(x, y, x + r, y, r)
    }
    ctx.closePath()
  }

  // Helper for drawing official WhatsApp SVG vector icon
  const drawWhatsAppIcon = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number
  ) => {
    ctx.save()
    ctx.translate(cx - size / 2, cy - size / 2)
    const scale = size / 24
    ctx.scale(scale, scale)
    const p = new Path2D(
      "M12.004 2C6.479 2 2 6.48 2 12c0 1.83.493 3.55 1.348 5.035L2.3 22l5.127-1.025A9.95 9.95 0 0 0 12.004 22C17.528 22 22 17.52 22 12s-4.472-10-9.996-10zm0 18.2a8.16 8.16 0 0 1-4.303-1.22l-.308-.184-3.05.61.625-2.97-.202-.32a8.16 8.16 0 1 1 7.238 4.084zm4.498-6.115c-.247-.123-1.46-.72-1.687-.803-.227-.082-.392-.123-.557.123-.165.247-.64.803-.784.968-.144.165-.288.185-.535.062-.247-.123-1.042-.384-1.986-1.225-.734-.655-1.23-1.464-1.374-1.711-.144-.247-.015-.38.109-.503.111-.11.247-.288.37-.432.124-.144.165-.247.247-.412.082-.165.041-.309-.02-.432-.062-.124-.557-1.34-.763-1.835-.2-.484-.403-.418-.557-.426l-.474-.008c-.165 0-.433.062-.66.309-.227.247-.866.845-.866 2.062s.886 2.392 1.01 2.557c.124.165 1.742 2.66 4.22 3.73.59.254 1.05.406 1.41.52.592.188 1.13.162 1.556.098.474-.07 1.46-.597 1.666-1.173.206-.577.206-1.072.144-1.173-.062-.103-.227-.165-.474-.288z"
    )
    ctx.fillStyle = '#25D366'
    ctx.fill(p)
    ctx.restore()
  }

  // Helper for drawing official Location Pin SVG vector icon
  const drawLocationPinIcon = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    color: string = '#CBD5E1'
  ) => {
    ctx.save()
    ctx.translate(cx - size / 2, cy - size / 2)
    const scale = size / 24
    ctx.scale(scale, scale)
    const p = new Path2D(
      "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
    )
    ctx.fillStyle = color
    ctx.fill(p)
    ctx.restore()
  }

  // Helper for drawing official Instagram SVG vector icon
  const drawInstagramIcon = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number
  ) => {
    ctx.save()
    ctx.translate(cx - size / 2, cy - size / 2)
    const scale = size / 24
    ctx.scale(scale, scale)
    const p = new Path2D(
      "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
    )
    const grad = ctx.createLinearGradient(0, 24, 24, 0)
    grad.addColorStop(0, '#f09433')
    grad.addColorStop(0.25, '#e6683c')
    grad.addColorStop(0.5, '#dc2743')
    grad.addColorStop(0.75, '#cc2366')
    grad.addColorStop(1, '#bc1888')
    ctx.fillStyle = grad
    ctx.fill(p)
    ctx.restore()
  }

  // Draw 9:16 frame at timestamp `t` (in seconds) - Exact Remotion 60fps Replication
  const drawFrame = (ctx: CanvasRenderingContext2D, t: number) => {
    const W = 720
    const H = 1280
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high' // Filtrado bicúbico Ultra HD para máxima nitidez
    ctx.clearRect(0, 0, W, H)

    const images = loadedImagesRef.current

    // Guard: si no hay imágenes cargadas aún, mostrar placeholder de loading
    if (images.length === 0) {
      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, '#0F172A')
      grad.addColorStop(1, '#020617')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)
      ctx.font = '700 18px system-ui, sans-serif'
      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Cargando imágenes...', W / 2, H / 2)
      return
    }

    const isCinematic = activeTemplateId === 'cinematic-broll' || activeTemplateId === 'cinematic-panoramic' || activeTemplateId === 'cinematic-panoramic-clean' || activeTheme === 'cinematic' || activeTheme === 'cinematic-panoramic' || activeTheme === 'cinematic-panoramic-clean'
    const isPanoramic = activeTemplateId === 'cinematic-panoramic' || activeTemplateId === 'cinematic-panoramic-clean' || activeTheme === 'cinematic-panoramic' || activeTheme === 'cinematic-panoramic-clean'
    const isClean = activeTemplateId === 'cinematic-panoramic-clean' || activeTheme === 'cinematic-panoramic-clean'

    // Cálculo de tiempo dinámico exacto por foto (ritmo panorámico pausado y elegante)
    const slideDurs: number[] = []
    let photosTotalTime = 0

    for (let i = 0; i < images.length; i++) {
      const im = images[i]
      let d = slideDuration || 2.4
      if (isPanoramic && im && im.complete && im.naturalWidth > 0) {
        const cScale = Math.max(W / im.width, H / im.height)
        const fW = im.width * cScale
        const fH = im.height * cScale
        const pDist = Math.max(fW - W, fH - H)
        d = Math.max(2.0, Math.min(3.8, 1.8 + pDist / 190))
      }
      slideDurs.push(d)
      photosTotalTime += d
    }

    if (photosTotalTime === 0) photosTotalTime = images.length * (slideDuration || 1.8)

    const isOutro = t >= photosTotalTime

    // Brand and Model parts
    const brandLine = videoBrand
    const modelLine = videoModelAndVersion

    // Clean anticipo text
    const formatAnticipoClean = (raw?: string) => {
      if (!raw) return ''
      let clean = raw
        .replace(/^[💵\s*•\-\*]+/g, '')
        .replace(/^anticipo\s*(desde)?\s*:?\s*/i, '')
        .replace(/^entrega\s*(desde)?\s*:?\s*/i, '')
        .trim()
      
      if (/^\$[\d\.\,]+$/.test(clean) || /^\d+$/.test(clean)) {
        const formatted = clean.startsWith('$') ? clean : `$${Number(clean).toLocaleString('es-AR')}`
        return `${formatted} + 18 cuotas Tasa 0% !`
      }
      return clean
    }
    const cleanAnticipo = formatAnticipoClean(activeAnticipo)
    const hasAnticipo = showAnticipoBanner && Boolean(activeAnticipo)

    // Clean price text
    const cleanPriceText = (p?: string) => {
      if (!p) return ''
      return p.replace(/^PRECIO\s*CONTADO\s*:\s*/i, '').trim()
    }
    const displayPrice = cleanPriceText(activePrice)

    if (!isOutro) {
      let slideIndex = 0
      let curSlideDur = slideDurs[0] || 1.8
      let localT = 0
      let accum = 0

      for (let i = 0; i < images.length; i++) {
        const d = slideDurs[i] || 1.8
        if (t < accum + d) {
          slideIndex = i
          curSlideDur = d
          localT = (t - accum) / d
          break
        }
        accum += d
        if (i === images.length - 1) {
          slideIndex = images.length - 1
          curSlideDur = d
          localT = 1.0
        }
      }

      const img = images.length > 0 ? images[slideIndex] : null

      if (isCinematic) {
        const nextIndex = (slideIndex + 1) < images.length ? slideIndex + 1 : slideIndex
        const nextImg = images.length > 0 ? images[nextIndex] : null

        let scale = 1.05
        let panX = 0
        let panY = 0

        // Smooth easeInOut curve for cinematic-broll vs Linear constant speed for isPanoramic (movimiento inmediato sin pausas)
        const easeT = isPanoramic ? localT : (localT < 0.5 ? 2 * localT * localT : -1 + (4 - 2 * localT) * localT)

        if (isPanoramic && img && img.complete && img.naturalWidth > 0) {
          const coverScale = Math.max(W / img.width, H / img.height)
          const fgW = img.width * coverScale
          const fgH = img.height * coverScale
          scale = 1.0

          if (fgW > W + 10) {
            // Paneo panorámico de lado a lado a velocidad constante instantánea
            const maxPanX = (fgW - W) / 2
            const dir = (slideIndex % 2 === 0) ? 1 : -1
            panX = dir * (-maxPanX + easeT * (2 * maxPanX))
            panY = 0
          } else if (fgH > H + 10) {
            // Paneo vertical de arriba a abajo si la foto es alta
            const maxPanY = (fgH - H) / 2
            const dir = (slideIndex % 2 === 0) ? 1 : -1
            panY = dir * (-maxPanY + easeT * (2 * maxPanY))
            panX = 0
          } else {
            scale = 1.04 + easeT * 0.08
          }
        } else {
          // Alternating Slow Cinematic Camera Movements per view
          const motionType = slideIndex % 5
          if (motionType === 0) {
            scale = 1.05 + easeT * 0.13
            panY = -6 + easeT * 12
          } else if (motionType === 1) {
            scale = 1.14 + easeT * 0.03
            panX = -32 + easeT * 64
          } else if (motionType === 2) {
            scale = 1.03 + easeT * 0.14
            panX = 8 - easeT * 16
            panY = 6 - easeT * 12
          } else if (motionType === 3) {
            scale = 1.10 + easeT * 0.08
            panY = -20 + easeT * 40
            panX = 10 - easeT * 10
          } else {
            scale = 1.18 - easeT * 0.12
            panX = 14 - easeT * 26
          }
        }

        if (img && img.complete && img.naturalWidth > 0) {
          // 1. Ambient Blurred Bokeh Background (9:16 full-bleed)
          const bgCache = blurredBgCacheRef.current[slideIndex]
          if (bgCache) {
            ctx.save()
            ctx.translate(W / 2, H / 2)
            ctx.scale(1.04 + easeT * 0.03, 1.04 + easeT * 0.03)
            ctx.drawImage(bgCache, -W / 2, -H / 2, W, H)
            ctx.restore()
          }

          // Dark showroom ambient tint
          ctx.fillStyle = 'rgba(5, 8, 16, 0.40)'
          ctx.fillRect(0, 0, W, H)

          // 2. Fixed Viewport Container (Ocupa TODA la vista 9:16 completa)
          const vpX = 0
          const vpY = 0
          const vpW = W // 720px full width edge-to-edge
          const vpH = H // 1280px full screen
          const vpCenterX = vpX + vpW / 2
          const vpCenterY = vpY + vpH / 2

          ctx.save()
          ctx.beginPath()
          ctx.rect(vpX, vpY, vpW, vpH)
          ctx.clip() // ✅ MÁSCARA FIJA: El cuadro no se mueve jamás en pantalla

          // Renderizar foto del vehículo DENTRO de la máscara fija (Cover fit)
          const coverScale = Math.max(vpW / img.width, vpH / img.height)
          const fgW = img.width * coverScale
          const fgH = img.height * coverScale

          ctx.save()
          ctx.translate(vpCenterX + panX, vpCenterY + panY)
          ctx.scale(scale, scale)
          ctx.shadowColor = 'rgba(0, 0, 0, 0.85)'
          ctx.shadowBlur = 24
          ctx.shadowOffsetY = 8
          ctx.drawImage(img, -fgW / 2, -fgH / 2, fgW, fgH)
          ctx.restore()

          // 3. Transición Cinematográfica Profesional entre Vistas (último 24% del slide)
          if (localT > 0.76 && nextImg && nextImg !== img && nextImg.complete && nextImg.naturalWidth > 0) {
            const rawTransT = (localT - 0.76) / 0.24
            // Curva suave Smoothstep
            const transT = rawTransT * rawTransT * (3 - 2 * rawTransT)
            const nextCoverScale = Math.max(vpW / nextImg.width, vpH / nextImg.height)
            const nextW = nextImg.width * nextCoverScale
            const nextH = nextImg.height * nextCoverScale
            let nextScale = 1.12 - transT * 0.07
            let nextPanX = (1 - transT) * 28
            let nextPanY = 0

            if (isPanoramic) {
              nextScale = 1.0
              const nextDir = (nextIndex % 2 === 0) ? 1 : -1
              if (nextW > W + 10) {
                const nextMaxPanX = (nextW - W) / 2
                nextPanX = nextDir * (-nextMaxPanX)
                nextPanY = 0
              } else if (nextH > H + 10) {
                const nextMaxPanY = (nextH - H) / 2
                nextPanY = nextDir * (-nextMaxPanY)
                nextPanX = 0
              }
            }

            // Siguiente foto entrando suavemente posicionada en movimiento continuo desde el costado
            ctx.save()
            ctx.globalAlpha = transT
            ctx.translate(vpCenterX + nextPanX, vpCenterY + nextPanY)
            ctx.scale(nextScale, nextScale)
            ctx.shadowColor = 'rgba(0, 0, 0, 0.85)'
            ctx.shadowBlur = 24
            ctx.shadowOffsetY = 8
            ctx.drawImage(nextImg, -nextW / 2, -nextH / 2, nextW, nextH)
            ctx.restore()

            // Destello de Luz Anamórfico Cinematográfico en el empalme del cambio de foto
            const flareAlpha = Math.sin(transT * Math.PI) * 0.40
            if (flareAlpha > 0.01) {
              ctx.save()
              ctx.globalCompositeOperation = 'screen'
              const flareGrad = ctx.createLinearGradient(vpX, vpY + vpH * 0.3, vpX + vpW, vpY + vpH * 0.7)
              flareGrad.addColorStop(0, 'rgba(255, 255, 255, 0)')
              flareGrad.addColorStop(0.3, `rgba(56, 189, 248, ${flareAlpha * 0.5})`)
              flareGrad.addColorStop(0.5, `rgba(250, 204, 21, ${flareAlpha * 0.8})`)
              flareGrad.addColorStop(0.7, `rgba(255, 255, 255, ${flareAlpha * 0.4})`)
              flareGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
              ctx.fillStyle = flareGrad
              ctx.fillRect(vpX, vpY, vpW, vpH)
              ctx.restore()
            }
          }

          // 4. Spotlight Ambient Lighting Sweep across current camera move
          const sweepX = (localT * W * 1.6) - W * 0.3
          const sweepGrad = ctx.createLinearGradient(sweepX - 120, 0, sweepX + 120, 0)
          sweepGrad.addColorStop(0, 'rgba(255, 255, 255, 0)')
          sweepGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.04)')
          sweepGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
          ctx.fillStyle = sweepGrad
          ctx.fillRect(vpX, vpY, vpW, vpH)

          ctx.restore() // Liberar la máscara fija del viewport
        } else {
          const darkGrad = ctx.createLinearGradient(0, 0, 0, H)
          darkGrad.addColorStop(0, '#0F172A')
          darkGrad.addColorStop(1, '#020617')
          ctx.fillStyle = darkGrad
          ctx.fillRect(0, 0, W, H)
        }

        // 5. Cinematic Vignette, Logo Emblem & Text Overlays (Omitidos si es plantilla limpia Solo Imágenes)
        if (!isClean) {
          // 5. Cinematic Vignette (Top and Bottom)
          ctx.save()
          const topVignette = ctx.createLinearGradient(0, 0, 0, 200)
          topVignette.addColorStop(0, 'rgba(2, 6, 23, 0.85)')
          topVignette.addColorStop(1, 'rgba(2, 6, 23, 0)')
          ctx.fillStyle = topVignette
          ctx.fillRect(0, 0, W, 200)

          const botVignette = ctx.createLinearGradient(0, H - 420, 0, H)
          botVignette.addColorStop(0, 'rgba(2, 6, 23, 0)')
          botVignette.addColorStop(0.4, 'rgba(2, 6, 23, 0.75)')
          botVignette.addColorStop(1, 'rgba(2, 6, 23, 0.95)')
          ctx.fillStyle = botVignette
          ctx.fillRect(0, H - 420, W, 420)
          ctx.restore()

          // 6. Top Dealership Brand Emblem (Subtle & Elegant)
          const topLogoW = 125
          const topLogoH = 54
          const topLogoX = (W - topLogoW) / 2
          const topLogoY = 40
          ctx.save()
          ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
          ctx.shadowBlur = 16
          if (logoImageRef.current && logoImageRef.current.complete && logoImageRef.current.naturalWidth > 0) {
            ctx.drawImage(logoImageRef.current, topLogoX, topLogoY, topLogoW, topLogoH)
          } else {
            ctx.font = 'italic 900 20px system-ui, sans-serif'
            ctx.fillStyle = '#FFFFFF'
            ctx.textAlign = 'center'
            ctx.fillText('OKMMOTORS', W / 2, topLogoY + 28)
          }
          ctx.restore()

          // Top micro-tagline under logo
          ctx.save()
          ctx.font = '700 11px system-ui, sans-serif'
          ctx.fillStyle = '#94A3B8'
          ctx.textAlign = 'center'
          ctx.fillText('SHOWROOM DE SELECCIONADOS', W / 2, topLogoY + topLogoH + 14)
          ctx.restore()

          // 7. Minimalist High-End HUD / Editorial Typography (Bottom Third)
          const marginX = 36
          const contentW = W - 2 * marginX
          const hudY = H - 290

          // 7.1 Sleek Frosted Glass Badge Pill (Año • Km • Transmisión)
          const b1 = (videoBadge1 || `${videoYear}`).replace(/[📅🚘⚙️💵💰🔥]/g, '').trim()
          const b2 = (videoBadge2 || `${videoKm}`).replace(/[📅🚘⚙️💵💰🔥]/g, '').trim()
          const b3 = (videoBadge3 || `${videoTransmission}`).replace(/[📅🚘⚙️💵💰🔥]/g, '').trim()
          const specLine = [b1, b2, b3].filter(Boolean).join('  •  ')

          if (specLine) {
            ctx.save()
            ctx.font = '800 14px system-ui, sans-serif'
            const specMetrics = ctx.measureText(specLine)
            const pillW = Math.min(specMetrics.width + 36, contentW)
            const pillH = 34
            const pillX = marginX

            ctx.shadowColor = 'rgba(0, 0, 0, 0.85)'
            ctx.shadowBlur = 14
            ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'
            drawRoundedRect(ctx, pillX, hudY, pillW, pillH, 12)
            ctx.fill()

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)'
            ctx.lineWidth = 1.2
            ctx.stroke()

            ctx.fillStyle = '#E2E8F0'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(specLine, pillX + pillW / 2, hudY + pillH / 2 + 1)
            ctx.restore()
          }

          // 7.2 Full Vehicle Model Name (Large, crisp, luxury automotive font)
          const titleY = hudY + 46
          ctx.save()
          ctx.font = '900 36px system-ui, sans-serif'
          ctx.fillStyle = '#FFFFFF'
          ctx.textAlign = 'left'
          ctx.textBaseline = 'top'
          ctx.shadowColor = 'rgba(0, 0, 0, 0.95)'
          ctx.shadowBlur = 18
          ctx.shadowOffsetY = 3

          const fullVehicleName = `${brandLine} ${modelLine}`.trim()
          let finalTitle = fullVehicleName
          if (ctx.measureText(finalTitle).width > contentW) {
            ctx.font = '900 28px system-ui, sans-serif'
          }
          ctx.fillText(finalTitle, marginX, titleY)
          ctx.restore()

          // 7.3 Bottom Dealership & Price / Anticipo Tag (Gris azulado resaltante, mismo tamaño, anticipo arriba)
          const bottomRowY = titleY + 54
          const slateBlueGrey = '#CBD5E1'

          ctx.save()
          ctx.textAlign = 'left'
          ctx.textBaseline = 'top'
          ctx.shadowColor = 'rgba(0, 0, 0, 0.95)'
          ctx.shadowBlur = 14

          // 1. Primero arriba: Entrega y cuotas (Mismo tamaño que el precio)
          if (cleanAnticipo) {
            let antFontSize = 24
            ctx.font = `900 ${antFontSize}px system-ui, sans-serif`
            const maxAntW = contentW * 0.64
            while (ctx.measureText(cleanAnticipo.toUpperCase()).width > maxAntW && antFontSize > 15) {
              antFontSize -= 1
              ctx.font = `900 ${antFontSize}px system-ui, sans-serif`
            }
            ctx.fillStyle = slateBlueGrey
            ctx.fillText(cleanAnticipo.toUpperCase(), marginX, bottomRowY)
          }

          // 2. Abajo: Precio Contado (Mismo tamaño y color gris azulado)
          const priceStr = displayPrice ? `PRECIO: ${displayPrice}` : ''
          if (priceStr) {
            const priceY = cleanAnticipo ? bottomRowY + 32 : bottomRowY
            ctx.font = '900 24px system-ui, sans-serif'
            ctx.fillStyle = slateBlueGrey
            ctx.fillText(priceStr, marginX, priceY)
          }

          // Location / WhatsApp badge right-aligned
          ctx.font = '900 14px system-ui, sans-serif'
          ctx.fillStyle = '#E2E8F0'
          ctx.textAlign = 'right'
          ctx.shadowColor = 'rgba(0, 0, 0, 0.95)'
          ctx.shadowBlur = 12
          ctx.fillText('RESISTENCIA, CHACO', marginX + contentW, bottomRowY + 4)

          ctx.font = '900 16px system-ui, sans-serif'
          ctx.fillStyle = '#25D366'
          ctx.shadowColor = 'rgba(0, 0, 0, 0.95)'
          ctx.shadowBlur = 14
          ctx.fillText('WhatsApp 3624-750716', marginX + contentW, bottomRowY + 30)
          ctx.restore()
        }
      } else {
        let photoTop = 160

      // 1. FULL-SCREEN: fondo blureado desde cache offscreen (sin blur vivo por frame)
      if (img && img.complete && img.naturalWidth > 0) {
        const bgCache = blurredBgCacheRef.current[slideIndex]
        if (bgCache) {
          // Usar el canvas pre-blureado — zoom sutil animado
          ctx.save()
          const bgScale = 1.0 + localT * 0.025
          ctx.translate(W / 2, H / 2)
          ctx.scale(bgScale, bgScale)
          ctx.drawImage(bgCache, -W / 2, -H / 2, W, H)
          ctx.restore()
        } else {
          // Fallback: blur vivo si el cache aún no está listo
          ctx.save()
          const bgScale = 1.25 + localT * 0.04
          ctx.translate(W / 2, H / 2)
          ctx.scale(bgScale, bgScale)
          const imgRatio = img.width / img.height
          let bgW = W, bgH = H
          if (imgRatio > W / H) { bgH = H; bgW = H * imgRatio } else { bgW = W; bgH = W / imgRatio }
          if ('filter' in ctx) { ctx.filter = 'blur(30px) brightness(0.70) saturate(1.2)' }
          ctx.drawImage(img, -bgW / 2, -bgH / 2, bgW, bgH)
          if ('filter' in ctx) { ctx.filter = 'none' }
          ctx.restore()
        }

        // Soft dark ambient tint across the entire canvas for unified depth
        ctx.fillStyle = 'rgba(7, 10, 18, 0.35)'
        ctx.fillRect(0, 0, W, H)

        // Centered crisp vehicle (Enlarged to occupy upper space)
        const marginX = 28 // 664px available width
        const safeW = W - 2 * marginX
        const safeH = 560 // Expanded height to fill upper space
        const centerY = 370
        const fitScale = fitMode === 'cover'
          ? Math.max(W / img.width, 480 / img.height)
          : Math.min(safeW / img.width, safeH / img.height)
        const fgW = img.width * fitScale
        const fgH = img.height * fitScale
        const fgZoom = 1.0 + localT * 0.02

        photoTop = centerY - fgH / 2

        ctx.save()
        ctx.translate(W / 2, centerY)
        ctx.scale(fgZoom, fgZoom)
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)'
        ctx.shadowBlur = 24
        ctx.shadowOffsetY = 8
        ctx.drawImage(img, -fgW / 2, -fgH / 2, fgW, fgH)
        ctx.restore()
      } else {
        // Fallback dark gradient for canvas
        const darkGrad = ctx.createLinearGradient(0, 0, 0, H)
        darkGrad.addColorStop(0, '#0F172A')
        darkGrad.addColorStop(1, '#020617')
        ctx.fillStyle = darkGrad
        ctx.fillRect(0, 0, W, H)
      }

      // Top Dealership Brand Emblem (Okmmotors Oval Logo un poco arriba de la foto)
      const topLogoW = 155
      const topLogoH = 66
      const topLogoX = (W - topLogoW) / 2
      // Un poco arriba de la foto (mínimo y = 22)
      const topLogoY = Math.max(22, Math.round(photoTop - topLogoH - 10))

      ctx.save()
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
      ctx.shadowBlur = 20
      ctx.shadowOffsetY = 6
      if (logoImageRef.current && logoImageRef.current.complete && logoImageRef.current.naturalWidth > 0) {
        ctx.drawImage(logoImageRef.current, topLogoX, topLogoY, topLogoW, topLogoH)
      } else {
        ctx.beginPath()
        ctx.ellipse(W / 2, topLogoY + topLogoH / 2, topLogoW / 2, topLogoH / 2, 0, 0, Math.PI * 2)
        ctx.fillStyle = '#CBD5E1'
        ctx.fill()
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 3
        ctx.stroke()
        ctx.font = 'italic 900 24px system-ui, sans-serif'
        ctx.fillStyle = '#0F172A'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('Okmmotors', W / 2, topLogoY + topLogoH / 2)
      }
      ctx.restore()

      // 2. Smooth ambient vignette across the lower half (NO solid box, NO borders)
      ctx.save()
      const bottomVignette = ctx.createLinearGradient(0, 520, 0, H)
      bottomVignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
      bottomVignette.addColorStop(0.3, 'rgba(2, 6, 23, 0.60)')
      bottomVignette.addColorStop(0.7, 'rgba(2, 6, 23, 0.85)')
      bottomVignette.addColorStop(1, 'rgba(2, 6, 23, 0.95)')
      ctx.fillStyle = bottomVignette
      ctx.fillRect(0, 520, W, H - 520)
      ctx.restore()

      const marginX = 36 // 5% of 720px
      const contentX = marginX
      const contentW = W - 2 * marginX // 648px

      // 2.1 Top Badges Row (Año, Km, Transmisión sin emojis) — Centrado verticalmente con margen equilibrado arriba y abajo
      const badgeY = 740
      const badgeH = 34
      const badgePill = (text: string, x: number): number => {
        if (!text) return x
        ctx.font = '900 15px system-ui, sans-serif'
        const metrics = ctx.measureText(text)
        const bW = metrics.width + 26
        ctx.save()
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
        ctx.shadowBlur = 10
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
        drawRoundedRect(ctx, x, badgeY, bW, badgeH, 12)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
        ctx.lineWidth = 1.2
        ctx.stroke()
        ctx.fillStyle = '#FFFFFF'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, x + bW / 2, badgeY + badgeH / 2 + 1)
        ctx.restore()
        return x + bW + 10
      }

      let curBadgeX = contentX
      const b1 = (videoBadge1 || `${videoYear}`).replace(/[📅🚘⚙️💵💰🔥]/g, '').trim()
      const b2 = (videoBadge2 || `${videoKm}`).replace(/[📅🚘⚙️💵💰🔥]/g, '').trim()
      const b3 = (videoBadge3 || `${videoTransmission}`).replace(/[📅🚘⚙️💵💰🔥]/g, '').trim()
      if (b1) curBadgeX = badgePill(b1, curBadgeX)
      if (b2) curBadgeX = badgePill(b2, curBadgeX)
      if (b3 && curBadgeX < contentX + contentW - 80) curBadgeX = badgePill(b3, curBadgeX)

      // 2.2 Vehicle Brand (arriba) & Model + Version (abajo)
      const textX = contentX
      const brandY = badgeY + badgeH + 18

      // Brand
      if (brandLine) {
        ctx.save()
        ctx.font = '900 18px system-ui, sans-serif'
        ctx.fillStyle = '#E2E8F0'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)'
        ctx.shadowBlur = 10
        ctx.shadowOffsetY = 2
        ctx.fillText(brandLine, textX, brandY)
        ctx.restore()
      }

      // Model + Version
      const modelY = brandLine ? brandY + 26 : brandY
      ctx.save()
      ctx.font = '900 34px system-ui, sans-serif'
      ctx.fillStyle = '#FFFFFF'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)'
      ctx.shadowBlur = 16
      ctx.shadowOffsetY = 3
      const modelMetrics = ctx.measureText(modelLine)
      if (modelMetrics.width > contentW) {
        ctx.font = '900 28px system-ui, sans-serif'
      }
      ctx.fillText(modelLine, textX, modelY)
      ctx.restore()

      // 2.3 Entrega Inmediata / Anticipo Banner (Plata Cromado Okmmotors)
      let nextElementY = modelY + 44
      if (hasAnticipo && cleanAnticipo) {
        const bannerX = contentX
        const labelY = nextElementY

        // Label "Entrega Inmediata" arriba del cuadro blanco
        ctx.save()
        ctx.font = '900 15px system-ui, sans-serif'
        ctx.fillStyle = '#E2E8F0'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)'
        ctx.shadowBlur = 10
        ctx.fillText('ENTREGA INMEDIATA', bannerX, labelY)
        ctx.restore()

        const bannerY = labelY + 22
        const bannerW = contentW
        const bannerH = 64

        ctx.save()
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)'
        ctx.shadowBlur = 24
        ctx.shadowOffsetY = 6

        const chromeGrad = ctx.createLinearGradient(bannerX, bannerY, bannerX + bannerW, bannerY + bannerH)
        chromeGrad.addColorStop(0, '#F1F5F9')
        chromeGrad.addColorStop(0.5, '#FFFFFF')
        chromeGrad.addColorStop(1, '#E2E8F0')
        ctx.fillStyle = chromeGrad
        drawRoundedRect(ctx, bannerX, bannerY, bannerW, bannerH, 18)
        ctx.fill()

        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 2
        ctx.stroke()

        let antFontSize = 24
        ctx.font = `900 ${antFontSize}px system-ui, sans-serif`
        while (ctx.measureText(cleanAnticipo).width > bannerW - 24 && antFontSize > 14) {
          antFontSize -= 1
          ctx.font = `900 ${antFontSize}px system-ui, sans-serif`
        }
        ctx.fillStyle = '#020617'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(cleanAnticipo, bannerX + bannerW / 2, bannerY + bannerH / 2 + 1)
        ctx.restore()

        nextElementY = bannerY + bannerH + 18
      } else {
        nextElementY += 10
      }

      // 2.4 Precio Contado y Permutas Row
      const priceRowY = nextElementY
      ctx.save()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(contentX, priceRowY)
      ctx.lineTo(contentX + contentW, priceRowY)
      ctx.stroke()
      ctx.restore()

      const priceContentY = priceRowY + 14
      ctx.save()
      ctx.font = '900 25px system-ui, sans-serif'
      ctx.fillStyle = '#FFFFFF'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)'
      ctx.shadowBlur = 12
      ctx.shadowOffsetY = 2
      ctx.fillText(`PRECIO CONTADO: ${displayPrice}`, contentX, priceContentY + 4)

      // Permutas
      ctx.font = '700 12px system-ui, sans-serif'
      ctx.fillStyle = '#CBD5E1'
      ctx.textAlign = 'right'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)'
      ctx.shadowBlur = 8
      ctx.fillText('PERMUTAS', contentX + contentW, priceContentY)
      ctx.font = '900 15px system-ui, sans-serif'
      ctx.fillStyle = '#FFFFFF'
      ctx.fillText('Tomamos tu Usado', contentX + contentW, priceContentY + 16)
      ctx.restore()

      // 2.5 Bottom WhatsApp Button & Location (Más abajo, centrado y con márgenes equilibrados)
      const btnX = contentX
      const btnY = priceContentY + 46
      const btnW = contentW
      const btnH = 62

      ctx.save()
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)'
      ctx.shadowBlur = 24
      ctx.shadowOffsetY = 6

      const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH)
      btnGrad.addColorStop(0, '#F1F5F9')
      btnGrad.addColorStop(0.5, '#FFFFFF')
      btnGrad.addColorStop(1, '#E2E8F0')
      ctx.fillStyle = btnGrad
      drawRoundedRect(ctx, btnX, btnY, btnW, btnH, 20)
      ctx.fill()

      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 2
      ctx.stroke()

      // WhatsApp text + Icon
      const waNumber = '3624750716'
      const btnText = `WHATSAPP ${waNumber}`
      ctx.font = '900 21px system-ui, sans-serif'
      const waMetrics = ctx.measureText(btnText)
      const totalWaW = waMetrics.width + 36
      const waStartX = btnX + (btnW - totalWaW) / 2

      drawWhatsAppIcon(ctx, waStartX + 12, btnY + btnH / 2, 26)

      ctx.fillStyle = '#020617'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(btnText, waStartX + 34, btnY + btnH / 2 + 1)
      ctx.restore()

      // Location más abajo y centrado
      const locY = btnY + btnH + 18
      ctx.save()
      const locText = 'Resistencia, Chaco'
      ctx.font = '900 15px system-ui, sans-serif'
      const locMetrics = ctx.measureText(locText)
      const totalLocW = locMetrics.width + 24
      const locStartX = (W - totalLocW) / 2

      drawLocationPinIcon(ctx, locStartX + 8, locY, 18, '#F1F5F9')

      ctx.fillStyle = '#F1F5F9'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)'
      ctx.shadowBlur = 10
      ctx.shadowOffsetY = 2
      ctx.fillText(locText, locStartX + 22, locY)
      ctx.restore()
    }
  } else {
      // Fondo outro — desde cache offscreen (primera imagen)
      const bgImg = (images.length > 0) ? images[0] : null
      if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
        const bgCache = blurredBgCacheRef.current[0]
        if (bgCache) {
          ctx.save()
          ctx.drawImage(bgCache, 0, 0, W, H)
          ctx.restore()
        } else {
          ctx.save()
          ctx.translate(W / 2, H / 2)
          ctx.scale(1.35, 1.35)
          const imgRatio = bgImg.width / bgImg.height
          let bgW = W, bgH = W / imgRatio
          if (bgH < H) { bgH = H; bgW = H * imgRatio }
          if ('filter' in ctx) { ctx.filter = 'blur(30px) brightness(0.75) saturate(1.25)' }
          ctx.drawImage(bgImg, -bgW / 2, -bgH / 2, bgW, bgH)
          if ('filter' in ctx) { ctx.filter = 'none' }
          ctx.restore()
        }

        // Overlay del color seleccionado por el usuario (outroBgStyle)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.50)'
        ctx.fillRect(0, 0, W, H)
        const hexToRgba = (hex: string, alpha: number) => {
          const h = hex.replace('#', '').padEnd(6, '0')
          const r = parseInt(h.slice(0, 2), 16) || 0
          const g = parseInt(h.slice(2, 4), 16) || 0
          const b = parseInt(h.slice(4, 6), 16) || 0
          return `rgba(${r}, ${g}, ${b}, ${alpha})`
        }
        const outroColorOverlay = hexToRgba(outroBgStyle.c1, outroBgStyle.c2 ? 0.55 : 0.60)
        const outroGrad = ctx.createLinearGradient(0, 0, 0, H)
        outroGrad.addColorStop(0, outroColorOverlay)
        outroGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.20)')
        outroGrad.addColorStop(1, outroColorOverlay)
        ctx.fillStyle = outroGrad
        ctx.fillRect(0, 0, W, H)
      } else {
        // Sin foto — usar outroBgStyle directo
        if (outroBgStyle.type === 'gradient' && outroBgStyle.c2) {
          const darkBg = ctx.createLinearGradient(0, 0, 0, H)
          darkBg.addColorStop(0, outroBgStyle.c1)
          darkBg.addColorStop(1, outroBgStyle.c2)
          ctx.fillStyle = darkBg
        } else {
          ctx.fillStyle = outroBgStyle.c1
        }
        ctx.fillRect(0, 0, W, H)
      }

      // Top Header / Enlarged Okmmotors Logo (y = 180)
      const outroLogoW = 320
      const outroLogoH = 180
      const outroLogoX = (W - outroLogoW) / 2
      const outroLogoY = 180

      ctx.save()
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)'
      ctx.shadowBlur = 32
      ctx.shadowOffsetY = 12
      if (logoImageRef.current && logoImageRef.current.complete && logoImageRef.current.naturalWidth > 0) {
        ctx.drawImage(logoImageRef.current, outroLogoX, outroLogoY, outroLogoW, outroLogoH)
      } else {
        ctx.beginPath()
        ctx.ellipse(W / 2, outroLogoY + outroLogoH / 2, outroLogoW / 2, outroLogoH / 2, 0, 0, Math.PI * 2)
        ctx.fillStyle = '#CBD5E1'
        ctx.fill()
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 4
        ctx.stroke()
        ctx.font = 'italic 900 40px system-ui, sans-serif'
        ctx.fillStyle = '#0F172A'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('Okmmotors', W / 2, outroLogoY + outroLogoH / 2)
      }
      ctx.restore()

      // Clean Frosted Glass Contact Card (y = 420)
      const boxX = 40
      const boxY = 420
      const boxW = W - 80 // 640px
      const boxH = 500

      ctx.save()
      ctx.shadowColor = 'rgba(0, 0, 0, 0.90)'
      ctx.shadowBlur = 40
      ctx.shadowOffsetY = 16

      ctx.fillStyle = 'rgba(10, 15, 26, 0.88)'
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 32)
      ctx.fill()

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
      ctx.lineWidth = 2
      ctx.stroke()

      // 1. Ubicación (Resistencia, Chaco)
      const locText = customOutroAddress || 'Resistencia, Chaco'
      const locCenterY = boxY + 95
      ctx.font = '900 28px system-ui, sans-serif'
      let locFontSize = 28
      while (ctx.measureText(locText).width > boxW - 100 && locFontSize > 16) {
        locFontSize -= 1
        ctx.font = `900 ${locFontSize}px system-ui, sans-serif`
      }
      const locW = ctx.measureText(locText).width
      const locTotalW = 34 + 14 + locW
      const locStartX = (W - locTotalW) / 2
      drawLocationPinIcon(ctx, locStartX + 17, locCenterY, 34, '#FFFFFF')
      ctx.fillStyle = '#FFFFFF'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)'
      ctx.shadowBlur = 12
      ctx.fillText(locText, locStartX + 34 + 14, locCenterY)

      // Divider 1
      const div1Y = boxY + 170
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(boxX + 36, div1Y)
      ctx.lineTo(boxX + boxW - 36, div1Y)
      ctx.stroke()

      // 2. Instagram (okmmotors)
      const rawInsta = customOutroContact || 'Seguinos en Instagram: @okmmotors'
      const instaText = rawInsta.includes('@okmmotors') ? rawInsta : 'Seguinos en Instagram: @okmmotors'
      const instaCenterY = boxY + 250
      ctx.font = '900 26px system-ui, sans-serif'
      let instaFontSize = 26
      while (ctx.measureText(instaText).width > boxW - 100 && instaFontSize > 16) {
        instaFontSize -= 1
        ctx.font = `900 ${instaFontSize}px system-ui, sans-serif`
      }
      const instaW = ctx.measureText(instaText).width
      const instaTotalW = 36 + 14 + instaW
      const instaStartX = (W - instaTotalW) / 2
      drawInstagramIcon(ctx, instaStartX + 18, instaCenterY, 36)
      ctx.fillStyle = '#FFFFFF'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)'
      ctx.shadowBlur = 12
      ctx.fillText(instaText, instaStartX + 36 + 14, instaCenterY)

      // Divider 2
      const div2Y = boxY + 330
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(boxX + 36, div2Y)
      ctx.lineTo(boxX + boxW - 36, div2Y)
      ctx.stroke()

      // 3. WhatsApp (3624750716)
      const wpText = 'WhatsApp 3624 - 750716'
      const wpCenterY = boxY + 415
      ctx.font = '900 30px system-ui, sans-serif'
      let wpFontSize = 30
      while (ctx.measureText(wpText).width > boxW - 100 && wpFontSize > 18) {
        wpFontSize -= 1
        ctx.font = `900 ${wpFontSize}px system-ui, sans-serif`
      }
      const wpW = ctx.measureText(wpText).width
      const wpTotalW = 40 + 14 + wpW
      const wpStartX = (W - wpTotalW) / 2
      drawWhatsAppIcon(ctx, wpStartX + 20, wpCenterY, 40)
      ctx.fillStyle = '#FFFFFF'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)'
      ctx.shadowBlur = 12
      ctx.fillText(wpText, wpStartX + 40 + 14, wpCenterY)

      ctx.restore()
    }

    // 6. DYNAMIC CUSTOM LAYERS (Capas dinámicas añadidas por el Asistente IA)
    const activeLayers = customLayers.filter(l => {
      const on = l.showOn || 'all'
      if (on === 'all') return true
      if (on === 'photos' && !isOutro) return true
      if (on === 'outro' && isOutro) return true
      return false
    })

    activeLayers.forEach(layer => {
      ctx.save()
      const text = layer.text || ''
      const bg = layer.bgColor || '#D97706'
      const fg = layer.textColor || '#FFFFFF'
      const border = layer.borderColor || '#FFFFFF'
      const fSize = layer.fontSize || 22

      if (layer.type === 'ribbon' || layer.type === 'banner') {
        let drawX = 0
        let drawY = 190
        let drawW = W
        let drawH = 46

        if (layer.position === 'top-center' || !layer.position) {
          ctx.font = `900 ${fSize}px system-ui, sans-serif`
          const tMetrics = ctx.measureText(text)
          drawW = Math.max(260, tMetrics.width + 48)
          drawX = (W - drawW) / 2
          drawY = 188
          drawH = 44

          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
          ctx.shadowBlur = 16
          ctx.shadowOffsetY = 4

          ctx.fillStyle = bg
          ctx.beginPath()
          ctx.roundRect(drawX, drawY, drawW, drawH, drawH / 2)
          ctx.fill()

          ctx.strokeStyle = border
          ctx.lineWidth = 2
          ctx.stroke()

          ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
          ctx.shadowBlur = 8
          ctx.fillStyle = fg
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(text, W / 2, drawY + drawH / 2 + 1)

        } else if (layer.position === 'top-right') {
          ctx.font = `900 ${fSize}px system-ui, sans-serif`
          const tMetrics = ctx.measureText(text)
          drawW = tMetrics.width + 36
          drawX = W - drawW - 24
          drawY = 74
          drawH = 42

          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
          ctx.shadowBlur = 14
          ctx.shadowOffsetY = 4

          ctx.fillStyle = bg
          ctx.beginPath()
          ctx.roundRect(drawX, drawY, drawW, drawH, 12)
          ctx.fill()

          ctx.strokeStyle = border
          ctx.lineWidth = 2
          ctx.stroke()

          ctx.fillStyle = fg
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(text, drawX + drawW / 2, drawY + drawH / 2 + 1)

        } else if (layer.position === 'above-price') {
          drawW = W - 60
          drawX = 30
          drawY = anticipoY - 56
          drawH = 44

          ctx.shadowColor = 'rgba(0, 0, 0, 0.85)'
          ctx.shadowBlur = 16
          ctx.shadowOffsetY = 4

          ctx.fillStyle = bg
          ctx.beginPath()
          ctx.roundRect(drawX, drawY, drawW, drawH, 12)
          ctx.fill()

          ctx.strokeStyle = border
          ctx.lineWidth = 1.8
          ctx.stroke()

          ctx.font = `900 ${fSize}px system-ui, sans-serif`
          ctx.fillStyle = fg
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(text, W / 2, drawY + drawH / 2 + 1)

        } else if (layer.position === 'bottom-banner') {
          drawW = W
          drawX = 0
          drawY = H - 54
          drawH = 46

          ctx.fillStyle = bg
          ctx.fillRect(drawX, drawY, drawW, drawH)

          ctx.font = `900 ${fSize}px system-ui, sans-serif`
          ctx.fillStyle = fg
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(text, W / 2, drawY + drawH / 2)
        }

      } else if (layer.type === 'badge' || layer.type === 'text') {
        ctx.font = `bold ${fSize}px system-ui, sans-serif`
        const tMetrics = ctx.measureText(text)
        const bW = tMetrics.width + 32
        const bH = 38
        const bX = layer.x !== undefined ? layer.x : (W - bW) / 2
        const bY = layer.y !== undefined ? layer.y : 240

        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
        ctx.shadowBlur = 12
        ctx.shadowOffsetY = 4

        ctx.fillStyle = bg
        ctx.beginPath()
        ctx.roundRect(bX, bY, bW, bH, bH / 2)
        ctx.fill()

        ctx.strokeStyle = border
        ctx.lineWidth = 1.6
        ctx.stroke()

        ctx.fillStyle = fg
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, bX + bW / 2, bY + bH / 2 + 1)
      }

      ctx.restore()
    })
  }

  // Animation playback loop
  useEffect(() => {
    if (!imagesReady) return
    let lastStamp = performance.now()

    const loop = (timestamp: number) => {
      const delta = (timestamp - lastStamp) / 1000
      lastStamp = timestamp

      if (isPlaying && !isRecording) {
        setCurrentTime(prev => {
          const next = prev + delta
          if (next >= duration) {
            return 0 // loop
          }
          return next
        })
      }

      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          drawFrame(ctx, currentTimeRef.current)
        }
      }

      animationFrameId.current = requestAnimationFrame(loop)
    }

    animationFrameId.current = requestAnimationFrame(loop)
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current)
    }
  }, [
    // currentTime se lee via currentTimeRef para no reiniciar el loop cada frame
    imagesReady, isPlaying, duration, fitMode,
    customTitle, customBadge1, customBadge2, customBadge3, customPriceText,
    customAnticipoText, showAnticipoBanner,
    titleTransform, badge1Transform, badge2Transform, badge3Transform, priceTransform, anticipoTransform,
    customOutroTitle, customOutroBullet1, customOutroBullet2, customOutroBullet3,
    customOutroBullet4, customOutroCTA, customOutroContact, customOutroAddress,
    customLayers, activeTheme, outroBgStyle, priceBtnStyle, videoFilter, slideDuration
  ])

  // Synthesize and Record Video from Canvas
  const recordVideoBlob = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current
      if (!canvas) {
        return reject(new Error('Canvas no disponible'))
      }

      setIsRecording(true)
      setIsPlaying(false)
      setRecordingProgress(0)

      const fps = 30
      const totalFrames = Math.floor(duration * fps)
      const stream = canvas.captureStream(fps)

      // Add silent audio track for maximum compatibility with Meta Video processing engines
      let combinedStream = stream
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        if (AudioCtx) {
          const audioCtx = new AudioCtx()
          const dest = audioCtx.createMediaStreamDestination()
          const osc = audioCtx.createOscillator()
          const gain = audioCtx.createGain()
          gain.gain.value = 0.0001
          osc.connect(gain)
          gain.connect(dest)
          osc.start()
          combinedStream = new MediaStream([
            ...stream.getVideoTracks(),
            ...dest.stream.getAudioTracks()
          ])
        }
      } catch (audioErr) {
        console.warn('Audio Context fallback:', audioErr)
      }

      // Detect supported mime type
      const mimeTypes = [
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ]
      let selectedMime = 'video/webm'
      for (const m of mimeTypes) {
        if (MediaRecorder.isTypeSupported(m)) {
          selectedMime = m
          break
        }
      }

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: selectedMime,
        videoBitsPerSecond: 28000000 // 28 Mbps Ultra HD nitidez cristalina sin compresión
      })

      const chunks: BlobPart[] = []
      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      recorder.onstop = () => {
        setIsRecording(false)
        const videoBlob = new Blob(chunks, { type: selectedMime })
        resolve(videoBlob)
      }

      recorder.onerror = err => {
        setIsRecording(false)
        reject(err)
      }

      // Render initial frame 0 synchronously before start so canvas is never blank
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Contexto 2D no disponible'))
      try {
        drawFrame(ctx, 0)
      } catch (initErr) {
        console.warn('Initial frame render error:', initErr)
      }

      recorder.start()

      // ✅ Sincronización exacta en tiempo real (Wall-Clock Sync): garantiza que 26s de video duren exactamente 26s reales al exportar y publicar en TikTok/Instagram
      const startTime = performance.now()
      const renderNextFrame = () => {
        try {
          const elapsedSec = (performance.now() - startTime) / 1000
          const t = Math.min(elapsedSec, duration)
          drawFrame(ctx, t)
          currentTimeRef.current = t
          setRecordingProgress(Math.min(100, Math.round((t / duration) * 100)))

          if (elapsedSec >= duration) {
            setTimeout(() => {
              try {
                if (recorder.state !== 'inactive') {
                  recorder.stop()
                }
              } catch (stopErr) {
                console.warn('Recorder stop error:', stopErr)
              }
            }, 300)
            return // finalizar ciclo de grabación
          }
          requestAnimationFrame(renderNextFrame)
        } catch (loopErr) {
          console.error('[recordVideoBlob] Frame render error:', loopErr)
        }
      }
      requestAnimationFrame(renderNextFrame)
    })
  }

  // Upload media blob (image or video) to Supabase Storage
  const uploadMediaToSupabase = async (blob: Blob, folder: string = 'reels', mimeType?: string): Promise<string> => {
    setStatusMessage('Subiendo archivo multimedia a Supabase Storage...')
    const isImage = (mimeType || blob.type).includes('image')
    const ext = isImage ? 'jpg' : (blob.type.includes('mp4') ? 'mp4' : 'webm')
    const file = new File([blob], `${folder}_${vehicle?.ID || 'v'}_${Date.now()}.${ext}`, {
      type: mimeType || blob.type
    })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)
    formData.append('vehicleId', vehicle?.ID || 'vehicle')

    const res = await fetch('/api/media/upload-video', {
      method: 'POST',
      body: formData
    })

    const data = await res.json()
    if (!res.ok || !data.success || !data.publicUrl) {
      throw new Error(data.error || 'Error al subir archivo multimedia a Supabase')
    }

    return data.publicUrl
  }

  // Handle Action Trigger
  const handlePublish = async (destination: PublishDestination) => {
    if (!vehicle || isPublishing || isRecording) return
    setIsPublishing(true)
    setErrorMessage(null)
    setPublishedUrl(null)
    setPublishedType(null)

    try {
      // 1. MODO HISTORIA EN INSTAGRAM: Renderiza y publica Video Reel 9:16 completo animado
      if (destination === 'ig_story') {
        setStatusMessage('Sintetizando y renderizando video 9:16 con IA para la Historia...')
        const blob = await recordVideoBlob()
        const publicVideoUrl = await uploadMediaToSupabase(blob, 'stories')

        setStatusMessage('Publicando Video Story en Instagram (@okmmotors) vía Meta Graph API...')
        const res = await fetch('/api/instagram/stories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoUrl: publicVideoUrl,
            vehicleTitle: title,
            vehicleId: vehicle.ID
          })
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Error al publicar Historia en Instagram')
        }
        setPublishedUrl('https://www.instagram.com/okmmotors/')
        setPublishedType('Instagram Story (Video Reel 9:16)')
        if (onSuccess) onSuccess()
        return
      }

      // 1.B. MODO ESTADO EN WHATSAPP: Reel Video 9:16 vertical
      if (destination === 'wa_story') {
        setStatusMessage('Sintetizando Reel Video 9:16 vertical para WhatsApp...')
        const videoBlob = await recordVideoBlob()
        const cleanName = `Estado_WhatsApp_${title.replace(/\s+/g, '_')}.mp4`

        // Descargar el Reel automáticamente al dispositivo
        const downloadUrl = URL.createObjectURL(videoBlob)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = cleanName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000)

        // Subir a Supabase para obtener URL pública del video MP4
        let publicVideoUrl: string | null = null
        try {
          publicVideoUrl = await uploadMediaToSupabase(videoBlob, 'stories', 'video/mp4')
        } catch (e) {
          console.error('[VideoReelModal] uploadMediaToSupabase error:', e)
        }

        // Formato limpio de texto sin emojis y con barras separadoras:
        // *Toyota Hilux Srx 4x4 At 2023* | Km: 59.000 | Precio: $61.000.000 | Automática | Diésel
        const kmFormatted = Number(String(kms).replace(/\D/g, '') || 0).toLocaleString('es-AR')
        const waDefault = [
          `*${title}*`,
          `Km: ${kmFormatted}`,
          `Precio: ${formattedPrice}`,
          entrega50 ? `Anticipo: ${entrega50}` : '',
          transmision || '',
          combustible || ''
        ].filter(Boolean).join(' | ')

        const waText = (caption && !caption.includes('🔥') && !caption.includes('@okmmotors'))
          ? caption
          : waDefault

        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          try {
            await navigator.clipboard.writeText(waText)
          } catch (e) {}
        }

        // Si es móvil y soporta Web Share con archivo de video MP4
        if (typeof navigator !== 'undefined' && navigator.share) {
          try {
            const file = new File([videoBlob], cleanName, { type: 'video/mp4' })
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: title,
                text: waText,
                files: [file]
              })
              setPublishedType('WhatsApp Estado (Reel 9:16)')
              if (onSuccess) onSuccess()
              return
            }
          } catch (shareErr: any) {
            if (shareErr.name === 'AbortError') return
          }
        }

        // Abrir WhatsApp Web con extensión Auto-Cyborg pasando videoUrl
        const lightweightMetaWA = {
          id: vehicle.ID,
          marca: vehicle.Marca,
          modelo: vehicle.Modelo,
          anio: anio,
          precio: formattedPrice,
          kms: kms,
          caption: waText,
          videoUrl: publicVideoUrl,
          mediaUrl: publicVideoUrl,
          imagenPath: publicVideoUrl,
          isVideo: true
        }

        window.postMessage(
          {
            type: 'AUTOAPP_PUBLISH_WA',
            payload: lightweightMetaWA
          },
          '*'
        )

        const encodedMetaWA = encodeURIComponent(JSON.stringify(lightweightMetaWA))
        const targetUrl = `https://web.whatsapp.com/#autoapp_wa=${encodedMetaWA}`
        
        window.open(targetUrl, '_blank')

        setPublishedUrl('https://web.whatsapp.com/')
        setPublishedType('WhatsApp Estado (Reel Video 9:16)')
        if (onSuccess) onSuccess()
        return
      }

      // 1.C. MODO TIKTOK: Reel Video 9:16 vertical
      if (destination === 'tiktok') {
        setStatusMessage('Sintetizando Reel Video 9:16 vertical para TikTok...')
        const videoBlob = await recordVideoBlob()
        const cleanName = `TikTok_${title.replace(/\s+/g, '_')}.mp4`

        // Generar copy limpio para TikTok con hashtags
        const cleanMarca = (vehicle.Marca || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
        const cleanModelo = (vehicle.Modelo || '').split(' ')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
        const kmFormatted = Number(String(kms).replace(/\D/g, '') || 0).toLocaleString('es-AR')

        const tiktokDefault = [
          `🚗 ${title}`,
          `📍 OKM Motors - Usados Seleccionados & 0km`,
          `⚡ ${kmFormatted} km | ${formattedPrice}`,
          entrega50 ? `💰 Anticipo desde ${entrega50}` : '',
          transmision ? `⚙️ Transmisión: ${transmision}` : '',
          combustible ? `⛽ Combustible: ${combustible}` : '',
          '',
          `📲 Escribinos al WhatsApp del perfil para coordinar tu test drive o reservar la unidad.`,
          '',
          `#autos #autosargentina #concesionaria #vendo #${cleanMarca} #${cleanModelo} #usadosseleccionados #parati #fyp #viral`
        ].filter(Boolean).join('\n')

        const tiktokText = caption || tiktokDefault

        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          try {
            await navigator.clipboard.writeText(tiktokText)
          } catch (e) {}
        }

        // 1. MODO CELULAR / TABLET: Compartir nativo vía Web Share con archivo .mp4
        const isMobile = isMobileDevice()
        if (isMobile && typeof navigator !== 'undefined' && navigator.share) {
          try {
            const file = new File([videoBlob], cleanName, { type: 'video/mp4' })
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: title,
                text: tiktokText,
                files: [file]
              })
              setPublishedType('TikTok (Reel Video 9:16)')
              if (onSuccess) onSuccess()
              return
            }
          } catch (shareErr: any) {
            if (shareErr.name === 'AbortError') return
          }
        }

        // 2. MODO COMPUTADORA / ESCRITORIO: Auto-Cyborg + TikTok Studio
        setStatusMessage('Preparando video 9:16 para TikTok Studio...')

        // Convertir videoBlob a Base64 en memoria (cero descargas a disco)
        const videoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve((reader.result as string) || '')
          reader.onerror = () => resolve('')
          reader.readAsDataURL(videoBlob)
        })

        // Subir a Supabase en paralelo como respaldo
        let publicVideoUrl: string | null = null
        try {
          publicVideoUrl = await uploadMediaToSupabase(videoBlob, 'stories', 'video/mp4')
        } catch (e) {
          console.warn('[VideoReelModal] uploadMediaToSupabase error (using base64):', e)
        }

        const fullMetaTT = {
          id: vehicle.ID,
          marca: vehicle.Marca,
          modelo: vehicle.Modelo,
          anio: anio,
          precio: formattedPrice,
          kms: kms,
          caption: tiktokText,
          videoBase64: videoBase64,
          videoUrl: publicVideoUrl,
          mediaUrl: publicVideoUrl,
          isVideo: true
        }

        window.postMessage(
          {
            type: 'AUTOAPP_PUBLISH_TASK',
            target: 'TIKTOK_PUBLISH',
            payload: fullMetaTT,
            data: fullMetaTT
          },
          '*'
        )

        await setExtensionStorage({
          cyborg_pending_tiktok: fullMetaTT,
          tiktok_active_car: fullMetaTT,
          task_status: 'ready_for_tiktok'
        })

        const lightweightMetaTT = {
          id: vehicle.ID,
          marca: vehicle.Marca,
          modelo: vehicle.Modelo,
          anio: anio,
          precio: formattedPrice,
          kms: kms,
          isVideo: true
        }

        const encodedMetaTT = encodeURIComponent(JSON.stringify(lightweightMetaTT))
        const targetUrl = `https://www.tiktok.com/tiktokstudio/upload#autoapp_tiktok=${encodedMetaTT}`
        window.open(targetUrl, '_blank')

        setPublishedUrl('https://www.tiktok.com/tiktokstudio/upload')
        setPublishedType('TikTok (Reel Video 9:16)')
        if (onSuccess) onSuccess()
        return
      }

      // 2. MODO VIDEO: Sintetizar animación 9:16 con Inteligencia Artificial
      setStatusMessage('Sintetizando y renderizando video en 9:16 con Inteligencia Artificial...')
      const blob = await recordVideoBlob()

      // MODO AGREGAR AUDIO Y PUBLICAR: Video 9:16 listo para elegir música en tendencia en Instagram, TikTok, Facebook o WhatsApp
      if (destination === 'audio_redirect') {
        const cleanName = `${title.replace(/\s+/g, '_')}_Reel_Audio.mp4`
        setAudioRedirectFileName(cleanName)

        // 1. Descargar automáticamente el archivo de video al dispositivo
        const downloadUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = cleanName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 15000)

        // 2. Copiar texto optimizado con hashtags al portapapeles
        const textToCopy = caption || [
          `🔥 ${title} (${anio})`,
          `📍 Kilometraje: ${kms}`,
          `💰 Precio: ${formattedPrice}`,
          entrega50 ? `💵 Anticipo mínimo: ${entrega50}` : '',
          `⚙️ Transmisión: ${transmision} | Combustible: ${combustible}`,
          `\n📲 ¡Consultá ahora para coordinar tu test drive o reserva!`
        ].filter(Boolean).join('\n')

        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          try {
            await navigator.clipboard.writeText(textToCopy)
            setCopiedCaptionSuccess(true)
          } catch (clipErr) {
            console.warn('Clipboard write error:', clipErr)
          }
        }

        // 3. Subir en segundo plano a Supabase Storage para tener URL pública si la necesitan
        try {
          uploadMediaToSupabase(blob, 'reels').then(url => {
            setAudioRedirectVideoUrl(url)
          }).catch(() => {})
        } catch (e) {}

        // 4. Si el navegador es móvil y soporta Web Share API con archivos (abre directo Instagram/TikTok con el video adjunto)
        if (typeof navigator !== 'undefined' && navigator.share) {
          try {
            const shareFile = new File([blob], cleanName, { type: blob.type.includes('mp4') ? 'video/mp4' : blob.type })
            if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
              setStatusMessage('Abriendo menú de aplicaciones del dispositivo...')
              await navigator.share({
                title: title,
                text: textToCopy,
                files: [shareFile]
              })
              setIsPublishing(false)
              setStatusMessage('')
              setPublishedType('Reel con Música Oficial')
              setShowAudioRedirectModal(true)
              return
            }
          } catch (shareErr: any) {
            if (shareErr.name === 'AbortError') {
              setIsPublishing(false)
              setStatusMessage('')
              setShowAudioRedirectModal(true)
              return
            }
          }
        }

        setIsPublishing(false)
        setStatusMessage('')
        setShowAudioRedirectModal(true)
        return
      }

      if (destination === 'download') {
        setStatusMessage('Descargando archivo de video...')
        const downloadUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
        a.download = `${title.replace(/\s+/g, '_')}_Reel_AutoApp.${ext}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(downloadUrl)
        return
      }

      // Subir video a Storage (se transcodifica automáticamente a MP4 H.264 / AAC en el servidor)
      const publicVideoUrl = await uploadMediaToSupabase(blob, 'reels')

      if (destination === 'ig_reel') {
        setStatusMessage('Publicando Reel en Instagram (@okmmotors) vía Meta Graph API...')
        const res = await fetch('/api/instagram/reels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoUrl: publicVideoUrl,
            caption,
            shareToFeed: true,
            vehicleTitle: title,
            vehicleId: vehicle.ID
          })
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Error al publicar Reel en Instagram')
        }
        setPublishedUrl(data.permalink || 'https://www.instagram.com/okmmotors/reels/')
        setPublishedType('Instagram Reel')
        if (onSuccess) onSuccess()
      } else if (destination === 'fb_reel' || destination === 'fb_feed') {
        const isFeed = destination === 'fb_feed'
        setStatusMessage(isFeed ? 'Publicando Video en el Feed/Muro de Facebook Fan Page...' : 'Publicando Reel en Fan Page de Facebook...')
        const res = await fetch('/api/facebook/reels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoUrl: publicVideoUrl,
            description: caption,
            vehicleTitle: title,
            vehicleId: vehicle.ID
          })
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(data.error || `Error al publicar ${isFeed ? 'en Feed de' : 'Reel en'} Facebook`)
        }
        setPublishedUrl(data.permalink || 'https://www.facebook.com/')
        setPublishedType(isFeed ? 'Facebook Feed (Muro Oficial)' : 'Facebook Reel / Shorts')
        if (onSuccess) onSuccess()
      } else if (destination === 'fb_story') {
        setStatusMessage('Preparando Historia 9:16 para Facebook...')
        const textToCopy = caption || `🔥 ${title} (${anio})\n💰 Precio: ${formattedPrice}\n📲 ¡Consultanos para más info!`
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          try {
            await navigator.clipboard.writeText(textToCopy)
            setCopiedCaptionSuccess(true)
          } catch (clipErr) {}
        }
        const cleanName = `${title.replace(/\s+/g, '_')}_Historia_FB.mp4`
        const downloadUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = cleanName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 15000)

        // Si es móvil y soporta Web Share
        if (typeof navigator !== 'undefined' && navigator.share) {
          try {
            const shareFile = new File([blob], cleanName, { type: blob.type.includes('mp4') ? 'video/mp4' : blob.type })
            if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
              await navigator.share({
                title: `${title} - Historia Facebook`,
                text: textToCopy,
                files: [shareFile]
              })
              setPublishedType('Facebook Historia')
              return
            }
          } catch (shareErr: any) {
            if (shareErr.name === 'AbortError') return
          }
        }

        window.open('https://www.facebook.com/stories/create', '_blank')
        setPublishedUrl('https://www.facebook.com/stories/create')
        setPublishedType('Facebook Historia (Story 24hs)')
        if (onSuccess) onSuccess()
      }
    } catch (err: any) {
      console.error('Error en publicación de Reel/Story:', err)
      setErrorMessage(err.message || 'Ocurrió un error inesperado al publicar')
    } finally {
      setIsPublishing(false)
      setIsRecording(false)
      setStatusMessage('')
    }
  }

  useImperativeHandle(ref, () => ({
    publish: async (destination?: PublishDestination) => {
      let dest: PublishDestination = destination || 'fb_reel'
      if (!destination) {
        if (platform === 'FB_REEL') dest = 'fb_reel'
        else if (platform === 'FB' || (platform as any) === 'FB_PAGE') dest = 'fb_feed'
        else if (platform === 'IG_REEL' || platform === 'IG') dest = 'ig_reel'
        else if (platform === 'IG_STORY') dest = 'ig_story'
        else if (platform === 'TIKTOK' || (platform as any) === 'TT') dest = 'tiktok'
        else if (platform === 'WA' || platform === 'WHATSAPP') dest = 'wa_story'
      }
      await handlePublish(dest)
    }
  }), [platform, vehicle, caption, title, isPublishing, isRecording])

  // Active selected box bounding coordinates, scaling and deletion actions (acorde a la letra)
  const getSelectedBox = () => {
    if (selectedElement === 'title' && titleTransform.visible) {
      return {
        id: 'title',
        name: 'Título',
        x: 30 + titleTransform.x,
        y: titleTop + titleTransform.y,
        w: titleBoxW,
        h: titleBoxH,
        scale: titleTransform.scale,
        onScaleChange: (delta: number) => {
          setTitleTransform(prev => ({
            ...prev,
            scale: Math.max(0.4, Math.min(2.2, Math.round((prev.scale + delta) * 100) / 100))
          }))
        },
        onReset: () => setTitleTransform({ x: 0, y: 0, scale: 1.0, visible: true }),
        onDelete: () => {
          setTitleTransform(prev => ({ ...prev, visible: false }))
          setSelectedElement(null)
        },
        onEdit: () => setEditingField('title'),
      }
    }
    if (selectedElement === 'badge1' && badge1Transform.visible) {
      return {
        id: 'badge1',
        name: 'Año',
        x: b1BaseX + badge1Transform.x,
        y: badgeY + badge1Transform.y,
        w: b1W,
        h: badgeH,
        scale: badge1Transform.scale,
        onScaleChange: (delta: number) => {
          setBadge1Transform(prev => ({
            ...prev,
            scale: Math.max(0.4, Math.min(2.2, Math.round((prev.scale + delta) * 100) / 100))
          }))
        },
        onReset: () => setBadge1Transform({ x: 0, y: 0, scale: 1.0, visible: true }),
        onDelete: () => {
          setBadge1Transform(prev => ({ ...prev, visible: false }))
          setSelectedElement(null)
        },
        onEdit: () => setEditingField('badge1'),
      }
    }
    if (selectedElement === 'badge2' && badge2Transform.visible) {
      return {
        id: 'badge2',
        name: 'Kilometraje',
        x: b2BaseX + badge2Transform.x,
        y: badgeY + badge2Transform.y,
        w: b2W,
        h: badgeH,
        scale: badge2Transform.scale,
        onScaleChange: (delta: number) => {
          setBadge2Transform(prev => ({
            ...prev,
            scale: Math.max(0.4, Math.min(2.2, Math.round((prev.scale + delta) * 100) / 100))
          }))
        },
        onReset: () => setBadge2Transform({ x: 0, y: 0, scale: 1.0, visible: true }),
        onDelete: () => {
          setBadge2Transform(prev => ({ ...prev, visible: false }))
          setSelectedElement(null)
        },
        onEdit: () => setEditingField('badge2'),
      }
    }
    if (selectedElement === 'badge3' && badge3Transform.visible) {
      return {
        id: 'badge3',
        name: 'Caja',
        x: b3BaseX + badge3Transform.x,
        y: badgeY + badge3Transform.y,
        w: b3W,
        h: badgeH,
        scale: badge3Transform.scale,
        onScaleChange: (delta: number) => {
          setBadge3Transform(prev => ({
            ...prev,
            scale: Math.max(0.4, Math.min(2.2, Math.round((prev.scale + delta) * 100) / 100))
          }))
        },
        onReset: () => setBadge3Transform({ x: 0, y: 0, scale: 1.0, visible: true }),
        onDelete: () => {
          setBadge3Transform(prev => ({ ...prev, visible: false }))
          setSelectedElement(null)
        },
        onEdit: () => setEditingField('badge3'),
      }
    }
    if (selectedElement === 'price' && priceTransform.visible) {
      return {
        id: 'price',
        name: 'Precio',
        x: priceBaseX + priceTransform.x,
        y: priceY + priceTransform.y,
        w: priceBoxW,
        h: priceBoxH,
        scale: priceTransform.scale,
        onScaleChange: (delta: number) => {
          setPriceTransform(prev => ({
            ...prev,
            scale: Math.max(0.4, Math.min(2.2, Math.round((prev.scale + delta) * 100) / 100))
          }))
        },
        onReset: () => setPriceTransform({ x: 0, y: 0, scale: 1.0, visible: true }),
        onDelete: () => {
          setPriceTransform(prev => ({ ...prev, visible: false }))
          setSelectedElement(null)
        },
        onEdit: () => setEditingField('price'),
      }
    }
    if (selectedElement === 'anticipo' && anticipoTransform.visible) {
      return {
        id: 'anticipo',
        name: 'Anticipo',
        x: anticipoBaseX + anticipoTransform.x,
        y: anticipoY + anticipoTransform.y,
        w: anticipoBoxW,
        h: anticipoBoxH,
        scale: anticipoTransform.scale,
        onScaleChange: (delta: number) => {
          setAnticipoTransform(prev => ({
            ...prev,
            scale: Math.max(0.4, Math.min(2.2, Math.round((prev.scale + delta) * 100) / 100))
          }))
        },
        onReset: () => setAnticipoTransform({ x: 0, y: 0, scale: 1.0, visible: true }),
        onDelete: () => {
          setAnticipoTransform(prev => ({ ...prev, visible: false }))
          setSelectedElement(null)
        },
        onEdit: () => setEditingField('anticipo'),
      }
    }
    return null
  }

  useImperativeHandle(ref, () => ({
    publish: async (dest?: PublishDestination) => {
      let targetDest = dest
      if (!targetDest) {
        if (isFacebook) targetDest = 'fb_reel'
        else if (isWhatsApp) targetDest = 'wa_story'
        else if (isTikTok) targetDest = 'tiktok'
        else targetDest = 'ig_reel'
      }
      await handlePublish(targetDest)
    }
  }))

  const selectedBox = getSelectedBox()

  if (!vehicle || !mounted) return null

  const twoColumnsContent = (
    <div className={`p-2 sm:p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-stretch ${inline ? 'w-full' : 'h-full min-h-0 overflow-hidden'}`}>
      
      {/* LEFT: 9:16 Canvas Phone Preview (5 Cols) */}
      <div className={`lg:col-span-5 flex flex-col items-center justify-between ${inline ? 'h-[580px] sm:h-[620px]' : 'h-full min-h-0'}`}>
        
        {/* Top Toolbar: Remotion 60fps Badge & Fit Mode */}
        <div className="flex items-center justify-between w-full max-w-[340px] mb-1.5 flex-shrink-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#131722] border border-[#1E2638] text-[11px] font-bold text-white shadow-sm">
                <Sparkles size={12} className="text-yellow-300" />
                <span>Remotion 60fps</span>
              </div>

              <div className="inline-flex items-center p-0.5 bg-[#131722] rounded-lg border border-[#1E2638] shadow-sm">
                <button
                  type="button"
                  onClick={() => setFitMode('contain')}
                  title="Auto Completo"
                  className={`p-1.5 rounded-md transition-all ${
                    fitMode === 'contain'
                      ? 'bg-[#2563EB] text-white shadow-sm ring-1 ring-[#38BDF8]/40'
                      : 'text-[#8B8FA8] hover:text-white hover:bg-[#1C2234]'
                  }`}>
                  <Maximize2 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setFitMode('cover')}
                  title="Llenar Pantalla"
                  className={`p-1.5 rounded-md transition-all ${
                    fitMode === 'cover'
                      ? 'bg-[#2563EB] text-white shadow-sm ring-1 ring-[#38BDF8]/40'
                      : 'text-[#8B8FA8] hover:text-white hover:bg-[#1C2234]'
                  }`}>
                  <Minimize2 size={14} />
                </button>
              </div>
            </div>

            {/* Canvas / Remotion Container that scales height to fill available space and maintains 9:16 aspect ratio */}
            <div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden py-1">
              <div className="relative h-full max-h-full aspect-[9/16] w-auto rounded-2xl overflow-hidden shadow-2xl border-2 border-[#1E2333] bg-black group">

              {/* Overlay elegante de carga mientras las fotos se están descargando */}
              {!imagesReady && (
                <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-9 h-9 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mb-3 shadow-[0_0_15px_rgba(250,204,21,0.4)]" />
                  <p className="text-xs font-bold text-white tracking-wide uppercase">Cargando reel HD...</p>
                  <p className="text-[11px] text-slate-400 mt-1">Optimizando imágenes a 60 FPS</p>
                </div>
              )}

              {/* Canvas Renderer con Drag & Drop Interactivo */}
              <canvas
                ref={canvasRef}
                width={720}
                height={1280}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={() => setIsDraggingCard(false)}
                onTouchStart={handleCanvasTouchStart}
                onTouchMove={handleCanvasTouchMove}
                onTouchEnd={handleCanvasTouchEnd}
                onDoubleClick={(e) => {
                  if (!canvasRef.current) return
                  const rect = canvasRef.current.getBoundingClientRect()
                  const clickX = (e.clientX - rect.left) * (720 / rect.width)
                  const clickY = (e.clientY - rect.top) * (1280 / rect.height)
                  const hit = hitTest(clickX, clickY)
                  if (hit) {
                    setIsPlaying(false)
                    setSelectedElement(hit)
                    setEditingField(hit)
                  }
                }}
                onWheel={(e) => {
                  if (!selectedElement) return
                  e.preventDefault()
                  const delta = e.deltaY < 0 ? 0.06 : -0.06
                  const updateScale = (prev: ElementTransform) => ({
                    ...prev,
                    scale: Math.max(0.4, Math.min(2.2, Math.round((prev.scale + delta) * 100) / 100))
                  })
                  if (selectedElement === 'title') setTitleTransform(updateScale)
                  else if (selectedElement === 'badge1') setBadge1Transform(updateScale)
                  else if (selectedElement === 'badge2') setBadge2Transform(updateScale)
                  else if (selectedElement === 'badge3') setBadge3Transform(updateScale)
                  else if (selectedElement === 'price') setPriceTransform(updateScale)
                  else if (selectedElement === 'anticipo') setAnticipoTransform(updateScale)
                }}
                className={`w-full h-full object-contain select-none cursor-pointer ${
                  isDraggingCard ? 'cursor-grabbing' : 'cursor-grab'
                }`}
              />

              {/* Bounding box outline for the active selected element (ajustado exactamente al texto con + y - en la punta) */}
              {selectedBox && editingField === null && (
                <div
                  className="absolute z-20 pointer-events-none transition-all duration-75"
                  style={{
                    top: `${(selectedBox.y / 1280) * 100}%`,
                    left: `${(selectedBox.x / 720) * 100}%`,
                    width: `${(selectedBox.w / 720) * 100}%`,
                    height: `${(selectedBox.h / 1280) * 100}%`,
                    transform: `scale(${selectedBox.scale})`,
                    transformOrigin: 'center center',
                  }}>
                  <div className="w-full h-full border-2 border-dashed border-[#38BDF8] rounded-xl shadow-[0_0_16px_rgba(56,189,248,0.6)] relative">
                    <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-[#38BDF8] rounded-full border border-white shadow-sm" />
                    <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-[#38BDF8] rounded-full border border-white shadow-sm" />
                    <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#38BDF8] rounded-full border border-white shadow-sm" />

                    {/* Punta del cuadrito: solo un más y un menos para agrandar / achicar */}
                    <div className="absolute -top-3.5 -right-3.5 pointer-events-auto flex items-center bg-[#090D1A] border border-[#38BDF8] rounded-full shadow-2xl p-0.5 z-30">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); selectedBox.onScaleChange(-0.08) }}
                        title="Achicar tamaño"
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-800 hover:bg-[#38BDF8] hover:text-black active:scale-95 text-white transition-all">
                        <Minus size={11} />
                      </button>
                      <div className="h-3 w-[1px] bg-slate-700 mx-0.5" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); selectedBox.onScaleChange(0.08) }}
                        title="Agrandar tamaño"
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-800 hover:bg-[#38BDF8] hover:text-black active:scale-95 text-white transition-all">
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* In-place Direct Text Editors (Ajustados al tamaño real de cada bloquecito) */}
              {editingField === 'title' && (
                <div
                  className="absolute z-30"
                  style={{
                    top: `${Math.max(2, ((titleTop + titleTransform.y) / 1280) * 100)}%`,
                    left: `${Math.max(1, ((30 + titleTransform.x) / 720) * 100)}%`,
                    width: `${(titleBoxW / 720) * 100}%`,
                    transform: `scale(${titleTransform.scale})`,
                    transformOrigin: 'top left'
                  }}>
                  <input
                    autoFocus
                    type="text"
                    value={customTitle || title}
                    onChange={e => setCustomTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === 'Escape') setEditingField(null)
                    }}
                    onBlur={() => setEditingField(null)}
                    className="w-full bg-black/95 text-white font-black text-xs uppercase px-2 py-1.5 rounded-xl border-2 border-[#38BDF8] shadow-2xl ring-2 ring-[#38BDF8]/60 outline-none"
                  />
                </div>
              )}

              {editingField === 'badge1' && (
                <div
                  className="absolute z-30"
                  style={{
                    top: `${((badgeY + badge1Transform.y) / 1280) * 100}%`,
                    left: `${Math.max(1, ((b1BaseX + badge1Transform.x) / 720) * 100)}%`,
                    width: `${(b1W / 720) * 100}%`,
                    transform: `scale(${badge1Transform.scale})`,
                    transformOrigin: 'top left'
                  }}>
                  <input
                    autoFocus
                    type="text"
                    value={customBadge1}
                    onChange={e => setCustomBadge1(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === 'Escape') setEditingField(null)
                    }}
                    onBlur={() => setEditingField(null)}
                    className="w-full bg-[#0F172A] text-white font-bold text-[10px] px-1.5 py-1 rounded-lg border-2 border-[#38BDF8] shadow-2xl ring-2 ring-[#38BDF8]/60 outline-none text-center"
                  />
                </div>
              )}

              {editingField === 'badge2' && (
                <div
                  className="absolute z-30"
                  style={{
                    top: `${((badgeY + badge2Transform.y) / 1280) * 100}%`,
                    left: `${Math.max(1, ((b2BaseX + badge2Transform.x) / 720) * 100)}%`,
                    width: `${(b2W / 720) * 100}%`,
                    transform: `scale(${badge2Transform.scale})`,
                    transformOrigin: 'top left'
                  }}>
                  <input
                    autoFocus
                    type="text"
                    value={customBadge2}
                    onChange={e => setCustomBadge2(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === 'Escape') setEditingField(null)
                    }}
                    onBlur={() => setEditingField(null)}
                    className="w-full bg-[#0F172A] text-white font-bold text-[10px] px-1.5 py-1 rounded-lg border-2 border-[#38BDF8] shadow-2xl ring-2 ring-[#38BDF8]/60 outline-none text-center"
                  />
                </div>
              )}

              {editingField === 'badge3' && (
                <div
                  className="absolute z-30"
                  style={{
                    top: `${((badgeY + badge3Transform.y) / 1280) * 100}%`,
                    left: `${Math.max(1, ((b3BaseX + badge3Transform.x) / 720) * 100)}%`,
                    width: `${(b3W / 720) * 100}%`,
                    transform: `scale(${badge3Transform.scale})`,
                    transformOrigin: 'top left'
                  }}>
                  <input
                    autoFocus
                    type="text"
                    value={customBadge3}
                    onChange={e => setCustomBadge3(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === 'Escape') setEditingField(null)
                    }}
                    onBlur={() => setEditingField(null)}
                    className="w-full bg-[#0F172A] text-white font-bold text-[10px] px-1.5 py-1 rounded-lg border-2 border-[#38BDF8] shadow-2xl ring-2 ring-[#38BDF8]/60 outline-none text-center"
                  />
                </div>
              )}

              {editingField === 'price' && (
                <div
                  className="absolute z-30"
                  style={{
                    top: `${((priceY + priceTransform.y) / 1280) * 100}%`,
                    left: `${Math.max(1, ((priceBaseX + priceTransform.x) / 720) * 100)}%`,
                    width: `${(priceBoxW / 720) * 100}%`,
                    height: `${(priceBoxH / 1280) * 100}%`,
                    transform: `scale(${priceTransform.scale})`,
                    transformOrigin: 'top left'
                  }}>
                  <input
                    autoFocus
                    type="text"
                    value={customPriceText}
                    onChange={e => setCustomPriceText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === 'Escape') setEditingField(null)
                    }}
                    onBlur={() => setEditingField(null)}
                    className="w-full h-full bg-gradient-to-r from-[#1E3A8A] via-[#2563EB] to-[#1D4ED8] text-white font-black text-xs text-center px-2 rounded-xl border-2 border-white shadow-2xl ring-2 ring-[#38BDF8] outline-none"
                  />
                </div>
              )}

              {editingField === 'anticipo' && (
                <div
                  className="absolute z-30"
                  style={{
                    top: `${((anticipoY + anticipoTransform.y) / 1280) * 100}%`,
                    left: `${Math.max(1, ((anticipoBaseX + anticipoTransform.x) / 720) * 100)}%`,
                    width: `${(anticipoBoxW / 720) * 100}%`,
                    height: `${(anticipoBoxH / 1280) * 100}%`,
                    transform: `scale(${anticipoTransform.scale})`,
                    transformOrigin: 'top left'
                  }}>
                  <input
                    autoFocus
                    type="text"
                    value={customAnticipoText}
                    onChange={e => setCustomAnticipoText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === 'Escape') setEditingField(null)
                    }}
                    onBlur={() => setEditingField(null)}
                    placeholder="💵 Anticipo o dejá vacío para ocultar"
                    className="w-full h-full bg-[#0F172A] text-[#93C5FD] font-bold text-[10px] text-center px-2 rounded-xl border-2 border-[#93C5FD] shadow-2xl ring-2 ring-[#38BDF8] outline-none"
                  />
                </div>
              )}

              {editingField === 'outroTitle' && (
                <div
                  className="absolute z-30"
                  style={{
                    top: `${(500 / 1280) * 100}%`,
                    left: '5%',
                    width: '90%'
                  }}>
                  <input
                    autoFocus
                    type="text"
                    value={customOutroTitle}
                    onChange={e => setCustomOutroTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === 'Escape') setEditingField(null)
                    }}
                    onBlur={() => setEditingField(null)}
                    className="w-full bg-black/95 text-white font-black text-xs text-center p-2 rounded-lg border-2 border-[#38BDF8] outline-none"
                  />
                </div>
              )}

              {editingField === 'outroCTA' && (
                <div
                  className="absolute z-30"
                  style={{
                    top: `${(890 / 1280) * 100}%`,
                    left: '5%',
                    width: '90%',
                    height: `${(70 / 1280) * 100}%`
                  }}>
                  <input
                    autoFocus
                    type="text"
                    value={customOutroCTA}
                    onChange={e => setCustomOutroCTA(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === 'Escape') setEditingField(null)
                    }}
                    onBlur={() => setEditingField(null)}
                    className="w-full h-full bg-[#2563EB] text-white font-black text-xs text-center p-2 rounded-xl border-2 border-white outline-none"
                  />
                </div>
              )}

              {editingField === 'outroContact' && (
                <div
                  className="absolute z-30"
                  style={{
                    top: `${(1010 / 1280) * 100}%`,
                    left: '5%',
                    width: '90%'
                  }}>
                  <input
                    autoFocus
                    type="text"
                    value={customOutroContact}
                    onChange={e => setCustomOutroContact(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === 'Escape') setEditingField(null)
                    }}
                    onBlur={() => setEditingField(null)}
                    className="w-full bg-[#0F172A] text-[#93C5FD] font-bold text-xs text-center p-2 rounded-lg border-2 border-[#38BDF8] outline-none"
                  />
                </div>
              )}

              {/* Recording / Processing Overlay */}
              {isRecording && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4 text-center">
                  <Loader2 size={36} className="animate-spin text-[#38BDF8]" />
                  <span className="text-sm font-bold text-white">Renderizando Video 9:16...</span>
                  <div className="w-48 bg-[#1F2337] rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#1E3A8A] to-[#38BDF8] h-full transition-all duration-150"
                      style={{ width: `${recordingProgress}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-[#94A3B8]">{recordingProgress}%</span>
                </div>
              )}
              </div>
            </div>

            {/* Dedicated Element Controls Bar (Agrandar, Achicar, Editar, Eliminar, Restablecer) */}
            {selectedBox ? (
              <div className="w-full max-w-[340px] bg-[#141724] border border-[#38BDF8] p-2 rounded-xl flex items-center justify-between shadow-xl mt-2 animate-in flex-shrink-0">
                <div className="flex items-center gap-1.5 min-w-0 pr-1">
                  <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse flex-shrink-0" />
                  <span className="text-[11px] font-black text-white truncate">{selectedBox.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => selectedBox.onScaleChange(-0.08)}
                    title="Achicar tamaño"
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#1E2333] hover:bg-[#38BDF8] hover:text-black text-white font-bold transition-all">
                    <Minus size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => selectedBox.onScaleChange(0.08)}
                    title="Agrandar tamaño"
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#1E2333] hover:bg-[#38BDF8] hover:text-black text-white font-bold transition-all">
                    <Plus size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={selectedBox.onEdit}
                    title="Editar texto"
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white transition-all ml-0.5">
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={selectedBox.onDelete}
                    title="Eliminar bloquecito"
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-950/70 hover:bg-red-800 border border-red-800 text-red-300 transition-all">
                    <Trash2 size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedElement(null)}
                    title="Cerrar barra"
                    className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-800 text-[#94A3B8] hover:text-white transition-all">
                    <X size={13} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-[#8B8FA8] text-center mt-2 flex items-center justify-center gap-1.5 max-w-[340px] flex-shrink-0">
                <Move size={11} className="text-[#38BDF8] flex-shrink-0" />
                <span>Tocá cualquier texto para moverlo, agrandarlo o eliminarlo</span>
              </div>
            )}

            {/* Recovery bar if any block was deleted / hidden */}
            {(!badge1Transform.visible || !badge2Transform.visible || !badge3Transform.visible || !anticipoTransform.visible || !titleTransform.visible || !priceTransform.visible) && (
              <div className="w-full max-w-[340px] mt-1.5 flex flex-wrap items-center gap-1 justify-center bg-[#0F121C] border border-[#23293D] p-1.5 rounded-lg text-[10px] animate-in flex-shrink-0">
                <span className="text-[#64748B] text-[9px] font-bold uppercase tracking-wider mr-0.5">Reactivar:</span>
                {!titleTransform.visible && (
                  <button
                    type="button"
                    onClick={() => setTitleTransform(prev => ({ ...prev, visible: true }))}
                    className="px-1.5 py-0.5 bg-[#1E293B] hover:bg-[#2563EB] text-[#93C5FD] hover:text-white rounded border border-[#334155] transition-all">
                    + Título
                  </button>
                )}
                {!badge1Transform.visible && (
                  <button
                    type="button"
                    onClick={() => setBadge1Transform(prev => ({ ...prev, visible: true }))}
                    className="px-1.5 py-0.5 bg-[#1E293B] hover:bg-[#2563EB] text-[#93C5FD] hover:text-white rounded border border-[#334155] transition-all">
                    + Año
                  </button>
                )}
                {!badge2Transform.visible && (
                  <button
                    type="button"
                    onClick={() => setBadge2Transform(prev => ({ ...prev, visible: true }))}
                    className="px-1.5 py-0.5 bg-[#1E293B] hover:bg-[#2563EB] text-[#93C5FD] hover:text-white rounded border border-[#334155] transition-all">
                    + Km
                  </button>
                )}
                {!badge3Transform.visible && (
                  <button
                    type="button"
                    onClick={() => setBadge3Transform(prev => ({ ...prev, visible: true }))}
                    className="px-1.5 py-0.5 bg-[#1E293B] hover:bg-[#2563EB] text-[#93C5FD] hover:text-white rounded border border-[#334155] transition-all">
                    + Caja
                  </button>
                )}
                {!priceTransform.visible && (
                  <button
                    type="button"
                    onClick={() => setPriceTransform(prev => ({ ...prev, visible: true }))}
                    className="px-1.5 py-0.5 bg-[#1E293B] hover:bg-[#2563EB] text-[#93C5FD] hover:text-white rounded border border-[#334155] transition-all">
                    + Precio
                  </button>
                )}
                {!anticipoTransform.visible && (
                  <button
                    type="button"
                    onClick={() => setAnticipoTransform(prev => ({ ...prev, visible: true }))}
                    className="px-1.5 py-0.5 bg-[#1E293B] hover:bg-[#2563EB] text-[#93C5FD] hover:text-white rounded border border-[#334155] transition-all">
                    + Anticipo
                  </button>
                )}
              </div>
            )}

            {/* Video Controls bar */}
            <div className="flex items-center gap-2.5 mt-2 w-full max-w-[340px] bg-[#141724] px-3.5 py-1.5 rounded-xl border border-[#222738] flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={isRecording}
                className="p-1.5 rounded-lg bg-[#222738] hover:bg-[#2F364E] text-white transition-all">
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentTime(0)
                  setIsPlaying(true)
                }}
                disabled={isRecording}
                title="Reiniciar reproducción"
                className="p-1.5 rounded-lg hover:bg-[#222738] text-[#8B8FA8] hover:text-white transition-all">
                <RotateCcw size={14} />
              </button>

              <div className="flex-1 min-w-[70px]">
                <input
                  type="range"
                  min="0"
                  max={duration}
                  step="0.1"
                  value={currentTime}
                  onChange={e => setCurrentTime(parseFloat(e.target.value))}
                  disabled={isRecording}
                  className="w-full accent-[#38BDF8] cursor-pointer"
                />
              </div>

              <span className="text-[11px] font-mono text-[#8B8FA8] min-w-[28px] text-right">
                {Math.floor(currentTime)}s
              </span>
            </div>
          </div>

          {/* RIGHT: Carrusel de fotos, Asistente IA Chat, Publishing Buttons & Plantillas (7 Cols) */}
          <div className={`lg:col-span-7 flex flex-col justify-between ${inline ? 'min-h-[580px] sm:min-h-[620px] pr-0' : 'h-full min-h-0 pr-6 sm:pr-8'} gap-3.5`}>
            
            {/* Carrusel de Fotos */}
            {allAvailablePhotos.length > 0 && !inline && (
              <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1 flex-shrink-0">
                {allAvailablePhotos.map((url, idx) => {
                  const isSelected = selectedPhotoUrls.includes(url)
                  const order = selectedPhotoUrls.indexOf(url) + 1
                  return (
                    <button
                      key={url + idx}
                      type="button"
                      onClick={() => togglePhotoSelection(url)}
                      title={isSelected ? `Foto #${order} del Reel (click para desmarcar)` : 'Click para sumar al Reel'}
                      className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden flex-shrink-0 transition-all border-2 bg-[#1A1F2E] flex items-center justify-center ${
                        isSelected
                          ? 'border-[#38BDF8] ring-2 ring-[#38BDF8]/40 scale-105 shadow-md'
                          : 'border-[#334155] opacity-50 hover:opacity-85 hover:border-[#64748B]'
                      }`}>
                      <ImageIcon size={18} className="text-[#475569] absolute" />
                      <img
                        src={url}
                        alt=""
                        className="relative z-10 w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none' }}
                      />
                      {isSelected ? (
                        <div className="absolute top-1 right-1 z-20 w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-[10px] font-black shadow">
                          {order}
                        </div>
                      ) : (
                        <div className="absolute inset-0 z-20 bg-black/40" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Texto de la publicación (Copy de Instagram / Facebook) */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[#10131D] border border-[#1E2333] flex flex-col flex-1 min-h-[160px] overflow-hidden gap-2">
              <div className="flex items-center justify-between pb-2 border-b border-[#1C2234] flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#2563EB] to-[#38BDF8] flex items-center justify-center text-white shadow">
                    <FileText size={13} />
                  </div>
                  <span className="text-xs font-black uppercase text-white tracking-wider">
                    {`Texto de la publicación (${isFacebook ? 'Facebook' : 'Instagram'})`}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {hasSavedTemplateNotice && (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md animate-in fade-in">
                      <Check size={11} />
                      Guardado para todos los autos
                    </span>
                  )}

                  <a
                    href="https://wa.me/5493624750716"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Probar enlace directo de WhatsApp"
                    className="px-2 py-1 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#4ADE80] text-[11px] font-bold flex items-center gap-1 border border-[#25D366]/30 transition-colors">
                    <span>wa.me</span>
                    <ExternalLink size={10} />
                  </a>

                  <button
                    type="button"
                    onClick={handleResetCaptionTemplate}
                    title="Restablecer formato predeterminado"
                    className="p-1.5 rounded-lg bg-[#1E2333] hover:bg-[#2A3147] text-[#8B8FA8] hover:text-white transition-colors">
                    <RotateCcw size={12} />
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(caption)
                      setCopiedCaptionSuccess(true)
                      setTimeout(() => setCopiedCaptionSuccess(false), 2000)
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[11px] font-bold flex items-center gap-1.5 transition-all shadow">
                    {copiedCaptionSuccess ? (
                      <>
                        <Check size={12} className="text-[#86EFAC]" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copiar texto</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Editable caption area */}
              <div className="flex-1 min-h-0 relative">
                <textarea
                  value={caption}
                  onChange={e => handleCaptionChange(e.target.value)}
                  placeholder="Escribí o editá el texto que acompañará el Reel..."
                  className="w-full h-full p-2.5 rounded-xl bg-[#0A0C12] border border-[#22283A] text-xs text-[#E2E8F0] placeholder-[#555A70] focus:outline-none focus:border-[#38BDF8] resize-none font-mono leading-relaxed overflow-y-auto no-scrollbar"
                />
              </div>

              {/* Auto-sync indicator footnote */}
              <div className="flex items-center justify-between text-[10px] text-[#64748B] pt-0.5 px-0.5">
                <span className="flex items-center gap-1">
                  <Sparkles size={11} className="text-[#38BDF8]" />
                  Los cambios que hagas en el texto se guardan y replican automáticamente para todos los autos manteniendo #resistencia #chaco
                </span>
              </div>
            </div>

            {/* Notification and Status alerts */}
            {statusMessage && (
              <div className="p-2.5 rounded-xl bg-[#3B82F615] border border-[#3B82F635] flex items-center gap-2 animate-in">
                <Loader2 size={16} className="animate-spin text-[#3B82F6] flex-shrink-0" />
                <span className="text-xs font-bold text-[#93C5FD]">{statusMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-[#EF444415] border border-[#EF444435] flex items-center gap-2 animate-in">
                <AlertCircle size={16} className="text-[#EF4444] flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-xs font-bold text-[#FCA5A5]">{errorMessage}</span>
                </div>
              </div>
            )}

            {publishedUrl && (
              <div className="p-3 rounded-xl bg-[#22C55E15] border border-[#22C55E35] flex items-center justify-between gap-3 animate-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-[#22C55E] flex-shrink-0" />
                  <div>
                    <p className="text-xs font-black text-white">¡Publicado en {publishedType}!</p>
                    <p className="text-[10px] text-[#86EFAC]">Tu contenido fue subido con éxito.</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <a
                    href={publishedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 rounded-xl bg-[#22C55E] text-black font-extrabold text-xs flex items-center gap-1 hover:bg-[#16a34a] transition-all shadow-md">
                    <span>Ver en Vivo</span>
                    <ExternalLink size={12} />
                  </a>
                  <button
                    type="button"
                    onClick={() => { setPublishedUrl(null); setPublishedType(null) }}
                    title="Cerrar aviso"
                    className="p-1 rounded-xl hover:bg-[#22C55E20] text-[#86EFAC] hover:text-white transition-all">
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* BOTÓN CHICO: AGREGAR AUDIO Y PUBLICAR */}
            {!isWhatsApp && !inline && (
              <div className="flex items-center flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handlePublish('audio_redirect')}
                  disabled={isRecording || isPublishing}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] via-[#EC4899] to-[#F59E0B] text-white hover:opacity-95 hover:scale-[1.01] transition-all flex items-center gap-2 shadow-md text-xs font-bold disabled:opacity-50 border border-white/20">
                  <Music size={14} />
                  <span>Agregar audio y publicar</span>
                </button>
              </div>
            )}

            {/* One-Click Publication Buttons: Reel, Story, Feed, Descargar */}
            {!inline && (
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <span className="text-[11px] font-bold uppercase text-[#8B8FA8] tracking-wider">
                {isTikTok
                  ? 'Acciones de TikTok'
                  : isWhatsApp
                  ? 'Acciones de WhatsApp (Mi Estado)'
                  : isFacebook
                  ? 'Acciones Oficiales de Facebook (Fan Page)'
                  : 'Acciones de Instagram (@okmmotors)'}
              </span>

              <div
                className={`grid grid-cols-1 ${
                  isWhatsApp || isTikTok ? 'sm:grid-cols-2' : isFacebook ? 'sm:grid-cols-4' : 'sm:grid-cols-3'
                } gap-2.5`}>
                {isTikTok ? (
                  <>
                    {/* 1. Publicar en TikTok (Reel Video 9:16) */}
                    <button
                      type="button"
                      onClick={() => handlePublish('tiktok')}
                      disabled={isRecording || isPublishing}
                      title="Publicar Reel Video 9:16 en TikTok (En celular: abre App TikTok listo para musicalizar. En PC: Auto-Cyborg)"
                      className="p-3 rounded-xl bg-gradient-to-r from-[#000000] via-[#111827] to-[#00F2FE]/20 border border-[#00F2FE]/50 text-white hover:opacity-95 hover:scale-[1.01] transition-all flex items-center justify-between shadow-md disabled:opacity-50">
                      <div className="flex items-center gap-2.5 text-left">
                        <Smartphone size={18} className="text-[#00F2FE]" />
                        <div>
                          <p className="text-xs font-black flex items-center gap-1.5">
                            <span>Publicar en TikTok</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FE2C55]/20 text-[#FE2C55] font-bold">9:16</span>
                          </p>
                          <p className="text-[10px] text-[#94A3B8] font-medium">Móvil: abre App | PC: Auto-Cyborg</p>
                        </div>
                      </div>
                      <Send size={14} className="text-[#00F2FE]" />
                    </button>
                  </>
                ) : isWhatsApp ? (
                  <>
                    {/* 1. Publicar en Mi Estado WhatsApp (Reel Video 9:16) */}
                    <button
                      type="button"
                      onClick={() => handlePublish('wa_story')}
                      disabled={isRecording || isPublishing}
                      title="Publicar Reel Video 9:16 animado en Mi Estado de WhatsApp"
                      className="p-3 rounded-xl bg-gradient-to-r from-[#25D366] via-[#128C7E] to-[#075E54] text-white hover:opacity-95 hover:scale-[1.01] transition-all flex items-center justify-between shadow-md disabled:opacity-50">
                      <div className="flex items-center gap-2.5 text-left">
                        <Smartphone size={18} />
                        <div>
                          <p className="text-xs font-black">Publicar en Mi Estado</p>
                          <p className="text-[10px] text-white/90 font-medium">Reel Video 9:16</p>
                        </div>
                      </div>
                      <Send size={14} />
                    </button>
                  </>
                ) : isFacebook ? (
                  <>
                    {/* 1. Reels / Shorts Facebook */}
                    <button
                      type="button"
                      onClick={() => handlePublish('fb_reel')}
                      disabled={isRecording || isPublishing}
                      title="Publicar Reel / Shorts 9:16 en la Fan Page Oficial de Facebook"
                      className="p-3 rounded-xl bg-gradient-to-r from-[#1877F2] via-[#0D65D9] to-[#0A52B5] text-white hover:opacity-95 hover:scale-[1.01] transition-all flex items-center justify-between shadow-md disabled:opacity-50">
                      <div className="flex items-center gap-2 text-left">
                        <Video size={18} />
                        <div>
                          <p className="text-xs font-black">Reels / Shorts</p>
                          <p className="text-[10px] text-white/80 font-medium">Reel 9:16 Fan Page</p>
                        </div>
                      </div>
                      <Send size={14} />
                    </button>

                    {/* 2. Historia Facebook */}
                    <button
                      type="button"
                      onClick={() => handlePublish('fb_story')}
                      disabled={isRecording || isPublishing}
                      title="Publicar Historia 9:16 en Facebook"
                      className="p-3 rounded-xl bg-gradient-to-r from-[#0064E0] via-[#0084FF] to-[#00C6FF] text-white hover:opacity-95 hover:scale-[1.01] transition-all flex items-center justify-between shadow-md disabled:opacity-50">
                      <div className="flex items-center gap-2 text-left">
                        <Smartphone size={18} />
                        <div>
                          <p className="text-xs font-black">Historia FB</p>
                          <p className="text-[10px] text-white/80 font-medium">Story 24hs Fan Page</p>
                        </div>
                      </div>
                      <Send size={14} />
                    </button>

                    {/* 3. Feed / Muro Facebook */}
                    <button
                      type="button"
                      onClick={() => handlePublish('fb_feed')}
                      disabled={isRecording || isPublishing}
                      title="Publicar video en el Feed y Muro de la Fan Page de Facebook"
                      className="p-3 rounded-xl bg-gradient-to-r from-[#1877F2] via-[#1565C0] to-[#0D47A1] text-white hover:opacity-95 hover:scale-[1.01] transition-all flex items-center justify-between shadow-md disabled:opacity-50">
                      <div className="flex items-center gap-2 text-left">
                        <Film size={18} />
                        <div>
                          <p className="text-xs font-black">Feed / Muro</p>
                          <p className="text-[10px] text-white/80 font-medium">Video en Muro FB</p>
                        </div>
                      </div>
                      <Send size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    {/* 1. Reel Instagram */}
                    <button
                      type="button"
                      onClick={() => handlePublish('ig_reel')}
                      disabled={isRecording || isPublishing}
                      className="p-3 rounded-xl bg-gradient-to-r from-[#E1306C] via-[#C13584] to-[#833AB4] text-white hover:opacity-95 hover:scale-[1.01] transition-all flex items-center gap-2.5 text-left">
                      <div className="flex items-center gap-2.5 text-left">
                        <Video size={18} />
                        <div>
                          <p className="text-xs font-black">Reel</p>
                          <p className="text-[10px] text-white/80 font-medium">@okmmotors</p>
                        </div>
                      </div>
                      <Send size={14} />
                    </button>

                    {/* 2. Story Instagram */}
                    <button
                      type="button"
                      onClick={() => handlePublish('ig_story')}
                      disabled={isRecording || isPublishing}
                      className="p-3 rounded-xl bg-gradient-to-r from-[#F77737] to-[#E1306C] text-white hover:opacity-95 hover:scale-[1.01] transition-all flex items-center justify-between shadow-md disabled:opacity-50">
                      <div className="flex items-center gap-2.5 text-left">
                        <Smartphone size={18} />
                        <div>
                          <p className="text-xs font-black">Story</p>
                          <p className="text-[10px] text-white/80 font-medium">Activa 24hs</p>
                        </div>
                      </div>
                      <Send size={14} />
                    </button>
                  </>
                )}

                {/* Descargar */}
                <button
                  type="button"
                  onClick={() => handlePublish('download')}
                  disabled={isRecording || isPublishing}
                  className="p-3 rounded-xl bg-[#1F2337] border border-[#2F364E] text-white hover:bg-[#2A2F45] hover:scale-[1.01] transition-all flex items-center justify-between shadow-sm disabled:opacity-50">
                  <div className="flex items-center gap-2 text-left">
                    <Download size={18} className="text-[#93C5FD]" />
                    <div>
                      <p className="text-xs font-black">Descargar</p>
                      <p className="text-[10px] text-[#8B8FA8] font-medium">MP4 9:16</p>
                    </div>
                  </div>
                  <Download size={14} className="text-[#93C5FD]" />
                </button>

              </div>
            </div>
            )}

            {/* Álbum / Rectángulo de Plantillas (exclusivamente Oportunidad Tasa 0%) */}
            <div className="p-3 rounded-xl bg-[#10131D] border border-[#1E2333] flex flex-col gap-2 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Bookmark size={13} className="text-[#38BDF8]" />
                  <span className="text-xs font-bold uppercase text-[#8B8FA8] tracking-wider">
                    Plantillas
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                {DEFAULT_TEMPLATES.map((tpl) => {
                  const isActive = activeTemplateId === tpl.id
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      className={`group relative px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border flex-shrink-0 ${
                        isActive
                          ? 'bg-[#2563EB]/25 border-[#38BDF8] text-[#38BDF8] shadow-sm'
                          : 'bg-[#141824] border-[#22293A] text-[#94A3B8] hover:text-white hover:border-[#38BDF8]/50'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#38BDF8] opacity-100' : 'bg-transparent'}`} />
                      <span>{tpl.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

          </div>
        </div>
  )

  {/* MODAL DE REDIRECCIÓN: AGREGAR AUDIO Y PUBLICAR EN PLATAFORMA OFICIAL */}
  const audioRedirectModalContent = (
    <div
            className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
            onClick={() => setShowAudioRedirectModal(false)}>
            <div
              className="relative w-full max-w-xl bg-[#0F121C] border border-[#2B3245] rounded-3xl shadow-2xl p-5 sm:p-6 text-white flex flex-col gap-4 overflow-hidden"
              onClick={e => e.stopPropagation()}>
              
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-[#1F2639] pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[#8B5CF6] via-[#EC4899] to-[#F59E0B] text-white shadow-md">
                    <Music size={22} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Agregar audio y publicar</h3>
                    <p className="text-xs text-[#94A3B8]">
                      Elegí la red social para abrir el editor oficial y seleccionar música en tendencia
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAudioRedirectModal(false)}
                  className="p-1.5 rounded-lg bg-[#191F30] text-[#94A3B8] hover:text-white hover:bg-[#252D42] transition-all">
                  <X size={16} />
                </button>
              </div>

              {/* Status checklist: Video listo & Caption copiado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#22C55E12] border border-[#22C55E30] flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#22C55E] flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">Video 9:16 descargado</p>
                    <p className="text-[10px] text-[#86EFAC] truncate">{audioRedirectFileName || 'En tus descargas'}</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#38BDF812] border border-[#38BDF830] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 size={16} className="text-[#38BDF8] flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">Texto y hashtags copiados</p>
                      <p className="text-[10px] text-[#7DD3FC] truncate">Listo para pegar (Ctrl+V)</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const text = caption || `${title} (${anio}) - ${formattedPrice}`
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(text)
                      }
                      setCopiedCaptionSuccess(true)
                      setTimeout(() => setCopiedCaptionSuccess(false), 2500)
                    }}
                    title="Copiar texto de nuevo"
                    className="p-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-white transition-all flex-shrink-0">
                    {copiedCaptionSuccess ? <Check size={13} className="text-[#22C55E]" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              {/* Steps explanation */}
              <div className="text-[11px] text-[#94A3B8] bg-[#141824] p-3 rounded-xl border border-[#1E2538] flex flex-col gap-1">
                <span className="font-bold text-[#E2E8F0] flex items-center gap-1.5">
                  <Sparkles size={13} className="text-[#F59E0B]" />
                  ¿Cómo publicar con música oficial en 3 pasos?
                </span>
                <ol className="list-decimal list-inside space-y-0.5 text-[#94A3B8] ml-1">
                  <li>Hacé clic en el botón de la red social abajo para abrir su editor.</li>
                  <li>Seleccioná el archivo de video recién descargado.</li>
                  <li>Tocá el ícono <b>Música 🎵</b> en la plataforma, buscá la canción, pegá el texto y publicá.</li>
                </ol>
              </div>

              {/* Direct Platform Redirection Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {isFacebook ? (
                  <>
                    {/* 1. Facebook Reels / Shorts */}
                    <a
                      href="https://www.facebook.com/reels/create"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-gradient-to-r from-[#1877F2] to-[#0D65D9] text-white hover:opacity-95 hover:scale-[1.01] transition-all flex items-center justify-between shadow-md group">
                      <div className="flex items-center gap-2.5 text-left">
                        <div className="p-2 rounded-lg bg-black/20">
                          <Video size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-black">Facebook Reels / Shorts</p>
                          <p className="text-[10px] text-white/90">Añadir música en tendencia</p>
                        </div>
                      </div>
                      <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </a>

                    {/* 2. Facebook Historias */}
                    <a
                      href="https://www.facebook.com/stories/create"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-gradient-to-r from-[#0064E0] to-[#00C6FF] text-white hover:opacity-95 hover:scale-[1.01] transition-all flex items-center justify-between shadow-md group">
                      <div className="flex items-center gap-2.5 text-left">
                        <div className="p-2 rounded-lg bg-black/20">
                          <Smartphone size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-black">Facebook Historias</p>
                          <p className="text-[10px] text-white/90">Story con música 24hs</p>
                        </div>
                      </div>
                      <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </a>

                    {/* 3. Facebook Fan Page (Feed / Muro) */}
                    <a
                      href="https://www.facebook.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-gradient-to-r from-[#1877F2] via-[#1565C0] to-[#0D47A1] text-white hover:opacity-95 hover:scale-[1.01] transition-all flex items-center justify-between shadow-md group">
                      <div className="flex items-center gap-2.5 text-left">
                        <div className="p-2 rounded-lg bg-black/20">
                          <Film size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-black">Facebook Feed / Muro</p>
                          <p className="text-[10px] text-white/90">Publicar en Fan Page</p>
                        </div>
                      </div>
                      <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </a>

                    {/* 4. WhatsApp */}
                    <a
                      href="https://web.whatsapp.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white hover:opacity-95 hover:scale-[1.01] transition-all flex items-center justify-between shadow-md group">
                      <div className="flex items-center gap-2.5 text-left">
                        <div className="p-2 rounded-lg bg-black/20">
                          <Send size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-black">WhatsApp Estados</p>
                          <p className="text-[10px] text-white/90">Compartir al instante</p>
                        </div>
                      </div>
                      <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </a>
                  </>
                ) : (
                  <>
                    {/* 1. Instagram */}
                    <a
                      href="https://www.instagram.com/create/select/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] text-white hover:opacity-95 hover:scale-[1.01] transition-all flex items-center justify-between shadow-md group">
                      <div className="flex items-center gap-2.5 text-left">
                        <div className="p-2 rounded-lg bg-black/25">
                          <Smartphone size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-black">Instagram Reels</p>
                          <p className="text-[10px] text-white/90">Elegir audio en tendencia</p>
                        </div>
                      </div>
                      <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </a>

                    {/* 2. TikTok */}
                    <a
                      href="https://www.tiktok.com/upload"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-gradient-to-r from-[#000000] via-[#111827] to-[#0F172A] border border-[#334155] text-white hover:border-[#00F2FE] hover:scale-[1.01] transition-all flex items-center justify-between shadow-md group">
                      <div className="flex items-center gap-2.5 text-left">
                        <div className="p-2 rounded-lg bg-white/10">
                          <Film size={18} className="text-[#00F2FE]" />
                        </div>
                        <div>
                          <p className="text-xs font-black">TikTok Studio</p>
                          <p className="text-[10px] text-[#94A3B8]">Añadir sonido viral</p>
                        </div>
                      </div>
                      <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform text-[#FE2C55]" />
                    </a>

                    {/* 3. Facebook Reels */}
                    <a
                      href="https://www.facebook.com/reels/create"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-gradient-to-r from-[#1877F2] to-[#0D65D9] text-white hover:opacity-95 hover:scale-[1.01] transition-all flex items-center justify-between shadow-md group">
                      <div className="flex items-center gap-2.5 text-left">
                        <div className="p-2 rounded-lg bg-black/20">
                          <Video size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-black">Facebook Reels</p>
                          <p className="text-[10px] text-white/90">Música de Meta</p>
                        </div>
                      </div>
                      <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </a>

                    {/* 4. WhatsApp */}
                    <a
                      href="https://web.whatsapp.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white hover:opacity-95 hover:scale-[1.01] transition-all flex items-center justify-between shadow-md group">
                      <div className="flex items-center gap-2.5 text-left">
                        <div className="p-2 rounded-lg bg-black/20">
                          <Send size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-black">WhatsApp Estados</p>
                          <p className="text-[10px] text-white/90">Compartir al instante</p>
                        </div>
                      </div>
                      <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </a>
                  </>
                )}
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between pt-2 border-t border-[#1F2639]">
                <button
                  type="button"
                  onClick={() => handlePublish('download')}
                  className="text-xs text-[#94A3B8] hover:text-white flex items-center gap-1.5 transition-colors">
                  <Download size={13} />
                  <span>Volver a descargar video</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAudioRedirectModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition-all shadow-md">
                  Listo
                </button>
              </div>

            </div>
          </div>
  )

  if (inline) {
    return (
      <div className="w-full text-white">
        {twoColumnsContent}
        {showAudioRedirectModal && audioRedirectModalContent}
      </div>
    )
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex justify-center items-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-md animate-in video-reel-modal-container overflow-hidden"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
      onClick={handleClose}>
      <div
        className="relative w-[96vw] max-w-[1520px] h-[92vh] max-h-[94vh] bg-[#0C0E15] border border-[#222738] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white"
        onClick={e => e.stopPropagation()}>
        
        {/* Close Button Top-Right */}
        <button
          type="button"
          onClick={handleClose}
          title="Cerrar"
          className="absolute top-4 right-4 z-30 p-2 rounded-xl bg-[#141724]/90 border border-[#222738] hover:bg-[#222738] text-[#94A3B8] hover:text-white transition-all shadow-md">
          <X size={18} />
        </button>

        {twoColumnsContent}
        {showAudioRedirectModal && audioRedirectModalContent}
      </div>
    </div>,
    document.body
  )
})

VideoReelModal.displayName = 'VideoReelModal'
