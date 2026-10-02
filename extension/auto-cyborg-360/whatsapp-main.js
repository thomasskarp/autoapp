// Auto-Cyborg 360 — WhatsApp Web Main World Script
// Corre en el contexto nativo ("world": "MAIN") de WhatsApp Web.
// 1. Intercepta el selector de archivos nativo para inyectar la foto del vehículo.
// 2. Inyecta automáticamente el texto en el editor Lexical ("Añade un comentario").
// 3. Envía el estado automáticamente tras verificar el texto.

(function() {
  console.log('⚡ [Auto-Cyborg 360] Hook MAIN World activo en WhatsApp Web.');

  window.__AUTOAPP_PENDING_FILE = null;
  window.__AUTOAPP_FILE_READY = false;
  window.__AUTOAPP_CAPTION = null;

  // Decodificador seguro del hash de la URL
  function getAutoAppData() {
    try {
      const hash = window.location.hash || '';
      if (hash.startsWith('#autoapp_wa=')) {
        const raw = hash.replace('#autoapp_wa=', '');
        try {
          return JSON.parse(decodeURIComponent(raw));
        } catch (e) {
          try {
            return JSON.parse(atob(raw));
          } catch (e2) {}
        }
      }
    } catch (err) {}
    return null;
  }

  // Cargar caption inicial desde hash si está presente
  const initialData = getAutoAppData();
  if (initialData && (initialData.caption || initialData.descripcion)) {
    window.__AUTOAPP_CAPTION = initialData.caption || initialData.descripcion;
    console.log('📝 [Auto-Cyborg MAIN] Caption detectado en URL hash:', window.__AUTOAPP_CAPTION.substring(0, 40) + '...');
  }

  // Función para convertir Base64 a File
  function base64ToFile(base64Data, filename, mimeType = 'image/jpeg') {
    try {
      const parts = base64Data.split(';base64,');
      const raw = parts.length > 1 ? parts[1] : parts[0];
      const byteString = atob(raw);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeType });
      return new File([blob], filename || 'foto_estado_autoapp.jpg', { type: mimeType });
    } catch (e) {
      console.warn('[Auto-Cyborg MAIN] Error convirtiendo base64 a File:', e);
      return null;
    }
  }

  // Inyección robusta de texto en el editor Lexical de WhatsApp Web
  function injectTextIntoEditor(editor, text) {
    if (!editor || !text) return false;
    try {
      editor.focus();
      editor.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      editor.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      editor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      // Establecer selección
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);

      // 1. Probar evento paste con DataTransfer (manejador nativo de Lexical)
      try {
        const dt = new DataTransfer();
        dt.setData('text/plain', text);
        const pasteEvt = new ClipboardEvent('paste', {
          clipboardData: dt,
          bubbles: true,
          cancelable: true
        });
        editor.dispatchEvent(pasteEvt);
      } catch (e) {}

      // 2. Inserción línea por línea con beforeinput + insertText + insertParagraph + input
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line) {
          editor.dispatchEvent(new InputEvent('beforeinput', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: line
          }));
          document.execCommand('insertText', false, line);
          editor.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: line
          }));
        }
        if (i < lines.length - 1) {
          editor.dispatchEvent(new InputEvent('beforeinput', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertParagraph'
          }));
          document.execCommand('insertParagraph', false);
          editor.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertParagraph'
          }));
        }
      }

      // Si por alguna razón sigue vacío, intentar document.execCommand('paste')
      if (!editor.textContent.trim()) {
        try {
          document.execCommand('paste');
        } catch (e) {}
      }

      return editor.textContent.trim().length > 0;
    } catch (err) {
      console.warn('[Auto-Cyborg MAIN] Error en injectTextIntoEditor:', err);
      return false;
    }
  }

  // Rutina continua para detectar el editor de pie de foto y llenarlo
  let captionRoutineRunning = false;
  function startCaptionInjectionRoutine() {
    if (captionRoutineRunning) return;
    captionRoutineRunning = true;
    console.log('🚀 [Auto-Cyborg MAIN] Iniciando rutina de inyección de pie de foto...');

    let attempts = 0;
    const maxAttempts = 40; // ~14 segundos

    const interval = setInterval(() => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(interval);
        captionRoutineRunning = false;
        console.log('⏱️ [Auto-Cyborg MAIN] Tiempo límite de inyección alcanzado.');
        return;
      }

      const captionText = window.__AUTOAPP_CAPTION || (getAutoAppData() && (getAutoAppData().caption || getAutoAppData().descripcion));
      if (!captionText) return;

      // 1. Localizar el editor de comentarios
      // En WhatsApp Web el editor usa div[data-lexical-editor="true"] o contenteditable en mitad inferior
      const allEditables = Array.from(document.querySelectorAll('div[data-lexical-editor="true"], div[contenteditable="true"][role="textbox"], div[contenteditable="true"]'));
      let editor = allEditables.find(el => {
        const r = el.getBoundingClientRect();
        return r.width > 20 && r.height > 10 && r.top > window.innerHeight * 0.4;
      }) || allEditables[0];

      // Si aún no está visible el editor, buscar y hacer clic en el placeholder "Añade un comentario"
      if (!editor) {
        const placeholder = Array.from(document.querySelectorAll('span, div, p')).find(el => {
          const t = (el.textContent || '').trim().toLowerCase();
          return el.children.length === 0 && (t === 'añade un comentario' || t.includes('añade un comentario') || t.includes('add a caption'));
        });
        if (placeholder) {
          placeholder.click();
        }
        return;
      }

      // Si el editor ya tiene el texto cargado
      if (editor.textContent.trim().length > 10) {
        console.log('✅ [Auto-Cyborg MAIN] El pie de foto ya está inyectado.');
        clearInterval(interval);
        captionRoutineRunning = false;

        // Auto-enviar tras 1.2 segundos
        setTimeout(() => {
          clickSendButton();
        }, 1200);
        return;
      }

      // 2. Inyectar texto
      console.log('✍️ [Auto-Cyborg MAIN] Inyectando texto en editor Lexical...');
      const ok = injectTextIntoEditor(editor, captionText);
      if (ok || editor.textContent.trim().length > 10) {
        console.log('🎉 [Auto-Cyborg MAIN] ¡Pie de foto inyectado con éxito!');
        clearInterval(interval);
        captionRoutineRunning = false;

        setTimeout(() => {
          clickSendButton();
        }, 1200);
      }
    }, 350);
  }

  // Localiza y hace clic en el botón redondo verde de Enviar Estado
  function clickSendButton() {
    console.log('🚀 [Auto-Cyborg MAIN] Buscando botón de Enviar Estado...');
    const sendIcon = document.querySelector('span[data-icon="send"]') ||
                     document.querySelector('span[data-icon="send-light"]') ||
                     document.querySelector('span[data-icon="round-send-filled"]') ||
                     document.querySelector('span[data-icon="wds-ic-send-filled"]') ||
                     document.querySelector('span[data-icon="forward"]');
    let btn = sendIcon ? (sendIcon.closest('button') || sendIcon.closest('div[role="button"]') || sendIcon) : null;
    
    if (!btn) {
      btn = document.querySelector('button[aria-label*="Enviar" i]') ||
            document.querySelector('button[aria-label*="Send" i]') ||
            document.querySelector('div[role="button"][aria-label*="Enviar" i]') ||
            document.querySelector('div[role="button"][aria-label*="Send" i]');
    }

    if (!btn) {
      const allBtns = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"]'));
      const candidates = allBtns.filter(b => {
        const r = b.getBoundingClientRect();
        return r.right >= window.innerWidth - 150 && r.bottom >= window.innerHeight - 150 && r.width >= 35 && r.height >= 35;
      });
      if (candidates.length > 0) {
        candidates.sort((a, b) => (b.getBoundingClientRect().right + b.getBoundingClientRect().bottom) - (a.getBoundingClientRect().right + a.getBoundingClientRect().bottom));
        btn = candidates[0];
      }
    }

    if (btn) {
      console.log('✅ [Auto-Cyborg MAIN] Haciendo clic automático en Enviar Estado...');
      btn.click();
      btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    } else {
      console.warn('⚠️ [Auto-Cyborg MAIN] Botón de enviar no encontrado en el viewport.');
    }
  }

  // Escuchar mensajes desde el content script (isolated world)
  window.addEventListener('message', function(event) {
    if (!event.data) return;

    if (event.data.type === 'AUTOAPP_SET_PENDING_FILE_DATA') {
      const { base64Data, fileName, mimeType, caption } = event.data;
      if (caption) {
        window.__AUTOAPP_CAPTION = caption;
      }
      if (base64Data) {
        window.__AUTOAPP_PENDING_FILE = base64ToFile(base64Data, fileName, mimeType || 'image/jpeg');
        window.__AUTOAPP_FILE_READY = true;
        console.log('📸 [Auto-Cyborg MAIN] Archivo de vehículo preparado en memoria para inyección:', window.__AUTOAPP_PENDING_FILE?.name);
      }
    }

    if (event.data.type === 'AUTOAPP_FILL_CAPTION_MAIN') {
      if (event.data.text) {
        window.__AUTOAPP_CAPTION = event.data.text;
      }
      startCaptionInjectionRoutine();
    }
  });

  // Interceptar HTMLInputElement.prototype.click para input[type="file"]
  const originalInputClick = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function() {
    if (this.type === 'file' && window.__AUTOAPP_PENDING_FILE) {
      console.log('🎯 [Auto-Cyborg MAIN] Selector de archivos de WhatsApp Web interceptado con éxito.');
      try {
        const file = window.__AUTOAPP_PENDING_FILE;
        const dt = new DataTransfer();
        dt.items.add(file);
        this.files = dt.files;
        this.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        this.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        
        // Notificar a content script
        window.postMessage({ type: 'AUTOAPP_FILE_INJECTED_SUCCESS' }, '*');
        
        // Disparar inmediatamente la rutina de inyección de pie de foto
        setTimeout(() => {
          startCaptionInjectionRoutine();
        }, 500);

        return; // Detener diálogo de archivos nativo de Windows
      } catch (err) {
        console.warn('[Auto-Cyborg MAIN] Error inyectando archivos en input:', err);
      }
    }
    return originalInputClick.apply(this, arguments);
  };

  // Observador de mutaciones para atrapar cualquier input[type="file"] agregado dinámicamente
  const observer = new MutationObserver(function(mutations) {
    if (!window.__AUTOAPP_PENDING_FILE) return;
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1) {
          const inputs = node.matches && node.matches('input[type="file"]') 
            ? [node] 
            : (node.querySelectorAll ? Array.from(node.querySelectorAll('input[type="file"]')) : []);
          for (const inp of inputs) {
            try {
              const dt = new DataTransfer();
              dt.items.add(window.__AUTOAPP_PENDING_FILE);
              inp.files = dt.files;
              inp.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
              inp.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
              console.log('🎯 [Auto-Cyborg MAIN] Archivo inyectado en input[type="file"] dinámico.');
              setTimeout(() => {
                startCaptionInjectionRoutine();
              }, 500);
            } catch (e) {}
          }
        }
      }
    }
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  // Si ya estamos en una URL de WhatsApp con autoapp_wa, iniciar observación de rutina
  if (window.location.hash && window.location.hash.includes('#autoapp_wa=')) {
    setTimeout(() => {
      startCaptionInjectionRoutine();
    }, 1500);
  }
})();
