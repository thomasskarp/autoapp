import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getCircularForVehicle } from '@/lib/services/circular-service'
import { formatFlyerPrice } from '@/components/stock/ad-flyer-preview'
import { isVehicle0km } from '@/components/stock/ad-template-utils'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { vehicleId, photoUrl, customFields, returnBase64 } = body

    let vehicle: any = null
    const supabase = createAdminClient()

    if (vehicleId) {
      const [uRes, oRes] = await Promise.all([
        supabase.from('DB_STOCK').select('*').eq('ID', vehicleId).maybeSingle(),
        supabase.from('DB_STOCK_OKM').select('*').eq('ID', vehicleId).maybeSingle()
      ])
      vehicle = uRes.data || oRes.data
    }

    // Determinar foto de fondo del vehículo
    const bgUrl = photoUrl || vehicle?.FOTO_PORTADA || (vehicle?.photoLinks && vehicle.photoLinks[0]) || null

    if (!bgUrl) {
      return NextResponse.json({ error: 'No se encontró foto para el vehículo' }, { status: 400 })
    }

    // Descargar imagen de fondo
    let bgBuffer: Buffer
    if (bgUrl.startsWith('data:')) {
      const base64Data = bgUrl.split(';base64,').pop() || ''
      bgBuffer = Buffer.from(base64Data, 'base64')
    } else {
      const fetchRes = await fetch(bgUrl)
      if (!fetchRes.ok) {
        return NextResponse.json({ error: 'No se pudo descargar la imagen del auto' }, { status: 400 })
      }
      bgBuffer = Buffer.from(await fetchRes.arrayBuffer())
    }

    const W = 571
    const H = 1024

    // Lienzo base de estudio oscuro 571x1024 (9:16)
    const baseCanvas = await sharp({
      create: {
        width: W,
        height: H,
        channels: 4,
        background: { r: 9, g: 17, b: 34, alpha: 1 }
      }
    }).png().toBuffer()

    // Redimensionar foto del auto con fit: 'contain' para que entre COMPLETO en la ventana central (y: 235..575, h: 340)
    const carResized = await sharp(bgBuffer)
      .resize(W, 340, { fit: 'contain', background: { r: 9, g: 17, b: 34, alpha: 0 } })
      .toBuffer()

    // Montar foto del auto centrada sobre el fondo oscuro
    const resizedBg = await sharp(baseCanvas)
      .composite([
        {
          input: carResized,
          top: 235,
          left: 0
        }
      ])
      .toBuffer()

    // Cargar logo Okmmotors
    let logoBase64 = ''
    try {
      const logoPath = path.join(process.cwd(), 'public', 'templates', 'okmmotors_oval_logo.png')
      logoBase64 = fs.readFileSync(logoPath).toString('base64')
    } catch (e) {
      console.warn('No se pudo cargar okmmotors_oval_logo.png:', e)
    }

    // Datos del vehículo
    const brand = (customFields?.brand || vehicle?.Marca || 'VOLKSWAGEN').toUpperCase()
    const model = (customFields?.model || vehicle?.Modelo || 'TAOS').toUpperCase()
    const ver = (customFields?.version || vehicle?.Version || '').toUpperCase()
    const is0km = vehicle ? isVehicle0km(vehicle) : true
    const anio = vehicle?.Año ? `${vehicle.Año}` : (is0km ? '2026' : '')
    const estadoKm = is0km ? `0KM ${anio}`.trim() : `${(vehicle?.Km ?? 0).toLocaleString('es-AR')} KM ${anio}`.trim()
    const subtitle = customFields?.subtitle || (ver ? (estadoKm ? `${ver} / ${estadoKm}` : ver) : estadoKm)

    const rawPrice = vehicle?.Precio_Venta ?? 58500000
    const pVenta = typeof rawPrice === 'number' && rawPrice > 0 ? rawPrice : 58500000

    const { circular } = vehicle ? getCircularForVehicle(vehicle) : { circular: null }
    const validRows = circular?.rows?.filter(r => r.maxFinanciar > 0 && r.cantCuotas > 0) || []

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

    const titleText = customFields?.title || `${brand} ${model}`
    const bannerText = customFields?.bannerText || 'ENTREGA INMEDIATA | FINANCIACION TASA 0%'
    const card1Price = customFields?.card1Price || formatFlyerPrice(pVenta)
    const card1Sub = customFields?.card1Sub || 'FINALES'
    const card2Price = customFields?.card2Price || formatFlyerPrice(maxFinanciar)
    const card2Sub = customFields?.card2Sub || `en ${cantCuotas} cuotas de ${formatFlyerPrice(costoCuota)}`

    const logoElement = logoBase64
      ? `<image href="data:image/png;base64,${logoBase64}" x="${(W - 192) / 2}" y="12" width="192" height="86" />`
      : `<text x="${W / 2}" y="55" font-family="Montserrat, Inter, Arial, sans-serif" font-size="28" font-weight="900" fill="#FFFFFF" text-anchor="middle">OKMMOTORS</text>`

    const svgOverlay = `
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="topVignette" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#040914" stop-opacity="0.96"/>
          <stop offset="35%" stop-color="#071120" stop-opacity="0.80"/>
          <stop offset="75%" stop-color="#071120" stop-opacity="0.30"/>
          <stop offset="100%" stop-color="#071120" stop-opacity="0.0"/>
        </linearGradient>

        <linearGradient id="bottomVignette" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#040914" stop-opacity="0.0"/>
          <stop offset="20%" stop-color="#060E1C" stop-opacity="0.85"/>
          <stop offset="100%" stop-color="#030710" stop-opacity="0.98"/>
        </linearGradient>

        <linearGradient id="titleBoxGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0B172C"/>
          <stop offset="100%" stop-color="#070F1D"/>
        </linearGradient>

        <linearGradient id="cardGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#FFFFFF"/>
          <stop offset="100%" stop-color="#F4F5F8"/>
        </linearGradient>

        <linearGradient id="pillGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#FFFFFF"/>
          <stop offset="100%" stop-color="#E5E7EB"/>
        </linearGradient>

        <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.5"/>
        </filter>
      </defs>

      <rect x="0" y="0" width="${W}" height="280" fill="url(#topVignette)"/>
      <rect x="0" y="550" width="${W}" height="474" fill="url(#bottomVignette)"/>

      ${logoElement}

      <text x="${W / 2}" y="122" 
            font-family="Montserrat, Inter, Arial, sans-serif" 
            font-size="13" 
            font-weight="700" 
            letter-spacing="3" 
            fill="#94A3B8" 
            text-anchor="middle">
        VEHÍCULOS SELECCIONADOS
      </text>

      <g filter="url(#shadow)">
        <rect x="28" y="152" width="515" height="106" rx="12" ry="12" 
              fill="url(#titleBoxGrad)" 
              stroke="#1E293B" 
              stroke-width="1.5" />
        
        <text x="${W / 2}" y="196" 
              font-family="Montserrat, Inter, Arial, sans-serif" 
              font-size="25" 
              font-weight="900" 
              letter-spacing="0.5" 
              fill="#FFFFFF" 
              text-anchor="middle">
          ${titleText}
        </text>

        <text x="${W / 2}" y="228" 
              font-family="Montserrat, Inter, Arial, sans-serif" 
              font-size="13.5" 
              font-weight="700" 
              letter-spacing="0.5" 
              fill="#8EA2B9" 
              text-anchor="middle">
          ${subtitle}
        </text>
      </g>

      <g filter="url(#shadow)">
        <rect x="24" y="569" width="523" height="46" rx="23" ry="23" 
              fill="url(#pillGrad)" 
              stroke="#FFFFFF" 
              stroke-width="1.5" />
        <text x="${W / 2}" y="598" 
              font-family="Montserrat, Inter, Arial, sans-serif" 
              font-size="15" 
              font-weight="900" 
              letter-spacing="0.5" 
              fill="#0F172A" 
              text-anchor="middle">
          ${bannerText}
        </text>
      </g>

      <g filter="url(#shadow)">
        <rect x="15" y="626" width="541" height="126" rx="12" ry="12" 
              fill="url(#cardGrad)" 
              stroke="#FFFFFF" 
              stroke-width="1" />
        
        <path d="M 15 638 A 12 12 0 0 1 27 626 L 27 752 A 12 12 0 0 1 15 740 Z" fill="#C2410C"/>

        <text x="${(W + 12) / 2}" y="682" 
              font-family="Montserrat, Inter, Arial, sans-serif" 
              font-size="40" 
              font-weight="900" 
              fill="#C2410C" 
              text-anchor="middle">
          ${card1Price}
        </text>

        <text x="${(W + 12) / 2}" y="722" 
              font-family="Montserrat, Inter, Arial, sans-serif" 
              font-size="25" 
              font-weight="900" 
              letter-spacing="0.5" 
              fill="#1F2937" 
              text-anchor="middle">
          ${card1Sub}
        </text>
      </g>

      <g filter="url(#shadow)">
        <rect x="15" y="766" width="541" height="126" rx="12" ry="12" 
              fill="url(#cardGrad)" 
              stroke="#FFFFFF" 
              stroke-width="1" />
        
        <path d="M 15 778 A 12 12 0 0 1 27 766 L 27 892 A 12 12 0 0 1 15 880 Z" fill="#C2410C"/>

        <text x="${(W + 12) / 2}" y="822" 
              font-family="Montserrat, Inter, Arial, sans-serif" 
              font-size="40" 
              font-weight="900" 
              fill="#C2410C" 
              text-anchor="middle">
          ${card2Price}
        </text>

        <text x="${(W + 12) / 2}" y="862" 
              font-family="Montserrat, Inter, Arial, sans-serif" 
              font-size="24" 
              font-weight="900" 
              letter-spacing="0.2" 
              fill="#0F172A" 
              text-anchor="middle">
          ${card2Sub}
        </text>
      </g>
    </svg>
    `

    const compositeBuffer = await sharp(resizedBg)
      .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
      .png({ quality: 95 })
      .toBuffer()

    if (returnBase64) {
      const base64Out = `data:image/png;base64,${compositeBuffer.toString('base64')}`
      return NextResponse.json({ success: true, flyerUrl: base64Out })
    }

    // Subir a Supabase Storage
    const fileName = `publicidades/flyer_${vehicleId || 'auto'}_${Date.now()}.png`
    try {
      const { error: uploadErr } = await supabase.storage
        .from('vehicle-images')
        .upload(fileName, compositeBuffer, { contentType: 'image/png', upsert: true })

      if (!uploadErr) {
        const { data: pubData } = supabase.storage
          .from('vehicle-images')
          .getPublicUrl(fileName)

        if (pubData?.publicUrl) {
          return NextResponse.json({
            success: true,
            flyerUrl: pubData.publicUrl,
            fileName
          })
        }
      }
    } catch (e) {
      console.warn('Fallo subida a storage, enviando base64:', e)
    }

    const base64Out = `data:image/png;base64,${compositeBuffer.toString('base64')}`
    return NextResponse.json({ success: true, flyerUrl: base64Out })
  } catch (err: any) {
    console.error('[Generate Flyer API] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
