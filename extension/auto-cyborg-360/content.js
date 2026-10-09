// Auto-Cyborg 360 — Content Script (DOM Automation Bridge)
// Soporta Facebook Marketplace, Instagram y Automatización Completa de WhatsApp Estados

console.log('⚡ [Auto-Cyborg 360] Content Script cargado en:', window.location.href)

// Decodificador seguro y universal de hash (Base64 UTF-8, URL encoded o JSON plano)
function decodePayload(raw) {
  if (!raw) return null

  // 1. Base64 con TextDecoder (estándar UTF-8 moderno para emojis y acentos)
  try {
    const binary = atob(raw)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    const decoded = new TextDecoder('utf-8').decode(bytes)
    return JSON.parse(decoded)
  } catch (e) {}

  // 2. Base64 clásico con escape/decodeURIComponent
  try {
    const decoded = decodeURIComponent(escape(atob(raw)))
    return JSON.parse(decoded)
  } catch (e) {}

  // 3. atob directo
  try {
    const decoded = atob(raw)
    return JSON.parse(decoded)
  } catch (e) {}

  // 4. decodeURIComponent estándar
  try {
    const jsonStr = decodeURIComponent(raw)
    return JSON.parse(jsonStr)
  } catch (e) {}

  // 5. JSON.parse directo
  try {
    return JSON.parse(raw)
  } catch (e) {}

  return null
}

function getPayloadFromHash() {
  const hash = window.location.hash
  if (!hash) return null

  if (hash.startsWith('#autoapp=')) {
    const raw = hash.replace('#autoapp=', '')
    const data = decodePayload(raw)
    return data ? { platform: 'facebook', data } : null
  }

  if (hash.startsWith('#autoapp_wa=')) {
    const raw = hash.replace('#autoapp_wa=', '')
    const data = decodePayload(raw)
    return data ? { platform: 'whatsapp', data } : null
  }

  if (hash.startsWith('#autoapp_ig=')) {
    const raw = hash.replace('#autoapp_ig=', '')
    const data = decodePayload(raw)
    return data ? { platform: 'instagram', data } : null
  }

  return null
}

function showAutoAppBanner(message, type = 'info', duration = 8000) {
  const existing = document.getElementById('autoapp-cyborg-banner')
  if (existing) existing.remove()

  const banner = document.createElement('div')
  banner.id = 'autoapp-cyborg-banner'
  banner.style.position = 'fixed'
  banner.style.top = '16px'
  banner.style.right = '16px'
  banner.style.zIndex = '99999999'
  banner.style.backgroundColor = type === 'success' ? '#10B981' : (type === 'error' ? '#EF4444' : '#2563EB')
  banner.style.color = '#FFFFFF'
  banner.style.padding = '12px 20px'
  banner.style.borderRadius = '10px'
  banner.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6)'
  banner.style.fontFamily = 'system-ui, -apple-system, sans-serif'
  banner.style.fontSize = '13px'
  banner.style.fontWeight = 'bold'
  banner.style.display = 'flex'
  banner.style.alignItems = 'center'
  banner.style.gap = '10px'
  banner.style.transition = 'all 0.3s ease'
  banner.innerHTML = `<span>⚡ Auto-Cyborg 360:</span> <span>${message}</span>`

  safeAppend(banner)
  if (duration > 0) {
    setTimeout(() => {
      banner.style.opacity = '0'
      banner.style.transform = 'translateY(-10px)'
      setTimeout(() => banner.remove(), 400)
    }, duration)
  }
}

function safeAppend(el) {
  if (document.body) {
    document.body.appendChild(el)
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body) document.body.appendChild(el)
    }, { once: true })
  }
}

function base64ToBlob(base64Data, contentType = 'image/jpeg') {
  try {
    const parts = base64Data.split(',')
    const b64 = parts.length > 1 ? parts[1] : parts[0]
    const binaryStr = atob(b64)
    const len = binaryStr.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }
    return new Blob([bytes], { type: contentType })
  } catch (e) {
    console.error('[Auto-Cyborg] Error convirtiendo base64 a blob:', e)
    return null
  }
}

function simulateClick(el) {
  if (!el) return false
  try {
    const target = el.closest('button') || el.closest('[role="button"]') || el
    target.focus()
    const opts = { bubbles: true, cancelable: true, view: window, buttons: 1 }
    target.dispatchEvent(new PointerEvent('pointerdown', opts))
    target.dispatchEvent(new MouseEvent('mousedown', opts))
    target.dispatchEvent(new PointerEvent('pointerup', opts))
    target.dispatchEvent(new MouseEvent('mouseup', opts))
    target.dispatchEvent(new MouseEvent('click', opts))
    if (typeof target.click === 'function') target.click()
    return true
  } catch (e) {
    console.warn('[Auto-Cyborg] simulateClick error:', e)
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 📱 AUTOMATIZACIÓN INTELIGENTE DE ESTADOS DE WHATSAPP (web.whatsapp.com)
// ─────────────────────────────────────────────────────────────────────────────

let cachedCarFile = null
let cachedCarBase64 = null
let automationLoopInterval = null
let isCaptionFilled = false
let isFileUploaded = false

async function initWhatsAppAutomation(carData) {
  console.log('🤖 [Auto-Cyborg 360] Iniciando flujo inteligente de Estados de WhatsApp con:', carData)

  const car = carData
  const title = `${car.marca || ''} ${car.modelo || ''} ${car.anio || ''}`.trim()
  const price = car.precio || ''
  const caption = car.caption || car.descripcion || ''
  const imageUrl = car.imagenPath || (car.photoLinks && car.photoLinks[0]) || ''

  // 1. Intentar copiar el copy al portapapeles
  if (caption) {
    try {
      await navigator.clipboard.writeText(caption)
      console.log('📋 [Auto-Cyborg 360] Texto de estado copiado al portapapeles.')
    } catch (e) {}
  }

  // 2. Inyectar HUD flotante de inmediato
  injectWhatsAppHUD(car, { title, price, caption, imageUrl })
  showAutoAppBanner(`Auto-Cyborg listo para publicar: ${title}`, 'info', 5000)

  // 3. Iniciar descarga preventiva de la imagen del vehículo en memoria
  prepareCarImageFile(car, imageUrl)

  // 4. Iniciar bucle de automatización adaptativo
  startStatusAutomationLoop(car, { title, caption, imageUrl })
}

// Descarga y prepara la imagen del vehículo sin bloques de CSP vía Background Service Worker
async function prepareCarImageFile(car, fallbackUrl) {
  if (cachedCarFile) return cachedCarFile

  // Caso 1: Viene en base64
  if (car.coverImageBase64 && car.coverImageBase64.startsWith('data:image')) {
    cachedCarBase64 = car.coverImageBase64
    const blob = base64ToBlob(car.coverImageBase64)
    if (blob) {
      cachedCarFile = new File([blob], 'foto_estado_autoapp.jpg', { type: 'image/jpeg' })
      notifyMainWorldOfFile(cachedCarBase64, 'foto_estado_autoapp.jpg', car.caption || car.descripcion)
      updateHUDStep('autoapp-step-2', true, 'Foto del vehículo preparada')
      return cachedCarFile
    }
  }

  // Caso 2: Descargar vía background service worker
  const url = fallbackUrl || car.imagenPath || (car.photoLinks && car.photoLinks[0])
  if (url) {
    console.log('📡 [Auto-Cyborg] Solicitando imagen de vehículo a background:', url)
    try {
      const bgBase64 = await new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ type: 'FETCH_IMAGE_BASE64', url }, (res) => {
            if (res && res.success && res.base64) {
              resolve(res.base64)
            } else {
              resolve(null)
            }
          })
        } else {
          resolve(null)
        }
      })

      if (bgBase64) {
        cachedCarBase64 = bgBase64
        const blob = base64ToBlob(bgBase64)
        if (blob) {
          cachedCarFile = new File([blob], 'foto_estado_autoapp.jpg', { type: 'image/jpeg' })
          notifyMainWorldOfFile(bgBase64, 'foto_estado_autoapp.jpg', car.caption || car.descripcion)
          updateHUDStep('autoapp-step-2', true, 'Foto del vehículo preparada')
          return cachedCarFile
        }
      }
    } catch (e) {
      console.warn('[Auto-Cyborg] Error obteniendo imagen vía background:', e)
    }
  }

  return null
}

// Notifica a whatsapp-main.js (que corre en MAIN world) para interceptar file picker nativo
function notifyMainWorldOfFile(base64Data, fileName, caption) {
  if (!base64Data) return
  window.postMessage({
    type: 'AUTOAPP_SET_PENDING_FILE_DATA',
    base64Data: base64Data,
    fileName: fileName || 'foto_autoapp.jpg',
    mimeType: 'image/jpeg',
    caption: caption || ''
  }, '*')
}

