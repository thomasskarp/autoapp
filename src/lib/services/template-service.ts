'use client'

export interface CopyTemplate {
  id: string
  name: string
  content: string
  isDefault?: boolean
  vehicleType?: 'all' | '0km' | 'usado'
  updatedAt?: string
}

export const STORAGE_KEY_TEMPLATES = 'autoapp_publication_templates'

export const GENERIC_TEMPLATES: CopyTemplate[] = [
  {
    id: 'default-comercial',
    name: '🏷️ Comercial Estándar',
    isDefault: true,
    vehicleType: 'all',
    content: `🚗 *{MARCA} {MODELO} {VERSION}* ({AÑO})
Km: {KM}
💰 Precio de Venta: {PRECIO}
💵 Entrega Mínima: {ENTREGA}

⛽ Combustible: {COMBUSTIBLE} | Caja: {TRANSMISION}
📝 {DESCRIPCION}`
  },
  {
    id: 'default-marketplace',
    name: '🔥 Marketplace / Oferta Directa',
    isDefault: true,
    vehicleType: 'all',
    content: `🔥 IMPERDIBLE: {MARCA} {MODELO} {VERSION} ({AÑO}) — ¡Entrega Inmediata!
📍 Kilometraje: {KM}
💰 Precio de Contado: {PRECIO}
💵 Anticipo / Cuotas: {ENTREGA}

📋 Documentación 100% al día | Tomamos usados en parte de pago
⛽ {COMBUSTIBLE} — {TRANSMISION}`
  },
  {
    id: 'default-financiacion',
    name: '⚡ Financiación Disponible',
    isDefault: true,
    vehicleType: 'all',
    content: `⚡ {MARCA} {MODELO} {VERSION} ({AÑO}) ⚡
📍 KM: {KM}
💰 PRECIO: {PRECIO}
💵 RETIRA CON {ENTREGA}

🔥 Financiación disponible a sola firma
📲 Consultanos por cuotas y planes a tu medida`
  },
  {
    id: 'default-reel',
    name: '🎬 Reel / Video',
    isDefault: true,
    vehicleType: 'all',
    content: `🔥 {MARCA} {MODELO} {VERSION} ({AÑO}) 🔥
📍 KM: {KM}
💰 PRECIO: {PRECIO}
💵 RETIRA CON {ENTREGA}

⚡ ¡Subite hoy mismo con entrega inmediata!
📲 Escribinos por WhatsApp o mensaje privado para coordinar tu visita.

#autos #autosargentina #usadosseleccionados #concesionaria`
  }
]

