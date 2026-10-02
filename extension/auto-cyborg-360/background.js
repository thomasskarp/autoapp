// Auto-Cyborg 360 — Service Worker (Manifest V3)
console.log('🤖 [Auto-Cyborg 360] Background service worker iniciado.')

chrome.runtime.onInstalled.addListener(() => {
  console.log('✅ [Auto-Cyborg 360] Extensión instalada con éxito.')
  chrome.storage.local.set({ status: 'ACTIVE', version: '1.0.0' })
})

// Escuchar mensajes externos desde la web de AutoApp
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (request.type === 'PING') {
    sendResponse({ status: 'PONG', version: '1.0.0' })
    return true
  }

  if (request.type === 'AUTOAPP_PUBLISH_VEHICLE' && request.payload) {
    console.log('🚗 [Auto-Cyborg 360] Payload recibido desde AutoApp:', request.payload)
    chrome.storage.local.set({ pendingVehicle: request.payload }, () => {
      sendResponse({ success: true, message: 'Vehículo en cola para autocompletar' })
    })
    return true
  }
})

// Escuchar solicitudes internas desde content script para descargar imágenes sin restricciones de CSP
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'FETCH_IMAGE_BASE64' && request.url) {
    fetch(request.url)
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return res.blob()
      })
      .then(blob => {
        const reader = new FileReader()
        reader.onloadend = () => sendResponse({ success: true, base64: reader.result })
        reader.onerror = () => sendResponse({ success: false, error: 'Error leyendo blob' })
        reader.readAsDataURL(blob)
      })
      .catch(err => sendResponse({ success: false, error: err.toString() }))
    return true // Asíncrono
  }
})