// Bucle de Estado Adaptativo: Inspecciona la pantalla y ejecuta la acción adecuada en cada momento
function startStatusAutomationLoop(car, info) {
  if (automationLoopInterval) clearInterval(automationLoopInterval)

  let ticks = 0
  const maxTicks = 120 // ~90 segundos máximo de supervisión

  automationLoopInterval = setInterval(async () => {
    ticks++
    if (ticks > maxTicks) {
      clearInterval(automationLoopInterval)
      console.log('⏱️ [Auto-Cyborg 360] Bucle de supervisión finalizado.')
      return
    }

    try {
      // ───────────────────────────────────────────────────────────────────────
      // FASE 4: ¿El editor multimedia ya está abierto?
      // ───────────────────────────────────────────────────────────────────────
      const sendButton = findSendButton()
      const captionInput = findStatusCaptionInput()

      if (sendButton || captionInput) {
        updateHUDStep('autoapp-step-3', true, 'Foto cargada en el editor')

        // Si el pie de foto aún no está relleno
        if (!isCaptionFilled && info.caption) {
          const targetInput = captionInput || findStatusCaptionInput()
          if (targetInput) {
            console.log('✍️ [Auto-Cyborg 360] Editor de foto detectado. Rellenando pie de foto...')
            const filled = fillCaption(targetInput, info.caption)
            if (filled || targetInput.textContent.trim().length > 0) {
              isCaptionFilled = true
              updateHUDStep('autoapp-step-4', true, 'Pie de foto rellenado')
              showAutoAppBanner('✅ ¡Foto y datos cargados! Publicando estado automáticamente...', 'success', 10000)
              highlightSendButton()

              // Auto-clic en el botón de Enviar para publicación 100% desatendida
              setTimeout(() => {
                const currentSendBtn = findSendButton()
                if (currentSendBtn) {
                  console.log('🚀 [Auto-Cyborg 360] Clic automático en Enviar Estado...')
                  simulateClick(currentSendBtn)
                  showAutoAppBanner('🎉 ¡Estado publicado con éxito en WhatsApp!', 'success', 8000)
                }
              }, 1200)
            }
          }
        } else if (sendButton) {
          highlightSendButton()
          if (isCaptionFilled) {
            // Ya cumplimos todo el flujo
            clearInterval(automationLoopInterval)
            console.log('🎉 [Auto-Cyborg 360] Flujo completado con éxito.')
          }
        }
        return
      }

      // ───────────────────────────────────────────────────────────────────────
      // FASE 3: ¿Estamos en el panel de Estados pero aún no en el editor?
      // ───────────────────────────────────────────────────────────────────────
      const inStatus = isStatusPanelActive()

      if (inStatus) {
        updateHUDStep('autoapp-step-1', true, 'Pestaña "Estados" abierta')

        // Asegurar que la foto esté preparada
        if (!cachedCarFile) {
          await prepareCarImageFile(car, info.imageUrl)
        }

        // 1. Probar inyectar directamente en input[type="file"] si existe
        if (cachedCarFile && !isFileUploaded) {
          const directInjected = attachFileToExistingInput(cachedCarFile)
          if (directInjected) {
            isFileUploaded = true
            console.log('✅ [Auto-Cyborg 360] Archivo inyectado en input[type="file"]!')
            return
          }
        }

        // 2. Si hay un menú desplegable de "Fotos y videos", hacer clic en él
        const clickedSubMenu = clickPhotosAndVideosOption()
        if (clickedSubMenu) {
          console.log('🎯 [Auto-Cyborg 360] Clic en "Fotos y videos" del menú de Estados.')
          return
        }

        // 3. Hacer clic en "Añadir a mi estado" / "Mi estado" / botón de cámara
        if (ticks % 3 === 0) { // intentar cada 2 segundos
          const clickedAdd = triggerAddStatusClick()
          if (clickedAdd) {
            console.log('🎯 [Auto-Cyborg 360] Clic en Añadir Estado.')
          }
        }
        return
      }

      // ───────────────────────────────────────────────────────────────────────
      // FASE 2: WhatsApp Web está cargado pero estamos en otra pestaña (Chats)
      // ───────────────────────────────────────────────────────────────────────
      const isWhatsAppReady = isWhatsAppWebLoaded()
      if (isWhatsAppReady) {
        // Buscar el botón de Estados en el riel izquierdo
        const statusTabButton = findStatusTabButton()
        if (statusTabButton) {
          console.log('🎯 [Auto-Cyborg 360] Abriendo pestaña Estados...')
          simulateClick(statusTabButton)
        }
        return
      }

      // ───────────────────────────────────────────────────────────────────────
      // FASE 1: WhatsApp Web aún está sincronizando o cargando
      // ───────────────────────────────────────────────────────────────────────
      console.log('⏳ [Auto-Cyborg 360] Esperando carga completa de WhatsApp Web...')

    } catch (err) {
      console.warn('[Auto-Cyborg 360] Error en tick de automatización:', err)
    }
  }, 750)
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔍 SELECTORES Y HELPERS DOM PARA WHATSAPP WEB
// ─────────────────────────────────────────────────────────────────────────────

function isWhatsAppWebLoaded() {
  return document.querySelector('#side') ||
         document.querySelector('#pane-side') ||
         document.querySelector('[role="navigation"]') ||
         document.querySelector('div[contenteditable="true"]')
}

function isStatusPanelActive() {
  const side = document.querySelector('#side') || document.querySelector('#pane-side') || document.querySelector('section')
  const sideText = (side ? side.innerText : '') || ''
  const bodyText = (document.body ? document.body.innerText : '') || ''

  return sideText.includes('Mi estado') ||
         sideText.includes('Estados') ||
         sideText.includes('My status') ||
         sideText.includes('Añade una actualización') ||
         bodyText.includes('Añadir a mi estado')
}

// Localiza el botón de la pestaña Estados en el riel izquierdo de WhatsApp Web
function findStatusTabButton() {
  // 1. Por aria-label o title
  const allClickable = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"], a[role="button"]'))
  for (const el of allClickable) {
    const label = (el.getAttribute('aria-label') || el.getAttribute('title') || '').toLowerCase()
    if (label.includes('estado') || label.includes('status') || label.includes('novedad') || label.includes('actualiza')) {
      return el
    }
  }

  // 2. Por data-icon del SVG
  const iconSelectors = [
    '[data-icon="status-outline"]',
    '[data-icon="status-v3"]',
    '[data-icon="status-v3-unread"]',
    '[data-icon="status"]',
    '[data-icon="newsletter-status-update"]',
    '[data-icon="status-update"]',
    '[data-icon*="status"]'
  ]
  for (const sel of iconSelectors) {
    const icon = document.querySelector(sel)
    if (icon) {
      return icon.closest('button') || icon.closest('[role="button"]') || icon
    }
  }

  // 3. Detección geométrica del riel vertical izquierdo (x <= 75px)
  const leftRailCandidates = []
  for (const el of allClickable) {
    const rect = el.getBoundingClientRect()
    if (rect.left >= 0 && rect.left <= 75 && rect.top >= 10 && rect.top <= 450 && rect.width >= 24 && rect.width <= 75 && rect.height >= 24 && rect.height <= 75) {
      if (!leftRailCandidates.some(c => c.contains(el))) {
        const subIndex = leftRailCandidates.findIndex(c => el.contains(c))
        if (subIndex >= 0) {
          leftRailCandidates[subIndex] = el
        } else {
          leftRailCandidates.push(el)
        }
      }
    }
  }

  leftRailCandidates.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)

  // En la barra vertical de WhatsApp Web:
  // [0] = Chats, [1] = Llamadas, [2] = Estados
  if (leftRailCandidates.length >= 3) {
    return leftRailCandidates[2]
  }

  return null
}

// Clic en "Añadir a mi estado", avatar con "+", o botón de cámara
function triggerAddStatusClick() {
  const addSelectors = [
    'button[aria-label*="Añadir a mi estado" i]',
    'button[aria-label*="Añadir estado" i]',
    'button[aria-label*="Add status" i]',
    'div[role="button"][aria-label*="Añadir a mi estado" i]',
    'div[role="button"][aria-label*="Añadir estado" i]',
    'span[data-icon="status-add"]',
    'span[data-icon="camera"]',
    'span[data-icon="plus"]'
  ]

  for (const sel of addSelectors) {
    const el = document.querySelector(sel)
    if (el) {
      simulateClick(el)
      return true
    }
  }

  // Buscar elemento que contenga "Mi estado" o "Añade una actualización"
  const elements = Array.from(document.querySelectorAll('div[role="button"], span, div'))
  for (const el of elements) {
    const txt = (el.innerText || '').trim()
    if (txt === 'Mi estado' || txt.startsWith('Añade una actualización') || txt.includes('Añadir a mi estado')) {
      const btn = el.closest('div[role="button"]') || el.closest('button') || el
      simulateClick(btn)
      return true
    }
  }

  return false
}

// Si al hacer clic en Añadir Estado aparece el submenú con "Fotos y videos"
function clickPhotosAndVideosOption() {
  const options = Array.from(document.querySelectorAll('li, div[role="button"], span'))
  for (const opt of options) {
    const text = (opt.innerText || opt.textContent || '').trim().toLowerCase()
    if (text.includes('fotos y videos') || text.includes('fotos o videos') || text.includes('photos & videos') || text === 'fotos') {
      const btn = opt.closest('li') || opt.closest('div[role="button"]') || opt
      simulateClick(btn)
      return true
    }
  }
  return false
}

// Inyección directa de archivo en input[type="file"] si ya está en el DOM
function attachFileToExistingInput(file) {
  if (!file) return false
  const inputs = Array.from(document.querySelectorAll('input[type="file"]'))
  for (const inp of inputs) {
    const accept = inp.getAttribute('accept') || ''
    if (accept.includes('image') || accept === '' || accept.includes('*')) {
      try {
        const dt = new DataTransfer()
        dt.items.add(file)
        inp.files = dt.files
        inp.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))
        inp.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }))
        return true
      } catch (e) {
        console.warn('[Auto-Cyborg] attachFileToExistingInput error:', e)
      }
    }
  }
  return false
}

