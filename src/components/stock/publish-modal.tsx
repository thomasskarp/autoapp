'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Vehicle } from '@/lib/supabase/types'
import { vehicleName, formatPrice, formatKm, getAllVehiclePhotos } from '@/lib/utils'
import {
  publishToFacebookMarketplace,
  publishToFacebookPage,
  publishToInstagramGraphAPI,
  publishToInstagramFeed,
  publishToWhatsAppStatus,
  publishToMercadoLibre,
  shareToWhatsAppMobile,
  isMobileDevice,
  publishToTikTok,
  publishToInstagramStory,
  generateTikTokCaption
} from '@/lib/publisher'
import {
  X, Loader2, CheckCircle2, Copy, Sparkles, Check, Image as ImageIcon,
  Save, Bookmark, Plus, Trash2, FileText, ChevronDown, ExternalLink,
  MessageSquare, RefreshCw, Film, Megaphone, Video, Star,
  Edit2, Upload
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { AdFlyerPreview, AdFlyerPreviewHandle } from './ad-flyer-preview'
import type { VideoReelModalHandle, PublishDestination } from '@/components/publications/video-reel-modal'

const VideoReelModal = dynamic(
  () => import('@/components/publications/video-reel-modal').then((mod) => mod.VideoReelModal),
  { ssr: false }
)
import {
  compileDefaultAdData,
  formatAdDataToText,
  parseTextToAdData,
  AdTemplateData,
  AdPublicidadTemplate,
  DEFAULT_PUBLICIDADES,
  isVehicleMatchingModel,
  isVehicleMatchingPublicidad,
  isVehicle0km,
  getSavedPublicidades,
  savePublicidades
} from './ad-template-utils'
import {
  getCircularForVehicle,
  formatCuotasForPublication,
  formatAllCuotasBulletList
} from '@/lib/services/circular-service'

export type ContentType = 'fotos' | 'reel' | 'publicidad' | 'video'

const CONTENT_TYPE_OPTIONS: { id: ContentType; label: string; icon: any }[] = [
  { id: 'fotos', label: 'Fotos', icon: ImageIcon },
  { id: 'reel', label: 'Reel', icon: Film },
  { id: 'publicidad', label: 'Publicidad', icon: Megaphone },
  { id: 'video', label: 'Video', icon: Video },
]

export type TargetPlatform =
  | 'FB_MARKETPLACE'
  | 'FB_PAGE'
  | 'FB_REEL'
  | 'IG'
  | 'IG_REEL'
  | 'IG_STORY'
  | 'TIKTOK'
  | 'WA'
  | 'MELI'

interface Props {
  vehicle: Vehicle | null
  onClose: () => void
  initialPlatform?: string | null
}

export interface CopyTemplate {
  id: string
  name: string
  content: string
  isDefault?: boolean
  vehicleType?: 'all' | '0km' | 'usado'
}

const DEFAULT_TEMPLATES: CopyTemplate[] = [
  {
    id: 'default-comercial',
    name: '🏷️ Comercial Estándar',
    isDefault: true,
    vehicleType: 'all',
    content: `🚗 *{MARCA} {MODELO} {VERSION}* ({AÑO})
Km: {KM}
💰 Precio de Venta: {PRECIO}
💵 Entrega Mínima: {ENTREGA}

⛽ Combustible: {COMBUSTIBLE} | Caja: {TRANSMISION}
📝 {DESCRIPCION}`
  },
  {
    id: 'default-marketplace',
    name: '🔥 Marketplace / Oferta Directa',
    isDefault: true,
    vehicleType: 'all',
    content: `🔥 IMPERDIBLE: {MARCA} {MODELO} {VERSION} ({AÑO}) — ¡Entrega Inmediata!
📍 Kilometraje: {KM}
💰 Precio de Contado: {PRECIO}
💵 Anticipo / Cuotas: {ENTREGA}

📋 Documentación 100% al día | Tomamos usados en parte de pago
⛽ {COMBUSTIBLE} — {TRANSMISION}`
  },
  {
    id: 'default-financiacion',
    name: '⚡ Financiación Tasa 0%',
    isDefault: true,
    vehicleType: 'all',
    content: `⚡ {MARCA} {MODELO} {VERSION} ({AÑO}) ⚡
📍 KM: {KM}
💰 PRECIO: {PRECIO}
💵 RETIRA CON {ENTREGA}

Tasa 0% :
{CUOTAS}

🔥 Financiación directa a sola firma
📍 Resistencia, Chaco | WhatsApp 3624-750716`
  },
  {
    id: 'default-reel',
    name: '🎬 Reel / Video Viral',
    isDefault: true,
    vehicleType: 'all',
    content: `🔥 {MARCA} {MODELO} {VERSION} ({AÑO}) 🔥
📍 KM: {KM}
💰 PRECIO: {PRECIO}
💵 RETIRA CON {ENTREGA}

⚡ ¡Subite hoy mismo con entrega inmediata!
📲 Escribinos al WhatsApp directo o mensaje privado para coordinar tu test drive.
📍 Resistencia, Chaco

#autos #autosargentina #usadosseleccionados #concesionaria #parati #fyp #viral`
  },
  {
    id: 'default-tiktok',
    name: '🎵 TikTok Catálogo',
    isDefault: true,
    vehicleType: 'all',
    content: `🚗 {MARCA} {MODELO} ({AÑO})
📍 {KM} | {PRECIO}
💰 Anticipo desde {ENTREGA} + cuotas fijas

📲 Info en el link del perfil / WhatsApp 3624-750716
Tomamos tu usado al mejor precio 🤝

#autos #autosargentina #concesionaria #vendo #parati #fyp #viral`
  },
  {
    id: 'default-whatsapp',
    name: '💬 WhatsApp Estado',
    isDefault: true,
    vehicleType: 'all',
    content: `⚡ *{MARCA} {MODELO} {VERSION}* ({AÑO}) ⚡
📍 KM: {KM}
💰 PRECIO: {PRECIO}
💵 RETIRA CON {ENTREGA}

🔥 Financiación directa a sola firma
📍 Resistencia, Chaco | WhatsApp 3624-750716`
  }
]


const PLATFORMS_META: Record<TargetPlatform, { name: string; label: string; color: string; bg: string; border: string; icon: string }> = {
  FB_MARKETPLACE: {
    name: 'Facebook Marketplace',
    label: 'Facebook Marketplace',
    color: '#60A5FA',
    bg: '#2563EB',
    border: '#3B82F650',
    icon: '🛒'
  },
  FB_PAGE: {
    name: 'Facebook Feed',
    label: 'Facebook Fan Page',
    color: '#60A5FA',
    bg: '#1877F2',
    border: '#1877F260',
    icon: '📢'
  },
  FB_REEL: {
    name: 'Facebook Reel',
    label: 'Facebook Reel',
    color: '#60A5FA',
    bg: 'linear-gradient(135deg, #1877F2 0%, #00C6FF 100%)',
    border: '#1877F260',
    icon: '🎬'
  },
  IG: {
    name: 'Instagram Feed',
    label: 'Instagram Feed',
    color: '#F472B6',
    bg: '#E1306C',
    border: '#E1306C60',
    icon: '📸'
  },
  IG_REEL: {
    name: 'Instagram Reel',
    label: 'Instagram Reel',
    color: '#F472B6',
    bg: 'linear-gradient(135deg, #833AB4 0%, #FD1D1D 50%, #FCB045 100%)',
    border: '#E1306C60',
    icon: '🎞️'
  },
  IG_STORY: {
    name: 'Instagram Story',
    label: 'Instagram Story',
    color: '#F472B6',
    bg: 'linear-gradient(135deg, #E1306C 0%, #F77737 100%)',
    border: '#E1306C60',
    icon: '⚡'
  },
  TIKTOK: {
    name: 'TikTok',
    label: 'TikTok',
    color: '#00F2FE',
    bg: 'linear-gradient(135deg, #010101 0%, #00F2FE 50%, #FE2C55 100%)',
    border: '#25F4EE60',
    icon: '🎵'
  },
  WA: {
    name: 'WhatsApp Estado',
    label: 'WhatsApp Estado',
    color: '#86EFAC',
    bg: '#25D366',
    border: '#25D36660',
    icon: '💬'
  },
  MELI: {
    name: 'MercadoLibre VIS',
    label: 'MercadoLibre',
    color: '#FFE600',
    bg: '#FFE600',
    border: '#FFE60060',
    icon: '🟡'
  }
}

export function escapeRegex(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Function to convert vehicle text back into generalized template with placeholders
export function parameterizeTextToTemplate(raw: string, veh: Vehicle | null): string {
  if (!veh || !raw) return raw

  let res = raw.replace(/\u00a0/g, ' ')
  const brand = (veh.Marca || '').trim()
  const model = (veh.Modelo || '').trim()
  const ver = (veh.Version || '').trim()

  // 1. Title combinations
  if (brand && model && ver) {
    res = res.replace(new RegExp(`${escapeRegex(brand)}\\s+${escapeRegex(model)}\\s+${escapeRegex(ver)}`, 'gi'), '{MARCA} {MODELO} {VERSION}')
  }
  if (brand && model) {
    res = res.replace(new RegExp(`${escapeRegex(brand)}\\s+${escapeRegex(model)}`, 'gi'), '{MARCA} {MODELO}')
  }
  if (model && ver) {
    res = res.replace(new RegExp(`${escapeRegex(model)}\\s+${escapeRegex(ver)}`, 'gi'), '{MODELO} {VERSION}')
  }

  // 2. Year in parenthesis, with context, or hyphen/spaces
  const carYear = veh.Año || (veh as any).Anio || (veh as any).anio || (veh as any).year
  if (carYear) {
    res = res.replace(new RegExp(`\\(${carYear}\\)`, 'g'), '({AÑO})')
    res = res.replace(new RegExp(`(modelo|año|ano|mod\\.?)\\s*${carYear}`, 'gi'), '$1 {AÑO}')
    res = res.replace(new RegExp(`(-\\s*)${carYear}\\b`, 'g'), '$1{AÑO}')
    res = res.replace(new RegExp(`\\b${carYear}\\b(?=\\s*(?:km|\\{KM\\}|\\d))`, 'gi'), '{AÑO}')
    res = res.replace(new RegExp(`\\b${carYear}\\b`, 'g'), '{AÑO}')
  }

  // Also replace any 4-digit year like 2024, 2025, 2026, 2027 preceded by hyphen or preceding KM
  res = res.replace(/(-\s*)(?:19\d\d|20\d\d)\b/gi, '$1{AÑO}')
  res = res.replace(/\b(?:19\d\d|20\d\d)\b(?=\s*(?:km|\\{KM\\}|\d{2,3}\.\d{3}))/gi, '{AÑO}')

  // 3. Price formatting
  if (veh.Precio_Venta && veh.Precio_Venta > 0) {
    const pVenta = veh.Precio_Venta
    const formatted = formatPrice(pVenta).replace(/\u00a0/g, ' ')
    res = res.replace(new RegExp(escapeRegex(formatted), 'gi'), '{PRECIO}')
    const noSpaceDollar = formatted.replace(/\$\s+/, '$')
    res = res.replace(new RegExp(escapeRegex(noSpaceDollar), 'gi'), '{PRECIO}')
    const numWithDots = Number(pVenta).toLocaleString('es-AR')
    res = res.replace(new RegExp(`\\$\\s*${escapeRegex(numWithDots)}`, 'gi'), '{PRECIO}')
    res = res.replace(new RegExp(`\\$${pVenta}`, 'gi'), '{PRECIO}')
  }

  // 4. Entrega / Anticipo
  if (veh.Precio_entrega) {
    const rawE = String(veh.Precio_entrega).replace(/\$/g, '').trim()
    if (rawE) {
      res = res.replace(new RegExp(`\\$\\s*${escapeRegex(rawE)}`, 'gi'), '{ENTREGA}')
      const numE = Number(rawE)
      if (!isNaN(numE) && numE > 0) {
        res = res.replace(new RegExp(`\\$\\s*${numE.toLocaleString('es-AR')}`, 'gi'), '{ENTREGA}')
      }
    }
  }
  if (veh.Precio_Venta && veh.Precio_Venta > 0) {
    const half = veh.Precio_Venta * 0.5
    const halfFormatted = formatPrice(half).replace(/\u00a0/g, ' ')
    res = res.replace(new RegExp(escapeRegex(halfFormatted), 'gi'), '{ENTREGA}')
    const halfNoSpace = halfFormatted.replace(/\$\s+/, '$')
    res = res.replace(new RegExp(escapeRegex(halfNoSpace), 'gi'), '{ENTREGA}')
  }

  // 5. Kilometers
  if (veh.Km != null) {
    if (Number(veh.Km) === 0) {
      res = res.replace(/\b0\s*km\b/gi, '{KM}')
    } else {
      res = res.replace(new RegExp(`${Number(veh.Km).toLocaleString('es-AR')}\\s*km`, 'gi'), '{KM}')
      res = res.replace(new RegExp(`${veh.Km}\\s*km`, 'gi'), '{KM}')
    }
  }

  // 6. Transmisión
  if (veh.Transmision) {
    res = res.replace(new RegExp(`transmisi[oó]n\\s+${escapeRegex(veh.Transmision)}`, 'gi'), 'Transmisión {TRANSMISION}')
    res = res.replace(new RegExp(`caja:?\\s*${escapeRegex(veh.Transmision)}`, 'gi'), 'Caja: {TRANSMISION}')
    res = res.replace(new RegExp(`\\b${escapeRegex(veh.Transmision)}\\b`, 'gi'), '{TRANSMISION}')
  }

  // 7. Combustible
  if (veh.Tipo_Combustible) {
    res = res.replace(new RegExp(`combustible:?\\s*${escapeRegex(veh.Tipo_Combustible)}`, 'gi'), 'Combustible: {COMBUSTIBLE}')
    res = res.replace(new RegExp(`\\b${escapeRegex(veh.Tipo_Combustible)}\\b`, 'gi'), '{COMBUSTIBLE}')
  }

  // 8. Individual Brand, Model, Version
  if (brand && brand.length > 2) {
    res = res.replace(new RegExp(`\\b${escapeRegex(brand)}\\b`, 'gi'), '{MARCA}')
  }
  if (model && model.length > 2) {
    res = res.replace(new RegExp(`\\b${escapeRegex(model)}\\b`, 'gi'), '{MODELO}')
  }
  if (ver && ver.length > 2) {
    res = res.replace(new RegExp(`\\b${escapeRegex(ver)}\\b`, 'gi'), '{VERSION}')
  }
  if (veh.Patente && veh.Patente.length >= 3 && veh.Patente !== '0KM') {
    res = res.replace(new RegExp(`\\b${escapeRegex(veh.Patente)}\\b`, 'gi'), '{PATENTE}')
  }

  // 9. Cuotas de la circular: reemplazar bloques de cuotas por {CUOTAS}
  const is0km = isVehicle0km(veh)
  const { circular } = is0km ? getCircularForVehicle(veh) : { circular: null }
  const pVenta = veh.Precio_Venta ?? 0
  const cuotasFormatted = circular ? formatCuotasForPublication(circular, pVenta) : ''
  if (cuotasFormatted && res.includes(cuotasFormatted)) {
    res = res.replace(cuotasFormatted, '{CUOTAS}')
  } else {
    // Detectar renglones de "- Entrega $... + ... cuotas..."
    res = res.replace(/(?:-\s*Entrega\s*\$[\d\.]+\s*\+\s*\d+\s*cuotas[^\n]*(?:\r?\n)?)+/gi, '{CUOTAS}\n')
  }

  return res
}

// Function to replace {MARCA}, {MODELO}, {KM}, etc. with actual vehicle values
export function compileTemplate(templateRaw: string, v: Vehicle | null): string {
  if (!v) return templateRaw

  const is0km = isVehicle0km(v)
  const carYear = v.Año || (v as any).Anio || (v as any).anio || (v as any).year
  const anioStr = carYear ? String(carYear) : (is0km ? '0km' : '')

  const pVenta = v.Precio_Venta ?? 0
  const pEntregaStr = typeof v.Precio_entrega === 'string' && v.Precio_entrega.trim() !== ''
    ? (v.Precio_entrega.trim().startsWith('$') ? v.Precio_entrega.trim() : `$${v.Precio_entrega.trim()}`)
    : (typeof v.Precio_entrega === 'number' && v.Precio_entrega > 0)
      ? formatPrice(v.Precio_entrega)
      : (pVenta > 0 ? formatPrice(pVenta * 0.5) : 'Consultar')

  const { circular } = is0km ? getCircularForVehicle(v) : { circular: null }
  const cuotasFormatted = circular ? formatCuotasForPublication(circular, pVenta) : ''

  const vars: Record<string, string> = {
    MARCA: v.Marca || '',
    MODELO: v.Modelo || '',
    VERSION: v.Version || '',
    AÑO: anioStr,
    ANIO: anioStr,
    KM: v.Km != null ? (Number(v.Km) === 0 ? '0 km' : `${Number(v.Km).toLocaleString('es-AR')} km`) : '0 km',
    PRECIO: pVenta > 0 ? formatPrice(pVenta) : 'Consultar',
    ENTREGA: pEntregaStr,
    ANTICIPO: pEntregaStr,
    CUOTAS: cuotasFormatted,
    CUOTAS_TODAS: cuotasFormatted,
    FINANCIACION: cuotasFormatted ? `Financiación:\n${cuotasFormatted}` : '',
    COMBUSTIBLE: v.Tipo_Combustible || 'Nafta',
    TRANSMISION: v.Transmision || 'Manual',
    CAJA: v.Transmision || 'Manual',
    ESTADO: v.Estado || 'DISPONIBLE',
    DESCRIPCION: (v.Descripcion || '').trim(),
    PATENTE: v.Patente || '',
    COLOR: (v as any).Color || '',
    CONDICION: is0km ? '0km (Nuevo)' : 'Usado Seleccionado'
  }

  let result = templateRaw

  // Si NO hay cuotas asociadas al auto, eliminar cualquier línea o bloque que incluya {CUOTAS}
  // para que "simplemente no aparecerán"
  if (!cuotasFormatted) {
    // 1. Eliminar encabezados tipo "Tasa 0% :" si anteceden a {CUOTAS}
    result = result.replace(/^[ \t]*Tasa\s*0%?\s*:?[ \t]*\r?\n+[ \t]*\{CUOTAS\}[ \t]*\r?\n?/gmi, '')
    // 2. Eliminar líneas como "💳 CUOTAS: {CUOTAS}", "CUOTAS: {CUOTAS}", "Financiación: {CUOTAS}"
    result = result.replace(/^[ \t]*(?:💳\s*)?(?:CUOTAS|Financiación|FINANCIACION)[ \t]*:?[ \t]*\{CUOTAS\}[ \t]*\r?\n?/gmi, '')
    // 3. Eliminar {CUOTAS} o {CUOTAS_TODAS} si quedó en su propia línea
    result = result.replace(/^[ \t]*\{CUOTAS\}[ \t]*\r?\n?/gmi, '')
    result = result.replace(/^[ \t]*\{CUOTAS_TODAS\}[ \t]*\r?\n?/gmi, '')
  }

  // Normalizar cualquier año residual guardado estáticamente (ej: 2026) cuando el auto tiene otro año (ej: 2017)
  if (carYear && String(carYear) !== '2026') {
    result = result.replace(/(-\s*)202[0-9]\b/gi, '$1{AÑO}')
    result = result.replace(/\b202[0-9]\b(?=\s*(?:km|\{KM\}|\d{2,3}\.\d{3}))/gi, '{AÑO}')
  }

  for (const [key, val] of Object.entries(vars)) {
    const reg = new RegExp(`\\{${key}\\}`, 'gi')
    result = result.replace(reg, val)
  }

  // Limpiar saltos de línea excesivos
  result = result.replace(/\n{3,}/g, '\n\n')

  return result
}

// Dedicated concise vehicle summary generator for WhatsApp Status
export function compileWhatsAppStatusText(v: Vehicle | null): string {
  if (!v) return ''

  const is0km = isVehicle0km(v)
  const pVenta = v.Precio_Venta ?? 0
  const pEntregaStr = typeof v.Precio_entrega === 'string' && v.Precio_entrega.trim() !== ''
    ? (v.Precio_entrega.trim().startsWith('$') ? v.Precio_entrega.trim() : `$${v.Precio_entrega.trim()}`)
    : (typeof v.Precio_entrega === 'number' && v.Precio_entrega > 0)
      ? formatPrice(v.Precio_entrega)
      : (pVenta > 0 ? formatPrice(pVenta * 0.5) : 'Consultar')

  const title = `${v.Marca || ''} ${v.Modelo || ''} ${v.Version || ''}`.replace(/\s+/g, ' ').trim()
  const carYear = v.Año || (v as any).Anio || (v as any).anio || (v as any).year
  const anioStr = carYear ? `${carYear}` : (is0km ? '0km' : '')
  const kmStr = v.Km != null ? `${Number(v.Km).toLocaleString('es-AR')} km` : '0 km'
  const precioStr = pVenta > 0 ? formatPrice(pVenta) : 'Consultar'

  const { circular } = is0km ? getCircularForVehicle(v) : { circular: null }
  const cuotasFormatted = circular ? formatCuotasForPublication(circular, pVenta) : ''

  const lines = [
    `⚡ *${title.toUpperCase()} (${anioStr})* ⚡`,
    `📍 KM: ${kmStr}`,
    `💰 PRECIO: ${precioStr}`,
    `💵 RETIRA CON ${pEntregaStr}`,
    cuotasFormatted ? `\n💳 FINANCIACIÓN:\n${cuotasFormatted}` : null,
    ``,
    `🔥 Financiación directa a sola firma`,
    `📍 Resistencia, Chaco | WhatsApp 3624-750716`
  ].filter(l => l !== null) as string[]

  return lines.join('\n')
}

export function PublishModal({ vehicle, onClose, initialPlatform }: Props) {
  const [mounted, setMounted] = useState(false)
  const [targetPlatform, setTargetPlatform] = useState<TargetPlatform>('FB_MARKETPLACE')

  // Content type selector state (fotos, reel, publicidad, video)
  const [contentType, setContentType] = useState<ContentType>('fotos')

  // Publicidad / Ad flyer state (Image 1, 2, 3, 4)
  const [portadaIndex, setPortadaIndex] = useState<number>(0)
  const [adData, setAdData] = useState<AdTemplateData>(() => compileDefaultAdData(vehicle))

  // Photos selection state
  const [allPhotos, setAllPhotos] = useState<string[]>([])
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([])

  // Templates state
  const [templates, setTemplates] = useState<CopyTemplate[]>(DEFAULT_TEMPLATES)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('default-comercial')
  const [updatedTemplateSuccess, setUpdatedTemplateSuccess] = useState(false)

  const isCurrent0km = isVehicle0km(vehicle)
  const currentVehicleType: '0km' | 'usado' = isCurrent0km ? '0km' : 'usado'

  // Plantillas filtradas automáticamente según la condición del auto (0km vs Usados)
  const visibleTemplates = useMemo(() => {
    return templates.filter(t => !t.vehicleType || t.vehicleType === 'all' || t.vehicleType === currentVehicleType)
  }, [templates, currentVehicleType])


  // Text state
  const [customText, setCustomText] = useState<string>('')
  const [copiedText, setCopiedText] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isUserEditingRef = useRef(false)

  // Status & Progress state
  const [loadingPlatform, setLoadingPlatform] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [completedPlatform, setCompletedPlatform] = useState<string | null>(null)

  // AI Copywriter State
  const [loadingAI, setLoadingAI] = useState(false)

  const [canShare, setCanShare] = useState(false)
  const [showReelStudio, setShowReelStudio] = useState(false)
  const adFlyerRef = useRef<AdFlyerPreviewHandle | null>(null)
  const videoReelRef = useRef<VideoReelModalHandle | null>(null)

  // Publicidades state (loaded flyer templates associated to models)
  const [publicidades, setPublicidades] = useState<AdPublicidadTemplate[]>(DEFAULT_PUBLICIDADES)
  const [selectedPublicidadId, setSelectedPublicidadId] = useState<string>('')

  // Modals for uploading and assistant
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false)
  const [newPubName, setNewPubName] = useState<string>('')
  const [newPubModel, setNewPubModel] = useState<string>('')
  const [newPubBrand, setNewPubBrand] = useState<string>('')
  const [newPubImage, setNewPubImage] = useState<string>('')
  const [newPubOnly0km, setNewPubOnly0km] = useState<boolean>(false)

  const [showAssistantModal, setShowAssistantModal] = useState<boolean>(false)
  const [assistantPrompt, setAssistantPrompt] = useState<string>('')
  const [assistantSuccessMsg, setAssistantSuccessMsg] = useState<string | null>(null)

  // Load saved publicidades on mount
  useEffect(() => {
    const list = getSavedPublicidades()
    setPublicidades(list)
  }, [])

  // Filter publicidades strictly matching this vehicle model (and 0km status if applicable)
  const availablePublicidades = useMemo(() => {
    if (!vehicle) return []
    return publicidades.filter(pub => isVehicleMatchingPublicidad(vehicle, pub))
  }, [vehicle, publicidades])

  // Auto-select matched publicidad for this vehicle
  useEffect(() => {
    if (availablePublicidades.length > 0) {
      if (!availablePublicidades.some(p => p.id === selectedPublicidadId)) {
        setSelectedPublicidadId(availablePublicidades[0].id)
      }
    } else {
      setSelectedPublicidadId('')
    }
  }, [availablePublicidades, selectedPublicidadId])

  const currentPublicidad = availablePublicidades.find(p => p.id === selectedPublicidadId) || availablePublicidades[0] || null

  // Handler for switching content type (Fotos, Reel, Publicidad, Video)
  const handleSelectContentType = (type: ContentType) => {
    setContentType(type)
    if (type !== 'publicidad') {
      // En Fotos, Reel, Video: restauramos fotos si estaba vacío
      if (selectedPhotos.length === 0 && allPhotos.length > 0) {
        setSelectedPhotos([...allPhotos])
      }
    }
    // Requisito: "el texto se mantiene igual" - solo compilar si estaba vacío
    if (!customText.trim()) {
      const foundTemplate = visibleTemplates.find(t => t.id === selectedTemplateId) || visibleTemplates[0] || DEFAULT_TEMPLATES[0]
      setCustomText(compileTemplate(foundTemplate.content, vehicle))
    }
  }


  const handleSelectPublicidad = (pub: AdPublicidadTemplate) => {
    setSelectedPublicidadId(pub.id)
  }

  const handleSaveNewPublicidad = () => {
    if (!newPubModel.trim()) {
      alert('Por favor ingresá el modelo al que querés asociar la publicidad (ej: S10, Hilux, Amarok).')
      return
    }
    if (!newPubImage.trim()) {
      alert('Por favor seleccioná o subí una imagen para la publicidad.')
      return
    }

    const created: AdPublicidadTemplate = {
      id: `pub-${Date.now()}`,
      name: newPubName.trim() || `Publicidad ${newPubBrand || ''} ${newPubModel.toUpperCase()}${newPubOnly0km ? ' 0KM' : ''}`.trim(),
      model: newPubModel.trim(),
      brand: newPubBrand.trim() || vehicle?.Marca || '',
      imageUrl: newPubImage,
      only0km: newPubOnly0km,
      createdAt: Date.now()
    }

    const updated = [...publicidades, created]
    setPublicidades(updated)
    savePublicidades(updated)
    setSelectedPublicidadId(created.id)
    setShowUploadModal(false)
    alert(`¡Publicidad guardada y asociada exitosamente al modelo ${created.model} para todas sus versiones!`)
  }

  const handleEditModelAssociation = (pub: AdPublicidadTemplate) => {
    const newModel = prompt(`¿A qué modelo querés asociar esta publicidad? (Aplica a todas las versiones de ese modelo):`, pub.model)
    if (!newModel || !newModel.trim()) return

    const updated = publicidades.map(p => {
      if (p.id === pub.id) {
        return { ...p, model: newModel.trim() }
      }
      return p
    })
    setPublicidades(updated)
    savePublicidades(updated)
    alert(`Publicidad asociada exitosamente al modelo "${newModel.trim()}"`)
  }

  const handleDeletePublicidad = (id: string) => {
    const target = publicidades.find(p => p.id === id)
    if (target?.isDefault) {
      alert('La plantilla oficial no se puede eliminar.')
      return
    }
    if (!confirm(`¿Eliminar la publicidad "${target?.name}"?`)) return

    const updated = publicidades.filter(p => p.id !== id)
    setPublicidades(updated)
    savePublicidades(updated)
    if (selectedPublicidadId === id) {
      const remaining = availablePublicidades.filter(p => p.id !== id)
      setSelectedPublicidadId(remaining[0]?.id || '')
    }
  }

  const handleExecuteAssistant = (commandText?: string) => {
    const text = (commandText || assistantPrompt).trim().toLowerCase()
    if (!text) return

    let detectedModel = ''
    const match = text.match(/(?:asocia(?:r)?(?:\s+esta\s+publicidad)?\s+(?:a|con|para)\s+(?:las?|los?)?|para\s+(?:las?|los?)?)\s*([a-z0-9\s]+)/i)
    if (match && match[1]) {
      detectedModel = match[1].replace(/0km|0\s*km|cero\s*km/gi, '').trim()
    } else {
      const words = text.replace(/asocia|esta|publicidad|a|las|los|de|0km|0\s*km/g, '').trim()
      if (words.length > 1) {
        detectedModel = words
      } else if (vehicle?.Modelo) {
        detectedModel = vehicle.Modelo
      }
    }

    if (!detectedModel) {
      alert('No se pudo identificar el modelo en la instrucción. Probá con: "asocia esta publicidad a las s10"')
      return
    }

    const cleanModel = detectedModel.toUpperCase()
    const is0kmSpecified = /0km|0\s*km|cero\s*km/i.test(text) || (cleanModel === 'AMAROK' && isVehicle0km(vehicle))

    let brand = vehicle?.Marca || ''
    if (/s10|cruze|tracker|onix|spin|trailblazer/i.test(cleanModel)) brand = 'Chevrolet'
    else if (/hilux|corolla|yaris|sw4|etios|cross/i.test(cleanModel)) brand = 'Toyota'
    else if (/ranger|maverick|territory|focus|ecosport|f-100|f-150/i.test(cleanModel)) brand = 'Ford'
    else if (/amarok|taos|gol|polo|nivus|t-cross|vento|suran/i.test(cleanModel)) brand = 'Volkswagen'
    else if (/cronos|toro|argo|pulse|fastback|mobi|strada/i.test(cleanModel)) brand = 'Fiat'
    else if (/208|2008|3008|partner/i.test(cleanModel)) brand = 'Peugeot'
    else if (/renegade|compass|commander/i.test(cleanModel)) brand = 'Jeep'
    else if (/frontier|kicks|versas/i.test(cleanModel)) brand = 'Nissan'

    const existingIndex = publicidades.findIndex(p => p.model.toLowerCase() === cleanModel.toLowerCase())

    let updatedList: AdPublicidadTemplate[] = []
    let activeId = ''

    const currentImg = currentPublicidad?.imageUrl || '/templates/plantilla_publicidad_okm.png?v=6'

    if (existingIndex >= 0) {
      updatedList = publicidades.map((p, idx) => {
        if (idx === existingIndex) {
          return { ...p, imageUrl: currentImg, brand: brand || p.brand, only0km: is0kmSpecified ? true : p.only0km }
        }
        return p
      })
      activeId = publicidades[existingIndex].id
    } else {
      const newPub: AdPublicidadTemplate = {
        id: `pub-${Date.now()}`,
        name: `Publicidad ${brand} ${cleanModel}${is0kmSpecified ? ' 0KM' : ''}`,
        model: cleanModel,
        brand: brand,
        imageUrl: currentImg,
        only0km: is0kmSpecified,
        createdAt: Date.now()
      }
      updatedList = [...publicidades, newPub]
      activeId = newPub.id
    }

    setPublicidades(updatedList)
    savePublicidades(updatedList)
    setSelectedPublicidadId(activeId)
    setAssistantSuccessMsg(`¡Éxito! Publicidad asociada al modelo "${cleanModel}" (${brand}) para todas sus versiones.`)
    setTimeout(() => {
      setShowAssistantModal(false)
      setAssistantSuccessMsg(null)
      setAssistantPrompt('')
    }, 1800)
  }

  // Handler for selecting photo as portada (updates live in the flyer, sets single photo in Publicidad)
  const handleSetPortada = (idx: number, url: string) => {
    setPortadaIndex(idx)
    if (contentType === 'publicidad') {
      setSelectedPhotos([url])
    }
    setAdData(prev => ({ ...prev, carImageUrl: url }))
  }

  // Live text change handler syncing textarea with adData
  const handleTextChange = (newVal: string) => {
    setCustomText(newVal)
    if (contentType === 'publicidad') {
      setAdData(prev => parseTextToAdData(newVal, prev))
    }
  }

  // Storage helper
  const saveTemplatesToStorage = (updated: CopyTemplate[]) => {
    setTemplates(updated)
    try {
      localStorage.setItem('autoapp_publication_templates', JSON.stringify(updated))
    } catch (e) {
      console.warn('Error saving templates:', e)
    }
  }

  useEffect(() => {
    setMounted(true)
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setCanShare(true)
    }

    // Load templates from localStorage and sanitize stale hardcoded years
    try {
      const saved = localStorage.getItem('autoapp_publication_templates')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = parsed.map((t: CopyTemplate) => {
            let content = t.content
            if (content.includes('- 2026') || /-\s*2026\b/.test(content)) {
              content = content.replace(/(-\s*)2026\b/g, '$1{AÑO}')
            }
            if (/\b2026\b(?=\s*(?:km|\{KM\}|\d{2,3}\.\d{3}))/.test(content)) {
              content = content.replace(/\b2026\b(?=\s*(?:km|\{KM\}|\d{2,3}\.\d{3}))/g, '{AÑO}')
            }
            return {
              ...t,
              content,
              vehicleType: t.vehicleType || 'all'
            }
          })
          setTemplates(sanitized)
        }
      }
    } catch (e) {
      console.warn('Error loading custom templates:', e)
    }
  }, [])

  // Sync target platform, photos and compiled template when opened or vehicle changes
  useEffect(() => {
    if (vehicle) {
      let p: TargetPlatform = 'FB_MARKETPLACE'
      if (initialPlatform) {
        const norm = initialPlatform.toUpperCase()
        if (norm === 'FB_MARKETPLACE' || norm === 'FB') p = 'FB_MARKETPLACE'
        else if (norm === 'FB_PAGE') p = 'FB_PAGE'
        else if (norm === 'FB_REEL') p = 'FB_REEL'
        else if (norm === 'IG') p = 'IG'
        else if (norm === 'IG_REEL') p = 'IG_REEL'
        else if (norm === 'IG_STORY') p = 'IG_STORY'
        else if (norm === 'TIKTOK' || norm === 'TT') p = 'TIKTOK'
        else if (norm === 'WA' || norm === 'WA_MOBILE') p = 'WA'
        else if (norm === 'MELI') p = 'MELI'
      }
      setTargetPlatform(p)

      // Photos: pre-select ALL photos by default (or only 1 photo if Publicidad is active)
      const photos = getAllVehiclePhotos(vehicle)
      setAllPhotos(photos)

      const initialPortada = photos[0] || ''
      const defaultAd = compileDefaultAdData(vehicle, initialPortada)
      setAdData(defaultAd)
      setPortadaIndex(0)

      if (contentType === 'publicidad') {
        setSelectedPhotos(initialPortada ? [initialPortada] : [])
        setCustomText(formatAdDataToText(defaultAd))
      } else {
        setSelectedPhotos(photos)
        if (p === 'WA') {
          setCustomText(compileWhatsAppStatusText(vehicle))
        } else if (p === 'TIKTOK') {
          const ttTemplate = visibleTemplates.find(t => t.id === 'default-tiktok') || templates.find(t => t.id === 'default-tiktok')
          if (ttTemplate) {
            setSelectedTemplateId(ttTemplate.id)
            setCustomText(compileTemplate(ttTemplate.content, vehicle))
          } else {
            setCustomText(generateTikTokCaption(vehicle))
          }
        } else {
          let initialTemplateId = 'default-comercial'
          if (p === 'FB_MARKETPLACE') initialTemplateId = 'default-marketplace'
          else if (p === 'IG' || p === 'IG_STORY') initialTemplateId = 'default-financiacion'
          else if (p === 'FB_REEL' || p === 'IG_REEL') initialTemplateId = 'default-reel'

          const foundTemplate = visibleTemplates.find(t => t.id === initialTemplateId) || visibleTemplates[0] || DEFAULT_TEMPLATES[0]
          setSelectedTemplateId(foundTemplate.id)
          setCustomText(compileTemplate(foundTemplate.content, vehicle))
        }
      }

      setCompletedPlatform(null)
      setStatusMsg(null)
    }
  }, [vehicle, initialPlatform])

  // Asegurar que selectedTemplateId pertenezca a las plantillas válidas del vehículo actual
  useEffect(() => {
    if (visibleTemplates.length > 0 && !visibleTemplates.some(t => t.id === selectedTemplateId)) {
      const nextT = visibleTemplates[0]
      setSelectedTemplateId(nextT.id)
      setCustomText(compileTemplate(nextT.content, vehicle))
    }
  }, [visibleTemplates, selectedTemplateId, vehicle])

  // Auto-guardado transparente de la plantilla seleccionada cada vez que el usuario modifica el texto
  useEffect(() => {
    if (!isUserEditingRef.current || !selectedTemplateId) return

    const timer = setTimeout(() => {
      const is0km = isVehicle0km(vehicle)
      const condition: '0km' | 'usado' = is0km ? '0km' : 'usado'
      const parameterizedContent = parameterizeTextToTemplate(customText, vehicle)
      setTemplates(prev => {
        const updated = prev.map(t => {
          if (t.id === selectedTemplateId) {
            return {
              ...t,
              content: parameterizedContent,
              vehicleType: t.isDefault ? (t.vehicleType || 'all') : (t.vehicleType || condition)
            }
          }
          return t
        })
        saveTemplatesToStorage(updated)
        return updated
      })
      isUserEditingRef.current = false
    }, 500)

    return () => clearTimeout(timer)
  }, [customText, selectedTemplateId, vehicle, currentVehicleType])

  if (!vehicle || !mounted) return null

  // Toggle single photo selection
  const togglePhoto = (url: string) => {
    if (selectedPhotos.includes(url)) {
      setSelectedPhotos(prev => prev.filter(p => p !== url))
    } else {
      setSelectedPhotos(prev => [...prev, url])
    }
  }


  // Switch target platform (Requisito 4: MANTIENE EL TEXTO INTACTO para publicar en múltiples redes)
  const handleSwitchPlatform = (platform: TargetPlatform) => {
    setTargetPlatform(platform)
    setCompletedPlatform(null)
    setStatusMsg(null)

    if (platform === 'FB_REEL' || platform === 'IG_REEL') {
      setContentType('reel')
    }

    // Si el usuario ya tiene texto editado o preparado, lo mantenemos intacto para no pisarlo
    if (!customText.trim()) {
      if (platform === 'WA') {
        const t = visibleTemplates.find(x => x.id === 'default-whatsapp') || templates.find(x => x.id === 'default-whatsapp')
        if (t) {
          setSelectedTemplateId(t.id)
          setCustomText(compileTemplate(t.content, vehicle))
        } else {
          setCustomText(compileWhatsAppStatusText(vehicle))
        }
      } else if (platform === 'TIKTOK') {
        const t = visibleTemplates.find(x => x.id === 'default-tiktok') || templates.find(x => x.id === 'default-tiktok')
        if (t) {
          setSelectedTemplateId(t.id)
          setCustomText(compileTemplate(t.content, vehicle))
        } else {
          setCustomText(generateTikTokCaption(vehicle))
        }
      } else {
        let tid = selectedTemplateId
        if (platform === 'FB_MARKETPLACE') tid = 'default-marketplace'
        else if (platform === 'IG' || platform === 'IG_STORY') tid = 'default-financiacion'
        else if (platform === 'FB_REEL' || platform === 'IG_REEL') tid = 'default-reel'
        else if (platform === 'FB_PAGE') tid = 'default-comercial'

        const t = visibleTemplates.find(x => x.id === tid) || visibleTemplates[0] || DEFAULT_TEMPLATES[0]
        setSelectedTemplateId(t.id)
        setCustomText(compileTemplate(t.content, vehicle))
      }
    }
  }

  // Handle template selection change
  const handleSelectTemplate = (templateId: string) => {
    isUserEditingRef.current = false
    setSelectedTemplateId(templateId)
    const t = visibleTemplates.find(x => x.id === templateId) || templates.find(x => x.id === templateId)
    if (t) {
      setCustomText(compileTemplate(t.content, vehicle))
    }
  }

  // Handle custom text change with auto-save
  const handleCustomTextChange = (newVal: string) => {
    isUserEditingRef.current = true
    setCustomText(newVal)
  }

  // Guardar como NUEVA plantilla separada (se asocia automáticamente a 0KM o Usados)
  const handleSaveAsNewTemplate = () => {
    const is0km = isVehicle0km(vehicle)
    const condition: '0km' | 'usado' = is0km ? '0km' : 'usado'
    const name = prompt('Ingresá un nombre para tu nueva plantilla:', `Plantilla ${is0km ? '0KM' : 'Usados'} ${visibleTemplates.length + 1}`)
    if (!name || !name.trim()) return

    const parameterizedContent = parameterizeTextToTemplate(customText, vehicle)

    const newTemplate: CopyTemplate = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      content: parameterizedContent,
      vehicleType: condition // Automáticamente '0km' o 'usado' según el auto abierto
    }

    const updated = [...templates, newTemplate]
    saveTemplatesToStorage(updated)
    setTemplates(updated)
    setSelectedTemplateId(newTemplate.id)
    isUserEditingRef.current = false
  }

  // Requisito 1: Botón para borrar plantilla en caso de querer borrar
  const handleDeleteTemplate = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const target = templates.find(t => t.id === id)
    if (!target) return

    if (!confirm(`¿Estás seguro de que deseas eliminar la plantilla "${target.name}"?`)) return

    const remaining = templates.filter(t => t.id !== id)
    saveTemplatesToStorage(remaining)
    setTemplates(remaining)

    const remainingVisible = remaining.filter(t => !t.vehicleType || t.vehicleType === 'all' || t.vehicleType === currentVehicleType)
    if (remainingVisible.length > 0) {
      const nextT = remainingVisible[0]
      setSelectedTemplateId(nextT.id)
      setCustomText(compileTemplate(nextT.content, vehicle))
    } else {
      const fallback: CopyTemplate = {
        id: `default-${currentVehicleType}`,
        name: currentVehicleType === '0km' ? '🏷️ 0KM Estándar' : '🏷️ Usados Estándar',
        vehicleType: currentVehicleType,
        content: `🚗 {MARCA} {MODELO} {VERSION} ({AÑO})\nKm: {KM}\n💰 Precio: {PRECIO}\n💵 Anticipo: {ENTREGA}\n⛽ {COMBUSTIBLE} — {TRANSMISION}`
      }
      const updated = [...remaining, fallback]
      saveTemplatesToStorage(updated)
      setTemplates(updated)
      setSelectedTemplateId(fallback.id)
      setCustomText(compileTemplate(fallback.content, vehicle))
    }
  }


  // Insertar variable en el cursor del textarea
  const handleInsertVariable = (tag: string) => {
    isUserEditingRef.current = true

    let textToInsert = tag
    if (tag === '{CUOTAS}') {
      const is0km = isVehicle0km(vehicle)
      const { circular } = is0km ? getCircularForVehicle(vehicle) : { circular: null }
      const pVenta = vehicle?.Precio_Venta ?? 0
      const cuotasFormatted = circular ? formatCuotasForPublication(circular, pVenta) : ''

      if (!cuotasFormatted) {
        alert('Este vehículo 0KM no tiene una circular de financiación configurada.')
        return
      }

      // Si el texto ya tiene los datos del vehículo (no es una plantilla con tags {MARCA}),
      // insertar directamente el bloque calculado de cuotas
      if (customText && !customText.includes('{MARCA}') && !customText.includes('{PRECIO}')) {
        textToInsert = cuotasFormatted
      } else {
        textToInsert = '{CUOTAS}'
      }
    }

    if (textareaRef.current) {
      const textarea = textareaRef.current
      const start = textarea.selectionStart || 0
      const end = textarea.selectionEnd || 0
      const prev = customText
      const next = prev.substring(0, start) + textToInsert + prev.substring(end)
      setCustomText(next)
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length)
      }, 0)
    } else {
      setCustomText(prev => prev + (prev ? '\n' : '') + textToInsert)
    }
  }

  // Generate AI Copy with Gemini
  const handleGenerateAICopy = async () => {
    try {
      setLoadingAI(true)
      const res = await fetch('/api/ai/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle: {
            marca: vehicle.Marca,
            modelo: vehicle.Modelo,
            version: vehicle.Version,
            anio: vehicle.Año,
            km: vehicle.Km,
            precio_venta: vehicle.Precio_Venta,
            precio_entrega: vehicle.Precio_entrega,
            combustible: vehicle.Tipo_Combustible,
            transmision: vehicle.Transmision,
            estado: vehicle.Estado,
            descripcion: vehicle.Descripcion,
            tipo: vehicle.Tipo_Vehiculo
          }
        })
      })

      const data = await res.json()
      if (data.success && data.copy) {
        if ((targetPlatform === 'IG' || targetPlatform === 'IG_REEL' || targetPlatform === 'IG_STORY') && data.copy.instagram) {
          setCustomText(`${data.copy.instagram.hook}\n\n${data.copy.instagram.caption}\n\n${(data.copy.instagram.hashtags || []).join(' ')}`)
        } else if ((targetPlatform === 'FB_PAGE' || targetPlatform === 'FB_MARKETPLACE' || targetPlatform === 'FB_REEL') && data.copy.facebook) {
          setCustomText(`${data.copy.facebook.title}\n\n${data.copy.facebook.description}\n\n• ${(data.copy.facebook.key_features || []).join('\n• ')}`)
        } else if (targetPlatform === 'TIKTOK') {
          if (data.copy.instagram) {
            setCustomText(`${data.copy.instagram.hook}\n\n${data.copy.instagram.caption}\n\n#autos #autosargentina #concesionaria #vendo #parati #fyp #viral`)
          } else {
            setCustomText(generateTikTokCaption(vehicle))
          }
        } else if (targetPlatform === 'MELI' && data.copy.mercadolibre) {
          setCustomText(`${data.copy.mercadolibre.title}\n\n${data.copy.mercadolibre.description}`)
        } else if (targetPlatform === 'WA' && data.copy.whatsapp) {
          setCustomText(`${data.copy.whatsapp.status_text}\n\n${data.copy.whatsapp.chat_pitch}`)
        }
      } else {
        alert('Aviso: ' + (data.error || 'No se pudo generar el copy con IA'))
      }
    } catch (err: any) {
      alert('Error al contactar el motor de IA: ' + err.message)
    } finally {
      setLoadingAI(false)
    }
  }

  const handleCopyText = () => {
    const textToCopy = compileTemplate(customText, vehicle)
    navigator.clipboard.writeText(textToCopy)
    setCopiedText(true)
    setTimeout(() => setCopiedText(false), 2000)
  }

  // Create customized vehicle payload with ONLY selected photos and custom text (or flyer image in Publicidad)
  const getCustomizedVehicleObj = (flyerUrlOverride?: string): Vehicle => {
    const mainPhoto = flyerUrlOverride || selectedPhotos[0] || vehicle.FOTO_PORTADA
    const extraPhotos = flyerUrlOverride ? [] : selectedPhotos.slice(1)
    const photoList = flyerUrlOverride ? [flyerUrlOverride] : selectedPhotos
    const finalCompiledText = compileTemplate(customText, vehicle)

    return {
      ...vehicle,
      FOTO_PORTADA: mainPhoto,
      FOTOS_EXTRA: JSON.stringify(extraPhotos),
      Descripcion: finalCompiledText,
      photoLinks: photoList
    } as any
  }

  // Convierte cualquier foto en formato 9:16 Ultra HD (1080x1920) con fondo desenfocado elegante para Stories
  const formatPhotoToStoryUltraHd = async (photoUrl: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = 1080
          canvas.height = 1920
          const ctx = canvas.getContext('2d')
          if (!ctx) return reject(new Error('Canvas context not available'))

          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'

          // 1. Fondo difuminado que llena el lienzo 9:16
          ctx.save()
          ctx.filter = 'blur(35px) brightness(0.65)'
          ctx.drawImage(img, -100, -50, 1280, 2020)
          ctx.restore()

          // 2. Viñeta degradada oscura
          const grad = ctx.createLinearGradient(0, 0, 0, 1920)
          grad.addColorStop(0, 'rgba(4, 10, 20, 0.75)')
          grad.addColorStop(0.2, 'rgba(4, 10, 20, 0.2)')
          grad.addColorStop(0.8, 'rgba(4, 10, 20, 0.2)')
          grad.addColorStop(1, 'rgba(4, 10, 20, 0.85)')
          ctx.fillStyle = grad
          ctx.fillRect(0, 0, 1080, 1920)

          // 3. Foto central completa sin recortes
          const aspect = img.naturalWidth / img.naturalHeight
          const drawW = 1080
          const drawH = Math.round(drawW / aspect)
          const offsetY = Math.round((1920 - drawH) / 2)

          // Sombra sutil debajo de la foto del vehículo
          ctx.save()
          ctx.shadowColor = 'rgba(0, 0, 0, 0.65)'
          ctx.shadowBlur = 40
          ctx.drawImage(img, 0, offsetY, drawW, drawH)
          ctx.restore()

          canvas.toBlob((blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Error creando blob de foto para historia'))
          }, 'image/png')
        } catch (err) {
          reject(err)
        }
      }
      img.onerror = () => reject(new Error('Error cargando imagen'))
      img.src = photoUrl
    })
  }

  // Execute publication to chosen target platform
  const handleExecutePublish = async () => {
    if (contentType === 'reel' || contentType === 'video' || targetPlatform === 'FB_REEL' || targetPlatform === 'IG_REEL') {
      if (videoReelRef.current) {
        let dest: PublishDestination | undefined = undefined
        if (targetPlatform === 'FB_PAGE' || targetPlatform === 'FB_REEL' || targetPlatform === 'FB_MARKETPLACE') {
          dest = 'fb_reel'
        } else if (targetPlatform === 'IG_STORY') {
          dest = 'ig_story'
        } else if (targetPlatform === 'TIKTOK') {
          dest = 'tiktok'
        } else if (targetPlatform === 'WA') {
          dest = 'wa_story'
        } else {
          dest = 'ig_reel'
        }
        await videoReelRef.current.publish(dest)
        return
      }
    }

    if (contentType !== 'publicidad' && selectedPhotos.length === 0) {
      alert('Por favor selecciona al menos 1 foto para publicar.')
      return
    }

    try {
      setLoadingPlatform(targetPlatform)

      let flyerPublicUrl: string | null = null

      // Si es Publicidad, generamos el flyer gráfico en ULTRA HD con el formato óptimo para la plataforma
      if (contentType === 'publicidad' && adFlyerRef.current) {
        try {
          const targetFormat: '9:16' = '9:16'
          const formatDesc = '9:16 Vertical (Ultra HD)'

          setStatusMsg(`Generando diseño en Ultra HD ${formatDesc} para ${activeMeta.name}...`)
          const flyerBlob = await adFlyerRef.current.generateCompositeBlob(targetFormat)

          setStatusMsg('Subiendo diseño Ultra HD a la nube...')
          const file = new File([flyerBlob], `publicidad_${vehicle.ID || 'flyer'}_${targetFormat.replace(':', 'x')}_${Date.now()}.png`, {
            type: 'image/png'
          })
          const formData = new FormData()
          formData.append('file', file)
          formData.append('folder', 'publicidades')
          formData.append('vehicleId', vehicle.ID || 'flyer')

          const uploadRes = await fetch('/api/media/upload-video', {
            method: 'POST',
            body: formData
          })
          const uploadData = await uploadRes.json()
          if (uploadData.success && uploadData.publicUrl) {
            flyerPublicUrl = uploadData.publicUrl
          } else {
            console.warn('Fallo subida de flyer a Supabase Storage, usando fallback base64:', uploadData?.error)
            const base64Fallback = await new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result as string)
              reader.readAsDataURL(flyerBlob)
            })
            flyerPublicUrl = base64Fallback
          }
        } catch (err: any) {
          console.error('Error generando o subiendo la publicidad:', err)
          alert('Aviso: Hubo un inconveniente al generar la imagen de la publicidad: ' + err.message)
        }
      }

      const targetV = getCustomizedVehicleObj(flyerPublicUrl || undefined)
      const compiledFinalText = compileTemplate(customText, vehicle)

      if (targetPlatform === 'FB_PAGE') {
        setStatusMsg('Publicando en Facebook Fan Page (API Oficial)...')
        const res = await publishToFacebookPage(targetV, (msg) => setStatusMsg(msg), { customCopy: compiledFinalText })
        setCompletedPlatform('FB_PAGE')
        if (res.url) {
          setTimeout(() => window.open(res.url, '_blank'), 1000)
        }
      } else if (targetPlatform === 'FB_MARKETPLACE') {
        setStatusMsg('Cargando datos en Facebook Marketplace...')
        await publishToFacebookMarketplace(targetV, (msg) => setStatusMsg(msg), { customCopy: compiledFinalText })
        setCompletedPlatform('FB_MARKETPLACE')
        setStatusMsg('✅ ¡Facebook Marketplace abierto y datos cargados! El texto se mantiene disponible para publicar en las demás plataformas.')
      } else if (targetPlatform === 'FB_REEL') {
        setShowReelStudio(true)
      } else if (targetPlatform === 'IG') {
        setStatusMsg('Publicando carrusel en Instagram (@okmmotors)...')
        try {
          const res = await publishToInstagramGraphAPI(targetV, (msg) => setStatusMsg(msg), { customCopy: compiledFinalText })
          setCompletedPlatform('IG')
          alert(`¡Publicado exitosamente en Instagram (@okmmotors)!\nURL: ${res.url}`)
        } catch (err: any) {
          console.warn('Fallo Graph API direct, usando extensión:', err)
          await publishToInstagramFeed(targetV, (msg) => setStatusMsg(msg), { customCaption: compiledFinalText })
          setCompletedPlatform('IG')
        }
      } else if (targetPlatform === 'IG_REEL') {
        setShowReelStudio(true)
      } else if (targetPlatform === 'IG_STORY') {
        if (contentType === 'reel' || contentType === 'video') {
          setShowReelStudio(true)
        } else {
          let storyImageUrl = flyerPublicUrl || targetV.FOTO_PORTADA || selectedPhotos[0]

          // Si son fotos normales horizontales, adaptarlas automáticamente a formato 9:16 Ultra HD
          if (!flyerPublicUrl && storyImageUrl) {
            try {
              setStatusMsg('Adaptando foto a formato 9:16 Ultra HD para Historia...')
              const formattedBlob = await formatPhotoToStoryUltraHd(storyImageUrl)
              const file = new File([formattedBlob], `story_${vehicle.ID || 'auto'}_${Date.now()}.png`, { type: 'image/png' })
              const fd = new FormData()
              fd.append('file', file)
              fd.append('folder', 'stories')
              fd.append('vehicleId', vehicle.ID || 'auto')
              const upRes = await fetch('/api/media/upload-video', { method: 'POST', body: fd })
              const upData = await upRes.json()
              if (upData.success && upData.publicUrl) {
                storyImageUrl = upData.publicUrl
              }
            } catch (err) {
              console.warn('Fallback a imagen original para historia:', err)
            }
          }

          setStatusMsg('Publicando Historia en Instagram Oficial (@okmmotors)...')
          await publishToInstagramStory(targetV, (msg) => setStatusMsg(msg), {
            imageUrl: storyImageUrl
          })
          setCompletedPlatform('IG_STORY')
          alert('¡Historia publicada con éxito en Instagram Oficial (@okmmotors)!')
        }
      } else if (targetPlatform === 'TIKTOK') {
        if (contentType === 'reel' || contentType === 'video') {
          setShowReelStudio(true)
        } else {
          setStatusMsg('Iniciando publicación en TikTok...')
          await publishToTikTok(targetV, (msg) => setStatusMsg(msg), { customText: compiledFinalText })
          setCompletedPlatform('TIKTOK')
        }
      } else if (targetPlatform === 'WA') {
        const isMobile = isMobileDevice()
        if (isMobile && canShare) {
          setStatusMsg('Abriendo WhatsApp en tu celular...')
          const shared = await shareToWhatsAppMobile(targetV, { customStatusText: compiledFinalText })
          if (shared) {
            setCompletedPlatform('WA')
            setStatusMsg('¡Compartido con éxito!')
          }
        } else {
          setStatusMsg('Preparando imágenes y texto para WhatsApp Web...')
          await publishToWhatsAppStatus(targetV, (msg) => setStatusMsg(msg), { customStatusText: compiledFinalText })
          setCompletedPlatform('WA')
        }
      } else if (targetPlatform === 'MELI') {
        setStatusMsg('Publicando automáticamente en MercadoLibre...')
        const res = await publishToMercadoLibre(targetV, (msg) => setStatusMsg(msg))
        setCompletedPlatform('MELI')
        if (res.url) {
          setTimeout(() => window.open(res.url, '_blank'), 1000)
        }
      }
    } catch (err: any) {
      alert(`Error al publicar en ${PLATFORMS_META[targetPlatform]?.name || 'plataforma'}: ${err.message}`)
    } finally {
      setLoadingPlatform(null)
    }
  }

  const activeMeta = PLATFORMS_META[targetPlatform] || PLATFORMS_META.FB_MARKETPLACE

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
      onClick={onClose}>

      {/* Main Modal Container */}
      <div
        className="card w-[98vw] max-w-[1600px] h-[95vh] flex flex-col overflow-hidden shadow-2xl rounded-2xl border border-[#2A2F45]"
        style={{ background: '#0F1117' }}
        onClick={e => e.stopPropagation()}>

        {/* Modal Top Header Bar with Platform Selector */}
        <div className="px-5 py-3 bg-[#13161F] border-b border-[#1F2337] flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-0.5">
            {([
              'FB_MARKETPLACE',
              'FB_PAGE',
              'FB_REEL',
              'IG',
              'IG_REEL',
              'IG_STORY',
              'TIKTOK',
              'WA',
              'MELI'
            ] as TargetPlatform[]).map(platform => {
              const meta = PLATFORMS_META[platform]
              const isActive = targetPlatform === platform
              return (
                <button
                  key={platform}
                  type="button"
                  onClick={() => handleSwitchPlatform(platform)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                    isActive
                      ? 'shadow-lg scale-[1.02]'
                      : 'bg-[#0B0D13] text-[#8B8FA8] hover:bg-[#1E2130] hover:text-white border border-[#1F2337]'
                  }`}
                  style={{
                    background: isActive ? meta.bg : undefined,
                    color: isActive ? (platform === 'MELI' ? '#000000' : '#FFFFFF') : undefined,
                    border: isActive ? 'none' : undefined
                  }}>
                  <span>{meta.icon}</span>
                  <span>{meta.name}</span>
                </button>
              )
            })}
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[#2A2F45] transition-colors text-[#8B8FA8] hover:text-white flex-shrink-0"
            style={{ background: '#1E2130', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body Container */}
        <div className="flex-1 p-4 sm:p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar text-left bg-[#0B0D13]">

          {/* VISTA UNIFICADA Y CONSISTENTE PARA TODAS LAS PLATAFORMAS (MARKETPLACE, FEED, REEL, TIKTOK, WHATSAPP, MELI) */}
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            
            {/* Card 1: Selector de Tipo de Contenido + Galería de Fotos / Publicidades */}
            <div className="flex flex-col gap-3 flex-shrink-0 bg-[#13161F] p-4 rounded-xl border border-[#1F2337]">
              
              {/* Selector de Tipo de Contenido: Fotos / Reel / Publicidad / Video */}
              <div className="flex items-center gap-1.5 flex-wrap bg-[#0B0D13] p-1.5 rounded-xl border border-[#1F2337]">
                {CONTENT_TYPE_OPTIONS.map(opt => {
                  const Icon = opt.icon
                  const isSelected = contentType === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectContentType(opt.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer border ${
                        isSelected
                          ? 'shadow-md scale-[1.02]'
                          : 'bg-[#13161F] text-[#8B8FA8] hover:text-[#E8EAED] hover:bg-[#1E2130] border-[#1F2337]'
                      }`}
                      style={isSelected ? {
                        background: activeMeta.bg || '#2563EB',
                        borderColor: activeMeta.color || '#3B82F6',
                        color: targetPlatform === 'MELI' ? '#000000' : '#FFFFFF'
                      } : undefined}>
                      <Icon size={14} className={isSelected ? (targetPlatform === 'MELI' ? 'text-black' : 'text-white') : 'text-[#8B8FA8]'} />
                      <span className="capitalize">{opt.label}</span>
                    </button>
                  )
                })}
              </div>

              {contentType === 'publicidad' ? (
                /* PUBLICIDADES (FLYER TEMPLATES ASOCIADAS A MODELOS) */
                <div className="flex flex-col gap-3">
                  {/* Publicidades Horizontal Scroll Row */}
                  <div className="flex items-center gap-3 overflow-x-auto py-1 custom-scrollbar">
                    {availablePublicidades.map((pub) => {
                      const isSelected = selectedPublicidadId === pub.id

                      return (
                        <div
                          key={pub.id}
                          onClick={() => handleSelectPublicidad(pub)}
                          className={`relative w-48 h-32 rounded-xl flex-shrink-0 overflow-hidden cursor-pointer group transition-all border flex flex-col justify-between p-2.5 ${
                            isSelected
                              ? 'ring-2 shadow-lg scale-[1.02]'
                              : 'border-[#1F2337] bg-[#0E121B] opacity-80 hover:opacity-100 hover:border-[#334155]'
                          }`}
                          style={isSelected ? {
                            borderColor: activeMeta.color || '#38BDF8',
                            boxShadow: `0 0 15px ${activeMeta.color || '#38BDF8'}30`,
                            backgroundColor: '#141A28'
                          } : undefined}>
                          
                          {/* Background thumbnail */}
                          {pub.imageUrl && (
                            <img
                              src={pub.imageUrl}
                              alt={pub.name}
                              className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 pointer-events-none group-hover:scale-105 transition-all"
                              onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none' }}
                            />
                          )}

                          {/* Top row: Checkbox + Badges & Actions */}
                          <div className="relative z-10 flex items-center justify-between w-full">
                            <div className="flex items-center gap-1.5">
                              <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                                  isSelected ? 'font-black' : 'bg-black/60 text-white/40 border border-white/20'
                                }`}
                                style={isSelected ? {
                                  background: activeMeta.bg || '#38BDF8',
                                  color: targetPlatform === 'MELI' ? '#000000' : '#FFFFFF'
                                } : undefined}>
                                {isSelected ? <Check size={13} strokeWidth={3} /> : null}
                              </div>
                              {pub.only0km && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#FACC15] text-black shadow-sm">
                                  0KM
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditModelAssociation(pub)
                                }}
                                title="Editar modelo asociado (aplica a todas las versiones)"
                                className="p-1 rounded bg-black/70 hover:bg-[#38BDF8] text-white hover:text-black transition-colors opacity-0 group-hover:opacity-100">
                                <Edit2 size={11} />
                              </button>
                              {!pub.isDefault && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeletePublicidad(pub.id)
                                  }}
                                  title="Eliminar publicidad"
                                  className="p-1 rounded bg-black/70 hover:bg-[#EF4444] text-white transition-colors opacity-0 group-hover:opacity-100">
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {/* Add New Publicidad Card */}
                    <div
                      onClick={() => {
                        setNewPubName(`Publicidad ${vehicle?.Marca || ''} ${vehicle?.Modelo || ''}`.trim())
                        setNewPubModel(vehicle?.Modelo || '')
                        setNewPubBrand(vehicle?.Marca || '')
                        setNewPubImage('')
                        setNewPubOnly0km(false)
                        setShowUploadModal(true)
                      }}
                      className="w-36 h-32 rounded-xl flex-shrink-0 border-2 border-dashed border-[#2A334B] hover:border-[#38BDF8] bg-[#0E121B]/50 hover:bg-[#141A28] flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-[#8B8FA8] hover:text-[#38BDF8] group">
                      <Plus size={22} className="group-hover:scale-110 transition-transform text-[#38BDF8]" />
                      <span className="text-[11px] font-bold text-center leading-tight">Cargar nueva<br/>publicidad</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* REGULAR PHOTOS SELECTION FOR FOTOS / REEL / VIDEO */
                <>
                  {/* Photos Horizontal Scroll Row */}
                  <div className="flex items-center gap-3 overflow-x-auto py-1 custom-scrollbar">
                    {allPhotos.map((url, idx) => {
                      const isSelected = selectedPhotos.includes(url)
                      const isPortada = idx === 0

                      return (
                        <div
                          key={url}
                          onClick={() => togglePhoto(url)}
                          className={`relative w-32 h-22 sm:w-36 sm:h-24 rounded-xl flex-shrink-0 overflow-hidden cursor-pointer group transition-all border ${
                            isSelected
                              ? 'shadow-md ring-2'
                              : 'border-[#1F2337] opacity-40 hover:opacity-100 hover:scale-[1.02]'
                          }`}
                          style={isSelected ? {
                            borderColor: activeMeta.color || '#22C55E',
                            boxShadow: `0 0 12px ${activeMeta.color || '#22C55E'}30`
                          } : undefined}>
                          <img
                            src={url}
                            alt={`Foto ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none' }}
                          />

                          {/* Selection Checkbox Overlay */}
                          <div
                            className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                              isSelected ? 'text-white shadow-sm' : 'bg-black/60 text-white/40 border border-white/30'
                            }`}
                            style={isSelected ? {
                              background: activeMeta.bg || '#22C55E',
                              color: targetPlatform === 'MELI' ? '#000' : '#fff'
                            } : undefined}>
                            {isSelected ? <Check size={13} strokeWidth={3} /> : null}
                          </div>

                          {/* Portada Badge */}
                          {isPortada && (
                            <span className="absolute bottom-1 left-1 text-[9px] font-black px-1.5 py-0.5 rounded bg-[#FACC15] text-black shadow-md flex items-center gap-1 border border-[#FACC15]">
                              <Star size={10} fill="currentColor" /> PORTADA
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {selectedPhotos.length === 0 && (
                    <p className="text-[11px] font-bold text-[#EF4444] bg-[#EF444410] p-1.5 rounded-lg border border-[#EF444430] text-center">
                      ⚠️ Tenés que seleccionar al menos 1 foto para publicar.
                    </p>
                  )}
                </>
              )}

              {/* INLINE REEL STUDIO (WHEN REEL OR VIDEO IS ACTIVE) */}
              {(contentType === 'reel' || contentType === 'video') && (
                <div className="mt-3 pt-4 border-t border-[#1F2337] w-full">
                  <VideoReelModal
                    ref={videoReelRef}
                    vehicle={getCustomizedVehicleObj()}
                    selectedPhotos={selectedPhotos}
                    platform={targetPlatform}
                    inline={true}
                    onClose={() => setContentType('fotos')}
                    onSuccess={() => onClose()}
                  />
                </div>
              )}

              {/* LIVE FLYER PREVIEW & PUBLICATION TEXT (WHEN PUBLICIDAD IS ACTIVE) */}
              {contentType === 'publicidad' && (
                <div className="mt-3 pt-4 border-t border-[#1F2337] w-full">
                  {currentPublicidad ? (
                    <AdFlyerPreview
                      ref={adFlyerRef}
                      vehicle={vehicle}
                      targetPlatform={targetPlatform}
                      templateImage={currentPublicidad.imageUrl}
                      customText={customText}
                      onCustomTextChange={handleCustomTextChange}
                      onCopyText={handleCopyText}
                      copiedText={copiedText}
                      templates={visibleTemplates}
                      selectedTemplateId={selectedTemplateId}
                      onSelectTemplate={handleSelectTemplate}
                      onSaveTemplate={handleSaveAsNewTemplate}
                      onDeleteTemplate={handleDeleteTemplate}
                      onInsertVariable={handleInsertVariable}
                    />
                  ) : (
                    <div className="py-12 px-6 rounded-2xl bg-[#0E121B]/60 border border-[#1F2337] flex flex-col items-center justify-center text-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-[#1F2337] flex items-center justify-center text-[#64748B]">
                        <Megaphone size={28} />
                      </div>
                      <div className="max-w-md">
                        <h4 className="text-sm font-bold text-white mb-1">
                          Sin publicidad asociada a {vehicle?.Marca} {vehicle?.Modelo}
                        </h4>
                        <p className="text-xs text-[#8B8FA8] leading-relaxed">
                          No hay ninguna plantilla publicitaria asociada a este modelo. Podés cargar una nueva plantilla para {vehicle?.Modelo || 'este modelo'}.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setNewPubName(`Publicidad ${vehicle?.Marca || ''} ${vehicle?.Modelo || ''}`.trim())
                            setNewPubModel(vehicle?.Modelo || '')
                            setNewPubBrand(vehicle?.Marca || '')
                            setNewPubImage('')
                            setNewPubOnly0km(false)
                            setShowUploadModal(true)
                          }}
                          className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md">
                          <Plus size={14} />
                          <span>Cargar Publicidad para {vehicle?.Modelo || 'este modelo'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Card 2: Plantillas System & Text Area (Shown for regular Photos view) */}
            {contentType === 'fotos' && (
              <div className="flex-1 flex flex-col gap-3 min-h-0 bg-[#13161F] p-4 sm:p-5 rounded-xl border border-[#1F2337] overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Templates Dropdown */}
                    <div className="relative inline-block">
                      <select
                        value={selectedTemplateId}
                        onChange={e => handleSelectTemplate(e.target.value)}
                        className="bg-[#0B0D13] border border-[#2A2F45] focus:border-[#FACC15] rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold text-[#FACC15] focus:outline-none cursor-pointer pr-9 appearance-none">
                        {visibleTemplates.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} {t.isDefault ? '(Por Defecto)' : ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={15} className="absolute right-3 top-3 text-[#FACC15] pointer-events-none" />
                    </div>

                    {/* Botón para borrar la plantilla seleccionada */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteTemplate(selectedTemplateId, e)}
                      title="Borrar la plantilla seleccionada"
                      className="px-2.5 py-2 rounded-xl text-xs font-bold text-[#EF4444] bg-[#EF444415] hover:bg-[#EF444425] border border-[#EF444430] transition-colors cursor-pointer flex items-center gap-1.5">
                      <Trash2 size={14} />
                      <span className="hidden sm:inline">Borrar Plantilla</span>
                    </button>

                    {/* Botón rápido Texto Resumido si está en WhatsApp */}
                    {targetPlatform === 'WA' && (
                      <button
                        type="button"
                        onClick={() => setCustomText(compileWhatsAppStatusText(vehicle))}
                        title="Resetear texto al formato resumido estándar de WhatsApp"
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-[#1F2337] hover:bg-[#2A2F45] text-[#86EFAC] border border-[#25D36640] transition-colors cursor-pointer flex items-center gap-1.5">
                        <RefreshCw size={13} />
                        <span>Texto Resumido</span>
                      </button>
                    )}
                  </div>

                  {/* Action Toolbar */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Botón Generar con IA disponible en TODAS las plataformas */}
                    <button
                      type="button"
                      onClick={handleGenerateAICopy}
                      disabled={loadingAI}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-[#8B5CF620] hover:bg-[#8B5CF635] text-[#C4B5FD] border border-[#8B5CF640] transition-colors cursor-pointer flex items-center gap-1.5">
                      {loadingAI ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      <span>{loadingAI ? 'Pensando...' : 'Generar con IA'}</span>
                    </button>

                    {/* Guardar como Nueva Plantilla */}
                    <button
                      type="button"
                      onClick={handleSaveAsNewTemplate}
                      title="Guardar como una nueva plantilla separada con otro nombre"
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-[#1F2337] hover:bg-[#2A2F45] text-[#E8EAED] border border-[#2A2F45] transition-colors cursor-pointer flex items-center gap-1.5">
                      <Plus size={14} className="text-[#60A5FA]" />
                      <span>Nueva</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyText}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-[#1F2337] hover:bg-[#2A2F45] text-white border border-[#2A2F45] transition-colors cursor-pointer flex items-center gap-1.5">
                      {copiedText ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
                      <span>{copiedText ? '¡Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                {/* Variables dinámicas para insertar en la plantilla */}
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] pt-1 border-t border-[#1F2337]/60 flex-shrink-0">
                  <span className="text-[#8B8FA8] font-bold text-[10px] uppercase mr-1">Variables auto:</span>
                  {[
                    { tag: '{MARCA}', label: 'Marca' },
                    { tag: '{MODELO}', label: 'Modelo' },
                    { tag: '{VERSION}', label: 'Versión' },
                    { tag: '{AÑO}', label: 'Año' },
                    { tag: '{KM}', label: 'KM' },
                    { tag: '{PRECIO}', label: 'Precio' },
                    { tag: '{ENTREGA}', label: 'Anticipo' },
                    { tag: '{CUOTAS}', label: 'Cuotas' },
                    { tag: '{COMBUSTIBLE}', label: 'Combustible' },
                    { tag: '{TRANSMISION}', label: 'Transmisión' },
                    { tag: '{PATENTE}', label: 'Patente' },
                  ].map(vTag => (
                    <button
                      key={vTag.tag}
                      type="button"
                      onClick={() => handleInsertVariable(vTag.tag)}
                      title={`Insertar ${vTag.tag} en el texto`}
                      className="px-2 py-0.5 rounded-md bg-[#0F1117] hover:bg-[#2563EB25] hover:text-[#60A5FA] border border-[#2A2F45] text-[#A0A5BD] font-mono text-[10px] transition-colors cursor-pointer">
                      + {vTag.label}
                    </button>
                  ))}
                </div>

                <textarea
                  ref={textareaRef}
                  className="w-full flex-1 bg-[#0B0D13] border border-[#1F2337] focus:border-[#FACC15] rounded-xl p-4 text-xs sm:text-sm text-[#E8EAED] leading-relaxed resize-none focus:outline-none transition-colors custom-scrollbar font-sans"
                  placeholder="Escribí o seleccioná una plantilla..."
                  value={customText}
                  onChange={e => handleCustomTextChange(e.target.value)}
                />
              </div>
            )}

          </div>

        </div>

        {/* Modal Action Footer */}
        <div
          className="px-6 py-4 border-t border-[#1F2337] flex items-center justify-between gap-4 flex-shrink-0"
          style={{ background: '#13161F' }}>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-[#8B8FA8] hover:bg-[#1E2130] hover:text-white transition-colors cursor-pointer">
            Cancelar
          </button>

          {targetPlatform === 'WA' ? (
            <div className="flex items-center gap-2 flex-1 max-w-2xl justify-end">
              <button
                type="button"
                onClick={() => window.open('https://web.whatsapp.com/', '_blank')}
                title="Abrir WhatsApp Web directamente"
                className="px-3.5 py-2.5 rounded-xl text-xs font-extrabold bg-[#1F2337] hover:bg-[#2A2F45] text-[#86EFAC] border border-[#25D36640] transition-colors cursor-pointer flex items-center gap-1.5">
                <ExternalLink size={14} />
                <span className="hidden sm:inline">WhatsApp Web</span>
              </button>

              <button
                type="button"
                onClick={() => window.open(`whatsapp://send?text=${encodeURIComponent(compileTemplate(customText, vehicle))}`, '_blank')}
                title="Abrir app WhatsApp en tu equipo"
                className="px-3.5 py-2.5 rounded-xl text-xs font-extrabold bg-[#1F2337] hover:bg-[#2A2F45] text-[#86EFAC] border border-[#25D36640] transition-colors cursor-pointer flex items-center gap-1.5">
                <MessageSquare size={14} />
                <span className="hidden sm:inline">WhatsApp App</span>
              </button>

              <button
                type="button"
                onClick={handleExecutePublish}
                disabled={loadingPlatform !== null || (contentType === 'publicidad' ? !currentPublicidad : selectedPhotos.length === 0)}
                className="btn-primary flex-1 py-3 px-6 rounded-xl text-xs sm:text-sm font-extrabold shadow-lg transition-all flex items-center justify-center gap-2 hover:scale-[1.01] cursor-pointer disabled:opacity-50"
                style={{
                  background: '#25D366',
                  color: '#FFFFFF',
                  border: 'none'
                }}>
                {loadingPlatform !== null ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Abriendo WhatsApp...</span>
                  </>
                ) : completedPlatform === 'WA' ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>¡WhatsApp Abierto con Éxito!</span>
                  </>
                ) : (
                  <>
                    <RocketIcon size={17} />
                    <span>
                      {contentType === 'publicidad'
                        ? (!currentPublicidad
                            ? `Sin publicidad asociada a ${vehicle?.Modelo || 'este modelo'}`
                            : 'Publicar Publicidad en WhatsApp Estado (1 foto)')
                        : contentType === 'reel'
                        ? `Publicar Reel en WhatsApp Estado (${selectedPhotos.length} ${selectedPhotos.length === 1 ? 'foto' : 'fotos'})`
                        : contentType === 'video'
                        ? `Publicar Video en WhatsApp Estado (${selectedPhotos.length} ${selectedPhotos.length === 1 ? 'foto' : 'fotos'})`
                        : `Publicar en WhatsApp Estado (${selectedPhotos.length} ${selectedPhotos.length === 1 ? 'foto' : 'fotos'})`
                      }
                    </span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleExecutePublish}
              disabled={loadingPlatform !== null || (contentType === 'publicidad' ? !currentPublicidad : selectedPhotos.length === 0)}
              className="btn-primary flex-1 max-w-lg py-3 rounded-xl text-xs sm:text-sm font-extrabold shadow-lg transition-all flex items-center justify-center gap-2 hover:scale-[1.01] cursor-pointer disabled:opacity-50"
              style={{
                background: activeMeta.bg,
                color: targetPlatform === 'MELI' ? '#000000' : '#FFFFFF',
                border: 'none'
              }}>
              {loadingPlatform !== null ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Publicando...</span>
                </>
              ) : completedPlatform === targetPlatform ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>¡Publicado con éxito!</span>
                </>
              ) : (
                <>
                  <RocketIcon size={17} />
                  <span>
                    {targetPlatform === 'FB_REEL' || targetPlatform === 'IG_REEL'
                      ? `Crear y Publicar ${activeMeta.name} (9:16)`
                      : contentType === 'publicidad'
                      ? (!currentPublicidad
                          ? `Sin publicidad asociada a ${vehicle?.Modelo || 'este modelo'}`
                          : `Publicar Publicidad en ${activeMeta.name} (1 foto)`)
                      : contentType === 'reel'
                      ? `Publicar Reel en ${activeMeta.name} (${selectedPhotos.length} ${selectedPhotos.length === 1 ? 'foto' : 'fotos'})`
                      : contentType === 'video'
                      ? `Publicar Video en ${activeMeta.name} (${selectedPhotos.length} ${selectedPhotos.length === 1 ? 'foto' : 'fotos'})`
                      : `Publicar en ${activeMeta.name} (${selectedPhotos.length} ${selectedPhotos.length === 1 ? 'foto' : 'fotos'})`
                    }
                  </span>
                </>
              )}
            </button>
          )}
        </div>

      </div>

      {/* Modal de Estudio de Reels y Video si se solicita */}
      {showReelStudio && (
        <VideoReelModal
          vehicle={getCustomizedVehicleObj()}
          platform={targetPlatform}
          onClose={() => {
            setShowReelStudio(false)
            setContentType('fotos')
          }}
          onSuccess={() => {
            setShowReelStudio(false)
            onClose()
          }}
        />
      )}

      {/* Modal para Cargar Nueva Publicidad Manualmente */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13161F] border border-[#2A334B] rounded-2xl w-full max-w-lg p-6 flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#1F2337] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#2563EB20] text-[#38BDF8] border border-[#2563EB40]">
                  <Megaphone size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Cargar Nueva Publicidad</h3>
                  <p className="text-xs text-[#8B8FA8]">Asocia una plantilla a un modelo para todas sus versiones</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 rounded-lg text-[#8B8FA8] hover:text-white hover:bg-[#1F2337] transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="block text-[#E8EAED] font-bold mb-1">
                  Modelo del Vehículo <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: S10, Hilux, Ranger, Cronos, Amarok"
                  value={newPubModel}
                  onChange={e => setNewPubModel(e.target.value)}
                  className="w-full bg-[#0B0D13] border border-[#2A334B] focus:border-[#38BDF8] rounded-xl px-3.5 py-2.5 text-white font-bold placeholder-[#64748B] focus:outline-none"
                />
                <p className="text-[11px] text-[#60A5FA] mt-1 font-medium">
                  💡 Aplica a todas las versiones de ese modelo (ej: LT, LTZ, High Country, V6, etc.)
                </p>
                <label className="flex items-center gap-2 cursor-pointer mt-2">
                  <input
                    type="checkbox"
                    checked={newPubOnly0km}
                    onChange={e => setNewPubOnly0km(e.target.checked)}
                    className="rounded text-[#38BDF8] focus:ring-[#38BDF8] cursor-pointer"
                  />
                  <span className="text-[#CBD5E1] text-[11px] font-medium">
                    Exclusiva para unidades 0KM (no mostrar en unidades usadas)
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#E8EAED] font-bold mb-1">Marca (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej: Chevrolet, Toyota, VW"
                    value={newPubBrand}
                    onChange={e => setNewPubBrand(e.target.value)}
                    className="w-full bg-[#0B0D13] border border-[#2A334B] focus:border-[#38BDF8] rounded-xl px-3.5 py-2.5 text-white placeholder-[#64748B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#E8EAED] font-bold mb-1">Nombre / Título</label>
                  <input
                    type="text"
                    placeholder="Ej: Publicidad Oficial S10"
                    value={newPubName}
                    onChange={e => setNewPubName(e.target.value)}
                    className="w-full bg-[#0B0D13] border border-[#2A334B] focus:border-[#38BDF8] rounded-xl px-3.5 py-2.5 text-white placeholder-[#64748B] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#E8EAED] font-bold mb-1">
                  Imagen de la Publicidad / Flyer <span className="text-[#EF4444]">*</span>
                </label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <label className="flex-1 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const reader = new FileReader()
                            reader.onload = (loadEvt) => {
                              if (loadEvt.target?.result) {
                                setNewPubImage(loadEvt.target.result as string)
                              }
                            }
                            reader.readAsDataURL(file)
                          }
                        }}
                        className="hidden"
                      />
                      <div className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-dashed border-[#38BDF8] bg-[#38BDF810] hover:bg-[#38BDF820] text-[#38BDF8] font-bold text-xs transition-colors">
                        <Upload size={15} />
                        <span>Subir imagen desde tu equipo</span>
                      </div>
                    </label>

                    <button
                      type="button"
                      onClick={() => setNewPubImage(currentPublicidad?.imageUrl || '/templates/plantilla_publicidad_okm.png?v=6')}
                      className="px-3 py-2.5 rounded-xl border border-[#2A334B] bg-[#1E2333] hover:bg-[#2A334B] text-[#94A3B8] hover:text-white text-xs font-bold transition-colors">
                      Usar plantilla base
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="O pegar URL directa de imagen..."
                    value={newPubImage}
                    onChange={e => setNewPubImage(e.target.value)}
                    className="w-full bg-[#0B0D13] border border-[#2A334B] focus:border-[#38BDF8] rounded-xl px-3.5 py-2 text-white text-[11px] placeholder-[#64748B] focus:outline-none font-mono"
                  />

                  {newPubImage && (
                    <div className="relative w-full h-28 rounded-xl overflow-hidden border border-[#2A334B] bg-black/40 flex items-center justify-center">
                      <img
                        src={newPubImage}
                        alt="Preview"
                        className="w-full h-full object-contain"
                        onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1F2337] mt-2">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#8B8FA8] hover:bg-[#1E2130] hover:text-white transition-colors">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveNewPublicidad}
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-500/20">
                <Check size={14} />
                <span>Guardar Publicidad</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal del Asistente de Publicidades */}
      {showAssistantModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13161F] border border-[#2A334B] rounded-2xl w-full max-w-md p-6 flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#1F2337] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#FACC1520] text-[#FACC15] border border-[#FACC1540]">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Asistente de Publicidades</h3>
                  <p className="text-xs text-[#8B8FA8]">Asociá plantillas a modelos mediante órdenes rápidas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAssistantModal(false)
                  setAssistantSuccessMsg(null)
                }}
                className="p-1.5 rounded-lg text-[#8B8FA8] hover:text-white hover:bg-[#1F2337] transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Podés pedirle al asistente que asocie la publicidad actual a cualquier modelo específico. La publicidad quedará vinculada para <strong className="text-white">todas las versiones</strong> de ese vehículo.
              </p>

              {/* Quick suggestions */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Órdenes sugeridas:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'asocia esta publicidad a las s10',
                    'asocia esta publicidad a las hilux',
                    'asocia esta publicidad a las ranger',
                    'asocia esta publicidad a las cronos',
                    'para amarok'
                  ].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => {
                        setAssistantPrompt(sug)
                        handleExecuteAssistant(sug)
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#1E2333] hover:bg-[#38BDF820] hover:text-[#38BDF8] border border-[#2A334B] hover:border-[#38BDF850] text-[11px] font-medium text-[#CBD5E1] transition-all text-left">
                      "{sug}"
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Input */}
              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-xs font-bold text-[#E8EAED]">Tu orden para el asistente:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Ej: asocia esta publicidad a las s10..."
                    value={assistantPrompt}
                    onChange={e => setAssistantPrompt(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleExecuteAssistant()
                      }
                    }}
                    className="flex-1 bg-[#0B0D13] border border-[#2A334B] focus:border-[#FACC15] rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-[#64748B] focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleExecuteAssistant()}
                    className="px-4 py-2.5 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-black text-xs font-black flex items-center gap-1.5 transition-all shadow-md">
                    <Sparkles size={14} />
                    <span>Ejecutar</span>
                  </button>
                </div>
              </div>

              {/* Success Message Banner */}
              {assistantSuccessMsg && (
                <div className="p-3 rounded-xl bg-[#22C55E20] border border-[#22C55E40] text-[#86EFAC] text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 size={16} className="text-[#22C55E] flex-shrink-0" />
                  <span>{assistantSuccessMsg}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-[#1F2337] mt-1">
              <button
                type="button"
                onClick={() => {
                  setShowAssistantModal(false)
                  setAssistantSuccessMsg(null)
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#8B8FA8] hover:bg-[#1E2130] hover:text-white transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}


function RocketIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.71.79-1.81.79-1.81" />
      <path d="M12 15l-3-3" />
      <path d="M15 12l-3-3" />
      <path d="M9 18l-6 3" />
      <path d="M21 3s-3.74.5-5 2c-.71.71-.79 1.81-.79 1.81L4 12.5a2.12 2.12 0 0 0-.27 2.76l.32.44a2.12 2.12 0 0 0 2.76.27l5.69-5.21s1.1.08 1.81-.79c1.5-1.26 2-5 2-5z" />
    </svg>
  )
}

