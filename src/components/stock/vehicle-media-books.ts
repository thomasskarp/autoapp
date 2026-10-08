export interface VehiclePhotoBook {
  id: string
  vehicleId: string
  name: string
  photos: string[]
  coverPhoto?: string
  isDefault?: boolean
  createdAt: string
}

export interface VehicleReelItem {
  id: string
  vehicleId: string
  name: string
  videoUrl?: string
  thumbnailUrl?: string
  aspectRatio?: '9:16'
  isDefault?: boolean
  createdAt: string
}

export interface VehicleVideoItem {
  id: string
  vehicleId: string
  name: string
  videoUrl?: string
  thumbnailUrl?: string
  aspectRatio?: '1:1' | '16:9'
  isDefault?: boolean
  createdAt: string
}

// ─── PHOTO BOOKS STORAGE & HELPERS ─────────────────────────────────────────────

export function getVehicleBooks(vehicleId: string, defaultPhotos: string[]): VehiclePhotoBook[] {
  const defaultBook: VehiclePhotoBook = {
    id: `book-default-${vehicleId || 'default'}`,
    vehicleId,
    name: 'Book Principal',
    photos: defaultPhotos,
    coverPhoto: defaultPhotos[0] || '',
    isDefault: true,
    createdAt: new Date().toISOString()
  }

  if (typeof window === 'undefined' || !vehicleId) {
    return [defaultBook]
  }

  try {
    const raw = localStorage.getItem(`autoapp_vehicle_books_${vehicleId}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Asegurar que el default book siempre tenga las fotos actualizadas del vehículo
        const customBooks = parsed.filter((b: VehiclePhotoBook) => !b.isDefault)
        const savedDefault = parsed.find((b: VehiclePhotoBook) => b.isDefault)
        const mergedDefault = {
          ...defaultBook,
          photos: defaultPhotos.length > 0 ? defaultPhotos : (savedDefault?.photos || [])
        }
        return [mergedDefault, ...customBooks]
      }
    }
  } catch (e) {
    console.warn('Error reading vehicle books:', e)
  }

  return [defaultBook]
}

export function saveVehicleBooks(vehicleId: string, books: VehiclePhotoBook[]): void {
  if (typeof window === 'undefined' || !vehicleId) return
  try {
    localStorage.setItem(`autoapp_vehicle_books_${vehicleId}`, JSON.stringify(books))
  } catch (e) {
    console.warn('Error saving vehicle books:', e)
  }
}

// ─── REELS STORAGE & HELPERS ───────────────────────────────────────────────────

export function getVehicleReels(vehicleId: string, defaultCover?: string): VehicleReelItem[] {
  const defaultReels: VehicleReelItem[] = [
    {
      id: `reel-dinamico-${vehicleId || 'default'}`,
      vehicleId,
      name: 'Reel Dinámico (9:16)',
      thumbnailUrl: defaultCover || '',
      aspectRatio: '9:16',
      isDefault: true,
      createdAt: new Date().toISOString()
    },
    {
      id: `reel-comercial-${vehicleId || 'default'}`,
      vehicleId,
      name: 'Reel Comercial / Promo',
      thumbnailUrl: defaultCover || '',
      aspectRatio: '9:16',
      isDefault: true,
      createdAt: new Date().toISOString()
    },
    {
      id: `reel-elegante-${vehicleId || 'default'}`,
      vehicleId,
      name: 'Reel Elegante / Showcase',
      thumbnailUrl: defaultCover || '',
      aspectRatio: '9:16',
      isDefault: true,
      createdAt: new Date().toISOString()
    }
  ]

  if (typeof window === 'undefined' || !vehicleId) {
    return defaultReels
  }

  try {
    const raw = localStorage.getItem(`autoapp_vehicle_reels_${vehicleId}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const customReels = parsed.filter((r: VehicleReelItem) => !r.isDefault)
        return [...defaultReels, ...customReels]
      }
    }
  } catch (e) {
    console.warn('Error reading vehicle reels:', e)
  }

  return defaultReels
}

export function saveVehicleReels(vehicleId: string, reels: VehicleReelItem[]): void {
  if (typeof window === 'undefined' || !vehicleId) return
  try {
    localStorage.setItem(`autoapp_vehicle_reels_${vehicleId}`, JSON.stringify(reels))
  } catch (e) {
    console.warn('Error saving vehicle reels:', e)
  }
}

// ─── VIDEOS STORAGE & HELPERS ──────────────────────────────────────────────────

export function getVehicleVideos(vehicleId: string, defaultCover?: string): VehicleVideoItem[] {
  const defaultVideos: VehicleVideoItem[] = [
    {
      id: `video-walkaround-${vehicleId || 'default'}`,
      vehicleId,
      name: 'Video Walkaround',
      thumbnailUrl: defaultCover || '',
      aspectRatio: '1:1',
      isDefault: true,
      createdAt: new Date().toISOString()
    },
    {
      id: `video-testdrive-${vehicleId || 'default'}`,
      vehicleId,
      name: 'Video Test Drive',
      thumbnailUrl: defaultCover || '',
      aspectRatio: '1:1',
      isDefault: true,
      createdAt: new Date().toISOString()
    }
  ]

  if (typeof window === 'undefined' || !vehicleId) {
    return defaultVideos
  }

  try {
    const raw = localStorage.getItem(`autoapp_vehicle_videos_${vehicleId}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const customVideos = parsed.filter((v: VehicleVideoItem) => !v.isDefault)
        return [...defaultVideos, ...customVideos]
      }
    }
  } catch (e) {
    console.warn('Error reading vehicle videos:', e)
  }

  return defaultVideos
}

export function saveVehicleVideos(vehicleId: string, videos: VehicleVideoItem[]): void {
  if (typeof window === 'undefined' || !vehicleId) return
  try {
    localStorage.setItem(`autoapp_vehicle_videos_${vehicleId}`, JSON.stringify(videos))
  } catch (e) {
    console.warn('Error saving vehicle videos:', e)
  }
}