// Localiza el campo de pie de foto en el editor multimedia de Estados
function findStatusCaptionInput() {
  // 1. Estrategia por texto de placeholder visible ("Añade un comentario" / "Add a caption")
  const allElements = Array.from(document.querySelectorAll('span, div, p, label'))
  for (const el of allElements) {
    if (el.children.length <= 2 && el.textContent) {
      const txt = el.textContent.trim().toLowerCase()
      if (txt === 'añade un comentario' || txt.includes('añade un comentario') || txt.includes('add a caption') || txt === 'escribe un comentario' || txt.includes('añadir un comentario')) {
        // El input editable suele ser hermano o estar en el mismo contenedor
        const parentBox = el.closest('div[tabindex], div[class*="editor"], div[class*="caption"], div[class*="input"]') || el.parentElement?.parentElement || el.parentElement
        if (parentBox) {
          const editable = parentBox.querySelector('[contenteditable="true"], [role="textbox"]')
          if (editable) return editable
        }
        // Intentar hacer clic en el placeholder para que WhatsApp enfoque el contenteditable nativo
        try {
          el.click()
          if (document.activeElement && (document.activeElement.getAttribute('contenteditable') === 'true' || document.activeElement.getAttribute('role') === 'textbox')) {
            return document.activeElement
          }
        } catch (e) {}
      }
    }
  }

  // 2. Estrategia por todos los contenteditable o role="textbox" visibles en el DOM
  const editables = Array.from(document.querySelectorAll('[contenteditable="true"], [role="textbox"]'))
  const screenH = window.innerHeight
  const screenW = window.innerWidth

  // Filtrar usando getBoundingClientRect (offsetParent falla en position: fixed del editor de WhatsApp)
  const visibleEditables = editables.filter(el => {
    const r = el.getBoundingClientRect()
    return r.width > 20 && r.height > 10 && r.top >= 0 && r.bottom <= screenH + 50
  })

  // En el editor de WhatsApp Web, el pie de foto se encuentra en la mitad inferior
  const bottomEditables = visibleEditables.filter(el => {
    const r = el.getBoundingClientRect()
    return r.top > screenH * 0.45
  })

  if (bottomEditables.length > 0) {
    // Tomar el más ancho o el más cercano a la barra inferior
    bottomEditables.sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)
    return bottomEditables[0]
  }

  if (visibleEditables.length > 0) {
    return visibleEditables[visibleEditables.length - 1]
  }

  return null
}

// Escribe el texto en el div[contenteditable="true"] actualizando el estado de Lexical/React
function fillCaption(inputEl, text) {
  if (!inputEl || !text) return false
  try {
    console.log('✍️ [Auto-Cyborg] fillCaption inyectando en:', inputEl)

    // 1. Enfocar y simular interacción de usuario
    inputEl.focus()
    inputEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
    inputEl.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }))
    inputEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    // 2. Colocar cursor al final
    const sel = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(inputEl)
    range.collapse(false)
    sel.removeAllRanges()
    sel.addRange(range)

    // 3. Método A: Simular evento Paste con DataTransfer (el más confiable para Lexical en React)
    try {
      const dt = new DataTransfer()
      dt.setData('text/plain', text)
      const pasteEvt = new ClipboardEvent('paste', {
        clipboardData: dt,
        bubbles: true,
        cancelable: true
      })
      inputEl.dispatchEvent(pasteEvt)
    } catch (e) {
      console.warn('[Auto-Cyborg] pasteEvt error:', e)
    }

    // 4. Método B: document.execCommand('insertText') si sigue vacío
    if (!inputEl.textContent.trim()) {
      try {
        document.execCommand('insertText', false, text)
      } catch (e) {}
    }

    // 5. Método C: Inserción línea por línea si execCommand truncó por saltos de línea
    if (!inputEl.textContent.trim()) {
      const lines = text.split('\n')
      for (let i = 0; i < lines.length; i++) {
        document.execCommand('insertText', false, lines[i])
        if (i < lines.length - 1) {
          document.execCommand('insertParagraph', false)
        }
      }
    }

    // 6. Asignar innerText y despachar eventos de entrada
    if (!inputEl.textContent.trim()) {
      inputEl.innerText = text
    }

    inputEl.dispatchEvent(new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: text
    }))
    inputEl.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: text
    }))
    inputEl.dispatchEvent(new Event('change', { bubbles: true }))

    // 7. Notificar también al MAIN world (whatsapp-main.js)
    window.postMessage({
      type: 'AUTOAPP_FILL_CAPTION_MAIN',
      text: text
    }, '*')

    return inputEl.textContent.trim().length > 0 || isCaptionFilled
  } catch (e) {
    console.warn('[Auto-Cyborg] fillCaption error:', e)
    return false
  }
}

// Localiza el botón redondo verde de Enviar / Publicar Estado
function findSendButton() {
  // 1. Por iconos de SVG conocidos en WhatsApp Web
  const iconSelectors = [
    'span[data-icon="send"]',
    'span[data-icon="send-light"]',
    'span[data-icon="round-send-filled"]',
    'span[data-icon="wds-ic-send-filled"]',
    'span[data-icon="forward"]',
    'span[data-icon="forward-chat"]'
  ]
  for (const sel of iconSelectors) {
    const icon = document.querySelector(sel)
    if (icon) {
      return icon.closest('button') || icon.closest('div[role="button"]') || icon
    }
  }

  // 2. Por atributos aria-label
  const aria = document.querySelector('button[aria-label*="Enviar" i]') ||
               document.querySelector('button[aria-label*="Send" i]') ||
               document.querySelector('div[role="button"][aria-label*="Enviar" i]') ||
               document.querySelector('div[role="button"][aria-label*="Send" i]')
  if (aria) return aria

  // 3. Detección geométrica infalible (botón circular verde en la esquina inferior derecha)
  const buttons = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"]'))
  const screenW = window.innerWidth
  const screenH = window.innerHeight

  const cornerButtons = buttons.filter(btn => {
    const rect = btn.getBoundingClientRect()
    return rect.right >= screenW - 140 && rect.bottom >= screenH - 120 && rect.width >= 35 && rect.height >= 35
  })

  if (cornerButtons.length > 0) {
    cornerButtons.sort((a, b) => {
      const rA = a.getBoundingClientRect()
      const rB = b.getBoundingClientRect()
      return (rB.right + rB.bottom) - (rA.right + rA.bottom)
    })
    return cornerButtons[0]
  }

  return null
}

// Destaca visualmente el botón verde de Enviar
function highlightSendButton() {
  const btn = findSendButton()
  if (!btn) return false

  btn.style.outline = '4px solid #25D366'
  btn.style.outlineOffset = '4px'
  btn.style.boxShadow = '0 0 35px #25D366, 0 0 60px rgba(37, 211, 102, 0.7)'
  btn.style.transition = 'all 0.3s ease'

  // Agregar badge flotante indicando al usuario hacer clic
  if (!document.getElementById('autoapp-send-pointer')) {
    const badge = document.createElement('div')
    badge.id = 'autoapp-send-pointer'
    badge.style.position = 'fixed'
    badge.style.zIndex = '99999999'
    badge.style.backgroundColor = '#10B981'
    badge.style.color = '#FFFFFF'
    badge.style.fontWeight = '800'
    badge.style.fontSize = '12px'
    badge.style.padding = '8px 14px'
    badge.style.borderRadius = '20px'
    badge.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)'
    badge.style.pointerEvents = 'none'
    badge.style.fontFamily = 'system-ui, sans-serif'
    badge.innerHTML = '👇 ¡Hacé clic acá para publicar!'
    safeAppend(badge)

    const updatePos = () => {
      if (!btn.isConnected) {
        badge.remove()
        return
      }
      const rect = btn.getBoundingClientRect()
      badge.style.top = `${rect.top - 46}px`
      badge.style.left = `${Math.max(10, rect.left - 70)}px`
    }
    updatePos()
    window.addEventListener('resize', updatePos)
    setInterval(updatePos, 800)
  }

  return true
}

