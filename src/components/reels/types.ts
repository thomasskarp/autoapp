export type ReelTemplateId = 
  | 'sport-impact' 
  | 'luxury-elegance' 
  | 'oportunidad-financiacion' 
  | 'clean-social'
  | 'cinematic-broll'
  | 'cinematic-panoramic'
  | 'cinematic-panoramic-clean'

export interface VehicleReelData {
  id?: string
  title: string
  brand: string
  model: string
  version?: string
  year: string | number
  km: string
  price: string
  anticipo?: string
  transmission?: string
  fuel?: string
  photos: string[]
}

export interface AgencyReelData {
  name: string
  instagram: string
  facebook?: string
  whatsapp?: string
  address?: string
  logoUrl?: string
  badgeText?: string
}

export interface ReelTemplateConfig {
  id: ReelTemplateId
  name: string
  tagline: string
  iconName: string
  accentColor: string
  badgeBg: string
  defaultSlideDuration: number
  recommendedFor: string
}

export interface CarReelCompositionProps {
  vehicle: VehicleReelData
  agency: AgencyReelData
  templateId: ReelTemplateId
  fitMode?: 'contain' | 'cover'
  slideDurationInSeconds?: number
  outroDurationInSeconds?: number
  showAnticipo?: boolean
  showPrice?: boolean
  customBadge1?: string
  customBadge2?: string
  customBadge3?: string
  musicTrackUrl?: string
  musicVolume?: number
}

export interface TemplateOverlayProps {
  vehicle: VehicleReelData
  agency: AgencyReelData
  customBadge1?: string
  customBadge2?: string
  customBadge3?: string
  showAnticipo?: boolean
  showPrice?: boolean
}
