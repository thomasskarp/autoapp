import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const apiKey = process.env.GEMINI_API_KEY
let aiClient: GoogleGenAI | null = null
if (apiKey) {
  aiClient = new GoogleGenAI({ apiKey })
}

function parseColorFromText(text: string): { type: 'solid' | 'gradient'; c1: string; c2?: string; isLight: boolean; label: string } | null {
  const t = text.toLowerCase()
  if (t.includes('gris azulado claro') || t.includes('azul grisáceo claro') || t.includes('celeste grisáceo') || t.includes('gris azulado') || t.includes('gris azul')) {
    return { type: 'gradient', c1: '#64748B', c2: '#334155', isLight: false, label: 'gris azulado elegante' }
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

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { message, vehicle, reelState } = body || {}

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ success: false, error: 'Mensaje requerido' }, { status: 400 })
    }

    const vehicleSummary = `
Auto: ${vehicle?.marca || 'Vehículo'} ${vehicle?.modelo || ''} ${vehicle?.version || ''}
Año: ${vehicle?.anio || 2026}
Kilometraje: ${vehicle?.km !== undefined && vehicle?.km !== null ? (vehicle.km === 0 ? '0km' : vehicle.km + ' km') : '0km'}
Precio: ${vehicle?.precio || 'Consultar'}
Anticipo: ${vehicle?.anticipo || 'A convenir'}
Transmisión: ${vehicle?.transmision || 'Automática'}
Combustible: ${vehicle?.combustible || 'Nafta'}
`

    // Super-smart natural language parser
    const runLocalParser = () => {
      const lower = message.toLowerCase()
      const actions: any[] = []
      const applied: string[] = []
      let copy: string | null = null

      const isOutroTarget = lower.includes('ultima imagen') || lower.includes('última imagen') || lower.includes('final') || lower.includes('agencia') || lower.includes('logo') || lower.includes('cierre') || lower.includes('outro') || lower.includes('pantalla final')
      const detectedColor = parseColorFromText(lower)

      // 0. Temas de diseño integral
      if (lower.includes('estilo deportivo') || lower.includes('deportivo') || lower.includes('sport')) {
        actions.push({ type: 'SET_THEME', value: 'sport-red' })
        applied.push('estilo deportivo M-Sport')
      } else if (lower.includes('estilo oscuro') || lower.includes('stealth') || lower.includes('black edition')) {
        actions.push({ type: 'SET_THEME', value: 'dark-stealth' })
        applied.push('estilo oscuro Black Stealth')
      } else if (lower.includes('estilo dorado') || lower.includes('luxury') || lower.includes('premium')) {
        actions.push({ type: 'SET_THEME', value: 'luxury-gold' })
        applied.push('estilo Luxury Gold')
      } else if (lower.includes('estilo blanco') || lower.includes('minimalista') || lower.includes('clean')) {
        actions.push({ type: 'SET_THEME', value: 'clean-white' })
        applied.push('estilo minimalista Clean White')
      }

      // 0.1 Capas libres / Franjas / Ribbons / Sellos especiales
      const ribbonMatch = message.match(/(?:franja|banner|sello|etiqueta|ribbon|cinta)\s*(?:dorada|roja|azul|verde|negra|blanca)?\s*(?:que\s+diga|con\s+el\s+texto|:)?\s*([A-Za-z0-9\s\!\¡\?¿\%\$\.\-]{3,40})/i)
      if (ribbonMatch && ribbonMatch[1]) {
        const text = ribbonMatch[1].trim().toUpperCase()
        const isGold = lower.includes('dorad') || lower.includes('oro')
        const isRed = lower.includes('roj')
        const isGreen = lower.includes('verd')
        actions.push({
          type: 'ADD_CUSTOM_LAYER',
          value: {
            id: 'layer_' + Date.now(),
            type: 'ribbon',
            text: text.startsWith('🔥') || text.startsWith('✨') ? text : `🔥 ${text}`,
            position: lower.includes('arriba') ? 'top-right' : 'top-center',
            bgColor: isGold ? '#D97706' : (isRed ? '#DC2626' : (isGreen ? '#16A34A' : '#2563EB')),
            textColor: '#FFFFFF',
            borderColor: isGold ? '#FDE68A' : '#FFFFFF'
          }
        })
        applied.push(`franja destacada "${text}"`)
      }

      // 1. Color de fondo de la última pantalla (outro / agencia y logo)
      if (detectedColor && (isOutroTarget || (!lower.includes('precio') && !lower.includes('boton') && !lower.includes('botón')))) {
        actions.push({ type: 'SET_OUTRO_BG', value: detectedColor })
        actions.push({ type: 'JUMP_TO_SLIDE', value: 'outro' })
        applied.push(`fondo de pantalla final ${detectedColor.label}`)
      }

      // 2. Color del botón de precio
      if ((lower.includes('precio') || lower.includes('boton') || lower.includes('botón')) && (lower.includes('color') || detectedColor)) {
        const color = detectedColor || { type: 'gradient', c1: '#DC2626', c2: '#7F1D1D', isLight: false, label: 'rojo' }
        actions.push({
          type: 'SET_PRICE_COLOR',
          value: {
            from: color.c1,
            via: color.c1,
            to: color.c2 || color.c1,
            border: color.isLight ? '#334155' : '#FFFFFF',
            label: color.label
          }
        })
        applied.push(`color de precio ${color.label}`)
      }

      // 3. Dirección / Ubicación (Address)
      const addrRegex = /(?:direcci[oó]n|ubicaci[oó]n|sucursal|estamos en|local(?:\s+en)?)\s*(?:es|:|en)?\s*([A-Za-z0-9\.\,\s\-º°]{3,60})/i
      const addrMatch = message.match(addrRegex)
      if (addrMatch && addrMatch[1]) {
        let clean = addrMatch[1].trim().replace(/^[:\-\s]+/, '').replace(/[\.\,\s]+$/, '')
        clean = clean.split(/\s+y\s+(?:whatsapp|wsp|tel|contacto|agrega|pone|instagram)/i)[0].trim()
        if (clean.length >= 3) {
          const val = clean.startsWith('📍') ? clean : `📍 ${clean}`
          actions.push({ type: 'SET_OUTRO_ADDRESS', value: val })
          actions.push({ type: 'JUMP_TO_SLIDE', value: 'outro' })
          applied.push(`dirección: ${val}`)
        }
      } else {
        const streetMatch = message.match(/(?:av\.?|avenida|calle|ruta|km)\s+[A-Za-z0-9\.\,\s\-º°]{3,45}/i)
        if (streetMatch && streetMatch[0] && !lower.includes('0km') && !lower.includes('0 km')) {
          let clean = streetMatch[0].trim().split(/\s+y\s+(?:whatsapp|wsp|tel|contacto|agrega|pone)/i)[0].trim()
          const val = `📍 ${clean}`
          actions.push({ type: 'SET_OUTRO_ADDRESS', value: val })
          actions.push({ type: 'JUMP_TO_SLIDE', value: 'outro' })
          applied.push(`dirección: ${val}`)
        }
      }

      // 4. Teléfono / WhatsApp / Contacto
      const wpRegex = /(?:whatsapp|wsp|wpp|tel[eé]fono|celular|cel|tel|contacto)\s*(?:es|:|al|de)?\s*([+\d\s\-\(\)]{6,22})/i
      const wpMatch = message.match(wpRegex)
      if (wpMatch && wpMatch[1]) {
        const num = wpMatch[1].trim().replace(/^[:\-\s]+/, '')
        const isWp = /w(hats)?app|wsp|wpp/i.test(message)
        const val = isWp ? `📲 WhatsApp: ${num}` : `📞 Tel: ${num}`
        actions.push({ type: 'SET_OUTRO_CONTACT', value: val })
        actions.push({ type: 'JUMP_TO_SLIDE', value: 'outro' })
        applied.push(`contacto: ${val}`)
      } else {
        const rawPhone = message.match(/(\+?54\s*9?\s*\d[\d\s\-]{7,14}\d)/)
        if (rawPhone && rawPhone[1]) {
          const val = `📲 WhatsApp: ${rawPhone[1].trim()}`
          actions.push({ type: 'SET_OUTRO_CONTACT', value: val })
          actions.push({ type: 'JUMP_TO_SLIDE', value: 'outro' })
          applied.push(`contacto: ${val}`)
        }
      }

      // 5. Instagram / Redes / Web
      const igMatch = message.match(/(?:instagram|ig|redes)\s*(?:es|:|en)?\s*(@[a-zA-Z0-9_\.]+|[a-zA-Z0-9_\.]{3,30})/i)
      if (igMatch && igMatch[1]) {
        const handle = igMatch[1].trim().startsWith('@') ? igMatch[1].trim() : `@${igMatch[1].trim()}`
        const val = `Seguinos en Instagram: ${handle}`
        actions.push({ type: 'SET_OUTRO_CONTACT', value: val })
        actions.push({ type: 'JUMP_TO_SLIDE', value: 'outro' })
        applied.push(`Instagram: ${handle}`)
      }

      const webMatch = message.match(/(?:web|sitio|p[aá]gina)\s*(?:es|:|en)?\s*(www\.[a-zA-Z0-9_\-\.]+\.[a-zA-Z]{2,}|[a-zA-Z0-9_\-]+\.com(?:\.ar)?)/i)
      if (webMatch && webMatch[1]) {
        const val = `🌐 ${webMatch[1].trim()}`
        actions.push({ type: 'SET_OUTRO_ADDRESS', value: val })
        actions.push({ type: 'JUMP_TO_SLIDE', value: 'outro' })
        applied.push(`web: ${val}`)
      }

      // 6. Beneficios / Viñetas / Puntos en la pantalla final
      if (/permuta|usado|llave contra llave/i.test(lower) && /agrega|pone|suma|tomamos|aceptamos|inclui|incluí/i.test(lower)) {
        const val = '🤝 Aceptamos permutas y tu usado'
        actions.push({ type: 'ADD_OUTRO_BULLET', value: val })
        actions.push({ type: 'JUMP_TO_SLIDE', value: 'outro' })
        applied.push(`viñeta: "${val}"`)
      }
      if (/garant[ií]a/i.test(lower) && /agrega|pone|suma|inclui|incluí|ofrecemos/i.test(lower)) {
        const gMatch = message.match(/garant[ií]a\s*(?:mec[aá]nica)?\s*(?:de\s+)?([A-Za-z0-9\s]+)/i)
        const gText = gMatch ? gMatch[0].trim() : 'Garantía mecánica de 1 año'
        const val = `🛡️ ${gText.charAt(0).toUpperCase() + gText.slice(1)}`
        actions.push({ type: 'ADD_OUTRO_BULLET', value: val })
        actions.push({ type: 'JUMP_TO_SLIDE', value: 'outro' })
        applied.push(`viñeta: "${val}"`)
      }
      if ((/financiaci[oó]n|cuotas?\s*fijas?|cr[eé]dito|tasa\s*0/i.test(lower)) && /agrega|pone|suma|inclui|incluí/i.test(lower)) {
        const fMatch = message.match(/(?:financiaci[oó]n|cuotas?\s*fijas?|cr[eé]ditos?)\s*([A-Za-z0-9\%\$\s]+)/i)
        const fText = fMatch ? fMatch[0].trim() : 'Financiación a medida en el acto'
        const val = `⚡ ${fText.charAt(0).toUpperCase() + fText.slice(1)}`
        actions.push({ type: 'ADD_OUTRO_BULLET', value: val })
        actions.push({ type: 'JUMP_TO_SLIDE', value: 'outro' })
        applied.push(`viñeta: "${val}"`)
      }
      if (/entrega inmediata|entrega en el acto/i.test(lower) && /agrega|pone|suma|inclui|incluí/i.test(lower)) {
        const val = '⚡ Entrega inmediata garantizada'
        actions.push({ type: 'ADD_OUTRO_BULLET', value: val })
        actions.push({ type: 'JUMP_TO_SLIDE', value: 'outro' })
        applied.push(`viñeta: "${val}"`)
      }

      // Explicit bullet: "agrega viñeta / punto / beneficio [texto]"
      const explicitBulletMatch = message.match(/(?:vi[ñn]eta|punto|beneficio)\s*(?:que\s+diga|:)?\s*([A-Za-z0-9\s\$\%\,\.\-]{3,50})/i)
      if (explicitBulletMatch && explicitBulletMatch[1]) {
        const val = `✨ ${explicitBulletMatch[1].trim()}`
        actions.push({ type: 'ADD_OUTRO_BULLET', value: val })
        actions.push({ type: 'JUMP_TO_SLIDE', value: 'outro' })
        applied.push(`viñeta: "${val}"`)
      }

      // 7. Título de la pantalla final
      const outroTitleMatch = message.match(/(?:t[ií]tulo)\s*(?:de\s+la\s+u[lú]ltima\s+imagen|de\s+la\s+pantalla\s+final|final)?\s*(?:por|a|:|que diga)\s*([A-Za-z0-9\s\!\¡\?¿\-]{3,50})/i)
      if (outroTitleMatch && outroTitleMatch[1] && (isOutroTarget || /final|outro|cierre/i.test(lower))) {
        const val = outroTitleMatch[1].trim().toUpperCase()
        actions.push({ type: 'SET_OUTRO_TITLE', value: val })
        actions.push({ type: 'JUMP_TO_SLIDE', value: 'outro' })
        applied.push(`título final: "${val}"`)
      }

      // 8. Botón CTA de la pantalla final
      const ctaMatch = message.match(/(?:bot[oó]n|cta)\s*(?:del\s+final|de\s+contacto|azul)?\s*(?:por|a|:|que diga)\s*([A-Za-z0-9\s\!\¡\?¿\-]{3,40})/i)
      if (ctaMatch && ctaMatch[1] && (isOutroTarget || /contacto|mensaje|final/i.test(lower))) {
        const val = `💬 ${ctaMatch[1].trim().toUpperCase().replace(/^[💬\s]+/, '')}`
        actions.push({ type: 'SET_OUTRO_CTA', value: val })
        actions.push({ type: 'JUMP_TO_SLIDE', value: 'outro' })
        applied.push(`botón final: "${val}"`)
      }

      // 9. Generic "agrega [info]" on the outro / final screen if nothing was extracted yet
      if (actions.length === 0 || (isOutroTarget && !actions.some(a => a.type.startsWith('SET_OUTRO_') && a.type !== 'SET_OUTRO_BG'))) {
        const genericAdd = message.match(/(?:agrega|pone|sum[aá]|inclu[ií])\s+(?:la\s+info(?:\s+de)?\s+|el\s+texto\s+|que\s+)?([A-Za-z0-9\s\.\,\:\-\@\/\$]+?)(?:\s+en\s+la\s+u[lú]ltima|\s+en\s+el\s+final|\s+en\s+la\s+pantalla\s+final|\s+al\s+final|$)/i)
        if (genericAdd && genericAdd[1]) {
          const raw = genericAdd[1].trim()
          if (!raw.toLowerCase().startsWith('color') && !raw.toLowerCase().startsWith('fondo') && raw.length > 2) {
            if (/\d{4,}|\@|av\.|calle|km/i.test(raw)) {
              const val = `📍 ${raw}`
              actions.push({ type: 'SET_OUTRO_ADDRESS', value: val })
              actions.push({ type: 'JUMP_TO_SLIDE', value: 'outro' })
              applied.push(`info: "${val}"`)
            } else {
              const val = `✨ ${raw}`
              actions.push({ type: 'ADD_OUTRO_BULLET', value: val })
              actions.push({ type: 'JUMP_TO_SLIDE', value: 'outro' })
              applied.push(`info: "${val}"`)
            }
          }
        }
      }

      // 10. Anticipo
      const anticipoMatch = message.match(/anticipo(?:\s+desde|\s+de|\s*:)?\s*(\$[\d\.\,]+(?:\s*\+\s*cuotas\s*tasa\s*0%)?)/i)
      if (anticipoMatch && anticipoMatch[1]) {
        const val = anticipoMatch[1].trim()
        const finalText = val.toUpperCase().startsWith('ANTICIPO') ? val : `ANTICIPO DESDE ${val} + cuotas tasa 0%`
        actions.push({ type: 'SET_ANTICIPO', value: finalText })
        applied.push(`anticipo: ${val}`)
      }

      // 11. Precio
      const priceMatch = message.match(/precio(?:\s+contado|\s+de|\s*:)?\s*(\$[\d\.\,]+)/i)
      if (priceMatch && priceMatch[1]) {
        const pVal = priceMatch[1].trim()
        actions.push({ type: 'SET_PRICE', value: `PRECIO CONTADO: ${pVal}` })
        applied.push(`precio: ${pVal}`)
      }

      // 12. Filtros cinematográficos
      if (lower.includes('blanco y negro') || lower.includes('escala de grises') || lower.includes('monocrom')) {
        actions.push({ type: 'SET_FILTER', value: 'grayscale(100%)' })
        applied.push('filtro blanco y negro')
      } else if (lower.includes('calido') || lower.includes('cálido') || lower.includes('vintage')) {
        actions.push({ type: 'SET_FILTER', value: 'sepia(25%) saturate(125%)' })
        applied.push('tono cálido')
      } else if (lower.includes('color normal') || lower.includes('sin filtro') || lower.includes('quitar filtro')) {
        actions.push({ type: 'SET_FILTER', value: 'none' })
        applied.push('colores originales')
      }

      // 13. Velocidad
      if (lower.includes('mas rapido') || lower.includes('más rápido') || lower.includes('rapido') || lower.includes('veloz')) {
        actions.push({ type: 'SET_SLIDE_DURATION', value: 0.7 })
        applied.push('velocidad rápida (0.7s)')
      } else if (lower.includes('mas lento') || lower.includes('más lento') || lower.includes('despacio')) {
        actions.push({ type: 'SET_SLIDE_DURATION', value: 1.5 })
        applied.push('velocidad pausada (1.5s)')
      }

      // 14. Modo de encuadre
      if (lower.includes('llenar pantalla') || lower.includes('cover')) {
        actions.push({ type: 'SET_FIT_MODE', value: 'cover' })
        applied.push('modo llenar pantalla')
      } else if (lower.includes('auto completo') || lower.includes('contain')) {
        actions.push({ type: 'SET_FIT_MODE', value: 'contain' })
        applied.push('modo auto completo')
      }

      // 15. Copies virales
      if (lower.includes('copy') || lower.includes('hashtag') || lower.includes('viral') || lower.includes('caption') || lower.includes('descripcion')) {
        const vTitle = `${vehicle?.marca || ''} ${vehicle?.modelo || ''}`.trim()
        copy = `🔥 ¡SUBITE A ESTE ${vTitle.toUpperCase()}! 🔥\n\n📍 Año: ${vehicle?.anio || 2026} | ${vehicle?.km === 0 ? '0km' : `${vehicle?.km || 0} km`}\n💰 Precio: ${vehicle?.precio || 'Consultar'}${vehicle?.anticipo ? `\n💵 Anticipo desde ${vehicle.anticipo} o tu usado en parte de pago` : ''}\n⚙️ Transmisión: ${vehicle?.transmision || 'Automática'}\n\n✅ Unidad peritada y garantizada.\n🚗 Tomamos tu usado llave contra llave al mejor precio.\n📲 ¡Envianos un mensaje directo para coordinar tu test drive!\n\n#okmmotors #${vTitle.toLowerCase().replace(/\s+/g, '')} #autosargentina #autos #concesionaria #reels #oportunidad`
      }

      // 16. Ocultar / Mostrar
      if (lower.includes('ocultar anticipo') || lower.includes('sacar anticipo') || lower.includes('sin anticipo')) {
        actions.push({ type: 'TOGGLE_ELEMENT', element: 'anticipo', visible: false })
        applied.push('anticipo ocultado')
      } else if (lower.includes('mostrar anticipo') || lower.includes('activar anticipo')) {
        actions.push({ type: 'TOGGLE_ELEMENT', element: 'anticipo', visible: true })
        applied.push('anticipo visible')
      }

      if (lower.includes('ocultar km') || lower.includes('sacar km') || lower.includes('ocultar kilometraje')) {
        actions.push({ type: 'TOGGLE_ELEMENT', element: 'badge2', visible: false })
        applied.push('km ocultado')
      } else if (lower.includes('mostrar km')) {
        actions.push({ type: 'TOGGLE_ELEMENT', element: 'badge2', visible: true })
        applied.push('km visible')
      }

      if (lower.includes('ocultar caja') || lower.includes('ocultar transmision') || lower.includes('sacar caja')) {
        actions.push({ type: 'TOGGLE_ELEMENT', element: 'badge3', visible: false })
        applied.push('transmisión ocultada')
      }

      let reply = ''
      if (applied.length > 0) {
        reply = `¡Listo! Apliqué en el video: ${applied.join(', ')}.`
        if (copy) reply += ' Además preparé el copy viral con hashtags.'
      } else if (copy) {
        reply = '¡Listo! Generé un copy viral de alto impacto con hashtags para Instagram y TikTok.'
      } else {
        reply = 'Entendido, apliqué los cambios solicitados en el video.'
      }

      return { reply, copy, actions }
    }

    if (!aiClient) {
      const result = runLocalParser()
      return NextResponse.json({ success: true, ...result })
    }

    try {
      const prompt = `Eres el Director Creativo y Desarrollador Visual de Reels y TikToks de la concesionaria Okmmotors.
Tu función es entender CUALQUIER requerimiento visual, estético o publicitario del usuario como un desarrollador autónomo, y aplicarlo directamente sobre el video publicitario.

Información del vehículo:
${vehicleSummary}

Estado actual del Reel:
- Título: ${reelState?.title || ''}
- Año: ${reelState?.badge1 || ''}
- Km: ${reelState?.badge2 || ''}
- Caja: ${reelState?.badge3 || ''}
- Anticipo: ${reelState?.anticipo || ''}
- Precio: ${reelState?.price || ''}
- Fondo pantalla final: ${reelState?.outroBg || 'Predeterminado'}
- Capas libres actuales: ${JSON.stringify(reelState?.customLayers || [])}

Mensaje del usuario:
"${message}"

INSTRUCCIONES DE RESPUESTA:
1. Responde de forma amable, creativa y automotriz en "reply", explicando con claridad qué cambios visuales hiciste y por qué favorecen la venta.
2. Genera una lista de acciones concretas en "actions" que modifiquen el lienzo.
Acciones soportadas:
- { "type": "SET_THEME", "value": "dark-stealth" | "luxury-gold" | "sport-red" | "clean-white" | "electric-cyan" }
- { "type": "ADD_CUSTOM_LAYER", "value": { "id": "layer_${Date.now()}", "type": "ribbon" | "badge" | "banner" | "text", "text": "TEXTO", "position": "top-right" | "top-center" | "top-left" | "bottom-banner" | "above-price", "bgColor": "#HEX", "textColor": "#HEX", "borderColor": "#HEX" } }
- { "type": "REMOVE_CUSTOM_LAYER", "value": "all" | "id_especifico" }
- { "type": "SET_OUTRO_BG", "value": { "type": "gradient" | "solid", "c1": "#HEX", "c2": "#HEX", "isLight": boolean, "label": "nombre del color" } }
- { "type": "SET_OUTRO_ADDRESS", "value": "📍 Dirección / Localidad / Horario" }
- { "type": "SET_OUTRO_CONTACT", "value": "📲 WhatsApp / Teléfono / Instagram" }
- { "type": "ADD_OUTRO_BULLET", "value": "✨ Beneficio o viñeta" }
- { "type": "SET_OUTRO_TITLE", "value": "TÍTULO FINAL" }
- { "type": "SET_OUTRO_CTA", "value": "💬 BOTÓN DE CONTACTO" }
- { "type": "JUMP_TO_SLIDE", "value": "outro" | "photos" }
- { "type": "SET_PRICE_COLOR", "value": { "from": "#HEX", "via": "#HEX", "to": "#HEX", "border": "#HEX", "label": "nombre" } }
- { "type": "SET_FILTER", "value": "grayscale(100%)" | "sepia(25%) saturate(125%)" | "contrast(120%) saturate(130%)" | "none" }
- { "type": "SET_SLIDE_DURATION", "value": 0.7 | 1.0 | 1.5 }
- { "type": "SET_FIT_MODE", "value": "contain" | "cover" }
- { "type": "SET_ANTICIPO", "value": "..." }
- { "type": "SET_PRICE", "value": "..." }
- { "type": "SET_TITLE", "value": "..." }
- { "type": "TOGGLE_ELEMENT", "element": "anticipo" | "price" | "badge1" | "badge2" | "badge3" | "title", "visible": boolean }
- { "type": "SCALE_ELEMENT", "element": "price" | "anticipo", "delta": number }
- { "type": "RESET" }

3. Si pide copy o hashtags, colócalo en "copy". Si no lo pide específicamente, puedes dejarlo en null o aportar uno breve.

Devuelve ÚNICAMENTE un JSON válido con esta estructura:
{
  "reply": "Explicación de los cambios realizados y sugerencias visuales",
  "copy": "Copy viral para redes o null",
  "actions": [ ... ]
}`

      const CANDIDATE_MODELS = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro-latest']
      let lastErr: any = null
      let parsed: any = null

      for (const modelName of CANDIDATE_MODELS) {
        try {
          const response = await aiClient.models.generateContent({
            model: modelName,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              responseMimeType: 'application/json'
            }
          })

          const raw = response.text || ''
          const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim()
          parsed = JSON.parse(cleaned)
          if (parsed && typeof parsed === 'object') {
            break
          }
        } catch (mErr: any) {
          lastErr = mErr
          console.warn(`[Gemini Model ${modelName} failed, trying fallback]:`, mErr?.status || mErr?.message?.slice(0, 80))
        }
      }

      if (parsed) {
        return NextResponse.json({
          success: true,
          reply: parsed.reply || 'Cambios aplicados con éxito.',
          copy: parsed.copy || null,
          actions: Array.isArray(parsed.actions) ? parsed.actions : []
        })
      }

      throw lastErr || new Error('No se pudo obtener respuesta de la IA')
    } catch (aiErr) {
      console.warn('[Reel Assistant Gemini Error, using local parser fallback]:', aiErr)
      const localResult = runLocalParser()
      return NextResponse.json({ success: true, ...localResult })
    }
  } catch (err: any) {
    console.error('[Reel Assistant API Error]:', err)
    return NextResponse.json({ success: false, error: err.message || 'Error en el asistente' }, { status: 500 })
  }
}