function updateHUDStep(stepId, completed, text) {
  const stepEl = document.getElementById(stepId)
  if (stepEl) {
    stepEl.firstElementChild.innerText = completed ? '✓' : '●'
    stepEl.firstElementChild.style.color = completed ? '#10B981' : '#F59E0B'
    if (text) {
      stepEl.lastElementChild.innerText = text
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 🎛️ HUD ASISTENTE FLOTANTE
// ─────────────────────────────────────────────────────────────────────────────

function injectWhatsAppHUD(car, info) {
  const existing = document.getElementById('autoapp-wa-hud')
  if (existing) existing.remove()

  const hud = document.createElement('div')
  hud.id = 'autoapp-wa-hud'
  hud.style.position = 'fixed'
  hud.style.bottom = '20px'
  hud.style.right = '20px'
  hud.style.width = '350px'
  hud.style.backgroundColor = '#111827'
  hud.style.color = '#F9FAFB'
  hud.style.borderRadius = '16px'
  hud.style.boxShadow = '0 20px 35px -5px rgba(0, 0, 0, 0.7), 0 0 0 1px #374151'
  hud.style.zIndex = '9999999'
  hud.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  hud.style.overflow = 'hidden'

  hud.innerHTML = `
    <div style="background: linear-gradient(135deg, #059669 0%, #10B981 100%); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">⚡</span>
        <div>
          <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #FFFFFF;">Auto-Cyborg 360</div>
          <div style="font-size: 10px; color: #D1FAE5; font-weight: 500;">Publicador de Estados WhatsApp</div>
        </div>
      </div>
      <div style="display: flex; gap: 6px;">
        <button id="autoapp-hud-min" style="background: rgba(0,0,0,0.2); border: none; color: white; width: 22px; height: 22px; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;">_</button>
        <button id="autoapp-hud-close" style="background: rgba(0,0,0,0.2); border: none; color: white; width: 22px; height: 22px; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;">✕</button>
      </div>
    </div>

    <div id="autoapp-hud-body" style="padding: 14px; display: flex; flex-direction: column; gap: 12px;">
      <!-- Ficha del Auto -->
      <div style="display: flex; gap: 10px; background: #1F2937; padding: 10px; border-radius: 10px; border: 1px solid #374151;">
        ${info.imageUrl ? `<img src="${info.imageUrl}" style="width: 55px; height: 55px; object-fit: cover; border-radius: 8px; flex-shrink: 0;" />` : ''}
        <div style="overflow: hidden; flex: 1;">
          <div style="font-size: 12px; font-weight: 700; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${info.title}</div>
          <div style="font-size: 13px; font-weight: 800; color: #10B981; margin-top: 2px;">${info.price}</div>
          <div style="font-size: 10px; color: #9CA3AF; margin-top: 2px;">${car.kms || 'Excelente estado'}</div>
        </div>
      </div>

      <!-- Pasos asistidos -->
      <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px; color: #D1D5DB;">
        <div style="display: flex; align-items: center; gap: 6px;" id="autoapp-step-1">
          <span style="color: #F59E0B;">●</span> <span>Abriendo pestaña Estados...</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;" id="autoapp-step-2">
          <span style="color: #F59E0B;">●</span> <span>Preparando foto del vehículo...</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;" id="autoapp-step-3">
          <span style="color: #F59E0B;">●</span> <span>Cargando imagen en Estado...</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;" id="autoapp-step-4">
          <span style="color: #F59E0B;">●</span> <span>Rellenando texto con IA...</span>
        </div>
      </div>

      <!-- Botones de Acción Rápida -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 2px;">
        <button id="autoapp-btn-status" style="background: #10B981; color: #000; border: none; padding: 8px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
          <span>🚀 Ir a Estados</span>
        </button>
        <button id="autoapp-btn-fill" style="background: #2563EB; color: #FFF; border: none; padding: 8px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
          <span>⚡ Re-pegar Copy</span>
        </button>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <button id="autoapp-btn-copy" style="background: #374151; color: #FFF; border: 1px solid #4B5563; padding: 7px; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer;">
          📋 Copiar Texto
        </button>
        <button id="autoapp-btn-copy-img" style="background: #374151; color: #FFF; border: 1px solid #4B5563; padding: 7px; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer;">
          🖼️ Copiar Foto
        </button>
      </div>
    </div>
  `

  safeAppend(hud)

  // Event Listeners del HUD
  hud.querySelector('#autoapp-hud-close').addEventListener('click', () => hud.remove())

  const bodyEl = hud.querySelector('#autoapp-hud-body')
  let isMinimized = false
  hud.querySelector('#autoapp-hud-min').addEventListener('click', () => {
    isMinimized = !isMinimized
    bodyEl.style.display = isMinimized ? 'none' : 'flex'
    hud.querySelector('#autoapp-hud-min').innerText = isMinimized ? '□' : '_'
  })

  hud.querySelector('#autoapp-btn-status').addEventListener('click', () => {
    const btn = findStatusTabButton()
    if (btn) simulateClick(btn)
  })

  hud.querySelector('#autoapp-btn-fill').addEventListener('click', () => {
    const input = findStatusCaptionInput()
    if (input) {
      fillCaption(input, info.caption)
      highlightSendButton()
    }
  })

  hud.querySelector('#autoapp-btn-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(info.caption)
      const btn = hud.querySelector('#autoapp-btn-copy')
      btn.innerText = '✅ ¡Copiado!'
      setTimeout(() => btn.innerText = '📋 Copiar Texto', 2000)
    } catch (e) {
      showAutoAppBanner('Error al copiar texto', 'error')
    }
  })

  hud.querySelector('#autoapp-btn-copy-img').addEventListener('click', async () => {
    const btn = hud.querySelector('#autoapp-btn-copy-img')
    btn.innerText = '⏳ Copiando...'
    try {
      let blob = null
      if (cachedCarFile) {
        blob = cachedCarFile
      } else if (cachedCarBase64) {
        blob = base64ToBlob(cachedCarBase64)
      }
      if (blob && navigator.clipboard && navigator.clipboard.write) {
        // En navegadores modernos se requiere image/png para el portapapeles
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = URL.createObjectURL(blob)
        await new Promise(r => img.onload = r)
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        canvas.toBlob(async (pngBlob) => {
          if (pngBlob) {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })])
            btn.innerText = '✅ ¡Foto Copiada!'
            showAutoAppBanner('Foto copiada. ¡Podés pegarla con Ctrl+V en WhatsApp!', 'success', 5000)
            setTimeout(() => btn.innerText = '🖼️ Copiar Foto', 2500)
          }
        }, 'image/png')
      }
    } catch (e) {
      console.warn('[Auto-Cyborg] Error copiando foto:', e)
      btn.innerText = '⚠️ Error al copiar'
      setTimeout(() => btn.innerText = '🖼️ Copiar Foto', 2000)
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 🚗 AUTOMATIZACIÓN INTELIGENTE DE FACEBOOK MARKETPLACE (facebook.com/marketplace)
// ─────────────────────────────────────────────────────────────────────────────

let cachedFacebookFiles = []
let isFacebookPhotosInjected = false
let isFacebookFieldsFilled = false
let facebookAutomationLoopInterval = null

// Ayudante para React 18: dispara el setter nativo del prototipo para que React actualice su estado
function setReactInputValue(element, value) {
  if (!element || value === undefined || value === null) return false
  try {
    element.focus()
    const strVal = String(value)
    const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set
    const prototype = Object.getPrototypeOf(element)
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set

    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
      prototypeValueSetter.call(element, strVal)
    } else if (valueSetter) {
      valueSetter.call(element, strVal)
    } else {
      element.value = strVal
    }

    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }))
    element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }))
    return true
  } catch (e) {
    console.warn('[Auto-Cyborg] setReactInputValue error:', e)
    return false
  }
}

function setReactTextareaValue(element, value) {
  if (!element || value === undefined || value === null) return false
  try {
    element.focus()
    const strVal = String(value)
    const prototype = Object.getPrototypeOf(element)
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set

    if (prototypeValueSetter) {
      prototypeValueSetter.call(element, strVal)
    } else {
      element.value = strVal
    }

    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  } catch (e) {
    console.warn('[Auto-Cyborg] setReactTextareaValue error:', e)
    return false
  }
}

// Localiza el input[type="file"] en Facebook Marketplace
function findFacebookFileInput() {
  const inputs = Array.from(document.querySelectorAll('input[type="file"]'))
  for (const inp of inputs) {
    const accept = inp.getAttribute('accept') || ''
    if (accept.includes('image') || accept === '' || accept.includes('*')) {
      return inp
    }
  }
  return inputs[0] || null
}

// Localiza el contenedor o dropzone visual de fotos en Facebook Marketplace
function findFacebookDropzone() {
  const candidates = Array.from(document.querySelectorAll('div[role="button"], div[tabindex], label, div'))
  for (const el of candidates) {
    const txt = (el.innerText || el.textContent || '').trim().toLowerCase()
    if (
      txt.includes('agregar fotos') ||
      txt.includes('añadir fotos') ||
      txt.includes('add photos') ||
      txt.includes('subir fotos') ||
      txt.includes('arrastra y suelta') ||
      txt.includes('drag and drop')
    ) {
      return el
    }
  }
  return null
}

// Descarga una imagen vía Background Service Worker para saltar CSP / CORS
async function fetchImageBase64FromBackground(url) {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: 'FETCH_IMAGE_BASE64', url }, (res) => {
        if (res && res.success && res.base64) {
          resolve(res.base64)
        } else {
          resolve(null)
        }
      })
    } else {
      resolve(null)
    }
  })
}

// Prepara el lote de archivos File[] para el vehículo desde Base64 o URL
async function prepareFacebookFiles(car, onProgress) {
  if (cachedFacebookFiles.length > 0) return cachedFacebookFiles

  const files = []

  // 1. A partir de las imágenes ya convertidas a Base64
  if (Array.isArray(car.images) && car.images.length > 0) {
    console.log(`[Auto-Cyborg] Preparando ${car.images.length} fotos desde base64...`)
    for (let i = 0; i < car.images.length; i++) {
      const b64 = car.images[i]
      if (b64 && typeof b64 === 'string') {
        const blob = base64ToBlob(b64, 'image/jpeg')
        if (blob) {
          files.push(new File([blob], `vehiculo_${i + 1}.jpg`, { type: 'image/jpeg' }))
        }
      }
    }
  }

  // 2. Si faltan imágenes o no había base64, descargar desde photoLinks
  const links = Array.isArray(car.photoLinks) ? car.photoLinks : (car.imagenPath ? [car.imagenPath] : [])
  if (files.length < links.length && links.length > 0) {
    console.log(`[Auto-Cyborg] Descargando ${links.length - files.length} fotos adicionales vía background...`)
    const startIndex = files.length
    for (let i = startIndex; i < Math.min(links.length, 20); i++) {
      const url = links[i]
      if (onProgress) onProgress(i + 1, links.length)
      try {
        const bgBase64 = await fetchImageBase64FromBackground(url)
        if (bgBase64) {
          const blob = base64ToBlob(bgBase64, 'image/jpeg')
          if (blob) {
            files.push(new File([blob], `vehiculo_${i + 1}.jpg`, { type: 'image/jpeg' }))
          }
        }
      } catch (e) {
        console.warn('[Auto-Cyborg] Error descargando foto:', url, e)
      }
    }
  }

  cachedFacebookFiles = files
  return files
}