export const DEFAULT_TEMPLATES: CopyTemplate[] = [
  {
    id: 'default-comercial',
    name: '🏷️ Comercial Estándar',
    isDefault: true,
    vehicleType: 'all',
    content: `🚗 *{MARCA} {MODELO} {VERSION}* ({AÑO})
Km: {KM}
💰 Precio de Venta: {PRECIO}
💵 Entrega Mínima: {ENTREGA}

⛽ Combustible: {COMBUSTIBLE} | Caja: {TRANSMISION}
📝 {DESCRIPCION}`
  },
  {
    id: 'default-marketplace',
    name: '🔥 Marketplace / Oferta Directa',
    isDefault: true,
    vehicleType: 'all',
    content: `🔥 IMPERDIBLE: {MARCA} {MODELO} {VERSION} ({AÑO}) — ¡Entrega Inmediata!
📍 Kilometraje: {KM}
💰 Precio de Contado: {PRECIO}
💵 Anticipo / Cuotas: {ENTREGA}

📋 Documentación 100% al día | Tomamos usados en parte de pago
⛽ {COMBUSTIBLE} — {TRANSMISION}`
  },
  {
    id: 'default-financiacion',
    name: '⚡ Financiación Tasa 0%',
    isDefault: true,
    vehicleType: 'all',
    content: `⚡ {MARCA} {MODELO} {VERSION} ({AÑO}) ⚡
📍 KM: {KM}
💰 PRECIO: {PRECIO}
💵 RETIRA CON {ENTREGA}

Tasa 0% :
{CUOTAS}

🔥 Financiación directa a sola firma
📍 Resistencia, Chaco | WhatsApp 3624-750716`
  },
  {
    id: 'default-reel',
    name: '🎬 Reel / Video Viral',
    isDefault: true,
    vehicleType: 'all',
    content: `🔥 {MARCA} {MODELO} {VERSION} ({AÑO}) 🔥
📍 KM: {KM}
💰 PRECIO: {PRECIO}
💵 RETIRA CON {ENTREGA}

⚡ ¡Subite hoy mismo con entrega inmediata!
📲 Escribinos al WhatsApp directo o mensaje privado para coordinar tu test drive.
📍 Resistencia, Chaco

#autos #autosargentina #usadosseleccionados #concesionaria #parati #fyp #viral`
  },
  {
    id: 'default-tiktok',
    name: '🎵 TikTok Catálogo',
    isDefault: true,
    vehicleType: 'all',
    content: `🚗 {MARCA} {MODELO} ({AÑO})
📍 {KM} | {PRECIO}
💰 Anticipo desde {ENTREGA} + cuotas fijas

📲 Info en el link del perfil / WhatsApp 3624-750716
Tomamos tu usado al mejor precio 🤝

#autos #autosargentina #concesionaria #vendo #parati #fyp #viral`
  },
  {
    id: 'default-whatsapp',
    name: '💬 WhatsApp Estado',
    isDefault: true,
    vehicleType: 'all',
    content: `⚡ *{MARCA} {MODELO} {VERSION}* ({AÑO}) ⚡
📍 KM: {KM}
💰 PRECIO: {PRECIO}
💵 RETIRA CON {ENTREGA}

🔥 Financiación directa a sola firma
📍 Resistencia, Chaco | WhatsApp 3624-750716`
  }
]

/**
 * Sanitiza texto de plantillas para asegurar variables limpias
 */
export function sanitizeTemplate(t: CopyTemplate): CopyTemplate {
  let content = t.content || ''
  if (content.includes('- 2026') || /-\s*2026\b/.test(content)) {
    content = content.replace(/(-\s*)2026\b/g, '$1{AÑO}')
  }
  if (/\b2026\b(?=\s*(?:km|\{KM\}|\d{2,3}\.\d{3}))/.test(content)) {
    content = content.replace(/\b2026\b(?=\s*(?:km|\{KM\}|\d{2,3}\.\d{3}))/g, '{AÑO}')
  }
  return {
    ...t,
    content,
    vehicleType: t.vehicleType || 'all'
  }
}

/**
 * Obtiene todas las plantillas guardadas localmente (o las por defecto)
 */
export function getAllTemplates(): CopyTemplate[] {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATES
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEMPLATES)
    if (!raw) return DEFAULT_TEMPLATES
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(sanitizeTemplate)
    }
  } catch (e) {
    console.warn('[TemplateService] Error leyendo plantillas locales:', e)
  }
  return DEFAULT_TEMPLATES
}

/**
 * Guarda todas las plantillas en almacenamiento local y emite evento reactivo
 */
export function saveAllTemplates(templates: CopyTemplate[], skipCloudPush = false): void {
  if (typeof window === 'undefined') return
  try {
    const sanitized = templates.map(sanitizeTemplate)
    localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(sanitized))
    window.dispatchEvent(new CustomEvent('publication-templates-updated', { detail: { templates: sanitized } }))

    if (!skipCloudPush) {
      pushTemplatesToCloud(sanitized).catch(err => {
        console.warn('[TemplateService] Error subiendo plantillas a la nube:', err)
      })
    }
  } catch (e) {
    console.error('[TemplateService] Error guardando plantillas:', e)
  }
}

