'use client'

import React from 'react'
import { TemplateOverlayProps } from '../types'
import { WhatsAppIcon, LocationPinIcon } from '../elements/Icons'

export const RedImpactTemplate: React.FC<TemplateOverlayProps> = ({
  vehicle,
  agency,
  customBadge1,
  customBadge2,
  customBadge3,
  showAnticipo = true,
  showPrice = true,
}) => {
  // Format vehicle price & financing options
  const numericPrice = typeof vehicle.price === 'string'
    ? parseFloat(vehicle.price.replace(/[^0-9.-]/g, '')) || 0
    : vehicle.price || 0

  const formatMoney = (amount: number) => {
    if (!amount || amount <= 0) return 'Consultar'
    return `$${Math.round(amount).toLocaleString('es-AR')}`
  }

  // Parse raw anticipo or compute defaults
  const parseAnticipoNum = () => {
    if (vehicle.anticipo) {
      const num = parseFloat(vehicle.anticipo.replace(/[^0-9.-]/g, ''))
      if (!isNaN(num) && num > 0) return num
    }
    return numericPrice > 0 ? numericPrice * 0.5 : 15000000
  }

  const baseAnticipo = parseAnticipoNum()

  // Financing options calculations matching flyer format
  const opt1 = {
    entrega: baseAnticipo,
    cuotas: 12,
    montoCuota: numericPrice > baseAnticipo ? Math.round((numericPrice - baseAnticipo) / 12) : 2250000
  }

  const opt2 = {
    entrega: Math.round(baseAnticipo * 1.05),
    cuotas: 18,
    montoCuota: numericPrice > baseAnticipo ? Math.round((numericPrice - baseAnticipo) / 18) : 1445000
  }

  const opt3 = {
    entrega: Math.round(baseAnticipo * 1.25),
    cuotas: 24,
    montoCuota: numericPrice > baseAnticipo ? Math.round((numericPrice - baseAnticipo) / 24) : 792000
  }

  const photos = vehicle.photos && vehicle.photos.length > 0 ? vehicle.photos : []
  const photo1 = photos[0] || '/images/placeholder-car.jpg'
  const photo2 = photos[1] || photos[0] || '/images/placeholder-car.jpg'

  const brandText = (vehicle.brand || '').toUpperCase()
  const modelText = (vehicle.model || vehicle.title || '').toUpperCase()
  const versionText = (vehicle.version || customBadge1 || `${vehicle.year || 2026}`).toUpperCase()

  return (
    <div className="relative w-full h-full bg-[#0B132B] text-white font-sans select-none overflow-hidden flex flex-col justify-between p-4 sm:p-5">
      {/* Background Neon Dark Blue & Silver Ambient Accents */}
      <div className="absolute inset-0 pointer-events-none opacity-40 z-0">
        <div className="absolute -top-10 -left-10 w-56 h-56 bg-blue-600/30 blur-3xl rounded-full" />
        <div className="absolute top-1/2 -right-10 w-64 h-64 bg-indigo-600/25 blur-3xl rounded-full" />
        <div className="absolute -bottom-10 left-1/3 w-64 h-64 bg-sky-600/30 blur-3xl rounded-full" />
        {/* Top left sharp blue line */}
        <div className="absolute top-0 left-0 w-36 h-1 bg-gradient-to-r from-blue-500 via-sky-400 to-transparent" />
        <div className="absolute top-0 left-0 w-1 h-36 bg-gradient-to-b from-blue-500 via-sky-400 to-transparent" />
        {/* Top right sharp blue line */}
        <div className="absolute top-0 right-0 w-36 h-1 bg-gradient-to-l from-blue-500 via-sky-400 to-transparent" />
        <div className="absolute top-0 right-0 w-1 h-36 bg-gradient-to-b from-blue-500 via-sky-400 to-transparent" />
      </div>

      {/* 1. Header: Logo Okmmotors arriba + Marca + Modelo + Versión */}
      <div className="relative z-10 flex flex-col items-center text-center gap-1.5 pt-1">
        {/* Logo okmmotors arriba (donde decía 865 cars) */}
        <img
          src={agency.logoUrl || '/okmmotors_oval_logo.png'}
          alt={agency.name || 'Okmmotors'}
          className="h-12 sm:h-14 w-auto object-contain drop-shadow-[0_4px_16px_rgba(59,130,246,0.6)]"
        />

        {/* Marca, Modelo y Versión (Valores autorellenados dinámicamente) */}
        <div className="flex flex-col items-center mt-1">
          {brandText && (
            <span className="text-xl sm:text-2xl font-black text-[#E2E8F0] tracking-widest leading-none drop-shadow-md">
              {brandText}
            </span>
          )}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#3B82F6] tracking-tight uppercase leading-none drop-shadow-[0_4px_20px_rgba(37,99,235,0.7)] my-1">
            {modelText}
          </h1>
          {versionText && (
            <div className="mt-1 px-4 py-1 bg-[#1E293B]/90 border border-blue-400/50 rounded-md text-xs sm:text-sm font-extrabold text-[#F8FAFC] uppercase tracking-wider shadow-lg">
              {versionText}
            </div>
          )}
        </div>
      </div>

      {/* 2. Middle: Dos Fotos del Auto Apiladas Verticalmente (Vista Estática de Folleto) */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-2 my-2">
        {/* Top Photo */}
        <div className="relative w-full h-[46%] rounded-2xl overflow-hidden border-2 border-blue-500/40 shadow-[0_8px_25px_rgba(0,0,0,0.85)] bg-[#1E293B]/60">
          <img
            src={photo1}
            alt="Foto Vista 1"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 ring-1 ring-inset ring-blue-400/30 rounded-2xl pointer-events-none" />
        </div>

        {/* Bottom Photo */}
        <div className="relative w-full h-[46%] rounded-2xl overflow-hidden border-2 border-blue-500/40 shadow-[0_8px_25px_rgba(0,0,0,0.85)] bg-[#1E293B]/60">
          <img
            src={photo2}
            alt="Foto Vista 2"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 ring-1 ring-inset ring-blue-400/30 rounded-2xl pointer-events-none" />
        </div>
      </div>

      {/* 3. Banner "ENTREGA INMEDIATA" (Azul Oscuro y Gris Claro) */}
      <div className="relative z-10 w-full my-1">
        <div className="w-full bg-gradient-to-r from-[#0F172A] via-[#1E3A8A] to-[#0F172A] border-y-2 border-blue-400 py-2 sm:py-2.5 px-4 text-center shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2">
          <span className="text-lg sm:text-2xl font-black uppercase text-[#E2E8F0] tracking-wider">
            ENTREGA
          </span>
          <span className="text-lg sm:text-2xl font-black uppercase text-[#0B132B] italic tracking-wider bg-[#F8FAFC] px-2 py-0.5 rounded shadow">
            INMEDIATA
          </span>
        </div>
      </div>

      {/* 4. Varias Formas de Financiación (3 Cajas en Azul Oscuro y Gris Claro) */}
      <div className="relative z-10 grid grid-cols-3 gap-2 my-1">
        {/* Card 1: 12 Cuotas */}
        <div className="bg-[#0F172A]/90 border-2 border-[#3B82F6] rounded-xl p-2 sm:p-2.5 text-center flex flex-col justify-between shadow-[0_0_15px_rgba(59,130,246,0.3)]">
          <span className="text-[10px] sm:text-xs font-bold text-[#94A3B8] uppercase">ENTREGA</span>
          <span className="text-xs sm:text-sm lg:text-base font-black text-[#60A5FA] leading-tight my-0.5">
            {formatMoney(opt1.entrega)}
          </span>
          <div className="border-t border-blue-900/60 pt-1 mt-0.5">
            <span className="text-[10px] sm:text-xs font-bold text-[#F8FAFC] block leading-tight">12 CUOTAS FIJAS</span>
            <span className="text-[10px] sm:text-xs font-black text-[#60A5FA] block">SIN INTERÉS</span>
            <span className="text-[9px] sm:text-[10px] font-bold text-[#CBD5E1] block mt-0.5">
              {formatMoney(opt1.montoCuota)} <span className="text-[8px] text-[#94A3B8]">+ SEGURO</span>
            </span>
          </div>
        </div>

        {/* Card 2: 18 Cuotas */}
        <div className="bg-[#0F172A]/90 border-2 border-[#3B82F6] rounded-xl p-2 sm:p-2.5 text-center flex flex-col justify-between shadow-[0_0_15px_rgba(59,130,246,0.3)]">
          <span className="text-[10px] sm:text-xs font-bold text-[#94A3B8] uppercase">ENTREGA</span>
          <span className="text-xs sm:text-sm lg:text-base font-black text-[#60A5FA] leading-tight my-0.5">
            {formatMoney(opt2.entrega)}
          </span>
          <div className="border-t border-blue-900/60 pt-1 mt-0.5">
            <span className="text-[10px] sm:text-xs font-bold text-[#F8FAFC] block leading-tight">18 CUOTAS FIJAS</span>
            <span className="text-[10px] sm:text-xs font-black text-[#60A5FA] block">SIN INTERÉS</span>
            <span className="text-[9px] sm:text-[10px] font-bold text-[#CBD5E1] block mt-0.5">
              {formatMoney(opt2.montoCuota)} <span className="text-[8px] text-[#94A3B8]">+ SEGURO</span>
            </span>
          </div>
        </div>

        {/* Card 3: 24 Cuotas */}
        <div className="bg-[#0F172A]/90 border-2 border-[#3B82F6] rounded-xl p-2 sm:p-2.5 text-center flex flex-col justify-between shadow-[0_0_15px_rgba(59,130,246,0.3)]">
          <span className="text-[10px] sm:text-xs font-bold text-[#94A3B8] uppercase">ENTREGA</span>
          <span className="text-xs sm:text-sm lg:text-base font-black text-[#60A5FA] leading-tight my-0.5">
            {formatMoney(opt3.entrega)}
          </span>
          <div className="border-t border-blue-900/60 pt-1 mt-0.5">
            <span className="text-[10px] sm:text-xs font-bold text-[#F8FAFC] block leading-tight">24 CUOTAS FIJAS</span>
            <span className="text-[10px] sm:text-xs font-black text-[#60A5FA] block">SIN INTERÉS</span>
            <span className="text-[9px] sm:text-[10px] font-bold text-[#CBD5E1] block mt-0.5">
              {formatMoney(opt3.montoCuota)} <span className="text-[8px] text-[#94A3B8]">+ SEGURO</span>
            </span>
          </div>
        </div>
      </div>

      {/* 5. Footer: Número de WhatsApp + Resistencia, Chaco */}
      <div className="relative z-10 w-full pt-2 border-t border-blue-900/50 flex items-center justify-center gap-3 text-xs sm:text-sm font-extrabold text-[#F8FAFC]">
        <div className="flex items-center gap-1.5 text-[#25D366]">
          <WhatsAppIcon className="w-4 h-4 text-[#25D366] fill-current flex-shrink-0" />
          <span className="text-[#F8FAFC] font-black tracking-wider">
            {agency.whatsapp || '3624-750716'}
          </span>
        </div>

        <span className="text-[#60A5FA] font-bold">|</span>

        <div className="flex items-center gap-1.5 text-[#60A5FA]">
          <LocationPinIcon className="w-4 h-4 text-[#60A5FA] flex-shrink-0" />
          <span className="text-[#F8FAFC] font-black tracking-wider">
            {agency.address || 'Resistencia, Chaco'}
          </span>
        </div>
      </div>
    </div>
  )
}