// Inyección de fotos en el input de Facebook Marketplace
async function injectPhotosIntoFacebook(files) {
  if (!files || files.length === 0) return false
  const fileInput = findFacebookFileInput()
  if (!fileInput) {
    console.warn('[Auto-Cyborg] No se encontró input[type="file"] en Facebook Marketplace')
    return false
  }

  try {
    const dt = new DataTransfer()
    for (const f of files) {
      dt.items.add(f)
    }

    fileInput.files = dt.files
    fileInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))
    fileInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }))

    const dropzone = findFacebookDropzone() || fileInput.parentElement
    if (dropzone) {
      try {
        const dropEvt = new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt
        })
        dropzone.dispatchEvent(dropEvt)
      } catch (e) {}
    }

    console.log(`✅ [Auto-Cyborg] ${files.length} fotos inyectadas en Facebook Marketplace!`)
    return true
  } catch (err) {
    console.error('[Auto-Cyborg] Error inyectando fotos en Facebook:', err)
    return false
  }
}

// Helper: Normaliza cadenas para comparaciones libres de tildes y mayúsculas
function normalizeStr(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

// Localiza el contenedor de un campo en Facebook Marketplace (label, div[role="combobox"], etc.)
function findFacebookFieldContainer(keywords) {
  const kwList = Array.isArray(keywords) ? keywords : [keywords]

  // 1. Prioridad: Elementos específicos con aria-label directo (labels, comboboxes, inputs)
  for (const kw of kwList) {
    const direct = Array.from(document.querySelectorAll(`label[aria-label*="${kw}" i], div[role="combobox"][aria-label*="${kw}" i], input[aria-label*="${kw}" i]`))
    for (const el of direct) {
      if (el.tagName === 'LABEL' || el.getAttribute('role') === 'combobox' || el.tagName === 'INPUT') {
        return el
      }
    }
  }

  // 2. Prioridad: Buscar en labels y comboboxes por coincidencia exacta de primera línea
  const allContainers = Array.from(document.querySelectorAll('label, div[role="combobox"], div[role="button"]'))
  for (const c of allContainers) {
    const rawTxt = (c.innerText || c.textContent || '').trim()
    const normTxt = normalizeStr(rawTxt)
    const normFirstLine = normTxt.split('\n')[0].trim()

    for (const kw of kwList) {
      const normKw = normalizeStr(kw)
      if (normFirstLine === normKw) {
        return c
      }
    }
  }

  // 2b. Coincidencia secundaria si no hubo exacta
  for (const c of allContainers) {
    const rawTxt = (c.innerText || c.textContent || '').trim()
    const normTxt = normalizeStr(rawTxt)
    const normFirstLine = normTxt.split('\n')[0].trim()

    for (const kw of kwList) {
      const normKw = normalizeStr(kw)
      if (normFirstLine.startsWith(normKw) || (normTxt.length < 50 && normTxt.includes(normKw))) {
        return c
      }
    }
  }

  // 3. Prioridad: Buscar cualquier elemento hoja con el texto y escalar a su contenedor interactivo
  for (const kw of kwList) {
    const normKw = normalizeStr(kw)
    const allLeafNodes = Array.from(document.querySelectorAll('*')).filter(el => {
      if (el.children.length === 0) {
        const text = normalizeStr(el.textContent || '')
        return text === normKw || text.startsWith(normKw)
      }
      return false
    })
    for (const leaf of allLeafNodes) {
      const parent = leaf.closest('[role="combobox"]') || 
                     leaf.closest('label') || 
                     leaf.closest('[role="button"]') || 
                     leaf.closest('div[tabindex]') || 
                     leaf.parentElement
      if (parent && (parent.tagName === 'LABEL' || parent.getAttribute('role') === 'combobox' || parent.querySelector('input'))) {
        return parent
      }
    }
  }

  return null
}

// Helper: Dispara clics profundos y eventos de puntero completos
function triggerFacebookClick(el) {
  if (!el) return false
  try {
    const target = el.closest('button') || el.closest('[role="button"]') || el
    target.focus?.()
    const opts = { bubbles: true, cancelable: true, view: window, buttons: 1 }
    target.dispatchEvent(new PointerEvent('pointerdown', opts))
    target.dispatchEvent(new MouseEvent('mousedown', opts))
    target.dispatchEvent(new PointerEvent('pointerup', opts))
    target.dispatchEvent(new MouseEvent('mouseup', opts))
    target.dispatchEvent(new MouseEvent('click', opts))
    if (typeof target.click === 'function') {
      try { target.click() } catch (e) {}
    }
    return true
  } catch (err) {
    console.warn('[Auto-Cyborg] triggerFacebookClick error:', err)
    return false
  }
}

// Espera a que aparezcan opciones en el DOM de Facebook Marketplace
async function waitForFacebookMenuOptions(timeoutMs = 1500) {
  const startTime = Date.now()
  const selectors = [
    '[role="option"]',
    '[role="menuitem"]',
    'div[role="listbox"] [role="option"]',
    'div[role="listbox"] div[tabindex]',
    'div[role="listbox"] span',
    'div[aria-haspopup="listbox"] [role="option"]',
    'div[role="dialog"] [role="option"]',
    'div[data-pagelet*="menu"] [role="option"]'
  ].join(', ')

  while (Date.now() - startTime < timeoutMs) {
    const list = Array.from(document.querySelectorAll(selectors)).filter(el => {
      const r = el.getBoundingClientRect()
      return (r.width > 0 && r.height > 0) || el.offsetParent !== null
    })

    if (list.length > 0) {
      return list
    }
    await new Promise(r => setTimeout(r, 80))
  }

  return []
}

// Localiza el disparador interactivo del selector "Tipo de vehículo"
function findFacebookVehicleTypeTrigger() {
  // 1. Selector directo por aria-label
  const direct = document.querySelector(
    '[aria-label*="tipo de vehículo" i], [aria-label*="tipo de vehiculo" i], [aria-label*="vehicle type" i]'
  )
  if (direct) {
    return direct.querySelector('[role="combobox"], [role="button"]') || direct
  }

  // 2. Buscar por texto visible dentro de comboboxes, botones o labels
  const candidates = Array.from(document.querySelectorAll('label, div[role="combobox"], div[role="button"], div[tabindex="0"]'))
  for (const c of candidates) {
    const txt = (c.innerText || c.textContent || '').trim().toLowerCase()
    const firstLine = txt.split('\n')[0].trim()
    if (firstLine.includes('tipo de veh') || txt.includes('tipo de vehículo') || txt.includes('tipo de vehiculo') || txt.includes('vehicle type')) {
      return c.querySelector('[role="combobox"], [role="button"]') || c
    }
  }

  // 3. Buscar cualquier elemento hoja con el texto exacto o parcial
  const allLeafNodes = Array.from(document.querySelectorAll('*')).filter(el => {
    return el.children.length === 0 && (el.textContent || '').trim().toLowerCase().includes('tipo de veh')
  })
  if (allLeafNodes.length > 0) {
    const leaf = allLeafNodes[0]
    return leaf.closest('[role="combobox"]') || 
           leaf.closest('label') || 
           leaf.closest('[role="button"]') || 
           leaf.closest('div[tabindex]') || 
           leaf.parentElement
  }

  return null
}

// Verifica si el tipo de vehículo ya fue seleccionado previamente
function isFacebookVehicleTypeSelected() {
  // A. Si campos subsiguientes (Año, Marca) ya están presentes en el DOM
  const hasSubsequentFields = Boolean(
    document.querySelector('[aria-label*="año" i], [aria-label*="ano" i], [aria-label*="year" i]') ||
    document.querySelector('[aria-label*="marca" i], [aria-label*="make" i]')
  )
  if (hasSubsequentFields) return true

  // B. Si el disparador ya muestra un valor como "Automóvil" o "Auto" o "Camioneta"
  const trigger = findFacebookVehicleTypeTrigger()
  if (trigger) {
    const txt = (trigger.innerText || trigger.textContent || '').trim().toLowerCase()
    if (!txt.includes('tipo de veh') && (txt.includes('auto') || txt.includes('camion') || txt.includes('coche'))) {
      return true
    }
  }

  return false
}

// Selecciona automáticamente "Tipo de vehículo" en Facebook Marketplace
async function selectFacebookVehicleType() {
  if (isFacebookVehicleTypeSelected()) {
    console.log('✅ [Auto-Cyborg] Tipo de vehículo ya seleccionado.')
    return true
  }

  const trigger = findFacebookVehicleTypeTrigger()
  if (!trigger) {
    console.log('[Auto-Cyborg] Esperando que aparezca selector de Tipo de vehículo...')
    return false
  }

  console.log('🚗 [Auto-Cyborg] Abriendo menú de Tipo de vehículo...')

  // 1. Clic en el elemento interactivo y sus contenedores
  triggerFacebookClick(trigger)
  if (trigger.parentElement) {
    triggerFacebookClick(trigger.parentElement)
  }
  const comboboxChild = trigger.querySelector('[role="combobox"], [role="button"]')
  if (comboboxChild) {
    triggerFacebookClick(comboboxChild)
  }
  const inputChild = trigger.querySelector('input')
  if (inputChild) {
    triggerFacebookClick(inputChild)
  }

  // Teclado por si Facebook requiere ArrowDown/Space para desplegar
  trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, bubbles: true }))

  // 2. Esperar opciones en el DOM
  const options = await waitForFacebookMenuOptions(1500)
  console.log(`[Auto-Cyborg] Opciones encontradas para Tipo de vehículo: ${options.length}`)

  if (options.length > 0) {
    // Buscar la opción de automóvil / camioneta / coche
    let chosen = options.find(opt => {
      const t = (opt.innerText || opt.textContent || '').trim().toLowerCase()
      return (
        t.includes('auto') ||
        t.includes('camion') ||
        t.includes('coche') ||
        t.includes('car') ||
        (t.includes('vehículo') && !t.includes('moto')) ||
        (t.includes('vehiculo') && !t.includes('moto'))
      )
    })

    // Fallback: Si no coincide por texto, en Facebook Marketplace la 1ª opción siempre es autos/camionetas
    if (!chosen) {
      chosen = options[0]
    }

    if (chosen) {
      console.log(`🎯 [Auto-Cyborg] Clic en Tipo de vehículo: "${chosen.innerText || chosen.textContent}"`)
      triggerFacebookClick(chosen)
      chosen.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }))
      await new Promise(r => setTimeout(r, 800))
      return true
    }
  }

  return false
}

