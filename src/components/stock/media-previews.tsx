'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Download, Copy, CheckCircle2, Upload, ChevronLeft, ChevronRight,
  Play, Pause, Volume2, VolumeX, Loader2, Sparkles, X, Plus, Trash2,
  Film, Video as VideoIcon, Image as ImageIcon, Star, Check, Smartphone,
  Layers, Maximize2
} from 'lucide-react'
import { Vehicle } from '@/lib/supabase/types'
import { VehiclePhotoBook, VehicleReelItem, VehicleVideoItem } from './vehicle-media-books'

// ─── PHOTO BOOK PREVIEW COMPONENT ───────────────────────────────────────────────

interface PhotoBookPreviewProps {
  currentPhoto: string
  photos: string[]
  currentPhotoIndex: number
  onSelectIndex: (idx: number) => void
  onAddPhotos: (files: FileList | File[]) => void
  onDeletePhoto?: (idx: number) => void
  targetPlatform?: string | null
}

export function PhotoBookPreview({
  currentPhoto,
  photos,
  currentPhotoIndex,
  onSelectIndex,
  onAddPhotos,
  onDeletePhoto,
  targetPlatform
}: PhotoBookPreviewProps) {
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16'>('1:1')
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Default to 9:16 for Stories or TikTok, else 1:1
  useEffect(() => {
    if (targetPlatform === 'IG_STORY' || targetPlatform === 'TIKTOK') {
      setAspectRatio('9:16')
    } else {
      setAspectRatio('1:1')
    }
  }, [targetPlatform])

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (photos.length <= 1) return
    const nextIdx = (currentPhotoIndex - 1 + photos.length) % photos.length
    onSelectIndex(nextIdx)
  }

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (photos.length <= 1) return
    const nextIdx = (currentPhotoIndex + 1) % photos.length
    onSelectIndex(nextIdx)
  }

  const handleDownload = async () => {
    if (!currentPhoto) return
    try {
      setDownloading(true)
      const res = await fetch(currentPhoto)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `foto_${currentPhotoIndex + 1}_Okmmotors.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      // Fallback
      window.open(currentPhoto, '_blank')
    } finally {
      setDownloading(false)
    }
  }

  const handleCopy = async () => {
    if (!currentPhoto) return
    try {
      const res = await fetch(currentPhoto)
      const blob = await res.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type || 'image/png']: blob })
      ])
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (e) {
      try {
        await navigator.clipboard.writeText(currentPhoto)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      } catch (err) {
        console.warn('Clipboard write error:', err)
      }
    }
  }

  const isPortada = currentPhotoIndex === 0

  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0 mx-auto">
      {/* Photo Container matching 1:1 or 9:16 */}
      {aspectRatio === '1:1' ? (
        <div
          className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-[#2A2F45] bg-[#060F1E] flex items-center justify-center transition-all hover:border-[#60A5FA50] group"
          style={{ width: '320px', height: '320px' }}>
          
          {/* Ambient blurred background */}
          {currentPhoto && (
            <img
              src={currentPhoto}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-xl scale-125 opacity-50 pointer-events-none select-none"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#040A14E8] via-black/25 to-[#040A14E8] pointer-events-none select-none" />

          {/* Centered sharp photo */}
          {currentPhoto ? (
            <img
              src={currentPhoto}
              alt={`Foto ${currentPhotoIndex + 1}`}
              className="relative z-10 w-full h-full object-contain pointer-events-none select-none transition-transform duration-300"
            />
          ) : (
            <div className="relative z-10 flex flex-col items-center justify-center gap-2 text-[#8B8FA8]">
              <ImageIcon size={32} />
              <span className="text-xs">Sin fotos en este book</span>
            </div>
          )}

          {/* Top badges */}
          <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5">
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-black/70 text-white border border-white/20 backdrop-blur-sm shadow-md flex items-center gap-1">
              <ImageIcon size={10} />
              <span>{photos.length > 0 ? `${currentPhotoIndex + 1} / ${photos.length}` : '0 fotos'}</span>
            </span>
            {isPortada && photos.length > 0 && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#FACC15] text-black shadow-md flex items-center gap-1 border border-[#FACC15]">
                <Star size={9} fill="currentColor" /> PORTADA
              </span>
            )}
          </div>

          {/* Aspect Ratio Switcher */}
          <button
            type="button"
            onClick={() => setAspectRatio('9:16')}
            title="Cambiar a formato 9:16 vertical (Historias/TikTok)"
            className="absolute top-2.5 right-2.5 z-20 p-1 rounded-lg bg-black/70 hover:bg-black/90 text-white/80 hover:text-white border border-white/20 transition-all text-[10px] font-bold flex items-center gap-1">
            <Smartphone size={11} />
            <span>9:16</span>
          </button>

          {/* Navigation Arrows */}
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevPhoto}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition-all hover:scale-110 cursor-pointer shadow-lg">
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={nextPhoto}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition-all hover:scale-110 cursor-pointer shadow-lg">
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>
      ) : (
        /* 9:16 VERTICAL CONTAINER */
        <div
          className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-[#2A2F45] bg-[#070E1A] flex items-center justify-center transition-all hover:border-[#60A5FA50] group"
          style={{ width: '280px', height: '502px' }}>
          
          {/* Ambient blurred background */}
          {currentPhoto && (
            <img
              src={currentPhoto}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-xl scale-125 opacity-60 pointer-events-none select-none"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/80 pointer-events-none select-none" />

          {/* Centered photo */}
          {currentPhoto ? (
            <img
              src={currentPhoto}
              alt={`Foto ${currentPhotoIndex + 1}`}
              className="relative z-10 w-full h-full object-contain pointer-events-none select-none"
            />
          ) : (
            <div className="relative z-10 flex flex-col items-center justify-center gap-2 text-[#8B8FA8]">
              <ImageIcon size={32} />
              <span className="text-xs">Sin fotos</span>
            </div>
          )}

          {/* Top badges */}
          <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5">
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-black/70 text-white border border-white/20 backdrop-blur-sm shadow-md flex items-center gap-1">
              <ImageIcon size={10} />
              <span>{currentPhotoIndex + 1} / {photos.length}</span>
            </span>
            {isPortada && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#FACC15] text-black shadow-md flex items-center gap-1 border border-[#FACC15]">
                <Star size={9} fill="currentColor" /> PORTADA
              </span>
            )}
          </div>

          {/* Aspect Ratio Switcher */}
          <button
            type="button"
            onClick={() => setAspectRatio('1:1')}
            title="Cambiar a formato 1:1 cuadrado (Marketplace/Feed)"
            className="absolute top-2.5 right-2.5 z-20 p-1 rounded-lg bg-black/70 hover:bg-black/90 text-white/80 hover:text-white border border-white/20 transition-all text-[10px] font-bold flex items-center gap-1">
            <Maximize2 size={11} />
            <span>1:1</span>
          </button>

          {/* Navigation Arrows */}
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevPhoto}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition-all hover:scale-110 cursor-pointer shadow-lg">
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={nextPhoto}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition-all hover:scale-110 cursor-pointer shadow-lg">
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Mini Thumbnails Strip under preview */}
      {photos.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-1 w-full max-w-[320px] px-1">
          {photos.map((pUrl, idx) => {
            const isSelected = idx === currentPhotoIndex
            return (
              <div
                key={pUrl + idx}
                onClick={() => onSelectIndex(idx)}
                className={`w-11 h-11 rounded-lg flex-shrink-0 overflow-hidden cursor-pointer border transition-all relative ${
                  isSelected ? 'border-[#38BDF8] ring-2 ring-[#38BDF8]/50 scale-105' : 'border-[#1F2337] opacity-60 hover:opacity-100'
                }`}>
                <img src={pUrl} alt="" className="w-full h-full object-cover" />
                {idx === 0 && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#FACC15] rounded-tl-sm flex items-center justify-center">
                    <Star size={7} className="text-black" fill="currentColor" />
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Action Toolbar under photo matching Publicidad style */}
      <div className="flex flex-col gap-2 w-full max-w-[320px]">
        <div className="flex items-center gap-1.5 w-full">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || photos.length === 0}
            className="flex-1 py-2 px-2.5 rounded-xl text-xs font-black bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-lg transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50">
            {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            <span>{downloading ? 'Descargando...' : 'Descargar'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            disabled={photos.length === 0}
            className="py-2 px-2.5 rounded-xl text-xs font-black bg-[#1F2337] hover:bg-[#2A2F45] text-white border border-[#2A2F45] transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50">
            {copied ? <CheckCircle2 size={13} className="text-green-400" /> : <Copy size={13} />}
            <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Subir fotos adicionales a este book"
            className="py-2 px-2.5 rounded-xl text-xs font-black bg-[#1F2337] hover:bg-[#2A2F45] text-[#8B8FA8] hover:text-white border border-[#2A2F45] transition-all flex items-center justify-center gap-1 cursor-pointer">
            <Upload size={13} />
            <span>Subir</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onAddPhotos(e.target.files)
            }
          }}
        />
      </div>
    </div>
  )
}

// ─── REEL PREVIEW COMPONENT (9:16 VERTICAL) ────────────────────────────────────

interface ReelPreviewProps {
  reel: VehicleReelItem
  fallbackPhotos: string[]
  onOpenStudio?: () => void
  onUploadCustomVideo?: (file: File) => void
}

export function ReelPreview({
  reel,
  fallbackPhotos,
  onOpenStudio,
  onUploadCustomVideo
}: ReelPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(true)
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // Animated carousel when no video file exists
  useEffect(() => {
    if (reel.videoUrl) return
    if (fallbackPhotos.length === 0 || !isPlaying) return

    const timer = setInterval(() => {
      setCurrentSlideIdx((prev) => (prev + 1) % fallbackPhotos.length)
    }, 2200)

    return () => clearInterval(timer)
  }, [fallbackPhotos.length, isPlaying, reel.videoUrl])

  const togglePlay = () => {
    if (reel.videoUrl && videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play()
        setIsPlaying(true)
      } else {
        videoRef.current.pause()
        setIsPlaying(false)
      }
    } else {
      setIsPlaying(!isPlaying)
    }
  }

  const handleDownload = async () => {
    if (reel.videoUrl) {
      try {
        setDownloading(true)
        const res = await fetch(reel.videoUrl)
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${reel.name.replace(/\s+/g, '_')}_Okmmotors.mp4`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (e) {
        window.open(reel.videoUrl, '_blank')
      } finally {
        setDownloading(false)
      }
    } else if (onOpenStudio) {
      onOpenStudio()
    }
  }

  const handleCopy = async () => {
    if (reel.videoUrl) {
      try {
        await navigator.clipboard.writeText(reel.videoUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      } catch (e) {}
    } else {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const activePhoto = fallbackPhotos[currentSlideIdx] || fallbackPhotos[0] || ''

  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0 mx-auto">
      {/* 9:16 Vertical Reel Player (280x502px) */}
      <div
        onClick={togglePlay}
        className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-[#2A2F45] bg-[#070E1A] flex items-center justify-center transition-all hover:border-[#60A5FA50] cursor-pointer group"
        style={{ width: '280px', height: '502px' }}>

        {reel.videoUrl ? (
          <video
            ref={videoRef}
            src={reel.videoUrl}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          /* Animated Reel Slideshow */
          <div className="relative w-full h-full overflow-hidden bg-black">
            {activePhoto && (
              <img
                src={activePhoto}
                alt=""
                className="w-full h-full object-cover transition-all duration-1000 ease-in-out scale-105"
                style={{
                  transform: isPlaying ? 'scale(1.12)' : 'scale(1.02)',
                  transition: 'transform 2.2s ease-out'
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/60 pointer-events-none" />

            {/* Simulated Reel Overlay Badges */}
            <div className="absolute bottom-6 left-3 right-3 text-left pointer-events-none">
              <span className="text-[11px] font-black text-white px-2 py-0.5 rounded bg-blue-600 shadow-md">
                OKMMOTORS REEL
              </span>
              <p className="text-xs font-bold text-white mt-1 drop-shadow-md">
                {reel.name}
              </p>
            </div>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 pointer-events-none">
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-black/70 text-[#38BDF8] border border-[#38BDF8]/40 backdrop-blur-sm shadow-md flex items-center gap-1">
            <Film size={11} />
            <span>REEL 9:16</span>
          </span>
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#FACC15] text-black shadow-md">
            HD 60FPS
          </span>
        </div>

        {/* Mute button if videoUrl */}
        {reel.videoUrl && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsMuted(!isMuted)
            }}
            className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white border border-white/20 transition-all">
            {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
          </button>
        )}

        {/* Play / Pause Overlay Icon when hovered or paused */}
        <div className={`absolute inset-0 z-10 flex items-center justify-center transition-opacity ${
          !isPlaying ? 'opacity-100 bg-black/40' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <div className="w-12 h-12 rounded-full bg-black/70 border border-white/30 text-white flex items-center justify-center shadow-xl backdrop-blur-md">
            {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
          </div>
        </div>

        {/* Progress Timeline at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
          <div
            className="h-full bg-[#38BDF8] transition-all duration-300"
            style={{
              width: reel.videoUrl ? '100%' : `${((currentSlideIdx + 1) / Math.max(fallbackPhotos.length, 1)) * 100}%`
            }}
          />
        </div>
      </div>

      {/* Action Toolbar under Reel matching Publicidad style */}
      <div className="flex flex-col gap-2 w-full max-w-[280px]">
        <div className="flex items-center gap-1.5 w-full">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 py-2 px-2.5 rounded-xl text-xs font-black bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-lg transition-all flex items-center justify-center gap-1 cursor-pointer">
            {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            <span>{downloading ? 'Descargando...' : 'Descargar'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="py-2 px-2.5 rounded-xl text-xs font-black bg-[#1F2337] hover:bg-[#2A2F45] text-white border border-[#2A2F45] transition-all flex items-center justify-center gap-1 cursor-pointer">
            {copied ? <CheckCircle2 size={13} className="text-green-400" /> : <Copy size={13} />}
            <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Subir video MP4 para este reel"
            className="py-2 px-2.5 rounded-xl text-xs font-black bg-[#1F2337] hover:bg-[#2A2F45] text-[#8B8FA8] hover:text-white border border-[#2A2F45] transition-all flex items-center justify-center gap-1 cursor-pointer">
            <Upload size={13} />
            <span>Subir</span>
          </button>

          {onOpenStudio && (
            <button
              type="button"
              onClick={onOpenStudio}
              title="Abrir editor completo de Reels (Remotion Studio)"
              className="p-2 rounded-xl text-xs font-black bg-[#8B5CF620] hover:bg-[#8B5CF635] text-[#C4B5FD] border border-[#8B5CF640] transition-all flex items-center justify-center cursor-pointer">
              <Sparkles size={14} />
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4, video/webm, video/quicktime"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file && onUploadCustomVideo) {
              onUploadCustomVideo(file)
            }
          }}
        />
      </div>
    </div>
  )
}

// ─── VIDEO PREVIEW COMPONENT (1:1 / 16:9) ──────────────────────────────────────

interface VideoPreviewProps {
  video: VehicleVideoItem
  fallbackPhotos: string[]
  onUploadCustomVideo?: (file: File) => void
}

export function VideoPreview({
  video,
  fallbackPhotos,
  onUploadCustomVideo
}: VideoPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(true)
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (video.videoUrl) return
    if (fallbackPhotos.length === 0 || !isPlaying) return

    const timer = setInterval(() => {
      setCurrentSlideIdx((prev) => (prev + 1) % fallbackPhotos.length)
    }, 2400)

    return () => clearInterval(timer)
  }, [fallbackPhotos.length, isPlaying, video.videoUrl])

  const togglePlay = () => {
    if (video.videoUrl && videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play()
        setIsPlaying(true)
      } else {
        videoRef.current.pause()
        setIsPlaying(false)
      }
    } else {
      setIsPlaying(!isPlaying)
    }
  }

  const handleDownload = async () => {
    if (video.videoUrl) {
      try {
        setDownloading(true)
        const res = await fetch(video.videoUrl)
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${video.name.replace(/\s+/g, '_')}_Okmmotors.mp4`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (e) {
        window.open(video.videoUrl, '_blank')
      } finally {
        setDownloading(false)
      }
    }
  }

  const handleCopy = async () => {
    if (video.videoUrl) {
      try {
        await navigator.clipboard.writeText(video.videoUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      } catch (e) {}
    } else {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const activePhoto = fallbackPhotos[currentSlideIdx] || fallbackPhotos[0] || ''

  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0 mx-auto">
      {/* 1:1 Video Container (320x320px) */}
      <div
        onClick={togglePlay}
        className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-[#2A2F45] bg-[#060F1E] flex items-center justify-center transition-all hover:border-[#60A5FA50] cursor-pointer group"
        style={{ width: '320px', height: '320px' }}>

        {video.videoUrl ? (
          <video
            ref={videoRef}
            src={video.videoUrl}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          /* Animated Slideshow Showcase */
          <div className="relative w-full h-full overflow-hidden bg-black">
            {activePhoto && (
              <img
                src={activePhoto}
                alt=""
                className="w-full h-full object-cover transition-all duration-1000 ease-in-out scale-105"
                style={{
                  transform: isPlaying ? 'scale(1.10)' : 'scale(1.02)',
                  transition: 'transform 2.4s ease-out'
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/50 pointer-events-none" />

            <div className="absolute bottom-4 left-3 right-3 text-left pointer-events-none">
              <span className="text-[10px] font-black text-white px-2 py-0.5 rounded bg-blue-600 shadow-md">
                VIDEO PRESENTACIÓN
              </span>
              <p className="text-xs font-bold text-white mt-1 drop-shadow-md">
                {video.name}
              </p>
            </div>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 pointer-events-none">
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-black/70 text-[#38BDF8] border border-[#38BDF8]/40 backdrop-blur-sm shadow-md flex items-center gap-1">
            <VideoIcon size={11} />
            <span>VIDEO HD</span>
          </span>
        </div>

        {/* Mute button */}
        {video.videoUrl && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsMuted(!isMuted)
            }}
            className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white border border-white/20 transition-all">
            {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
          </button>
        )}

        {/* Play / Pause Overlay Icon */}
        <div className={`absolute inset-0 z-10 flex items-center justify-center transition-opacity ${
          !isPlaying ? 'opacity-100 bg-black/40' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <div className="w-12 h-12 rounded-full bg-black/70 border border-white/30 text-white flex items-center justify-center shadow-xl backdrop-blur-md">
            {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
          </div>
        </div>

        {/* Progress Timeline */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
          <div
            className="h-full bg-[#38BDF8] transition-all duration-300"
            style={{
              width: video.videoUrl ? '100%' : `${((currentSlideIdx + 1) / Math.max(fallbackPhotos.length, 1)) * 100}%`
            }}
          />
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col gap-2 w-full max-w-[320px]">
        <div className="flex items-center gap-1.5 w-full">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || !video.videoUrl}
            className="flex-1 py-2 px-2.5 rounded-xl text-xs font-black bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-lg transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50">
            {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            <span>{downloading ? 'Descargando...' : 'Descargar'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="py-2 px-2.5 rounded-xl text-xs font-black bg-[#1F2337] hover:bg-[#2A2F45] text-white border border-[#2A2F45] transition-all flex items-center justify-center gap-1 cursor-pointer">
            {copied ? <CheckCircle2 size={13} className="text-green-400" /> : <Copy size={13} />}
            <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Subir video para este vehículo"
            className="py-2 px-2.5 rounded-xl text-xs font-black bg-[#1F2337] hover:bg-[#2A2F45] text-[#8B8FA8] hover:text-white border border-[#2A2F45] transition-all flex items-center justify-center gap-1 cursor-pointer">
            <Upload size={13} />
            <span>Subir</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4, video/webm, video/quicktime"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file && onUploadCustomVideo) {
              onUploadCustomVideo(file)
            }
          }}
        />
      </div>
    </div>
  )
}

// ─── BOOK UPLOAD MODAL ──────────────────────────────────────────────────────────

interface BookUploadModalProps {
  vehicle: Vehicle | null
  onClose: () => void
  onSaveBook: (newBook: { name: string; photos: string[] }) => void
}

const BOOK_SUGGESTIONS = [
  'Book Exterior',
  'Book Interior',
  'Book Estudio',
  'Book Detalles',
  'Book Concesionaria',
  'Book 2'
]

export function BookUploadModal({ vehicle, onClose, onSaveBook }: BookUploadModalProps) {
  const [bookName, setBookName] = useState('Book Exterior')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFilesSelected = (files: FileList | File[]) => {
    const list = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (list.length === 0) return

    setSelectedFiles(prev => [...prev, ...list])
    list.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          setPreviews(prev => [...prev, e.target!.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemovePreview = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!bookName.trim()) {
      alert('Por favor ingresá un nombre para este book (ej: Book Exterior, Book 2).')
      return
    }
    if (selectedFiles.length === 0) {
      alert('Por favor seleccioná al menos 1 foto para el book.')
      return
    }

    try {
      setIsUploading(true)
      const uploadedUrls: string[] = []

      for (let i = 0; i < selectedFiles.length; i++) {
        setUploadProgress(`Subiendo foto ${i + 1} de ${selectedFiles.length}...`)
        const file = selectedFiles[i]

        const fd = new FormData()
        fd.append('file', file)
        fd.append('folder', 'books')
        fd.append('vehicleId', vehicle?.ID || 'vehicle')

        try {
          const res = await fetch('/api/media/upload-video', {
            method: 'POST',
            body: fd
          })
          const data = await res.json()
          if (data.success && data.publicUrl) {
            uploadedUrls.push(data.publicUrl)
          } else {
            // Fallback a base64 preview si falla la subida
            uploadedUrls.push(previews[i] || '')
          }
        } catch (err) {
          uploadedUrls.push(previews[i] || '')
        }
      }

      onSaveBook({
        name: bookName.trim(),
        photos: uploadedUrls.filter(Boolean)
      })
      onClose()
    } catch (err: any) {
      alert('Error guardando el book: ' + err.message)
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in"
      onClick={onClose}>
      <div
        className="w-full max-w-lg bg-[#13161F] border border-[#2A2F45] rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-left"
        onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1F2337]">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Layers size={18} className="text-[#38BDF8]" />
              <span>Cargar Nuevo Book de Fotos</span>
            </h3>
            <p className="text-xs text-[#8B8FA8] mt-0.5">
              {vehicle?.Marca} {vehicle?.Modelo} {vehicle?.Version || ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1E2130] text-[#8B8FA8] hover:text-white flex items-center justify-center transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Book Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#A0A5BD]">Nombre del Book</label>
          <input
            type="text"
            value={bookName}
            onChange={e => setBookName(e.target.value)}
            placeholder="ej: Book Exterior, Book Interior, Book 2"
            className="w-full bg-[#0B0D13] border border-[#2A2F45] focus:border-[#38BDF8] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none transition-colors"
          />

          {/* Quick Suggestions */}
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            {BOOK_SUGGESTIONS.map(sug => (
              <button
                key={sug}
                type="button"
                onClick={() => setBookName(sug)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all ${
                  bookName === sug
                    ? 'bg-[#38BDF8] text-black border-[#38BDF8]'
                    : 'bg-[#1A1F2C] text-[#8B8FA8] hover:text-white border-[#2A2F45]'
                }`}>
                {sug}
              </button>
            ))}
          </div>
        </div>

        {/* Upload Dropzone */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#A0A5BD]">Fotos del Book</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#2A334B] hover:border-[#38BDF8] bg-[#0E121B]/60 hover:bg-[#141A28] rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center group">
            <div className="w-10 h-10 rounded-xl bg-[#1E2638] text-[#38BDF8] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Hacé clic para seleccionar fotos</p>
              <p className="text-[11px] text-[#8B8FA8] mt-0.5">Podés seleccionar múltiples archivos (PNG, JPG, WEBP)</p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
            onChange={e => {
              if (e.target.files) handleFilesSelected(e.target.files)
            }}
          />
        </div>

        {/* Selected Photos Grid Preview */}
        {previews.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#86EFAC]">{previews.length} {previews.length === 1 ? 'foto seleccionada' : 'fotos seleccionadas'}</span>
              <button
                type="button"
                onClick={() => { setSelectedFiles([]); setPreviews([]) }}
                className="text-[11px] text-[#EF4444] hover:underline">
                Limpiar todas
              </button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-36 overflow-y-auto custom-scrollbar p-1 bg-[#0B0D13] rounded-xl border border-[#1F2337]">
              {previews.map((src, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-[#2A2F45] group">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePreview(idx)}
                    className="absolute top-1 right-1 w-5 h-5 rounded bg-black/80 hover:bg-[#EF4444] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={10} />
                  </button>
                  {idx === 0 && (
                    <span className="absolute bottom-0 left-0 right-0 bg-[#FACC15] text-black text-[8px] font-black text-center">
                      PORTADA
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#1F2337] mt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#8B8FA8] hover:bg-[#1E2130] transition-colors">
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isUploading || selectedFiles.length === 0}
            className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50">
            {isUploading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>{uploadProgress || 'Guardando...'}</span>
              </>
            ) : (
              <>
                <Plus size={14} />
                <span>Crear Book ({selectedFiles.length} fotos)</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
