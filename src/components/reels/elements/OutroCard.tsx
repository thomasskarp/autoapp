'use client'

import React from 'react'
import { spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { AgencyReelData } from '../types'
import { WhatsAppIcon, LocationPinIcon } from './Icons'

interface OutroCardProps {
  agency: AgencyReelData
  accentColor?: string
  bgPhotoUrl?: string
}

export const OutroCard: React.FC<OutroCardProps> = ({
  agency,
  accentColor = '#10B981',
  bgPhotoUrl,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Spring animations for staggered entry
  const logoSpring = spring({ frame, fps, config: { damping: 12, stiffness: 120 } })
  const titleSpring = spring({ frame: frame - 6, fps, config: { damping: 14, stiffness: 110 } })
  const bulletsSpring = spring({ frame: frame - 12, fps, config: { damping: 14, stiffness: 100 } })
  const buttonSpring = spring({ frame: frame - 18, fps, config: { damping: 10, stiffness: 140 } })

  return (
    <div className="relative w-full h-full bg-black flex flex-col items-center justify-between p-8 text-white select-none overflow-hidden">
      {/* Background: Foto del auto borrosa que genera iluminación ambiental */}
      {bgPhotoUrl ? (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bgPhotoUrl}
            alt=""
            style={{
              transform: 'scale(1.35) translateZ(0)',
              willChange: 'transform',
              filter: 'blur(22px) brightness(1.0) saturate(1.25)',
              objectFit: 'cover',
              width: '100%',
              height: '100%',
            }}
          />
          {/* Soft ambient lighting overlay */}
          <div className="absolute inset-0 bg-black/35 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/20 to-black/75 pointer-events-none" />
        </div>
      ) : (
        <div 
          className="absolute -top-24 -left-24 w-80 h-80 rounded-full opacity-25 blur-3xl pointer-events-none"
          style={{ backgroundColor: accentColor }}
        />
      )}

      {/* Top Header / Logo Section: Agrandado y un poco más abajo */}
      <div 
        className="w-full flex flex-col items-center mt-12 sm:mt-14 relative z-10"
        style={{
          transform: `scale(${Math.max(0, logoSpring)})`,
          opacity: Math.min(1, Math.max(0, logoSpring)),
        }}
      >
        {agency.logoUrl ? (
          <img
            src={agency.logoUrl}
            alt={agency.name || 'Okmmotors'}
            className="h-24 sm:h-28 max-w-[280px] object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.8)] filter brightness-105"
          />
        ) : (
          <div className="px-6 py-2.5 rounded-full bg-gradient-to-r from-slate-800 to-slate-900 border border-white/20 shadow-xl">
            <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-white via-slate-200 to-white bg-clip-text text-transparent">
              {agency.name.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Center Hook & Value Bullets */}
      <div className="w-full flex flex-col items-center my-auto space-y-5 max-w-[94%] relative z-10">
        {/* Título: ¡CONSULTÁ POR TU 0KM A TASA 0%! */}
        <div 
          className="text-center"
          style={{
            transform: `translateY(${(1 - Math.max(0, titleSpring)) * 30}px)`,
            opacity: Math.min(1, Math.max(0, titleSpring)),
          }}
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight uppercase text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.9)]">
            ¡Consultá por tu 0KM <br />
            <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">a tasa 0%!</span>
          </h2>
        </div>

        {/* Cuadrito de información comercial */}
        <div 
          className="w-full bg-slate-950/85 border border-slate-300/30 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 space-y-3 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col items-center text-center"
          style={{
            transform: `scale(${Math.max(0, bulletsSpring)})`,
            opacity: Math.min(1, Math.max(0, bulletsSpring)),
          }}
        >
          <div className="text-sm sm:text-base font-bold text-slate-100 tracking-wide">
            0km y Usados Multimarca.
          </div>

          <div className="text-sm sm:text-base font-bold text-slate-100 tracking-wide">
            Entrega inmediata
          </div>

          <div className="text-sm sm:text-base font-bold text-slate-100 tracking-wide">
            Financiaciones a medida
          </div>

          <div className="text-sm sm:text-base font-bold text-slate-100 tracking-wide">
            Tomamos tu vehículo usado.
          </div>

          {/* Separador y datos destacados con iconos oficiales */}
          <div className="w-full border-t border-white/15 pt-3 mt-1 flex flex-col items-center gap-2">
            <div className="text-base sm:text-lg lg:text-xl font-black text-white uppercase tracking-wider flex items-center justify-center gap-2">
              <LocationPinIcon className="w-5 h-5 text-slate-300 flex-shrink-0" />
              <span>Resistencia, Chaco</span>
            </div>

            <div className="text-lg sm:text-xl lg:text-2xl font-black text-white tracking-tight drop-shadow flex items-center justify-center gap-2.5">
              <WhatsAppIcon className="w-6 h-6 text-[#25D366] fill-current flex-shrink-0" />
              <span>WhatsApp 3624 - 750716</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA Button & Handles */}
      <div 
        className="w-full flex flex-col items-center mb-6 space-y-3 relative z-10"
        style={{
          transform: `scale(${Math.max(0, buttonSpring)})`,
          opacity: Math.min(1, Math.max(0, buttonSpring)),
        }}
      >
        <div 
          className="w-full py-3.5 sm:py-4 px-6 rounded-2xl shadow-[0_10px_25px_rgba(255,255,255,0.25)] flex items-center justify-center gap-2.5 font-black text-sm sm:text-base uppercase tracking-wider text-slate-950 border-2 border-white bg-gradient-to-r from-slate-100 via-white to-slate-200"
        >
          <WhatsAppIcon className="w-5 h-5 text-[#25D366] fill-current" />
          <span>ENVIANOS UN MENSAJE DIRECTO</span>
        </div>

        <p className="text-xs text-slate-300 font-medium tracking-wide">
          {agency.facebook ? (
            <>Seguinos en Facebook: <span className="text-white font-semibold">{agency.facebook}</span></>
          ) : (
            <>Seguinos en Instagram: <span className="text-white font-semibold">{agency.instagram || '@okmmotors'}</span></>
          )}
        </p>
      </div>
    </div>
  )
}