// Infiere y resuelve la lista de tipos de carrocería a buscar
function resolveCarBodyStyle(car) {
  const rawBody = normalizeStr(car.Tipo_Carroceria || car.carroceria || car.tipo_carroceria || car.tipo || '')
  const modelStr = normalizeStr(`${car.marca || ''} ${car.modelo || ''} ${car.version || ''}`)

  // Pick-up / Camioneta
  if (
    rawBody.includes('pick') || rawBody.includes('camioneta') || rawBody.includes('chata') ||
    /\b(hilux|ranger|amarok|toro|frontier|s10|oroch|strada|saveiro|maverick|ram|f-150|f150|alaskan|l200|d-max|poer|titano)\b/i.test(modelStr)
  ) {
    return ['camioneta', 'pick-up', 'pickup', 'camioneta pickup', 'truck']
  }

  // SUV
  if (
    rawBody.includes('suv') || rawBody.includes('utilitario deportivo') ||
    /\b(tracker|compass|renegade|kicks|duster|ecosport|cross|taos|t-cross|nivus|hr-v|cr-v|creta|tucson|sportage|sw4|tiguan|captur|2008|3008|5008|c4 cactus|cactus|stepway|spin|rav4|kuga|territory|bronco|pulse|fastback|wr-v|corolla cross)\b/i.test(modelStr)
  ) {
    return ['suv', 'utilitario', 'camioneta suv']
  }

  // Sedán (incluye 408, 508, Cronos, Cruze, Virtus, Vento, Corolla, Logan, etc.)
  if (
    rawBody.includes('sedan') || rawBody.includes('4 puertas') ||
    /\b(cronos|cruze|virtus|vento|prisma|logan|voyage|bora|elysee|c-elysee|siena|linea|civic|sentra|versa|aveo|symbol|408|508|fluence|megane|corolla)\b/i.test(modelStr)
  ) {
    return ['sedan', 'sedán']
  }

  // Hatchback (incluye 208, 308, 206, 207, Gol, Onix, Sandero, Polo, Ka, etc.)
  if (
    rawBody.includes('hatch') || rawBody.includes('5 puertas') ||
    /\b(gol|208|206|207|308|onix|sandero|polo|etios|ka|clio|fox|fiesta|focus|argo|mobi|up|golf|c3|palio|uno|kwid|yaris|march|tiida|fit)\b/i.test(modelStr)
  ) {
    return ['hatchback', 'hatch']
  }

  // Furgoneta / Utilitario
  if (
    rawBody.includes('furgon') || rawBody.includes('van') || rawBody.includes('utilitario') ||
    /\b(kangoo|berlingo|partner|fiorino|transit|master|sprinter|expert|jumpy|boxer|ducato)\b/i.test(modelStr)
  ) {
    return ['furgoneta', 'van', 'minivan', 'utilitario']
  }

  if (rawBody) {
    return [rawBody]
  }

  return ['sedan', 'sedán', 'hatchback', 'suv', 'camioneta']
}

// Infiere y resuelve el tipo de combustible a buscar en Facebook
function resolveCarFuelType(car) {
  const rawFuel = normalizeStr(car.Tipo_Combustible || car.combustible || car.tipo_combustible || '')

  if (rawFuel.includes('diesel') || rawFuel.includes('gasoil')) {
    return ['diesel', 'diésel']
  }
  if (rawFuel.includes('gnc') || rawFuel.includes('gas')) {
    return ['gnc', 'gas natural', 'gas']
  }
  if (rawFuel.includes('hibrid')) {
    return ['hibrido', 'híbrido', 'hybrid']
  }
  if (rawFuel.includes('electr')) {
    return ['electrico', 'eléctrico', 'electric']
  }

  // Por defecto en Argentina / LatAm es Nafta / Gasolina
  return ['gasolina', 'nafta', 'petrol']
}

// Infiere y resuelve la transmisión (Automática o Manual)
function resolveCarTransmission(car) {
  const rawTrans = normalizeStr(car.transmision || car.Transmision || '')
  const modelStr = normalizeStr(`${car.modelo || ''} ${car.version || ''}`)

  const isAuto = rawTrans.includes('auto') || 
                 rawTrans.includes('at') || 
                 /\b(at|dsg|cvt|tiptronic|powershift|steptronic|eat6|eat8)\b/i.test(modelStr)

  if (isAuto) {
    return ['automatica', 'automática', 'automatic']
  }

  return ['transmision manual', 'manual']
}

// Escribe texto en un input de React 18 / Facebook simulando teclado humano para activar typeaheads
async function typeIntoFacebookInput(input, text) {
  if (!input || !text) return false
  try {
    input.focus()
    input.click()
    await new Promise(r => setTimeout(r, 80))

    // 1. Limpiar texto existente
    try {
      input.select?.()
      document.execCommand('selectAll', false, null)
      document.execCommand('delete', false, null)
    } catch (e) {}

    // 2. Inserción con document.execCommand (dispara eventos de entrada confiables para React)
    let typed = false
    try {
      typed = document.execCommand('insertText', false, text)
    } catch (e) {}

    // 3. Respaldo directo en prototipo si execCommand no colocó el valor
    if (!typed || input.value !== text) {
      setReactInputValue(input, text)
    }

    // 4. Disparar eventos sintéticos que espera el Typeahead de Facebook
    input.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, data: text, inputType: 'insertText' }))
    input.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: text.slice(-1), bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keyup', { key: text.slice(-1), bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, bubbles: true }))

    return true
  } catch (err) {
    console.warn('[Auto-Cyborg] typeIntoFacebookInput error:', err)
    return false
  }
}

// Marca el checkbox "El título del vehículo no presenta inconvenientes" si está visible
function checkVehicleTitleCheckbox() {
  const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'))
  for (const cb of checkboxes) {
    if (!cb.checked) {
      cb.focus?.()
      cb.click()
      cb.dispatchEvent(new Event('input', { bubbles: true }))
      cb.dispatchEvent(new Event('change', { bubbles: true }))
      console.log('✅ [Auto-Cyborg] Checkbox de título sin inconvenientes marcado.')
      return true
    }
  }
  return false
}

