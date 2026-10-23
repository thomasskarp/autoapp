'use client'

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import {
  Download, Copy, CheckCircle2, Upload, RefreshCw,
  Loader2, ChevronDown, Trash2, Plus, Check
} from 'lucide-react'
import { Vehicle } from '@/lib/supabase/types'
import { CopyTemplate } from './publish-modal'
import { formatPrice } from '@/lib/utils'
import { getCircularForVehicle, calculateEntrega } from '@/lib/services/circular-service'

export interface AdFlyerPreviewHandle {
  generateCompositeBlob: (format?: '9:16' | '1:1') => Promise<Blob>
}

interface Props {
  vehicle?: Vehicle | null
  carPhotoUrl?: string | null
  templateImage?: string
  customText: string
  onCustomTextChange: (newVal: string) => void
  onCopyText?: () => void
  copiedText?: boolean
  onGenerateAI?: () => void
  loadingAI?: boolean
  templates?: CopyTemplate[]
  selectedTemplateId?: string
  onSelectTemplate?: (id: string) => void
  onSaveTemplate?: () => void
  onUpdateTemplate?: () => void
  updatedTemplateSuccess?: boolean
  onDeleteTemplate?: (id: string) => void
  onInsertVariable?: (tag: string) => void
  targetPlatform?: string | null
  onlyPreview?: boolean
}

const DEFAULT_TEMPLATE_IMAGE = '/templates/plantilla_universal_clean.png'

interface TemplateFields {
  // Title box (media_1790630237346.png)
  title: string
  subtitle: string

  // Banner ribbon (media_1790630244202.png)
  bannerText: string

  // Card 1 (media_1790630250127.png)
  card1Price: string
  card1Sub: string
  card1Extra: string

  // Card 2 (media_1790630254467.png)
  card2Price: string
  card2Sub: string
  card2Extra: string

  // Card 3 (media_1790630259072.png)
  card3Price: string
  card3Sub: string
  card3Extra: string

  // Card 4 (Oferta contado)
  card4Title: string
  card4Sub?: string
  card4Price: string
  card4Extra: string
}

const DEFAULT_FIELDS: TemplateFields = {
  title: 'VOLKSWAGEN TAOS',
  subtitle: 'HIGHLINE 1.4 TSI AT / 0KM 2026',
  bannerText: 'ENTREGA INMEDIATA | FINANCIACION TASA 0%',
  card1Price: '$58.500.000',
  card1Sub: 'FINALES',
  card1Extra: '',
  card2Price: '$13.500.000',
  card2Sub: 'en 18 cuotas de $750.000',
  card2Extra: '',
  card3Price: '',
  card3Sub: '',
  card3Extra: '',
  card4Title: 'OFERTA CONTADO',
  card4Sub: '',
  card4Price: '$58.500.000',
  card4Extra: ''
}

// Helper to format currency for the flyer matching exact visual spec (no space after $, dot thousand separator)
export function formatFlyerPrice(val?: number | null): string {
  if (val == null || isNaN(val)) return '$0'
  return `$${Math.round(val).toLocaleString('es-AR')}`
}

function buildFlyerFields(vehicle?: Vehicle | null): TemplateFields {
  if (!vehicle) return DEFAULT_FIELDS

  const brand = (vehicle.Marca || 'VOLKSWAGEN').toUpperCase()
  const model = (vehicle.Modelo || 'TAOS').toUpperCase()
  const ver = (vehicle.Version || '').toUpperCase()
  const is0km = vehicle.is_okm_table === true || Number(vehicle.Km) === 0 || (vehicle.Tipo_Vehiculo || '').toLowerCase().includes('0km')
  const anio = vehicle.Año ? `${vehicle.Año}` : (is0km ? '2026' : '')
  const estadoKm = is0km ? `0KM ${anio}`.trim() : `${(vehicle.Km ?? 0).toLocaleString('es-AR')} KM ${anio}`.trim()
  const subtitle = ver ? (estadoKm ? `${ver} / ${estadoKm}` : ver) : estadoKm

  const rawPrice = vehicle.Precio_Venta ?? 58500000
  const pVenta = typeof rawPrice === 'number' && rawPrice > 0 ? rawPrice : 58500000

  // Consultar circular del vehículo si existe
  const { circular } = vehicle ? getCircularForVehicle(vehicle) : { circular: null }
  const validRows = circular?.rows?.filter(r => r.maxFinanciar > 0 && r.cantCuotas > 0) || []

  // Por defecto: Plan de 18 cuotas o cálculo inteligente proporcional
  let maxFinanciar = Math.round((pVenta * 0.5) / 100000) * 100000 || 13500000
  let cantCuotas = 18
  let costoCuota = Math.round((maxFinanciar / 18) / 10000) * 10000 || 750000

  if (validRows.length > 0) {
    const row18 = validRows.find(r => r.cantCuotas === 18) || validRows[Math.min(1, validRows.length - 1)]
    if (row18) {
      maxFinanciar = row18.maxFinanciar
      cantCuotas = row18.cantCuotas
      costoCuota = row18.costoCuota
    }
  }

  return {
    title: `${brand} ${model}`,
    subtitle,
    bannerText: 'ENTREGA INMEDIATA | FINANCIACION TASA 0%',
    card1Price: formatFlyerPrice(pVenta),
    card1Sub: 'FINALES',
    card1Extra: '',
    card2Price: formatFlyerPrice(maxFinanciar),
    card2Sub: `en ${cantCuotas} cuotas de ${formatFlyerPrice(costoCuota)}`,
    card2Extra: '',
    card3Price: '',
    card3Sub: '',
    card3Extra: '',
    card4Title: 'OFERTA CONTADO',
    card4Sub: '',
    card4Price: formatFlyerPrice(pVenta),
    card4Extra: ''
  }
}

