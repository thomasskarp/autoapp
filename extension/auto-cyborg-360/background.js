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