// Selecciona una opción en un dropdown o combobox de Facebook Marketplace (Año, Marca, Modelo, Carrocería, Estado, Combustible, etc.)
async function selectFacebookDropdownOption(keywords, targetValues, isModel = false) {
  if (!targetValues) return false
  const targets = (Array.isArray(targetValues) ? targetValues : [targetValues]).map(t => normalizeStr(t)).filter(Boolean)
  if (targets.length === 0) return false

  const container = findFacebookFieldContainer(keywords)
  if (!container) {
    console.log(`[Auto-Cyborg] No se encontró contenedor para: ${keywords[0]}`)
    return false
  }

  // Asegurar visibilidad en el viewport para interactividad
  try {
    container.scrollIntoView({ behavior: 'auto', block: 'center' })
  } catch (e) {}

  const input = container.tagName === 'INPUT' ? container : container.querySelector('input')
  const clickable = container.querySelector('[role="combobox"], [role="button"]') || container

  // Si ya tiene alguno de los valores asignados, no repetir
  const currentText = normalizeStr(container.innerText || container.textContent || input?.value || '')
  if (targets.some(t => currentText.includes(t))) {
    console.log(`[Auto-Cyborg] ${keywords[0]} ya tiene "${currentText}".`)
    return true
  }

  console.log(`[Auto-Cyborg] Seleccionando ${targets.join('/')} en ${keywords[0]}...`)

  // 1. Abrir dropdown o enfocar input
  triggerFacebookClick(clickable)
  triggerFacebookClick(container)

  if (input) {
    input.focus?.()
    if (!input.readOnly) {
      // Input escribible (Marca, Modelo): teclear con simulación de eventos
      await typeIntoFacebookInput(input, targets[0])
    } else {
      triggerFacebookClick(input)
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, bubbles: true }))
    }
  }

  // 2. Esperar opciones en el DOM
  const options = await waitForFacebookMenuOptions(1400)

  if (options.length > 0) {
    let matched = null

    for (const targetStr of targets) {
      const baseModel = isModel ? targetStr.split(/[\s\-_]+/)[0] : targetStr

      // Match 1: Coincidencia exacta
      matched = options.find(opt => {
        const t = normalizeStr(opt.innerText || opt.textContent || '')
        return t === targetStr
      })

      // Match 2: Empieza con o el objetivo empieza con la opción
      if (!matched) {
        matched = options.find(opt => {
          const t = normalizeStr(opt.innerText || opt.textContent || '')
          return t.startsWith(targetStr) || targetStr.startsWith(t)
        })
      }

      // Match 3: Modelo base (ej: "408" para "408 Allure")
      if (!matched && (isModel || baseModel)) {
        matched = options.find(opt => {
          const t = normalizeStr(opt.innerText || opt.textContent || '')
          return t === baseModel || t.startsWith(baseModel) || baseModel.startsWith(t)
        })
      }

      // Match 4: Parcial / inclusión
      if (!matched) {
        matched = options.find(opt => {
          const t = normalizeStr(opt.innerText || opt.textContent || '')
          return t.includes(targetStr) || targetStr.includes(t) || (baseModel && (t.includes(baseModel) || baseModel.includes(t)))
        })
      }

      // Match 5: Por tokens si tiene varias palabras
      if (!matched && targetStr.includes(' ')) {
        const tokens = targetStr.split(/\s+/).filter(w => w.length >= 3)
        matched = options.find(opt => {
          const t = normalizeStr(opt.innerText || opt.textContent || '')
          return tokens.some(tok => t === tok || t.includes(tok))
        })
      }

      if (matched) break
    }

    // Fallback inteligente para Estado del vehículo (el usuario pidió siempre Excelente): si ninguna coincidió, elegir la 1ª
    if (!matched && (keywords[0].includes('estado') || keywords[0].includes('condition'))) {
      matched = options[0]
    }
    // Fallback para Tipo de carrocería si no coincidió con ninguna palabra clave
    if (!matched && (keywords[0].includes('carrocería') || keywords[0].includes('carroceria') || keywords[0].includes('body'))) {
      matched = options[0]
    }

    if (matched) {
      console.log(`🎯 [Auto-Cyborg] Opción elegida para ${keywords[0]}: "${matched.innerText || matched.textContent}"`)
      triggerFacebookClick(matched)
      matched.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }))
      await new Promise(r => setTimeout(r, 400))
      return true
    }
  }

  // Si no encontró opción en menú pero hay input editable, presionar Enter para confirmar sugerencia de Facebook
  if (input && !input.readOnly) {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, bubbles: true }))
    await new Promise(r => setTimeout(r, 300))
  }

  return false
}

// Rellena un campo de texto numérico o plano en Facebook Marketplace (Precio, Kilometraje)
function fillFacebookTextInput(keywords, value) {
  if (!value) return false
  const kwList = Array.isArray(keywords) ? keywords : [keywords]

  // 1. Selector directo por input aria-label o name
  for (const kw of kwList) {
    const directInputs = Array.from(document.querySelectorAll(`input[aria-label*="${kw}" i], input[name*="${kw}" i]`))
    for (const inp of directInputs) {
      const current = (inp.value || '').trim()
      if (!current || current === '0') {
        inp.focus?.()
        setReactInputValue(inp, String(value))
        console.log(`✅ [Auto-Cyborg] Campo completado directo (${kw}): ${value}`)
        return true
      }
      return true
    }
  }

  // 2. Búsqueda por contenedor de campo
  const container = findFacebookFieldContainer(keywords)
  if (container) {
    const input = container.tagName === 'INPUT' ? container : container.querySelector('input')
    if (input) {
      const current = (input.value || '').trim()
      if (!current || current === '0') {
        input.focus?.()
        setReactInputValue(input, String(value))
        console.log(`✅ [Auto-Cyborg] Campo completado vía contenedor (${kwList[0]}): ${value}`)
        return true
      }
      return true
    }
  }

  return false
}

// Rellena la descripción en el formulario de Marketplace
function fillFacebookDescription(desc) {
  if (!desc) return false

  // 1. Textarea
  const textareas = Array.from(document.querySelectorAll('textarea'))
  for (const txtarea of textareas) {
    if (!txtarea.value || txtarea.value.trim().length < 10) {
      setReactTextareaValue(txtarea, desc)
      console.log('✅ [Auto-Cyborg] Descripción cargada en textarea.')
      return true
    }
  }

  // 2. Contenteditable
  const editables = Array.from(document.querySelectorAll('[contenteditable="true"]'))
  for (const el of editables) {
    const aria = (el.getAttribute('aria-label') || '').toLowerCase()
    if ((aria.includes('descripción') || aria.includes('description') || aria.includes('detalle')) && !el.textContent.trim()) {
      fillCaption(el, desc)
      console.log('✅ [Auto-Cyborg] Descripción cargada en contenteditable.')
      return true
    }
  }

  return false
}

