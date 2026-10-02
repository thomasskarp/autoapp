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
}

const DEFAULT_TEMPLATE_IMAGE = '/templates/plantilla_publicidad_okm.png?v=6'

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
  title: 'VOLKSWAGEN AMAROK',
  subtitle: 'COMFORTLINE AT 4X2',
  bannerText: 'ENTREGA INMEDIATA | FINANCIACION TASA 0%',
  card1Price: '$23.200.000',
  card1Sub: '+ 24 Cuotas de',
  card1Extra: '$420.000',
  card2Price: '$18.300.000',
  card2Sub: '+ 18 Cuotas de',
  card2Extra: '$720.000',
  card3Price: '$17.500.000',
  card3Sub: '+ 12 Cuotas de',
  card3Extra: '$3.050.000',
  card4Title: 'OFERTA CONTADO',
  card4Sub: '',
  card4Price: '$53.800.000',
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
  const model = (vehicle.Modelo || 'AMAROK').toUpperCase()
  const ver = (vehicle.Version || 'COMFORTLINE AT 4X2').toUpperCase()
  const anio = vehicle.Año ? `${vehicle.Año}` : ''
  const subtitle = anio && !ver.includes(anio) ? `${ver} (${anio})` : ver

  const rawPrice = vehicle.Precio_Venta ?? 53800000
  const pVenta = typeof rawPrice === 'number' && rawPrice > 0 ? rawPrice : 53800000

  // Si existe circular para este modelo/versión 0KM, usar las cuotas exactas de la circular
  const { circular } = vehicle ? getCircularForVehicle(vehicle) : { circular: null }
  const validRows = circular?.rows?.filter(r => r.maxFinanciar > 0 && r.cantCuotas > 0) || []

  let ant24 = Math.round((pVenta * 0.7) / 100000) * 100000
  let cuota24 = Math.round(((pVenta - ant24) / 24) / 10000) * 10000 || 420000
  let label24 = '+ 24 Cuotas de'

  let ant18 = Math.round((pVenta * 0.55) / 100000) * 100000
  let cuota18 = Math.round(((pVenta - ant18) / 18) / 10000) * 10000 || 720000
  let label18 = '+ 18 Cuotas de'

  let ant12 = Math.round((pVenta * 0.35) / 100000) * 100000
  let cuota12 = Math.round(((pVenta - ant12) / 12) / 10000) * 10000 || 3050000
  let label12 = '+ 12 Cuotas de'

  if (validRows.length >= 3) {
    const r1 = validRows[2] || validRows[validRows.length - 1]
    ant24 = calculateEntrega(pVenta, r1.maxFinanciar)
    cuota24 = r1.costoCuota
    label24 = `+ ${r1.cantCuotas} Cuotas de`

    const r2 = validRows[1] || validRows[0]
    ant18 = calculateEntrega(pVenta, r2.maxFinanciar)
    cuota18 = r2.costoCuota
    label18 = `+ ${r2.cantCuotas} Cuotas de`

    const r3 = validRows[0]
    ant12 = calculateEntrega(pVenta, r3.maxFinanciar)
    cuota12 = r3.costoCuota
    label12 = `+ ${r3.cantCuotas} Cuotas de`
  } else if (validRows.length > 0) {
    const r = validRows[0]
    ant18 = calculateEntrega(pVenta, r.maxFinanciar)
    cuota18 = r.costoCuota
    label18 = `+ ${r.cantCuotas} Cuotas de`
  }

  return {
    title: `${brand} ${model}`,
    subtitle,
    bannerText: 'ENTREGA INMEDIATA | FINANCIACION TASA 0%',
    card1Price: formatFlyerPrice(ant24),
    card1Sub: label24,
    card1Extra: formatFlyerPrice(cuota24),
    card2Price: formatFlyerPrice(ant18),
    card2Sub: label18,
    card2Extra: formatFlyerPrice(cuota18),
    card3Price: formatFlyerPrice(ant12),
    card3Sub: label12,
    card3Extra: formatFlyerPrice(cuota12),
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
    targetPlatform
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
    ox: number,
    oy: number,
    w: number,
    h: number,
    refW: number,
    refH: number
  ) => {
    const sx = w / refW
    const sy = h / refH

    // 1. Draw base template image
    ctx.drawImage(baseImg, ox, oy, w, h)

    // 2. Title Box (Canonical x: 28..543, y: 195..289, w: 515, h: 94)
    const titleLeft = ox + 28 * sx
    const titleTop = oy + 195 * sy
    const titleWidth = 515 * sx
    const titleHeight = 94 * sy

    const titleGrad = ctx.createLinearGradient(0, titleTop, 0, titleTop + titleHeight)
    titleGrad.addColorStop(0, '#091224')
    titleGrad.addColorStop(1, '#0D1B36')
    ctx.fillStyle = titleGrad
    ctx.fillRect(titleLeft, titleTop, titleWidth, titleHeight)

    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `900 ${Math.round(24 * sy)}px Montserrat, Inter, system-ui, sans-serif`
    ctx.fillText(fields.title.trim().toUpperCase(), ox + w / 2, titleTop + titleHeight * 0.38)

    ctx.fillStyle = '#899AB0'
    ctx.font = `700 ${Math.round(14 * sy)}px Montserrat, Inter, system-ui, sans-serif`
    ctx.fillText(fields.subtitle.trim().toUpperCase(), ox + w / 2, titleTop + titleHeight * 0.75)

    // 3. Banner Ribbon (Canonical x: 24..547, y: 572..619, w: 523, h: 47)
    const bLeft = ox + 24 * sx
    const bTop = oy + 572 * sy
    const bW = 523 * sx
    const bH = 47 * sy

    const bGrad = ctx.createLinearGradient(0, bTop, 0, bTop + bH)
    bGrad.addColorStop(0, '#E2E5EE')
    bGrad.addColorStop(1, '#CCD0DB')
    ctx.fillStyle = bGrad
    ctx.beginPath()
    ctx.roundRect(bLeft, bTop, bW, bH, 14 * sy)
    ctx.fill()
    ctx.lineWidth = Math.max(1, Math.round(1.2 * sy))
    ctx.strokeStyle = '#FFFFFF'
    ctx.stroke()

    ctx.fillStyle = '#1E222D'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `800 ${Math.round(17 * sy)}px Montserrat, Inter, system-ui, sans-serif`
    ctx.fillText(fields.bannerText.trim().toUpperCase(), ox + w / 2, bTop + bH / 2)

    // 4. Cards area mask (Canonical x: 5..566, y: 620..868)
    const maskGrad = ctx.createLinearGradient(0, oy + 620 * sy, 0, oy + 870 * sy)
    maskGrad.addColorStop(0, '#9396A9')
    maskGrad.addColorStop(0.5, '#A7A6B6')
    maskGrad.addColorStop(1, '#BAB9C7')
    ctx.fillStyle = maskGrad
    ctx.fillRect(ox + 5 * sx, oy + 620 * sy, 561 * sx, 248 * sy)

    // Helper to draw each promotional card
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

      // Left Orange Stripe
      const stripeW = Math.max(4, Math.round(6 * sx))
      ctx.fillStyle = '#C85A32'
      ctx.beginPath()
      ctx.roundRect(cx, cy, stripeW, ch, [8 * sy, 0, 0, 8 * sy])
      ctx.fill()

      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const centerX = cx + (cw + stripeW) / 2

      if (isContado) {
        // Line 1: OFERTA CONTADO
        ctx.fillStyle = '#1E222D'
        ctx.font = `800 ${Math.round(18 * sy)}px Montserrat, Inter, system-ui, sans-serif`
        ctx.fillText(line1.trim().toUpperCase(), centerX, cy + ch * 0.35)

        // Line 2: Precio Contado
        ctx.fillStyle = '#B85D38'
        ctx.font = `800 ${Math.round(24 * sy)}px Montserrat, Inter, system-ui, sans-serif`
        ctx.fillText((line3 || line2 || fields.card4Price).trim(), centerX, cy + ch * 0.70)
      } else {
        // Line 1: Anticipo
        ctx.fillStyle = '#B85D38'
        ctx.font = `800 ${Math.round(22 * sy)}px Montserrat, Inter, system-ui, sans-serif`
        ctx.fillText(line1.trim(), centerX, cy + ch * 0.24)

        // Line 2: Cuotas
        ctx.fillStyle = '#6B7280'
        ctx.font = `800 ${Math.round(15 * sy)}px Montserrat, Inter, system-ui, sans-serif`
        ctx.fillText(line2.trim(), centerX, cy + ch * 0.52)

        // Line 3: Precio cuota
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

    // Card 1 (Top-Left: 24 Cuotas)
    drawCard(col1X, row1Y, cardW, cardH, fields.card1Price, fields.card1Sub, fields.card1Extra, false)

    // Card 2 (Top-Right: 18 Cuotas)
    drawCard(col2X, row1Y, cardW, cardH, fields.card2Price, fields.card2Sub, fields.card2Extra, false)

    // Card 3 (Bottom-Left: 12 Cuotas)
    drawCard(col1X, row2Y, cardW, cardH, fields.card3Price, fields.card3Sub, fields.card3Extra, false)

    // Card 4 (Bottom-Right: Oferta Contado)
    drawCard(col2X, row2Y, cardW, cardH, fields.card4Title, '', fields.card4Price, true)
  }

  // Ultra HD canvas rendering for Download, Copy and Auto-Publishing (1080x1920 or 1200x1200)
  const generateCompositeBlob = async (targetFormat?: '9:16' | '1:1'): Promise<Blob> => {
    const chosenFormat = targetFormat || aspectRatio
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      let finished = false
      const onImageLoaded = () => {
        if (finished) return
        finished = true
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d', { willReadFrequently: false })
          if (!ctx) return reject(new Error('Canvas context not available'))

          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'

          const refW = 571
          const refH = 1024

          if (chosenFormat === '1:1') {
            // ========================================================
            // ULTRA HD 1:1 SQUARE FORMAT (1200 x 1200 px)
            // For: Facebook Marketplace, Mercado Libre, Instagram Feed, Facebook Feed
            // Ensures the entire flyer is visible without ANY cropping!
            // ========================================================
            const outW = 1200
            const outH = 1200
            canvas.width = outW
            canvas.height = outH

            // 1. Draw ambient studio background
            const bgGrad = ctx.createLinearGradient(0, 0, 0, outH)
            bgGrad.addColorStop(0, '#060f1e')
            bgGrad.addColorStop(0.22, '#0a172b')
            bgGrad.addColorStop(0.48, '#1b2d48')
            bgGrad.addColorStop(0.65, '#50647a')
            bgGrad.addColorStop(0.85, '#8598a8')
            bgGrad.addColorStop(1, '#b0b8c2')
            ctx.fillStyle = bgGrad
            ctx.fillRect(0, 0, outW, outH)

            // 2. Draw blurred ambient wings for realistic studio atmosphere
            ctx.save()
            ctx.filter = 'blur(30px) brightness(0.65)'
            ctx.drawImage(img, -100, -50, outW + 200, outH + 100)
            ctx.restore()

            // Subtle dark vignette on ambient wings
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

            // Central flyer subtle drop shadow
            ctx.save()
            ctx.shadowColor = 'rgba(0, 0, 0, 0.65)'
            ctx.shadowBlur = 45
            ctx.shadowOffsetX = 0
            ctx.shadowOffsetY = 0
            ctx.fillStyle = '#08172c'
            ctx.fillRect(offsetX, offsetY, flyerW, flyerH)
            ctx.restore()

            // Render flyer elements inside (offsetX, offsetY, flyerW, flyerH)
            renderFlyerContent(ctx, img, offsetX, offsetY, flyerW, flyerH, refW, refH)
          } else {
            // ========================================================
            // ULTRA HD 9:16 VERTICAL FORMAT (1080 x 1920 px)
            // For: Instagram Story, TikTok, WhatsApp Status, Reels
            // Exact native Full HD / 2K mobile aspect ratio
            // ========================================================
            const outW = 1080
            const outH = 1920
            canvas.width = outW
            canvas.height = outH

            renderFlyerContent(ctx, img, 0, 0, outW, outH, refW, refH)
          }

          canvas.toBlob((blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Failed to create blob'))
          }, 'image/png')
        } catch (err) {
          reject(err)
        }
      }

      img.onload = onImageLoaded
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = templateImage
      if (img.complete && img.naturalWidth > 0) {
        onImageLoaded()
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

  // Shared in-place editable inputs overlay for flyer (pixel-perfect in both 9:16 and 1:1)
  const renderOverlayInputs = () => (
    <>
      {/* 1. CAJA TÍTULO Y VERSIÓN */}
      <div
        className="absolute z-10 flex flex-col items-center justify-center px-1.5 py-0.5 rounded-lg border border-transparent hover:border-[#60A5FA60] focus-within:border-[#60A5FA] focus-within:ring-1 focus-within:ring-[#60A5FA50] transition-all"
        style={{
          top: '19.0%',
          left: '4.9%',
          width: '90.2%',
          height: '9.2%',
          background: 'linear-gradient(180deg, #091224 0%, #0D1B36 100%)'
        }}>
        <input
          type="text"
          value={fields.title}
          onChange={e => handleFieldChange('title', e.target.value)}
          placeholder="VOLKSWAGEN AMAROK"
          title="Hacé clic para escribir la Marca y Modelo"
          className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-white/10 rounded text-white font-extrabold uppercase text-[12px] leading-tight tracking-wide font-sans cursor-text hover:bg-white/5 transition-colors p-0 m-0"
        />
        <input
          type="text"
          value={fields.subtitle}
          onChange={e => handleFieldChange('subtitle', e.target.value)}
          placeholder="COMFORTLINE AT 4X2"
          title="Hacé clic para escribir la Versión y Año"
          className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-white/10 rounded text-[#899AB0] font-bold uppercase text-[8.5px] leading-tight tracking-wider font-sans cursor-text hover:bg-white/5 transition-colors p-0 m-0 mt-0.5"
        />
      </div>

      {/* 2. CAJA CINTA CENTRAL */}
      <div
        className="absolute z-10 flex items-center justify-center px-2 rounded-full border border-white/70 shadow-[0_1px_4px_rgba(0,0,0,0.12)] hover:border-[#60A5FA60] focus-within:border-[#60A5FA] focus-within:ring-1 focus-within:ring-[#60A5FA50] transition-all"
        style={{
          top: '55.9%',
          left: '4.2%',
          width: '91.6%',
          height: '4.6%',
          background: 'linear-gradient(180deg, #E2E5EE 0%, #CCD0DB 100%)'
        }}>
        <input
          type="text"
          value={fields.bannerText}
          onChange={e => handleFieldChange('bannerText', e.target.value)}
          placeholder="ENTREGA INMEDIATA | FINANCIACION TASA 0%"
          title="Hacé clic para modificar el texto de la cinta"
          className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/10 rounded-full text-[#1E222D] font-black uppercase text-[10.5px] tracking-tight leading-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0"
        />
      </div>

      {/* MÁSCARA DE FONDO: Elimina por completo los cuadros viejos */}
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

      {/* 3. CAJA TARJETA 1 - 24 CUOTAS */}
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
          onBlur={e => handleFieldChange('card1Price', e.target.value.trim())}
          placeholder="$23.200.000"
          title="Hacé clic para editar el anticipo"
          className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/5 rounded text-[#B85D38] font-black text-[12.5px] leading-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0"
        />
        <input
          type="text"
          value={fields.card1Sub}
          onChange={e => handleFieldChange('card1Sub', e.target.value)}
          onBlur={e => handleFieldChange('card1Sub', e.target.value.trim())}
          placeholder="+ 24 Cuotas de"
          title="Hacé clic para editar las cuotas"
          className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/5 rounded text-[#6B7280] font-black text-[10.5px] leading-tight tracking-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0"
        />
        <input
          type="text"
          value={fields.card1Extra}
          onChange={e => handleFieldChange('card1Extra', e.target.value)}
          onBlur={e => handleFieldChange('card1Extra', e.target.value.trim())}
          placeholder="$420.000"
          title="Hacé clic para editar el precio de la cuota"
          className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/5 rounded text-[#0B0D13] font-black text-[12.5px] leading-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0"
        />
      </div>

      {/* 4. CAJA TARJETA 2 - 18 CUOTAS */}
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
          onBlur={e => handleFieldChange('card2Price', e.target.value.trim())}
          placeholder="$18.300.000"
          title="Hacé clic para editar el anticipo"
          className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/5 rounded text-[#B85D38] font-black text-[12.5px] leading-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0"
        />
        <input
          type="text"
          value={fields.card2Sub}
          onChange={e => handleFieldChange('card2Sub', e.target.value)}
          onBlur={e => handleFieldChange('card2Sub', e.target.value.trim())}
          placeholder="+ 18 Cuotas de"
          title="Hacé clic para editar las cuotas"
          className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/5 rounded text-[#6B7280] font-black text-[10.5px] leading-tight tracking-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0"
        />
        <input
          type="text"
          value={fields.card2Extra}
          onChange={e => handleFieldChange('card2Extra', e.target.value)}
          onBlur={e => handleFieldChange('card2Extra', e.target.value.trim())}
          placeholder="$720.000"
          title="Hacé clic para editar el precio de la cuota"
          className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/5 rounded text-[#0B0D13] font-black text-[12.5px] leading-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0"
        />
      </div>

      {/* 5. CAJA TARJETA 3 - 12 CUOTAS */}
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
          onBlur={e => handleFieldChange('card3Price', e.target.value.trim())}
          placeholder="$17.500.000"
          title="Hacé clic para editar el anticipo"
          className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/5 rounded text-[#B85D38] font-black text-[12.5px] leading-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0"
        />
        <input
          type="text"
          value={fields.card3Sub}
          onChange={e => handleFieldChange('card3Sub', e.target.value)}
          onBlur={e => handleFieldChange('card3Sub', e.target.value.trim())}
          placeholder="+ 12 Cuotas de"
          title="Hacé clic para editar las cuotas"
          className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/5 rounded text-[#6B7280] font-black text-[10.5px] leading-tight tracking-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0"
        />
        <input
          type="text"
          value={fields.card3Extra}
          onChange={e => handleFieldChange('card3Extra', e.target.value)}
          onBlur={e => handleFieldChange('card3Extra', e.target.value.trim())}
          placeholder="$3.050.000"
          title="Hacé clic para editar el precio de la cuota"
          className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/5 rounded text-[#0B0D13] font-black text-[12.5px] leading-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0"
        />
      </div>

      {/* 6. CAJA TARJETA 4 - OFERTA DE CONTADO */}
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
          onBlur={e => handleFieldChange('card4Title', e.target.value.trim())}
          placeholder="OFERTA CONTADO"
          title="Hacé clic para editar el título de oferta"
          className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/5 rounded text-[#0B0D13] font-black uppercase text-[11px] tracking-tight leading-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0"
        />
        <input
          type="text"
          value={fields.card4Price}
          onChange={e => handleFieldChange('card4Price', e.target.value)}
          onBlur={e => handleFieldChange('card4Price', e.target.value.trim())}
          placeholder="$53.800.000"
          title="Hacé clic para editar el precio de contado"
          className="w-full text-center bg-transparent border-0 focus:outline-none focus:bg-black/5 rounded text-[#B85D38] font-black text-[13.5px] leading-tight font-sans cursor-text hover:bg-black/5 transition-colors p-0 m-0"
        />
      </div>

      {isCustom && (
        <span className="absolute top-2.5 right-2.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-[#2563EB] text-white shadow-md border border-white/20">
          Personalizada
        </span>
      )}
    </>
  )

  return (
    <div className="flex flex-col lg:flex-row items-stretch justify-center gap-5 w-full py-1">
      
      {/* LEFT: FLYER DISPLAY WITH PIXEL-PERFECT IN-PLACE EDITABLE BOXES */}
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
              src={templateImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-xl scale-125 opacity-50 pointer-events-none select-none"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#040A14E8] via-black/25 to-[#040A14E8] pointer-events-none select-none" />

            {/* Central Flyer Wrapper */}
            <div
              className="relative h-full mx-auto shadow-[0_10px_35px_rgba(0,0,0,0.7)] border-x border-white/10 bg-[#070E1A] overflow-hidden"
              style={{ aspectRatio: '571 / 1024', height: '100%' }}>
              
              {/* Base Background Image */}
              <img
                src={templateImage}
                alt="Plantilla Publicidad Okmmotors"
                className="w-full h-full object-contain pointer-events-none select-none"
              />

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
            
            {/* Base Background Image */}
            <img
              src={templateImage}
              alt="Plantilla Publicidad Okmmotors"
              className="w-full h-full object-contain pointer-events-none select-none"
              style={{ width: '280px', height: '502px' }}
            />

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
