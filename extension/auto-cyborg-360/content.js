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
// 🚀 INICIALIZACIÓN GLOBAL
// ─────────────────────────────────────────────────────────────────────────────

async function init() {
  // 1. Si estamos en AutoApp (localhost / 127.0.0.1 / vercel)
  if (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1') || window.location.hostname.includes('vercel.app')) {
    console.log('⚡ [Auto-Cyborg 360] Puente activo en AutoApp.')
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'AUTOAPP_PUBLISH_TASK') {
        const payload = event.data.payload
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          if (event.data.target === 'WHATSAPP_STATUS') {
            chrome.storage.local.set({ wa_active_car: payload })
            console.log('🚗 [Auto-Cyborg 360] Vehículo guardado para WhatsApp en storage local:', payload)
          }
        }
      }
    })
    return
  }

  const hashPayload = getPayloadFromHash()

  // Guardar en storage si viene del hash para persistencia
  if (hashPayload && hashPayload.platform === 'whatsapp') {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ wa_active_car: hashPayload.data })
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
    if (hashPayload && hashPayload.platform === 'facebook') {
      const payload = hashPayload.data
      showAutoAppBanner(`Cargando ficha de ${payload.marca || ''} ${payload.modelo || ''}...`, 'success')
      if (payload.descripcion) {
        try {
          await navigator.clipboard.writeText(payload.descripcion)
          showAutoAppBanner('Descripción copiada al portapapeles para pegar en Marketplace', 'info')
        } catch (err) {}
      }
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

// Escuchar cambios de hash dinámicos en WhatsApp Web
window.addEventListener('hashchange', () => {
  if (window.location.hostname.includes('whatsapp.com')) {
    init()
  }
})

// Ejecutar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