// Ejecución secuencial de autocompletado en Facebook Marketplace
async function runFacebookVehicleAutomation(car) {
  let actionsDone = false

  // ─────────────────────────────────────────────────────────────────────────
  // PASO 1: TIPO DE VEHÍCULO (DEBE SER LO PRIMERO ABSOLUTO)
  // Al seleccionar "Coche/camión", Facebook despliega la subventana de autocompletado.
  // ─────────────────────────────────────────────────────────────────────────
  const isTypeSelected = isFacebookVehicleTypeSelected()
  if (!isTypeSelected) {
    const typeOk = await selectFacebookVehicleType()
    if (!typeOk && !isFacebookVehicleTypeSelected()) {
      console.log('[Auto-Cyborg] Esperando selección de Tipo de vehículo antes de continuar...')
      return false
    }
    // Dar tiempo para que Facebook renderice los campos dependientes
    await new Promise(r => setTimeout(r, 800))
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PASO 2: SUBIR FOTOS (ahora que el tipo de vehículo abrió el formulario)
  // ─────────────────────────────────────────────────────────────────────────
  if (!isFacebookPhotosInjected) {
    const fileInput = findFacebookFileInput()
    if (fileInput) {
      const files = await prepareFacebookFiles(car)
      if (files.length > 0) {
        const ok = await injectPhotosIntoFacebook(files)
        if (ok) {
          isFacebookPhotosInjected = true
          actionsDone = true
          console.log(`✅ [Auto-Cyborg] ${files.length} fotos inyectadas en Marketplace.`)
          await new Promise(r => setTimeout(r, 600))
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PASO 3: AÑO (Screen 2)
  // ─────────────────────────────────────────────────────────────────────────
  const carYear = car.anio ? String(car.anio).trim() : ''
  if (carYear) {
    await selectFacebookDropdownOption(['año', 'ano', 'year', 'fabricación'], carYear)
    await new Promise(r => setTimeout(r, 400))
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PASO 4: MARCA (Screen 2: crítico, teclear y esperar sugerencias)
  // ─────────────────────────────────────────────────────────────────────────
  const carBrand = (car.marca || '').trim()
  if (carBrand) {
    await selectFacebookDropdownOption(['marca', 'make', 'brand', 'fabricante'], carBrand)
    // Espera para que Facebook consulte y cargue el catálogo de modelos de esta marca
    await new Promise(r => setTimeout(r, 1500))
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PASO 5: MODELO (Screen 2: buscar modelo base ej. "408" y modelo completo)
  // ─────────────────────────────────────────────────────────────────────────
  const carModel = (car.modelo || '').trim()
  if (carModel) {
    const baseModel = carModel.split(/[\s\-_]+/)[0]
    await selectFacebookDropdownOption(['modelo', 'model'], [baseModel, carModel], true)
    await new Promise(r => setTimeout(r, 500))
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PASO 6: PRECIO (Screen 3)
  // ─────────────────────────────────────────────────────────────────────────
  const cleanPrice = String(car.precioNumero || (car.precio ? car.precio.replace(/\D/g, '') : '')).trim()
  if (cleanPrice && cleanPrice !== '0') {
    fillFacebookTextInput(['precio', 'price', 'valor'], cleanPrice)
    await new Promise(r => setTimeout(r, 300))
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PASO 7: TIPO DE CARROCERÍA (Screen 3)
  // ─────────────────────────────────────────────────────────────────────────
  const bodyTargets = resolveCarBodyStyle(car)
  await selectFacebookDropdownOption(
    ['tipo de carrocería', 'tipo de carroceria', 'carrocería', 'carroceria', 'body style'],
    bodyTargets
  )
  await new Promise(r => setTimeout(r, 400))

  // ─────────────────────────────────────────────────────────────────────────
  // PASO 8: CHECKBOX "El título del vehículo no presenta inconvenientes" (Screen 4)
  // ─────────────────────────────────────────────────────────────────────────
  checkVehicleTitleCheckbox()

  // ─────────────────────────────────────────────────────────────────────────
  // PASO 9: ESTADO DEL VEHÍCULO (Screen 4: SIEMPRE EXCELENTE)
  // ─────────────────────────────────────────────────────────────────────────
  await selectFacebookDropdownOption(
    ['estado del vehículo', 'estado del vehiculo', 'vehicle condition', 'condición', 'condicion', 'estado'],
    ['excelente', 'excellent']
  )
  await new Promise(r => setTimeout(r, 400))

  // ─────────────────────────────────────────────────────────────────────────
  // PASO 10: TIPO DE COMBUSTIBLE (Screen 4: Gasolina/Nafta, Diésel, etc.)
  // ─────────────────────────────────────────────────────────────────────────
  const fuelTargets = resolveCarFuelType(car)
  await selectFacebookDropdownOption(
    ['tipo de combustible', 'fuel type', 'combustible'],
    fuelTargets
  )
  await new Promise(r => setTimeout(r, 400))

  // ─────────────────────────────────────────────────────────────────────────
  // PASO 11: TRANSMISIÓN (Screen 4: Manual o Automática)
  // ─────────────────────────────────────────────────────────────────────────
  const transTargets = resolveCarTransmission(car)
  await selectFacebookDropdownOption(
    ['transmisión', 'transmision', 'transmission', 'caja de cambios', 'caja'],
    transTargets
  )
  await new Promise(r => setTimeout(r, 400))

  // ─────────────────────────────────────────────────────────────────────────
  // PASO 12: KILOMETRAJE
  // ─────────────────────────────────────────────────────────────────────────
  const cleanKms = String(car.kms ? car.kms.replace(/\D/g, '') : '').trim()
  if (cleanKms) {
    fillFacebookTextInput(['kilometraje', 'mileage', 'odómetro', 'kilómetros', 'km'], cleanKms)
    await new Promise(r => setTimeout(r, 300))
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PASO 13: ÚLTIMO LA DESCRIPCIÓN (después de completar todos los campos)
  // ─────────────────────────────────────────────────────────────────────────
  if (car.descripcion) {
    fillFacebookDescription(car.descripcion)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VERIFICACIÓN FINAL: sólo dar por completado si Marca, Modelo, Año y Precio están listos
  // ─────────────────────────────────────────────────────────────────────────
  const brandContainer = findFacebookFieldContainer(['marca', 'make', 'brand'])
  const modelContainer = findFacebookFieldContainer(['modelo', 'model'])
  const priceContainer = findFacebookFieldContainer(['precio', 'price'])
  const yearContainer = findFacebookFieldContainer(['año', 'ano', 'year'])
  
  const isBrandDone = Boolean(brandContainer && (
    (brandContainer.innerText || '').toLowerCase().includes(carBrand.toLowerCase()) ||
    (brandContainer.querySelector('input')?.value || '').toLowerCase().includes(carBrand.toLowerCase())
  ))
  const isModelDone = Boolean(modelContainer && (
    (modelContainer.innerText || '').toLowerCase().includes(carModel.toLowerCase()) ||
    (modelContainer.querySelector('input')?.value || '').toLowerCase().includes(carModel.toLowerCase())
  ))
  const isYearDone = Boolean(yearContainer?.innerText?.includes(carYear))
  const isPriceDone = Boolean(priceContainer?.querySelector('input')?.value)

  if (isBrandDone && isModelDone && isPriceDone && isYearDone) {
    isFacebookFieldsFilled = true
    actionsDone = true
    showAutoAppBanner(`✅ ¡${car.marca || ''} ${car.modelo || ''} autocompletado con éxito!`, 'success', 5000)
  }

  return actionsDone
}

// Bucle de supervisión silencioso en Facebook Marketplace (sin recuadros flotantes)
function startFacebookAutomationLoop(car) {
  if (facebookAutomationLoopInterval) clearInterval(facebookAutomationLoopInterval)

  let ticks = 0
  const maxTicks = 60 // ~60 segundos máximo

  facebookAutomationLoopInterval = setInterval(async () => {
    ticks++
    if (ticks > maxTicks) {
      clearInterval(facebookAutomationLoopInterval)
      console.log('⏱️ [Auto-Cyborg 360] Bucle de supervisión de Facebook Marketplace finalizado.')
      return
    }

    try {
      await runFacebookVehicleAutomation(car)

      // Si las fotos y campos están listos, detener el bucle
      if (isFacebookPhotosInjected && isFacebookFieldsFilled) {
        clearInterval(facebookAutomationLoopInterval)
        console.log('🎉 [Auto-Cyborg 360] Publicación de Facebook Marketplace completada al 100%!')
      }
    } catch (err) {
      console.warn('[Auto-Cyborg 360] Error en tick de Facebook Marketplace:', err)
    }
  }, 1000)
}

// Inicialización de la automatización en Facebook Marketplace
async function initFacebookMarketplaceAutomation(carData) {
  console.log('🤖 [Auto-Cyborg 360] Iniciando flujo automático de Facebook Marketplace con:', carData)
  const car = carData
  const title = `${car.marca || ''} ${car.modelo || ''} ${car.anio || ''}`.trim()

  // 1. Copiar descripción al portapapeles preventivamente
  if (car.descripcion) {
    try {
      await navigator.clipboard.writeText(car.descripcion)
      console.log('📋 [Auto-Cyborg 360] Descripción copiada al portapapeles.')
    } catch (e) {}
  }

  // 2. Notificación discreta en la parte superior (sin recuadro lateral invasivo)
  showAutoAppBanner(`⚡ Auto-Cyborg: Autocompletando ${title}...`, 'info', 4000)

  // 3. Iniciar descarga preventiva de fotos en memoria
  prepareFacebookFiles(car)

  // 4. Iniciar bucle de automatización DOM
  startFacebookAutomationLoop(car)
}

// ─────────────────────────────────────────────────────────────────────────────
// 🚀 INICIALIZACIÓN GLOBAL
// ─────────────────────────────────────────────────────────────────────────────

async function init() {
  // 1. Si estamos en AutoApp (localhost / 127.0.0.1 / vercel / autoapp)
  const isAutoApp = window.location.hostname.includes('localhost') || 
                    window.location.hostname.includes('127.0.0.1') || 
                    window.location.hostname.includes('vercel.app') ||
                    window.location.hostname.includes('autoapp')
  if (isAutoApp) {
    console.log('⚡ [Auto-Cyborg 360] Puente activo en AutoApp.')
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'AUTOAPP_PUBLISH_TASK') {
        const payload = event.data.payload
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          if (event.data.target === 'WHATSAPP_STATUS') {
            chrome.storage.local.set({ wa_active_car: payload })
            console.log('🚗 [Auto-Cyborg 360] Vehículo guardado para WhatsApp en storage local:', payload)
          } else if (event.data.target === 'FACEBOOK_MARKETPLACE') {
            const carToStore = payload.active_car || payload.fb_active_car || payload
            chrome.storage.local.set({ fb_active_car: carToStore, active_car: carToStore })
            console.log('🚗 [Auto-Cyborg 360] Vehículo guardado para Facebook Marketplace en storage local:', carToStore)
          }
        }
      }
      if (event.data && event.data.type === 'AUTOAPP_SET_STORAGE' && event.data.data) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set(event.data.data)
          console.log('📦 [Auto-Cyborg 360] Storage directo guardado en Chrome storage:', event.data.data)
        }
      }
    })
    return
  }

  const hashPayload = getPayloadFromHash()

  // Guardar en storage si viene del hash para persistencia entre recargas
  if (hashPayload && hashPayload.platform === 'whatsapp') {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ wa_active_car: hashPayload.data })
    }
  } else if (hashPayload && hashPayload.platform === 'facebook') {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ fb_active_car: hashPayload.data, active_car: hashPayload.data })
    }
  }

  // 2. Si estamos en WhatsApp Web
  if (window.location.hostname.includes('whatsapp.com')) {
    let carData = hashPayload && hashPayload.platform === 'whatsapp' ? hashPayload.data : null

    if (!carData && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const stored = await chrome.storage.local.get(['wa_active_car'])
        if (stored && stored.wa_active_car) {
          carData = stored.wa_active_car
        }
      } catch (e) {}
    }

    if (carData) {
      initWhatsAppAutomation(carData)
    }
    return
  }

  // 3. Si estamos en Facebook Marketplace
  if (window.location.hostname.includes('facebook.com')) {
    let carData = hashPayload && hashPayload.platform === 'facebook' ? hashPayload.data : null

    if (!carData && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const stored = await chrome.storage.local.get(['fb_active_car', 'active_car'])
        if (stored && (stored.fb_active_car || stored.active_car)) {
          carData = stored.fb_active_car || stored.active_car
        }
      } catch (e) {}
    }

    if (carData) {
      initFacebookMarketplaceAutomation(carData)
    }
    return
  }

  // 4. Si estamos en Instagram
  if (window.location.hostname.includes('instagram.com')) {
    if (hashPayload && hashPayload.platform === 'instagram') {
      const payload = hashPayload.data
      const captionText = payload.descripcion || payload.caption || ''
      if (captionText) {
        try {
          await navigator.clipboard.writeText(captionText)
          showAutoAppBanner('Copy con hashtags copiado al portapapeles para Instagram.', 'success')
        } catch (err) {}
      }
    }
    return
  }
}

// Escuchar cambios de hash dinámicos en WhatsApp Web y Facebook Marketplace
window.addEventListener('hashchange', () => {
  if (window.location.hostname.includes('whatsapp.com') || window.location.hostname.includes('facebook.com')) {
    init()
  }
})

// Ejecutar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