export const AdFlyerPreview = forwardRef<AdFlyerPreviewHandle, Props>(function AdFlyerPreview(props, ref) {
  const {
    vehicle,
    customText,
    onCustomTextChange,
    onCopyText,
    copiedText,
    onGenerateAI,
    loadingAI,
    templates = [],
    selectedTemplateId,
    onSelectTemplate,
    onSaveTemplate,
    onUpdateTemplate,
    updatedTemplateSuccess,
    onDeleteTemplate,
    onInsertVariable,
    targetPlatform,
    onlyPreview
  } = props
  const [templateImage, setTemplateImage] = useState<string>(props.templateImage || DEFAULT_TEMPLATE_IMAGE)
  const [copiedImage, setCopiedImage] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1'>('9:16')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Always synchronize format to 9:16 for all platforms (Marketplace, Stories, Reels, Feed, etc.)
  useEffect(() => {
    setAspectRatio('9:16')
  }, [targetPlatform])

  // Update templateImage if prop changes
  useEffect(() => {
    if (props.templateImage) {
      setTemplateImage(props.templateImage)
    }
  }, [props.templateImage])

  // In-place editable fields on the flyer
  const [fields, setFields] = useState<TemplateFields>(() => buildFlyerFields(vehicle))

  // Update fields if vehicle prop changes
  useEffect(() => {
    if (vehicle) {
      setFields(buildFlyerFields(vehicle))
    }
  }, [vehicle?.ID, vehicle?.Precio_Venta, vehicle?.Marca, vehicle?.Modelo, vehicle?.Version])

  // Load custom template from localStorage if previously uploaded and no prop provided
  useEffect(() => {
    if (props.templateImage) return
    try {
      const saved = localStorage.getItem('autoapp_custom_ad_template_image')
      if (saved) setTemplateImage(saved)
    } catch (e) {
      console.warn('Error reading saved ad template:', e)
    }
  }, [props.templateImage])

  // Handle direct field change in flyer
  const handleFieldChange = (key: keyof TemplateFields, value: string) => {
    setFields(prev => ({ ...prev, [key]: value }))
  }

  // Autofill fields from current vehicle
  const handleAutofillFromVehicle = () => {
    if (!vehicle) return
    setFields(buildFlyerFields(vehicle))
  }

  // Reset back to original default values
  const handleResetToDefaultValues = () => {
    setFields(DEFAULT_FIELDS)
  }

  // Handle uploading custom template image
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      if (result) {
        setTemplateImage(result)
        try {
          localStorage.setItem('autoapp_custom_ad_template_image', result)
        } catch (err) {
          console.warn('Template too large for localStorage, kept in state:', err)
        }
      }
    }
    reader.readAsDataURL(file)
  }

  // Reset back to official default template image
  const handleResetToDefaultImage = () => {
    setTemplateImage(DEFAULT_TEMPLATE_IMAGE)
    try {
      localStorage.removeItem('autoapp_custom_ad_template_image')
    } catch (err) {
      console.warn('Error removing custom ad template:', err)
    }
  }

  // Render all graphic elements cleanly on any canvas context and scale
  const renderFlyerContent = (
    ctx: CanvasRenderingContext2D,
    baseImg: HTMLImageElement,
    carImg: HTMLImageElement | null,
    ox: number,
    oy: number,
    w: number,
    h: number,
    refW: number,
    refH: number
  ) => {
    const sx = w / refW
    const sy = h / refH

    // 1. Dibujar la plantilla oficial enviada por el usuario como lienzo base
    ctx.drawImage(baseImg, ox, oy, w, h)

    // 2. Si hay foto del vehículo, expandirla al ancho total del lienzo 9:16 (sin márgenes laterales) con difuminado suave fotográfico
    if (carImg && carImg.naturalWidth > 0) {
      ctx.save()

      // Ventana expandida al ancho total: de x: ox a ox + w (ancho total w, sin márgenes laterales)
      // Empieza detrás de la caja de título (175) y se extiende detrás de la cinta blanca inferior (685)
      const slotX = ox
      const slotY = oy + Math.round(175 * sy)
      const slotW = w
      const slotH = Math.round(510 * sy)

      const imgW = carImg.naturalWidth
      const imgH = carImg.naturalHeight
      const renderRatio = slotW / slotH
      const imgRatio = imgW / imgH

      // Cobertura completa del ancho total
      let sWidth = imgW
      let sHeight = imgH
      let sxCrop = 0
      let syCrop = 0

      if (imgRatio > renderRatio) {
        sWidth = Math.round(imgH * renderRatio)
        sxCrop = Math.round((imgW - sWidth) / 2)
      } else {
        sHeight = Math.round(imgW / renderRatio)
        syCrop = Math.round((imgH - sHeight) / 2)
      }

      // Renderizar con canvas auxiliar para máscara de opacidad fotográfica (fade to transparent)
      const offCanvas = document.createElement('canvas')
      offCanvas.width = slotW
      offCanvas.height = slotH
      const offCtx = offCanvas.getContext('2d')

      if (offCtx) {
        offCtx.drawImage(carImg, sxCrop, syCrop, sWidth, sHeight, 0, 0, slotW, slotH)

        offCtx.globalCompositeOperation = 'destination-in'
        const maskGrad = offCtx.createLinearGradient(0, 0, 0, slotH)
        maskGrad.addColorStop(0, 'rgba(0,0,0,0)')
        maskGrad.addColorStop(0.10, 'rgba(0,0,0,0.15)')
        maskGrad.addColorStop(0.24, 'rgba(0,0,0,0.60)')
        maskGrad.addColorStop(0.38, 'rgba(0,0,0,1)')
        maskGrad.addColorStop(0.68, 'rgba(0,0,0,1)')
        maskGrad.addColorStop(0.82, 'rgba(0,0,0,0.60)')
        maskGrad.addColorStop(0.94, 'rgba(0,0,0,0.15)')
        maskGrad.addColorStop(1, 'rgba(0,0,0,0)')
        offCtx.fillStyle = maskGrad
        offCtx.fillRect(0, 0, slotW, slotH)

        ctx.drawImage(offCanvas, slotX, slotY)
      } else {
        ctx.drawImage(carImg, sxCrop, syCrop, sWidth, sHeight, slotX, slotY, slotW, slotH)
      }

      ctx.restore()
    }

    // 2. Title Box (Canonical x: 28..543, y: 138..244, w: 515, h: 106, rx: 12)
    const titleLeft = ox + 28 * sx
    const titleTop = oy + 138 * sy
    const titleWidth = 515 * sx
    const titleHeight = 106 * sy

    ctx.save()
    const titleGrad = ctx.createLinearGradient(0, titleTop, 0, titleTop + titleHeight)
    titleGrad.addColorStop(0, '#0B172C')
    titleGrad.addColorStop(1, '#070F1D')
    ctx.fillStyle = titleGrad
    ctx.beginPath()
    ctx.roundRect(titleLeft, titleTop, titleWidth, titleHeight, 12 * sy)
    ctx.fill()
    ctx.lineWidth = Math.max(1, Math.round(1.2 * sy))
    ctx.strokeStyle = '#1E293B'
    ctx.stroke()

    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `900 ${Math.round(23 * sy)}px Montserrat, Inter, system-ui, sans-serif`
    ctx.fillText(fields.title.trim().toUpperCase(), ox + w / 2, titleTop + titleHeight * 0.40)

    ctx.fillStyle = '#8EA2B9'
    ctx.font = `700 ${Math.round(13 * sy)}px Montserrat, Inter, system-ui, sans-serif`
    ctx.fillText(fields.subtitle.trim().toUpperCase(), ox + w / 2, titleTop + titleHeight * 0.74)
    ctx.restore()

    // 3. Banner Ribbon (Canonical x: 24..547, y: 663..709, w: 523, h: 46, rx: 23)
    const bLeft = ox + 24 * sx
    const bTop = oy + 663 * sy
    const bW = 523 * sx
    const bH = 46 * sy

    ctx.save()
    const bGrad = ctx.createLinearGradient(0, bTop, 0, bTop + bH)
    bGrad.addColorStop(0, '#FFFFFF')
    bGrad.addColorStop(1, '#E5E7EB')
    ctx.fillStyle = bGrad
    ctx.beginPath()
    ctx.roundRect(bLeft, bTop, bW, bH, 23 * sy)
    ctx.fill()
    ctx.lineWidth = Math.max(1, Math.round(1.2 * sy))
    ctx.strokeStyle = '#FFFFFF'
    ctx.stroke()

    ctx.fillStyle = '#0F172A'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `900 ${Math.round(15 * sy)}px Montserrat, Inter, system-ui, sans-serif`
    ctx.fillText(fields.bannerText.trim().toUpperCase(), ox + w / 2, bTop + bH / 2)
    ctx.restore()

    // 4. Tarjetas promocionales (2 tarjetas full width o clásico 2x2)
    const isTwoCards = !fields.card3Price

    if (isTwoCards) {
      const drawFullWidthCard = (cy: number, ch: number, price: string, sub: string) => {
        const cx = ox + 15 * sx
        const cw = 541 * sx
        ctx.save()

        ctx.shadowColor = 'rgba(0, 0, 0, 0.25)'
        ctx.shadowBlur = 12 * sy
        ctx.shadowOffsetY = 4 * sy

        const cardGrad = ctx.createLinearGradient(cx, cy, cx, cy + ch)
        cardGrad.addColorStop(0, '#FFFFFF')
        cardGrad.addColorStop(1, '#F4F5F8')

        ctx.beginPath()
        ctx.roundRect(cx, cy, cw, ch, 12 * sy)
        ctx.fillStyle = cardGrad
        ctx.fill()
        ctx.shadowColor = 'transparent'

        ctx.lineWidth = Math.max(1, Math.round(1.2 * sy))
        ctx.strokeStyle = '#FFFFFF'
        ctx.stroke()

        // Franja naranja izquierda
        const stripeW = Math.max(8, Math.round(12 * sx))
        ctx.fillStyle = '#C2410C'
        ctx.beginPath()
        ctx.roundRect(cx, cy, stripeW, ch, [12 * sy, 0, 0, 12 * sy])
        ctx.fill()

        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const centerX = cx + (cw + stripeW) / 2

        ctx.fillStyle = '#C2410C'
        ctx.font = `900 ${Math.round(38 * sy)}px Montserrat, Inter, system-ui, sans-serif`
        ctx.fillText(price.trim(), centerX, cy + ch * 0.38)

        ctx.fillStyle = '#0F172A'
        ctx.font = `900 ${Math.round(23 * sy)}px Montserrat, Inter, system-ui, sans-serif`
        ctx.fillText(sub.trim(), centerX, cy + ch * 0.76)

        ctx.restore()
      }

      // Card 1 (Precio Final)
      drawFullWidthCard(oy + 720 * sy, 126 * sy, fields.card1Price, fields.card1Sub)

      // Card 2 (Financiación en Cuotas)
      drawFullWidthCard(oy + 860 * sy, 126 * sy, fields.card2Price, fields.card2Sub)
    } else {
      // 4 tarjetas cuadrícula clásica 2x2
      const drawCard = (
        cx: number,
        cy: number,
        cw: number,
        ch: number,
        line1: string,
        line2: string,
        line3: string,
        isContado: boolean
      ) => {
        ctx.save()
        const cardGrad = ctx.createLinearGradient(cx, cy, cx, cy + ch)
        cardGrad.addColorStop(0, '#FAFBFD')
        cardGrad.addColorStop(1, '#E2E6EE')

        ctx.beginPath()
        ctx.roundRect(cx, cy, cw, ch, 8 * sy)
        ctx.fillStyle = cardGrad
        ctx.fill()
        ctx.lineWidth = Math.max(1, Math.round(1.2 * sy))
        ctx.strokeStyle = '#FFFFFF'
        ctx.stroke()

        const stripeW = Math.max(4, Math.round(6 * sx))
        ctx.fillStyle = '#C85A32'
        ctx.beginPath()
        ctx.roundRect(cx, cy, stripeW, ch, [8 * sy, 0, 0, 8 * sy])
        ctx.fill()

        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const centerX = cx + (cw + stripeW) / 2

        if (isContado) {
          ctx.fillStyle = '#1E222D'
          ctx.font = `800 ${Math.round(18 * sy)}px Montserrat, Inter, system-ui, sans-serif`
          ctx.fillText(line1.trim().toUpperCase(), centerX, cy + ch * 0.35)

          ctx.fillStyle = '#B85D38'
          ctx.font = `800 ${Math.round(24 * sy)}px Montserrat, Inter, system-ui, sans-serif`
          ctx.fillText((line3 || line2 || fields.card4Price).trim(), centerX, cy + ch * 0.70)
        } else {
          ctx.fillStyle = '#B85D38'
          ctx.font = `800 ${Math.round(22 * sy)}px Montserrat, Inter, system-ui, sans-serif`
          ctx.fillText(line1.trim(), centerX, cy + ch * 0.24)

          ctx.fillStyle = '#6B7280'
          ctx.font = `800 ${Math.round(15 * sy)}px Montserrat, Inter, system-ui, sans-serif`
          ctx.fillText(line2.trim(), centerX, cy + ch * 0.52)

          ctx.fillStyle = '#0B0D13'
          ctx.font = `800 ${Math.round(22 * sy)}px Montserrat, Inter, system-ui, sans-serif`
          ctx.fillText(line3.trim(), centerX, cy + ch * 0.80)
        }
        ctx.restore()
      }

      const col1X = ox + 16 * sx
      const col2X = ox + 291 * sx
      const cardW = 264 * sx
      const cardH = 114 * sy
      const row1Y = oy + 631 * sy
      const row2Y = oy + 757 * sy

      drawCard(col1X, row1Y, cardW, cardH, fields.card1Price, fields.card1Sub, fields.card1Extra, false)
      drawCard(col2X, row1Y, cardW, cardH, fields.card2Price, fields.card2Sub, fields.card2Extra, false)
      drawCard(col1X, row2Y, cardW, cardH, fields.card3Price, fields.card3Sub, fields.card3Extra, false)
      drawCard(col2X, row2Y, cardW, cardH, fields.card4Title, '', fields.card4Price, true)
    }
  }

  // Ultra HD canvas rendering for Download, Copy and Auto-Publishing (1080x1920 or 1200x1200)
  const generateCompositeBlob = async (targetFormat?: '9:16' | '1:1'): Promise<Blob> => {
    const chosenFormat = targetFormat || aspectRatio
    const activeCarPhoto = props.carPhotoUrl || vehicle?.FOTO_PORTADA || (vehicle as any)?.Fotos?.[0] || (vehicle?.FOTOS_EXTRA ? vehicle.FOTOS_EXTRA.split(',')[0]?.trim() : null) || null

    const loadImage = async (src: string): Promise<HTMLImageElement | null> => {
      if (!src) return null

      // 1. Data URLs o Blob URLs se cargan directamente sin restricciones de CORS
      if (src.startsWith('data:') || src.startsWith('blob:')) {
        return new Promise((resolve) => {
          const i = new Image()
          i.onload = () => resolve(i)
          i.onerror = () => resolve(null)
          i.src = src
          if (i.complete && i.naturalWidth > 0) resolve(i)
        })
      }

      // 2. URLs relativas locales (ej: /templates/...)
      if (src.startsWith('/')) {
        return new Promise((resolve) => {
          const i = new Image()
          i.crossOrigin = 'anonymous'
          i.onload = () => resolve(i)
          i.onerror = () => resolve(null)
          i.src = src
          if (i.complete && i.naturalWidth > 0) resolve(i)
        })
      }

      // 3. URLs remotas (Google Drive, Supabase, Cloudinary, etc.):
      // Convertir a Blob URL local mediante proxy para eliminar errores de CORS y Canvas taint
      try {
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(src.trim())}`
        const res = await fetch(proxyUrl)
        if (res.ok) {
          const blob = await res.blob()
          const objectUrl = URL.createObjectURL(blob)
          return new Promise((resolve) => {
            const i = new Image()
            i.onload = () => resolve(i)
            i.onerror = () => resolve(null)
            i.src = objectUrl
            if (i.complete && i.naturalWidth > 0) resolve(i)
          })
        }
      } catch (err) {
        console.warn('[AdFlyerPreview] Proxy fetch failed for car photo, trying direct load:', err)
      }

      // 4. Fallback directo con crossOrigin
      return new Promise((resolve) => {
        const i = new Image()
        i.crossOrigin = 'anonymous'
        i.onload = () => resolve(i)
        i.onerror = () => resolve(null)
        i.src = src
        if (i.complete && i.naturalWidth > 0) resolve(i)
      })
    }

    const [img, carImg] = await Promise.all([
      loadImage(templateImage),
      activeCarPhoto ? loadImage(activeCarPhoto) : Promise.resolve(null)
    ])

    if (!img) throw new Error('No se pudo cargar la imagen de la plantilla')

    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { willReadFrequently: false })
        if (!ctx) return reject(new Error('Canvas context not available'))

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        const refW = 571
        const refH = 1024

        if (chosenFormat === '1:1') {
          // ULTRA HD 1:1 SQUARE FORMAT (1200 x 1200 px)
          const outW = 1200
          const outH = 1200
          canvas.width = outW
          canvas.height = outH

          // 1. Ambient studio background
          const bgGrad = ctx.createLinearGradient(0, 0, 0, outH)
          bgGrad.addColorStop(0, '#060f1e')
          bgGrad.addColorStop(0.22, '#0a172b')
          bgGrad.addColorStop(0.48, '#1b2d48')
          bgGrad.addColorStop(0.65, '#50647a')
          bgGrad.addColorStop(0.85, '#8598a8')
          bgGrad.addColorStop(1, '#b0b8c2')
          ctx.fillStyle = bgGrad
          ctx.fillRect(0, 0, outW, outH)

          // 2. Blurred ambient wings
          const ambientSource = carImg || img
          ctx.save()
          ctx.filter = 'blur(30px) brightness(0.65)'
          ctx.drawImage(ambientSource, -100, -50, outW + 200, outH + 100)
          ctx.restore()

          const sideVignette = ctx.createLinearGradient(0, 0, outW, 0)
          sideVignette.addColorStop(0, 'rgba(4, 10, 20, 0.88)')
          sideVignette.addColorStop(0.22, 'rgba(4, 10, 20, 0.45)')
          sideVignette.addColorStop(0.5, 'rgba(4, 10, 20, 0)')
          sideVignette.addColorStop(0.78, 'rgba(4, 10, 20, 0.45)')
          sideVignette.addColorStop(1, 'rgba(4, 10, 20, 0.88)')
          ctx.fillStyle = sideVignette
          ctx.fillRect(0, 0, outW, outH)

          // 3. Central Flyer dimensions
          const flyerH = 1200
          const flyerW = Math.round(flyerH * (refW / refH)) // ~669 px
          const offsetX = Math.round((outW - flyerW) / 2) // ~265 px
          const offsetY = 0

          ctx.save()
          ctx.shadowColor = 'rgba(0, 0, 0, 0.65)'
          ctx.shadowBlur = 45
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 0
          ctx.fillStyle = '#08172c'
          ctx.fillRect(offsetX, offsetY, flyerW, flyerH)
          ctx.restore()

          renderFlyerContent(ctx, img, carImg, offsetX, offsetY, flyerW, flyerH, refW, refH)
        } else {
          // ULTRA HD 9:16 VERTICAL FORMAT (1080 x 1920 px)
          const outW = 1080
          const outH = 1920
          canvas.width = outW
          canvas.height = outH

          renderFlyerContent(ctx, img, carImg, 0, 0, outW, outH, refW, refH)
        }

        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to create blob'))
        }, 'image/png')
      } catch (err) {
        reject(err)
      }
    })
  }

  useImperativeHandle(ref, () => ({
    generateCompositeBlob
  }))

  // Handle Download (Ultra HD in chosen format)
  const handleDownload = async () => {
    setDownloading(true)
    try {
      const blob = await generateCompositeBlob(aspectRatio)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeTitle = fields.title.replace(/\s+/g, '_') || 'Publicidad'
      const formatLabel = aspectRatio === '1:1' ? 'Marketplace_1x1' : 'Historia_9x16'
      a.download = `Publicidad_${safeTitle}_${formatLabel}_Okmmotors.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Error downloading:', e)
    } finally {
      setDownloading(false)
    }
  }

  // Handle Copy (Ultra HD in chosen format)
  const handleCopy = async () => {
    try {
      const blob = await generateCompositeBlob(aspectRatio)
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type || 'image/png']: blob })
      ])
      setCopiedImage(true)
      setTimeout(() => setCopiedImage(false), 2500)
    } catch (e) {
      console.warn('Error copying:', e)
    }
  }

  const isCustom = templateImage !== DEFAULT_TEMPLATE_IMAGE
  const carPhotoUrl = props.carPhotoUrl || vehicle?.FOTO_PORTADA || (vehicle as any)?.Fotos?.[0] || (vehicle?.FOTOS_EXTRA ? vehicle.FOTOS_EXTRA.split(',')[0]?.trim() : null) || null
  const isTwoCards = !fields.card3Price

  // Shared in-place editable inputs overlay for flyer (pixel-perfect in both 9:16 and 1:1)
  const renderOverlayInputs = () => (
    <>
      {/* 1. CAJA TÍTULO Y VERSIÓN */}
      <div
        className="absolute z-10 flex flex-col items-center justify-center px-1.5 py-0.5 rounded-xl border border-transparent hover:border-[#60A5FA60] focus-within:border-[#60A5FA] focus-within:ring-1 focus-within:ring-[#60A5FA50] transition-all shadow-md"
        style={{
          top: '13.5%',
          left: '4.9%',
          width: '90.2%',
          height: '10.3%',
          background: 'linear-gradient(180deg, #0B172C 0%, #070F1D 100%)'
        }}>
        <input
          type="text"
          value={fields.title}
          onChange={e => handleFieldChange('title', e.target.value)}
          placeholder="VOLKSWAGEN TAOS"
          title="Hacé clic para escribir la Marca y Modelo"
          className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-white/10 rounded text-white font-black uppercase text-[12px] sm:text-[13px] leading-tight tracking-wide font-sans cursor-text hover:bg-white/5 transition-colors p-0 m-0"
        />
        <input
          type="text"
          value={fields.subtitle}
          onChange={e => handleFieldChange('subtitle', e.target.value)}
          placeholder="HIGHLINE 1.4 TSI AT / 0KM 2026"
          title="Hacé clic para escribir la Versión y Año"
          className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-white/10 rounded text-[#8EA2B9] font-bold uppercase text-[8.5px] sm:text-[9.5px] leading-tight tracking-wider font-sans cursor-text hover:bg-white/5 transition-colors p-0 m-0 mt-0.5"
        />
      </div>

      {/* 2. CAJA CINTA CENTRAL */}
      <div
        className="absolute z-10 flex items-center justify-center px-2 rounded-full border border-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.18)] hover:border-[#60A5FA60] focus-within:border-[#60A5FA] focus-within:ring-1 focus-within:ring-[#60A5FA50] transition-all"
        style={{
          top: '64.8%',
          left: '4.2%',
          width: '91.6%',
          height: '4.5%',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #E5E7EB 100%)'
        }}>
        <input
          type="text"
          value={fields.bannerText}
          onChange={e => handleFieldChange('bannerText', e.target.value)}
          placeholder="ENTREGA INMEDIATA | FINANCIACION TASA 0%"
          title="Hacé clic para modificar el texto de la cinta"
          className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/10 rounded-full text-[#0F172A] font-black uppercase text-[9.5px] sm:text-[10.5px] tracking-tight leading-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0"
        />
      </div>

      {isTwoCards ? (
        /* ======================================================== */
        /* NUEVO DISEÑO UNIVERSAL: 2 TARJETAS APILADAS ANCHO COMPLETO */
        /* ======================================================== */
        <>
          {/* TARJETA 1 - PRECIO FINAL */}
          <div
            className="absolute z-10 flex flex-col justify-center items-center text-center overflow-hidden pl-3 pr-2 py-0.5 rounded-xl border border-white/90 shadow-[0_4px_12px_rgba(0,0,0,0.22)] hover:border-[#60A5FA] focus-within:border-[#60A5FA] focus-within:ring-2 focus-within:ring-[#60A5FA50] transition-all"
            style={{
              top: '70.3%',
              left: '2.6%',
              width: '94.8%',
              height: '12.3%',
              background: 'linear-gradient(180deg, #FFFFFF 0%, #F4F5F8 100%)'
            }}>
            <div className="absolute left-0 top-0 bottom-0 w-[5px] sm:w-[6px] bg-[#C2410C]" />
            <input
              type="text"
              value={fields.card1Price}
              onChange={e => handleFieldChange('card1Price', e.target.value)}
              placeholder="$58.500.000"
              title="Hacé clic para editar el precio contado final"
              className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/5 rounded text-[#C2410C] font-black text-[17px] sm:text-[19px] leading-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0"
            />
            <input
              type="text"
              value={fields.card1Sub}
              onChange={e => handleFieldChange('card1Sub', e.target.value)}
              placeholder="FINALES"
              title="Hacé clic para editar la leyenda (ej. FINALES)"
              className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/5 rounded text-[#1F2937] font-black uppercase text-[11px] sm:text-[12px] leading-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0 mt-0.5"
            />
          </div>

          {/* TARJETA 2 - FINANCIACIÓN EN CUOTAS */}
          <div
            className="absolute z-10 flex flex-col justify-center items-center text-center overflow-hidden pl-3 pr-2 py-0.5 rounded-xl border border-white/90 shadow-[0_4px_12px_rgba(0,0,0,0.22)] hover:border-[#60A5FA] focus-within:border-[#60A5FA] focus-within:ring-2 focus-within:ring-[#60A5FA50] transition-all"
            style={{
              top: '84.0%',
              left: '2.6%',
              width: '94.8%',
              height: '12.3%',
              background: 'linear-gradient(180deg, #FFFFFF 0%, #F4F5F8 100%)'
            }}>
            <div className="absolute left-0 top-0 bottom-0 w-[5px] sm:w-[6px] bg-[#C2410C]" />
            <input
              type="text"
              value={fields.card2Price}
              onChange={e => handleFieldChange('card2Price', e.target.value)}
              placeholder="$13.500.000"
              title="Hacé clic para editar el anticipo a financiar"
              className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/5 rounded text-[#C2410C] font-black text-[17px] sm:text-[19px] leading-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0"
            />
            <input
              type="text"
              value={fields.card2Sub}
              onChange={e => handleFieldChange('card2Sub', e.target.value)}
              placeholder="en 18 cuotas de $750.000"
              title="Hacé clic para editar la cuota y plazo"
              className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/5 rounded text-[#0F172A] font-black text-[11px] sm:text-[12px] leading-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0 mt-0.5"
            />
          </div>
        </>
      ) : (
        /* DISEÑO CLÁSICO: 4 TARJETAS 2x2 */
        <>
          <div
            className="absolute pointer-events-none z-[5]"
            style={{
              top: '60.5%',
              left: '1.0%',
              width: '98.0%',
              height: '24.2%',
              background: 'linear-gradient(180deg, #9396A9 0%, #A7A6B6 50%, #BAB9C7 100%)'
            }}
          />
          {/* Card 1 */}
          <div
            className="absolute z-10 flex flex-col justify-between items-center text-center overflow-hidden pl-[5px] pr-[2px] py-1 rounded-lg border border-white/80 shadow-[0_2px_6px_rgba(0,0,0,0.18)] hover:border-[#60A5FA] focus-within:border-[#60A5FA] focus-within:ring-1 focus-within:ring-[#60A5FA50] transition-all"
            style={{
              top: '61.2%',
              left: '1.8%',
              width: '47.4%',
              height: '11.5%',
              background: 'linear-gradient(180deg, #FAFBFD 0%, #E3E7EF 100%)'
            }}>
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#C85A32]" />
            <input
              type="text"
              value={fields.card1Price}
              onChange={e => handleFieldChange('card1Price', e.target.value)}
              placeholder="$23.200.000"
              className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/5 rounded text-[#B85D38] font-black text-[12.5px] leading-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0"
            />
            <input
              type="text"
              value={fields.card1Sub}
              onChange={e => handleFieldChange('card1Sub', e.target.value)}
              placeholder="+ 24 Cuotas de"
              className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/5 rounded text-[#6B7280] font-black text-[10.5px] leading-tight tracking-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0"
            />
            <input
              type="text"
              value={fields.card1Extra}
              onChange={e => handleFieldChange('card1Extra', e.target.value)}
              placeholder="$420.000"
              className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/5 rounded text-[#0B0D13] font-black text-[12.5px] leading-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0"
            />
          </div>

          {/* Card 2 */}
          <div
            className="absolute z-10 flex flex-col justify-between items-center text-center overflow-hidden pl-[5px] pr-[2px] py-1 rounded-lg border border-white/80 shadow-[0_2px_6px_rgba(0,0,0,0.18)] hover:border-[#60A5FA] focus-within:border-[#60A5FA] focus-within:ring-1 focus-within:ring-[#60A5FA50] transition-all"
            style={{
              top: '61.2%',
              left: '50.8%',
              width: '47.4%',
              height: '11.5%',
              background: 'linear-gradient(180deg, #FAFBFD 0%, #E3E7EF 100%)'
            }}>
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#C85A32]" />
            <input
              type="text"
              value={fields.card2Price}
              onChange={e => handleFieldChange('card2Price', e.target.value)}
              placeholder="$18.300.000"
              className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/5 rounded text-[#B85D38] font-black text-[12.5px] leading-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0"
            />
            <input
              type="text"
              value={fields.card2Sub}
              onChange={e => handleFieldChange('card2Sub', e.target.value)}
              placeholder="+ 18 Cuotas de"
              className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/5 rounded text-[#6B7280] font-black text-[10.5px] leading-tight tracking-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0"
            />
            <input
              type="text"
              value={fields.card2Extra}
              onChange={e => handleFieldChange('card2Extra', e.target.value)}
              placeholder="$720.000"
              className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/5 rounded text-[#0B0D13] font-black text-[12.5px] leading-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0"
            />
          </div>

          {/* Card 3 */}
          <div
            className="absolute z-10 flex flex-col justify-between items-center text-center overflow-hidden pl-[5px] pr-[2px] py-1 rounded-lg border border-white/80 shadow-[0_2px_6px_rgba(0,0,0,0.18)] hover:border-[#60A5FA] focus-within:border-[#60A5FA] focus-within:ring-1 focus-within:ring-[#60A5FA50] transition-all"
            style={{
              top: '73.2%',
              left: '1.8%',
              width: '47.4%',
              height: '11.5%',
              background: 'linear-gradient(180deg, #FAFBFD 0%, #E3E7EF 100%)'
            }}>
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#C85A32]" />
            <input
              type="text"
              value={fields.card3Price}
              onChange={e => handleFieldChange('card3Price', e.target.value)}
              placeholder="$17.500.000"
              className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/5 rounded text-[#B85D38] font-black text-[12.5px] leading-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0"
            />
            <input
              type="text"
              value={fields.card3Sub}
              onChange={e => handleFieldChange('card3Sub', e.target.value)}
              placeholder="+ 12 Cuotas de"
              className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/5 rounded text-[#6B7280] font-black text-[10.5px] leading-tight tracking-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0"
            />
            <input
              type="text"
              value={fields.card3Extra}
              onChange={e => handleFieldChange('card3Extra', e.target.value)}
              placeholder="$3.050.000"
              className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/5 rounded text-[#0B0D13] font-black text-[12.5px] leading-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0"
            />
          </div>

          {/* Card 4 */}
          <div
            className="absolute z-10 flex flex-col justify-center items-center text-center gap-1.5 overflow-hidden pl-[5px] pr-[2px] py-1 rounded-lg border border-white/80 shadow-[0_2px_6px_rgba(0,0,0,0.18)] hover:border-[#60A5FA] focus-within:border-[#60A5FA] focus-within:ring-1 focus-within:ring-[#60A5FA50] transition-all"
            style={{
              top: '73.2%',
              left: '50.8%',
              width: '47.4%',
              height: '11.5%',
              background: 'linear-gradient(180deg, #FAFBFD 0%, #E3E7EF 100%)'
            }}>
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#C85A32]" />
            <input
              type="text"
              value={fields.card4Title}
              onChange={e => handleFieldChange('card4Title', e.target.value)}
              placeholder="OFERTA CONTADO"
              className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/5 rounded text-[#0B0D13] font-black uppercase text-[11px] tracking-tight leading-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0"
            />
            <input
              type="text"
              value={fields.card4Price}
              onChange={e => handleFieldChange('card4Price', e.target.value)}
              placeholder="$53.800.000"
              className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/5 rounded text-[#B85D38] font-black text-[13.5px] leading-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0"
            />
          </div>
        </>
      )}

      {isCustom && (
        <span className="absolute top-2.5 right-2.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-[#2563EB] text-white shadow-md border border-white/20">
          Personalizada
        </span>
      )}
    </>
  )

  const flyerPreviewElement = (
    <div className="flex flex-col items-center gap-2 flex-shrink-0 mx-auto">
        
        {/* Dynamic Container according to Aspect Ratio */}
        {aspectRatio === '1:1' ? (
          /* ======================================================== */
          /* 1:1 SQUARE FLYER (MARKETPLACE, MELI, FEED)               */
          /* Fits complete uncropped flyer with matching ambient wings */
          /* ======================================================== */
          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-[#2A2F45] bg-[#060F1E] flex items-center justify-center transition-all hover:border-[#60A5FA50]"
            style={{ width: '320px', height: '320px' }}>
            
            {/* Blurred ambient background filling 1:1 square */}
            <img
              src={carPhotoUrl || templateImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-xl scale-125 opacity-50 pointer-events-none select-none"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#040A14E8] via-black/25 to-[#040A14E8] pointer-events-none select-none" />

            {/* Central Flyer Wrapper */}
            <div
              className="relative h-full mx-auto shadow-[0_10px_35px_rgba(0,0,0,0.7)] border-x border-white/10 bg-[#070E1A] overflow-hidden"
              style={{ aspectRatio: '571 / 1024', height: '100%' }}>
              
              {/* Base Template Image enviada por el usuario */}
              <img
                src={templateImage}
                alt="Plantilla Publicidad Okmmotors"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none z-0"
              />

              {/* Foto del auto expandida al ancho total 9:16 (sin márgenes laterales) con difuminado suave fotográfico */}
              {carPhotoUrl && (
                <div
                  className="absolute inset-x-0 z-[2] pointer-events-none select-none overflow-hidden"
                  style={{
                    top: '17.0%',
                    height: '50.0%',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.15) 10%, rgba(0,0,0,0.60) 24%, black 38%, black 68%, rgba(0,0,0,0.60) 82%, rgba(0,0,0,0.15) 94%, transparent 100%)',
                    maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.15) 10%, rgba(0,0,0,0.60) 24%, black 38%, black 68%, rgba(0,0,0,0.60) 82%, rgba(0,0,0,0.15) 94%, transparent 100%)'
                  }}>
                  <img
                    src={carPhotoUrl}
                    alt={fields.title}
                    className="w-full h-full object-cover object-center"
                  />
                </div>
              )}

              {/* In-place editable inputs overlay */}
              {renderOverlayInputs()}
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* 9:16 VERTICAL FLYER (STORIES, TIKTOK, WHATSAPP STATUS)   */
          /* Exact full-screen mobile format                          */
          /* ======================================================== */
          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-[#2A2F45] bg-[#070E1A] flex items-center justify-center transition-all hover:border-[#60A5FA50]"
            style={{ width: '280px', height: '502px' }}>
            
            {/* Base Template Image enviada por el usuario */}
            <img
              src={templateImage}
              alt="Plantilla Publicidad Okmmotors"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none z-0"
              style={{ width: '280px', height: '502px' }}
            />

            {/* Foto del auto expandida al ancho total 9:16 (sin márgenes laterales) con difuminado suave fotográfico */}
            {carPhotoUrl && (
              <div
                className="absolute inset-x-0 z-[2] pointer-events-none select-none overflow-hidden"
                style={{
                  top: '17.0%',
                  height: '50.0%',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.15) 10%, rgba(0,0,0,0.60) 24%, black 38%, black 68%, rgba(0,0,0,0.60) 82%, rgba(0,0,0,0.15) 94%, transparent 100%)',
                  maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.15) 10%, rgba(0,0,0,0.60) 24%, black 38%, black 68%, rgba(0,0,0,0.60) 82%, rgba(0,0,0,0.15) 94%, transparent 100%)'
                }}>
                <img
                  src={carPhotoUrl}
                  alt={fields.title}
                  className="w-full h-full object-cover object-center"
                />
              </div>
            )}

            {/* In-place editable inputs overlay */}
            {renderOverlayInputs()}
          </div>
        )}

        {/* Action Toolbar under flyer */}
        <div className="flex flex-col gap-2 w-full max-w-[320px]">
          <div className="flex items-center gap-1.5 w-full">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 py-2 px-2.5 rounded-xl text-xs font-black bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-lg transition-all flex items-center justify-center gap-1 cursor-pointer">
              {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              <span>{downloading ? 'Descargando...' : 'Descargar'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="py-2 px-2.5 rounded-xl text-xs font-black bg-[#1F2337] hover:bg-[#2A2F45] text-white border border-[#2A2F45] transition-all flex items-center justify-center gap-1 cursor-pointer">
              {copiedImage ? <CheckCircle2 size={13} className="text-green-400" /> : <Copy size={13} />}
              <span>{copiedImage ? '¡Copiado Ultra HD!' : 'Copiar'}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Cargar mi propia plantilla ya creada"
              className="py-2 px-2.5 rounded-xl text-xs font-black bg-[#1F2337] hover:bg-[#2A2F45] text-[#8B8FA8] hover:text-white border border-[#2A2F45] transition-all flex items-center justify-center gap-1 cursor-pointer">
              <Upload size={13} />
              <span>Subir</span>
            </button>

            {isCustom && (
              <button
                type="button"
                onClick={handleResetToDefaultImage}
                title="Restablecer a plantilla original de Okmmotors"
                className="p-2 rounded-xl text-xs font-black bg-[#1F2337] hover:bg-[#2A2F45] text-[#EF4444] border border-[#2A2F45] transition-all flex items-center justify-center cursor-pointer">
                <RefreshCw size={13} />
              </button>
            )}
          </div>



          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>
    )

  if (onlyPreview) {
    return flyerPreviewElement
  }

  return (
    <div className="flex flex-col lg:flex-row items-stretch justify-center gap-5 w-full py-1">
      {flyerPreviewElement}

      {/* RIGHT: CUADRO CON EL TEXTO PLANTILLA QUE IRÁ EN LA PUBLICACIÓN */}
      <div className="flex-1 flex flex-col gap-3 min-w-[320px] w-full bg-[#13161F] p-4 sm:p-5 rounded-xl border border-[#1F2337] h-[540px] overflow-hidden">
        
        {/* Top Header & Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Template Selector Dropdown */}
            {templates.length > 0 && onSelectTemplate && (
              <div className="relative inline-block">
                <select
                  value={selectedTemplateId}
                  onChange={e => onSelectTemplate(e.target.value)}
                  className="bg-[#0B0D13] border border-[#2A2F45] focus:border-[#FACC15] rounded-xl px-3 py-1.5 text-xs font-bold text-[#FACC15] focus:outline-none cursor-pointer pr-8 appearance-none">
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.isDefault ? '(Por Defecto)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-[#FACC15] pointer-events-none" />
              </div>
            )}

            {/* Borrar Plantilla */}
            {onDeleteTemplate && selectedTemplateId && (
              <button
                type="button"
                onClick={() => onDeleteTemplate(selectedTemplateId)}
                title="Borrar plantilla seleccionada"
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#EF4444] bg-[#EF444415] hover:bg-[#EF444425] border border-[#EF444430] transition-colors cursor-pointer flex items-center gap-1.5">
                <Trash2 size={13} />
                <span className="hidden sm:inline">Borrar</span>
              </button>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {onSaveTemplate && (
              <button
                type="button"
                onClick={onSaveTemplate}
                title="Guardar como una nueva plantilla separada"
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#1F2337] hover:bg-[#2A2F45] text-[#E8EAED] border border-[#2A2F45] transition-colors cursor-pointer flex items-center gap-1.5">
                <Plus size={13} className="text-[#60A5FA]" />
                <span className="hidden sm:inline">Nueva</span>
              </button>
            )}

            {onCopyText && (
              <button
                type="button"
                onClick={onCopyText}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#1F2337] hover:bg-[#2A2F45] text-white border border-[#2A2F45] transition-colors cursor-pointer flex items-center gap-1.5">
                {copiedText ? <CheckCircle2 size={13} className="text-green-400" /> : <Copy size={13} />}
                <span>{copiedText ? '¡Copiado!' : 'Copiar'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Variables dinámicas para la plantilla */}
        {onInsertVariable && (
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
              { tag: '{COMBUSTIBLE}', label: 'Combustible' },
              { tag: '{TRANSMISION}', label: 'Transmisión' },
              { tag: '{PATENTE}', label: 'Patente' },
            ].map(vTag => (
              <button
                key={vTag.tag}
                type="button"
                onClick={() => onInsertVariable(vTag.tag)}
                title={`Insertar ${vTag.tag} en el texto`}
                className="px-2 py-0.5 rounded-md bg-[#0F1117] hover:bg-[#2563EB25] hover:text-[#60A5FA] border border-[#2A2F45] text-[#A0A5BD] font-mono text-[10px] transition-colors cursor-pointer">
                + {vTag.label}
              </button>
            ))}
          </div>
        )}

        {/* Text Area for the actual post caption */}
        <textarea
          className="w-full flex-1 bg-[#0B0D13] border border-[#1F2337] focus:border-[#FACC15] rounded-xl p-4 text-xs sm:text-sm text-[#E8EAED] font-sans leading-relaxed resize-none focus:outline-none transition-colors custom-scrollbar"
          placeholder="Escribí o editá el texto comercial del vehículo que acompañará esta publicación..."
          value={customText}
          onChange={e => onCustomTextChange(e.target.value)}
        />

        {/* Bottom Status / Counter */}
        <div className="flex items-center justify-end text-[11px] text-[#8B8FA8] px-1 flex-shrink-0">
          <span>{customText.length} caracteres</span>
        </div>

      </div>

    </div>
  )
})
