'use client'

import React from 'react'
import { spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { TemplateOverlayProps } from '../types'
import { WhatsAppIcon, LocationPinIcon } from '../elements/Icons'

export const FinancingTemplate: React.FC<TemplateOverlayProps> = ({
  vehicle,
  agency,
  customBadge1,
  customBadge2,
  customBadge3,
  showAnticipo = true,
  showPrice = true,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Smooth entrance springs
  const logoSpring = spring({ frame, fps, config: { damping: 14, stiffness: 120 } })
  const cardSpring = spring({ frame: frame - 2, fps, config: { damping: 14, stiffness: 110 } })

  // Clean anticipo: Si el usuario escribió texto personalizado en el cuadro (ej: "$15.250.000 + 18 cuotas a tasa 0 !"),
  // se muestra exactamente ese texto. Si solo viene un número o monto de stock, se le agrega "+ 18 cuotas Tasa 0% !".
  const formatAnticipoClean = (raw?: string) => {
    if (!raw) return ''
    let clean = raw
      .replace(/^[💵\s*•\-\*]+/g, '')
      .replace(/^anticipo\s*(desde)?\s*:?\s*/i, '')
      .replace(/^entrega\s*(desde)?\s*:?\s*/i, '')
      .trim()
    
    // Si sólo es un importe numérico pelado (ej: "$15.250.000" o "15250000"), agregar cuotas a tasa 0%
    if (/^\$[\d\.\,]+$/.test(clean) || /^\d+$/.test(clean)) {
      const formatted = clean.startsWith('$') ? clean : `$${Number(clean).toLocaleString('es-AR')}`
      return `${formatted} + 18 cuotas Tasa 0% !`
    }
    return clean
  }

  // Clean price text to avoid duplication of "PRECIO CONTADO:"
  const cleanPriceText = (p?: string) => {
    if (!p) return ''
    return p.replace(/^PRECIO\s*CONTADO\s*:\s*/i, '').trim()
  }

  // Split Brand (arriba) y Modelo + Versión (abajo)
  const getVehicleTitleParts = () => {
    const rawBrand = (vehicle.brand && vehicle.brand.toLowerCase() !== 'vehículo' && vehicle.brand.toLowerCase() !== 'vehiculo')
      ? vehicle.brand.trim()
      : (vehicle.title.split(' ')[0] || '')

    let rest = ''
    if (vehicle.model) {
      rest = [vehicle.model, vehicle.version].filter(Boolean).join(' ').trim()
    } else {
      rest = vehicle.title
    }

    if (rawBrand) {
      const regex = new RegExp(`^${rawBrand}\\s*`, 'i')
      rest = rest.replace(regex, '').trim()
    }

    if (!rest) {
      rest = vehicle.title
    }

    return {
      brand: rawBrand ? rawBrand.toUpperCase() : '',
      modelAndVersion: rest.toUpperCase()
    }
  }

  const { brand: brandText, modelAndVersion: modelText } = getVehicleTitleParts()

  return (
    <div className="relative w-full h-full pointer-events-none font-sans select-none overflow-hidden">
      {/* Top Dealership Brand Emblem (Logo Okmmotors un poco arriba de la foto) */}
      <div 
        className="absolute top-3 sm:top-4 left-0 right-0 z-30 flex justify-center items-center pointer-events-none"
        style={{
          transform: `scale(${Math.max(0, logoSpring)})`,
          opacity: Math.min(1, Math.max(0, logoSpring)),
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={agency.logoUrl || '/okmmotors_oval_logo.png'}
          alt={agency.name || 'Okmmotors'}
          className="h-12 sm:h-14 w-auto object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.85)] filter brightness-105"
        />
      </div>

      {/* Smooth dark atmospheric vignette on lower half (sin recuadro ni líneas divisorias) */}
      <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-10" />

      {/* Sales Content: Sin recuadro, fondo visible y tipografía resaltada */}
      <div 
        className="absolute top-[53.5%] left-[5%] right-[5%] z-20 flex flex-col gap-2.5 sm:gap-3 pointer-events-none"
        style={{
          transform: `translateY(${(1 - Math.max(0, cardSpring)) * 25}px)`,
          opacity: Math.min(1, Math.max(0, cardSpring)),
        }}
      >
        {/* 1. Top Badges Row */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="bg-black/60 backdrop-blur-md text-white border border-white/35 text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-xl uppercase tracking-wider shadow-lg drop-shadow">
            {customBadge1 || vehicle.year}
          </span>
          <span className="bg-black/60 backdrop-blur-md text-white border border-white/35 text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-xl uppercase tracking-wider shadow-lg drop-shadow">
            {customBadge2 || vehicle.km}
          </span>
          {customBadge3 && (
            <span className="bg-black/60 backdrop-blur-md text-slate-200 border border-white/25 text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-xl uppercase tracking-wider shadow-lg drop-shadow">
              {customBadge3}
            </span>
          )}
        </div>

        {/* 2. Car Brand (arriba) y Modelo + Versión (abajo) */}
        <div className="flex flex-col">
          {brandText && (
            <span className="text-sm sm:text-base lg:text-lg font-black text-slate-200 uppercase tracking-wider leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
              {brandText}
            </span>
          )}
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white uppercase tracking-tight leading-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] [text-shadow:_0_2px_12px_rgba(0,0,0,0.95)]">
            {modelText}
          </h2>
        </div>

        {/* 3. Entrega Inmediata Label + Banner Blanco Cromado */}
        {showAnticipo && vehicle.anticipo && (
          <div className="flex flex-col gap-1">
            <span className="text-xs sm:text-sm font-black text-slate-200 uppercase tracking-widest px-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
              Entrega Inmediata
            </span>
            <div className="bg-gradient-to-r from-slate-100 via-white to-slate-200 py-3 sm:py-3.5 px-3 sm:px-4 rounded-2xl text-slate-950 shadow-[0_10px_30px_rgba(0,0,0,0.7)] flex items-center justify-center text-center border-2 border-white">
              <span className="text-base sm:text-xl lg:text-2xl font-black uppercase tracking-tight leading-snug drop-shadow-sm line-clamp-2">
                {formatAnticipoClean(vehicle.anticipo)}
              </span>
            </div>
          </div>
        )}

        {/* 4. Pie de precios: PRECIO CONTADO y PERMUTAS */}
        <div className="pt-2 sm:pt-2.5 border-t border-white/25 flex items-center justify-between gap-2">
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight drop-shadow-[0_4px_14px_rgba(0,0,0,0.95)] [text-shadow:_0_2px_10px_rgba(0,0,0,0.9)] whitespace-nowrap">
            PRECIO CONTADO: {cleanPriceText(vehicle.price)}
          </div>
          <div className="text-right flex flex-col items-end drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
            <span className="text-[11px] sm:text-xs uppercase font-bold text-slate-300 block tracking-wider">
              PERMUTAS
            </span>
            <span className="text-xs sm:text-sm font-black text-white whitespace-nowrap">
              Tomamos tu Usado
            </span>
          </div>
        </div>

        {/* 5. WhatsApp Button & Ubicación (Más arriba, compacto justo debajo del precio) */}
        <div className="pt-1 flex flex-col items-center gap-2">
          <div className="w-full py-3 sm:py-3.5 px-4 rounded-2xl bg-gradient-to-r from-slate-100 via-white to-slate-200 border-2 border-white shadow-[0_10px_30px_rgba(0,0,0,0.7)] flex items-center justify-center gap-2 font-black text-xs sm:text-sm lg:text-base uppercase tracking-wider text-slate-950">
            <WhatsAppIcon className="w-5 h-5 text-[#25D366] fill-current flex-shrink-0" />
            <span>WHATSAPP {agency.whatsapp || '3624750716'}</span>
          </div>

          {/* Ubicación */}
          <div className="flex items-center justify-center gap-1.5 text-slate-200 font-black text-xs sm:text-sm tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
            <LocationPinIcon className="w-4 h-4 text-slate-200 flex-shrink-0" />
            <span>{agency.address || 'Resistencia, Chaco'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
