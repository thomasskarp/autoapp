// Auto-Cyborg 360 — Content Script (DOM Automation Bridge)

function getPayloadFromHash() {
  const hash = window.location.hash
  if (!hash) return null

  if (hash.startsWith('#autoapp=')) {
    try {
      const jsonStr = decodeURIComponent(hash.replace('#autoapp=', ''))
      return JSON.parse(jsonStr)
    } catch (e) {
      console.error('[Auto-Cyborg 360] Error parseando hash Facebook:', e)
    }
  }

  if (hash.startsWith('#autoapp_wa=')) {
    try {
      const jsonStr = decodeURIComponent(hash.replace('#autoapp_wa=', ''))
      return JSON.parse(jsonStr)
    } catch (e) {
      console.error('[Auto-Cyborg 360] Error parseando hash WhatsApp:', e)
    }
  }

  return null
}

function showAutoAppBanner(message, type = 'info') {
  const existing = document.getElementById('autoapp-cyborg-banner')
  if (existing) existing.remove()

  const banner = document.createElement('div')
  banner.id = 'autoapp-cyborg-banner'
  banner.style.position = 'fixed'
  banner.style.top = '16px'
  banner.style.right = '16px'
  banner.style.zIndex = '99999999'
  banner.style.backgroundColor = type === 'success' ? '#10B981' : '#F59E0B'
  banner.style.color = '#FFFFFF'
  banner.style.padding = '12px 18px'
  banner.style.borderRadius = '10px'
  banner.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)'
  banner.style.fontFamily = 'system-ui, -apple-system, sans-serif'
  banner.style.fontSize = '13px'
  banner.style.fontWeight = 'bold'
  banner.style.display = 'flex'
  banner.style.alignItems = 'center'
  banner.style.gap = '8px'
  banner.innerHTML = `<span>⚡ Auto-Cyborg 360:</span> <span>${message}</span>`

  document.body.appendChild(banner)
  setTimeout(() => banner.remove(), 6000)
}

// Inicialización en la página
async function init() {
  const payload = getPayloadFromHash()

  if (payload) {
    console.log('🤖 [Auto-Cyborg 360] Vehículo detectado vía hash:', payload)
    showAutoAppBanner(`Cargando ficha de ${payload.marca || ''} ${payload.modelo || ''}...`, 'success')

    if (window.location.hostname.includes('facebook.com')) {
      console.log('🚗 [Auto-Cyborg 360] Preparando automatización de Marketplace...')
      // Copiar descripción al portapapeles si está disponible
      if (payload.descripcion) {
        try {
          await navigator.clipboard.writeText(payload.descripcion)
          showAutoAppBanner('Descripción copiada al portapapeles para pegar en Marketplace', 'info')
        } catch (err) {}
      }
    }

    if (window.location.hostname.includes('whatsapp.com')) {
      showAutoAppBanner('Ficha lista. Usa Ctrl+V para pegar foto o texto en tu chat o estado.', 'success')
    }
  }
}

init()
