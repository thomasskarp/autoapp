'use client'

import React from 'react'
import { Img, interpolate, useCurrentFrame } from 'remotion'

interface KenBurnsImageProps {
  src: string
  index: number
  durationInFrames: number
  fitMode?: 'contain' | 'cover'
  className?: string
}

export const KenBurnsImage: React.FC<KenBurnsImageProps> = ({
  src,
  index,
  durationInFrames,
  fitMode = 'contain',
  className = '',
}) => {
  const frame = useCurrentFrame()

  // Direction alternation for dynamic visual flow
  const isEven = index % 2 === 0
  const isThird = index % 3 === 0

  const scale = interpolate(
    frame,
    [0, durationInFrames],
    isEven ? [1.0, 1.12] : [1.12, 1.0],
    { extrapolateRight: 'clamp' }
  )

  const translateX = interpolate(
    frame,
    [0, durationInFrames],
    isThird ? [-15, 15] : isEven ? [10, -10] : [-8, 8],
    { extrapolateRight: 'clamp' }
  )

  const translateY = interpolate(
    frame,
    [0, durationInFrames],
    isEven ? [5, -5] : [-5, 5],
    { extrapolateRight: 'clamp' }
  )

  return (
    <div className={`relative w-full h-full overflow-hidden bg-black ${className}`}>
      {/* Ambient background with heavy blur to eliminate black bars gracefully */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Img
          src={src}
          style={{
            transform: `scale(${scale * 1.35}) translate(${translateX * 0.5}px, ${translateY * 0.5}px) translateZ(0)`,
            willChange: 'transform',
            filter: 'blur(20px) brightness(0.42) saturate(1.3)',
            objectFit: 'cover',
            width: '100%',
            height: '100%',
          }}
        />
        {/* Subtle dark vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/75" />
      </div>

      {/* Main crisp car image with subtle cinematic zoom */}
      <div className="relative z-10 w-full h-full flex items-center justify-center p-2">
        <Img
          src={src}
          style={{
            transform: `scale(${scale}) translate(${translateX}px, ${translateY}px) translateZ(0)`,
            willChange: 'transform',
            objectFit: fitMode === 'cover' ? 'cover' : 'contain',
            width: '100%',
            height: '100%',
            borderRadius: fitMode === 'contain' ? '18px' : '0px',
          }}
        />
      </div>
    </div>
  )
}
