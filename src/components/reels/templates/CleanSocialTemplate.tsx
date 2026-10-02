'use client'

import React from 'react'
import { spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { TemplateOverlayProps } from '../types'

export const CleanSocialTemplate: React.FC<TemplateOverlayProps> = ({
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

  const popSpring = spring({ frame, fps, config: { damping: 14, stiffness: 120 } })

  return (
    <div className="relative w-full h-full pointer-events-none font-sans select-none overflow-hidden">
      {/* Top Header Floating Pill */}
      <div 
        className="absolute top-12 left-6 z-20"
        style={{
          transform: `translateY(${(1 - Math.max(0, popSpring)) * -20}px)`,
          opacity: Math.min(1, Math.max(0, popSpring)),
        }}
      >
        <div className="bg-black/70 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 flex items-center space-x-2 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-xs font-bold text-white tracking-wide">
            @{agency.instagram.replace(/^@/, '')}
          </span>
        </div>
      </div>

      {/* Social Safe-Zone Overlays: Positioned mid-bottom to avoid TikTok captions & buttons - PERSISTENT */}
      <div 
        className="absolute bottom-28 left-6 right-16 z-20 flex flex-col space-y-2"
        style={{
          transform: `scale(${Math.max(0, popSpring)})`,
          opacity: Math.min(1, Math.max(0, popSpring)),
        }}
      >
        <div className="bg-black/80 backdrop-blur-lg px-4 py-3 rounded-2xl border border-white/20 shadow-xl max-w-full">
          <h2 className="text-xl font-black text-white uppercase tracking-tight leading-snug">
            {vehicle.title}
          </h2>

          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="bg-white/20 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-md">
              {customBadge1 || vehicle.year}
            </span>
            <span className="bg-white/20 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-md">
              {customBadge2 || vehicle.km}
            </span>
            {customBadge3 && (
              <span className="bg-blue-500/30 text-blue-200 border border-blue-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
                {customBadge3}
              </span>
            )}
          </div>

          {(showPrice || showAnticipo) && (
            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
              {showPrice && vehicle.price && (
                <span className="text-base font-black text-yellow-400">
                  {vehicle.price}
                </span>
              )}
              {showAnticipo && vehicle.anticipo && (
                <span className="text-[11px] font-bold text-slate-300">
                  {vehicle.anticipo}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
