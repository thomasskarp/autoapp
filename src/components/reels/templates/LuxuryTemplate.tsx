'use client'

import React from 'react'
import { spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { TemplateOverlayProps } from '../types'

export const LuxuryTemplate: React.FC<TemplateOverlayProps> = ({
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

  const logoSpring = spring({ frame, fps, config: { damping: 16, stiffness: 100 } })
  const cardSpring = spring({ frame: frame - 2, fps, config: { damping: 16, stiffness: 90 } })

  return (
    <div className="relative w-full h-full pointer-events-none font-sans select-none overflow-hidden">
      {/* Top Dealership Brand Emblem */}
      <div 
        className="absolute top-3 left-0 right-0 z-20 flex justify-center items-center"
        style={{
          transform: `scale(${Math.max(0, logoSpring)})`,
          opacity: Math.min(1, Math.max(0, logoSpring)),
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={agency.logoUrl || '/okmmotors_oval_logo.png'}
          alt={agency.name || 'Okmmotors'}
          className="h-12 sm:h-14 w-auto object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.9)]"
        />
      </div>

      {/* Bottom Floating Glassmorphism Showcase Card - Mitad info (49% inferior) */}
      <div 
        className="absolute top-[51%] bottom-3 left-3 right-3 z-20 flex flex-col"
        style={{
          transform: `translateY(${(1 - Math.max(0, cardSpring)) * 25}px)`,
          opacity: Math.min(1, Math.max(0, cardSpring)),
        }}
      >
        <div className="h-full w-full p-5 sm:p-6 rounded-3xl bg-black/85 backdrop-blur-2xl border border-white/20 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.9)] flex flex-col justify-between">
          
          {/* Top Badges Row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold text-white/90 bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-xl uppercase tracking-wider">
              {customBadge1 || vehicle.year}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-white/90 bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-xl uppercase tracking-wider">
              {customBadge2 || vehicle.km}
            </span>
            {customBadge3 && (
              <span className="text-xs sm:text-sm font-semibold tracking-wider text-slate-300 bg-white/5 backdrop-blur-md border border-white/15 px-3.5 py-1.5 rounded-xl uppercase">
                {customBadge3}
              </span>
            )}
          </div>

          <div className="py-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-1">
              {vehicle.brand} • SELECCIÓN EXCLUSIVA
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white uppercase leading-snug drop-shadow-md">
              {vehicle.title}
            </h2>
          </div>

          {/* Anticipo Banner */}
          {showAnticipo && vehicle.anticipo && (
            <div className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md text-white shadow-lg">
              <span className="text-[11px] uppercase tracking-widest text-emerald-400 block font-bold mb-0.5">
                Financiación a Medida
              </span>
              <span className="text-base sm:text-lg font-bold text-slate-100">
                {vehicle.anticipo}
              </span>
            </div>
          )}

          {/* Price & Trade-in */}
          <div className="pt-3.5 border-t border-white/15 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase tracking-widest text-slate-400 block font-semibold">
                Inversión Contado
              </span>
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow">
                {vehicle.price}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs uppercase tracking-widest text-slate-400 block font-semibold">
                Permutas
              </span>
              <span className="text-sm sm:text-base font-semibold text-slate-200">
                Tomamos tu Usado
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
