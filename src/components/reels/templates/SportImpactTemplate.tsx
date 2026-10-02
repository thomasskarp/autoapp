'use client'

import React from 'react'
import { spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { TemplateOverlayProps } from '../types'

export const SportImpactTemplate: React.FC<TemplateOverlayProps> = ({
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

  const logoSpring = spring({ frame, fps, config: { damping: 14, stiffness: 120 } })
  const cardSpring = spring({ frame: frame - 2, fps, config: { damping: 14, stiffness: 110 } })

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
      {/* Top Dealership Brand Emblem */}
      <div 
        className="absolute top-4 left-0 right-0 z-20 flex justify-center items-center"
        style={{
          transform: `scale(${Math.max(0, logoSpring)})`,
          opacity: Math.min(1, Math.max(0, logoSpring)),
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={agency.logoUrl || '/okmmotors_oval_logo.png'}
          alt={agency.name || 'Okmmotors'}
          className="h-16 sm:h-20 w-auto object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.95)] filter brightness-105"
        />
      </div>

      {/* Bottom Information Card: Mitad info (49% inferior) */}
      <div 
        className="absolute top-[51%] bottom-3 left-3 right-3 z-20 flex flex-col pointer-events-none"
        style={{
          transform: `translateY(${(1 - Math.max(0, cardSpring)) * 25}px)`,
          opacity: Math.min(1, Math.max(0, cardSpring)),
        }}
      >
        <div className="h-full w-full bg-black/95 backdrop-blur-2xl p-4 sm:p-5 rounded-3xl border-l-4 border-yellow-400 border-t border-r border-b border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.95)] flex flex-col justify-start gap-3 sm:gap-3.5">
          
          {/* Top Badges Row */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="bg-yellow-400 text-black font-extrabold text-xs sm:text-sm px-3.5 py-1.5 rounded-xl uppercase tracking-wider shadow-md">
              {customBadge1 || `📅 ${vehicle.year}`}
            </span>
            <span className="bg-white/15 text-white font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-xl uppercase tracking-wider border border-white/20 shadow-md">
              {customBadge2 || vehicle.km}
            </span>
            {customBadge3 && (
              <span className="bg-slate-800/90 text-yellow-300 font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-xl uppercase tracking-wider border border-yellow-400/30 shadow-md">
                ⚡ {customBadge3}
              </span>
            )}
          </div>

          {/* Car Brand (arriba) y Modelo + Versión (abajo) */}
          <div className="flex flex-col">
            {brandText && (
              <span className="text-sm sm:text-base lg:text-lg font-black text-yellow-400 uppercase tracking-wider leading-tight">
                {brandText}
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black italic tracking-tight text-white uppercase leading-tight drop-shadow-md">
              {modelText}
            </h1>
          </div>

          {/* Anticipo Banner */}
          {showAnticipo && vehicle.anticipo && (
            <div className="w-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-black py-3 sm:py-3.5 px-4 rounded-2xl font-black text-base sm:text-lg lg:text-xl uppercase tracking-wider text-center shadow-xl border border-yellow-200/50">
              🔥 {vehicle.anticipo}
            </div>
          )}

          {/* Price & Trade-in */}
          <div className="pt-2 sm:pt-2.5 border-t border-white/15 flex items-center justify-between gap-2">
            <div>
              <span className="text-lg sm:text-2xl lg:text-3xl font-black text-yellow-400 tracking-tight drop-shadow">
                PRECIO CONTADO: {vehicle.price}
              </span>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="text-[11px] sm:text-xs uppercase font-bold text-yellow-400 block tracking-wider">
                PERMUTAS
              </span>
              <span className="text-xs sm:text-sm font-black text-white whitespace-nowrap">
                Tomamos tu Usado
              </span>
            </div>
          </div>

          {/* Contact Button & Ubicación */}
          <div className="mt-auto pt-2 flex flex-col items-center gap-2">
            <div className="w-full py-3 sm:py-3.5 px-4 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 border border-yellow-200 shadow-xl flex items-center justify-center font-black text-xs sm:text-sm lg:text-base uppercase tracking-wider text-black">
              <span>WHATSAPP {agency.whatsapp || '3624750716'}</span>
            </div>

            {/* Ubicación abajo de todo */}
            <div className="flex items-center justify-center text-slate-300 font-bold text-xs sm:text-sm tracking-wide">
              <span>{agency.address || 'Resistencia, Chaco'}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