/**
 * Guarda o actualiza una plantilla individual
 */
export function saveTemplate(template: CopyTemplate): CopyTemplate[] {
  const current = getAllTemplates()
  const now = new Date().toISOString()
  const withTime: CopyTemplate = { ...template, updatedAt: now }

  const index = current.findIndex(t => t.id === template.id)
  let updated: CopyTemplate[]
  if (index >= 0) {
    updated = [...current]
    updated[index] = withTime
  } else {
    updated = [...current, withTime]
  }

  saveAllTemplates(updated)
  return updated
}

/**
 * Elimina una plantilla puntual por ID
 */
export function deleteTemplate(id: string): CopyTemplate[] {
  const current = getAllTemplates()
  const updated = current.filter(t => t.id !== id)
  const finalTemplates = updated.length > 0 ? updated : DEFAULT_TEMPLATES
  saveAllTemplates(finalTemplates)
  return finalTemplates
}

let isSyncing = false
let lastSyncTime = 0

/**
 * Envía las plantillas de publicación completas a la nube (Supabase)
 */
export async function pushTemplatesToCloud(templates: CopyTemplate[]): Promise<boolean> {
  if (typeof window === 'undefined') return false
  try {
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templates })
    })
    return res.ok
  } catch (e) {
    console.warn('[TemplateService] pushTemplatesToCloud error:', e)
    return false
  }
}

/**
 * Descarga y sincroniza las plantillas desde Supabase en la nube
 * Mezcla con las locales manteniendo siempre las más recientes
 */
export async function syncTemplatesFromCloud(force = false): Promise<CopyTemplate[]> {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATES
  const now = Date.now()
  if (!force && isSyncing) return getAllTemplates()
  if (!force && now - lastSyncTime < 5000) return getAllTemplates()

  isSyncing = true
  lastSyncTime = now

  try {
    const res = await fetch('/api/templates', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json()
    if (data.success && Array.isArray(data.templates) && data.templates.length > 0) {
      const cloudTemplates = data.templates as CopyTemplate[]
      const localTemplates = getAllTemplates()

      let hasChanges = false
      let hasLocalNewer = false

      // Crear mapa por id
      const mergedMap = new Map<string, CopyTemplate>()

      // 1. Agregar locales
      localTemplates.forEach(lt => mergedMap.set(lt.id, lt))

      // 2. Fusionar cloud
      cloudTemplates.forEach(ct => {
        const local = mergedMap.get(ct.id)
        if (!local) {
          mergedMap.set(ct.id, ct)
          hasChanges = true
        } else {
          const cloudTime = ct.updatedAt ? new Date(ct.updatedAt).getTime() : 0
          const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0
          if (cloudTime > localTime) {
            mergedMap.set(ct.id, ct)
            hasChanges = true
          } else if (localTime > cloudTime) {
            hasLocalNewer = true
          }
        }
      })

      // Verificar si hay alguna plantilla local no presente en cloud
      localTemplates.forEach(lt => {
        if (!cloudTemplates.some(ct => ct.id === lt.id)) {
          hasLocalNewer = true
        }
      })

      const mergedList = Array.from(mergedMap.values()).map(sanitizeTemplate)

      if (hasChanges || localTemplates.length === 0) {
        saveAllTemplates(mergedList, true)
      }

      if (hasLocalNewer) {
        pushTemplatesToCloud(mergedList).catch(() => {})
      }

      return mergedList
    }
  } catch (err) {
    console.warn('[TemplateService] Error sincronizando plantillas con Supabase:', err)
  } finally {
    isSyncing = false
  }

  return getAllTemplates()
}

// Inicialización de sincronización reactiva en navegador
if (typeof window !== 'undefined') {
  setTimeout(() => {
    syncTemplatesFromCloud().catch(() => {})
  }, 250)

  window.addEventListener('focus', () => {
    syncTemplatesFromCloud().catch(() => {})
  })
}
