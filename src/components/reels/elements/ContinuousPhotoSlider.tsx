'use client'

import React from 'react'
import { interpolate, useCurrentFrame } from 'remotion'

interface ContinuousPhotoSliderProps {
  photos: string[]
  slideFrames: number
  fitMode?: 'contain' | 'cover'
}

export const ContinuousPhotoSlider: React.FC<ContinuousPhotoSliderProps> = ({
  photos,
  slideFrames,
  fitMode = 'contain',
}) => {
  const frame = useCurrentFrame()

  // Guard against empty photos
  const safePhotos = photos && photos.length > 0 ? photos : ['/images/placeholder-car.jpg']
  const totalPhotos = safePhotos.length

  // Current photo index and local progress inside the current slide
  const activeIndex = Math.min(Math.floor(frame / slideFrames), totalPhotos - 1)
  const localFrame = frame % slideFrames

  // Alternate Ken Burns direction based on photo index
  const isEven = activeIndex % 2 === 0
  const isThird = activeIndex % 3 === 0

  const scale = interpolate(
    localFrame,
    [0, slideFrames],
    isEven ? [1.0, 1.08] : [1.08, 1.0],
    { extrapolateRight: 'clamp' }
  )

  const translateX = interpolate(
    localFrame,
    [0, slideFrames],
    isThird ? [-10, 10] : isEven ? [6, -6] : [-5, 5],
    { extrapolateRight: 'clamp' }
  )

  const translateY = interpolate(
    localFrame,
    [0, slideFrames],
    isEven ? [3, -3] : [-3, 3],
    { extrapolateRight: 'clamp' }
  )

  return (
    <div className="relative w-full h-full overflow-hidden bg-black select-none">
      {safePhotos.map((photoUrl, idx) => {
        const isActive = idx === activeIndex
        const isPrevious = idx === activeIndex - 1

        // Keep active photo and previous photo visible to prevent ANY black gap/flicker
        if (!isActive && !isPrevious) {
          return (
            <div key={`${photoUrl}-${idx}`} className="hidden" aria-hidden="true">
              {/* Invisible preload so browser never has decode delay */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="" className="hidden" loading="eager" />
            </div>
          )
        }

        const currentScale = isActive ? scale : 1.0
        const currentTranslateX = isActive ? translateX : 0
        const currentTranslateY = isActive ? translateY : 0
        const zIndex = isActive ? 10 : 5

        return (
          <div
            key={`${photoUrl}-${idx}`}
            className="absolute inset-0 w-full h-full overflow-hidden transition-none"
            style={{
              zIndex,
              opacity: 1,
            }}
          >
            {/* Ambient luminous blurred background ("fondo borroso que solo haga luz") */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt=""
                style={{
                  transform: `scale(${currentScale * 1.3}) translate(${currentTranslateX * 0.3}px, ${currentTranslateY * 0.3}px) translateZ(0)`,
                  willChange: 'transform',
                  filter: 'blur(20px) brightness(1.05) saturate(1.25)',
                  objectFit: 'cover',
                  width: '100%',
                  height: '100%',
                }}
              />
              {/* Soft luminous light diffuser without dark gradient */}
              <div className="absolute inset-0 bg-black/15 pointer-events-none" />
            </div>

            {/* Main vehicle photo: Centrada con margencito arriba y margencito abajo */}
            <div
              className={`absolute z-10 inset-x-0 ${
                fitMode === 'cover'
                  ? 'top-0 bottom-0 flex items-center justify-center'
                  : 'top-14 sm:top-16 bottom-[47%] flex items-center justify-center px-[4%] py-1'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt=""
                className="rounded-2xl"
                style={{
                  transform: `scale(${currentScale}) translate(${currentTranslateX}px, ${currentTranslateY}px) translateZ(0)`,
                  willChange: 'transform',
                  objectFit: fitMode === 'cover' ? 'cover' : 'contain',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  filter: 'drop-shadow(0 16px 36px rgba(0, 0, 0, 0.8)) drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5))',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
