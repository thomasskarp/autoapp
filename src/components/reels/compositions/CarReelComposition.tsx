'use client'

import React from 'react'
import { Audio, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { CarReelCompositionProps, TemplateOverlayProps } from '../types'
import { ContinuousPhotoSlider } from '../elements/ContinuousPhotoSlider'
import { SportImpactTemplate } from '../templates/SportImpactTemplate'
import { LuxuryTemplate } from '../templates/LuxuryTemplate'
import { FinancingTemplate } from '../templates/FinancingTemplate'
import { CleanSocialTemplate } from '../templates/CleanSocialTemplate'
import { OutroCard } from '../elements/OutroCard'

export const CarReelComposition: React.FC<CarReelCompositionProps> = ({
  vehicle,
  agency,
  templateId,
  fitMode = 'contain',
  slideDurationInSeconds = 1.4,
  outroDurationInSeconds = 3.0,
  showAnticipo = true,
  showPrice = true,
  customBadge1,
  customBadge2,
  customBadge3,
  musicTrackUrl,
  musicVolume = 0.6,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const slideFrames = Math.max(15, Math.round(slideDurationInSeconds * fps))
  const outroFrames = Math.max(30, Math.round(outroDurationInSeconds * fps))

  const photos = vehicle.photos && vehicle.photos.length > 0 
    ? vehicle.photos 
    : ['/images/placeholder-car.jpg']

  const totalPhotos = photos.length
  const photosTotalFrames = totalPhotos * slideFrames
  const isOutro = frame >= photosTotalFrames

  // Smooth outro slide entrance during final segment
  const outroSpring = spring({
    frame: frame - photosTotalFrames,
    fps,
    config: { damping: 14, stiffness: 120 },
  })

  const overlayProps: TemplateOverlayProps = {
    vehicle,
    agency,
    customBadge1,
    customBadge2,
    customBadge3,
    showAnticipo,
    showPrice,
  }

  const renderOverlay = () => {
    switch (templateId) {
      case 'luxury-elegance':
        return <LuxuryTemplate {...overlayProps} />
      case 'oportunidad-financiacion':
        return <FinancingTemplate {...overlayProps} />
      case 'clean-social':
        return <CleanSocialTemplate {...overlayProps} />
      case 'sport-impact':
      default:
        return <SportImpactTemplate {...overlayProps} />
    }
  }

  const getAccentColor = () => {
    switch (templateId) {
      case 'luxury-elegance':
        return '#CBD5E1'
      case 'oportunidad-financiacion':
        return '#10B981'
      case 'clean-social':
        return '#3B82F6'
      case 'sport-impact':
      default:
        return '#FACC15'
    }
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none">
      {/* Optional Background Music Track */}
      {musicTrackUrl && (
        <Audio src={musicTrackUrl} volume={musicVolume} />
      )}

      {/* 1. Continuous Photo Slideshow (INSTANT transition, ZERO black screen gap) */}
      <div className="absolute inset-0 z-0">
        <ContinuousPhotoSlider
          photos={photos}
          slideFrames={slideFrames}
          fitMode={fitMode}
        />
      </div>

      {/* 2. Persistent Vehicle Info & Badges Overlay (STAYS ON SCREEN ENTIRE VIDEO) */}
      <div 
        className="absolute inset-0 z-20 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: isOutro ? Math.max(0, 1 - outroSpring) : 1,
        }}
      >
        {renderOverlay()}
      </div>

      {/* 3. Dealership Outro Screen (Appears smoothly during final outro segment) */}
      {isOutro && (
        <div 
          className="absolute inset-0 z-30 pointer-events-auto"
          style={{
            transform: `translateY(${(1 - Math.max(0, outroSpring)) * 40}px)`,
            opacity: Math.min(1, Math.max(0, outroSpring)),
          }}
        >
          <OutroCard 
            agency={agency} 
            accentColor={getAccentColor()} 
            bgPhotoUrl={photos[0]}
          />
        </div>
      )}
    </div>
  )
}
