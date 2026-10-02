'use client'

import { useState, useEffect } from 'react'
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Link2,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  ExternalLink,
  MessageSquare,
  Send,
  HelpCircle,
  Power,
  Sparkles,
  Layers,
  Phone,
  QrCode,
  Lock
} from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function CRMConnectionsModal({ isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'meta' | 'mercadolibre' | 'whatsapp'>('meta')
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({})

  // Estado de Meta (Facebook Messenger, Instagram DMs y Comentarios)
  const [metaConfig, setMetaConfig] = useState({
    connected: false,
    pageId: '',
    pageName: '',
    pageToken: '',
    igUserId: '',
    igUsername: '',
    verifyToken: 'autoapp_meta_webhook_secret',
    appId: '',
    appSecret: ''
  })

  // Estado de MercadoLibre
  const [meliConfig, setMeliConfig] = useState({
    connected: false,
    clientId: '',
    clientSecret: '',
    accessToken: '',
    nickname: '',
    sellerId: ''
  })

  // Estado de WhatsApp
  const [waConfig, setWaConfig] = useState({
    connected: false,
    mode: 'cloud_api' as 'cloud_api' | 'web_session',
    phoneNumberId: '',
    wabaId: '',
    accessToken: '',
    phoneNumber: '',
    verifyToken: 'autoapp_whatsapp_webhook_secret',
    webConnected: false
  })

  // Cargar estado actual de las conexiones
  const fetchConnections = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/crm/connections')
      const data = await res.json()
      if (data.success && data.connections) {
        const { meta, mercadolibre, whatsapp } = data.connections
        if (meta) {
          setMetaConfig(prev => ({
            ...prev,
            connected: meta.connected || false,
            pageId: meta.pageId || '',
            pageName: meta.pageName || '',
            pageToken: meta.pageToken || '',
            igUserId: meta.igUserId || '',
            igUsername: meta.igUsername || '',
            verifyToken: meta.verifyToken || 'autoapp_meta_webhook_secret',
            appId: meta.appId || '',
          }))
        }
        if (mercadolibre) {
          setMeliConfig(prev => ({
            ...prev,
            connected: mercadolibre.connected || false,
            clientId: mercadolibre.clientId || '',
            accessToken: mercadolibre.accessToken || '',
            nickname: mercadolibre.nickname || '',
            sellerId: mercadolibre.sellerId || ''
          }))
        }
        if (whatsapp) {
          setWaConfig(prev => ({
            ...prev,
            connected: whatsapp.connected || false,
            mode: whatsapp.mode || 'cloud_api',
            phoneNumberId: whatsapp.phoneNumberId || '',
            wabaId: whatsapp.wabaId || '',
            accessToken: whatsapp.accessToken || '',
            phoneNumber: whatsapp.phoneNumber || '',
            verifyToken: whatsapp.verifyToken || 'autoapp_whatsapp_webhook_secret',
            webConnected: whatsapp.webConnected || false
          }))
        }
      }
    } catch (e) {
      console.warn('Error cargando conexiones:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchConnections()
      setStatusMsg(null)
    }
  }, [isOpen])

  const toggleShowToken = (key: string) => {
    setShowTokens(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Guardar credenciales de Meta
  const handleSaveMeta = async () => {
    try {
      setLoading(true)
      setStatusMsg({ type: 'info', text: 'Guardando configuración de Meta...' })
      const res = await fetch('/api/crm/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_meta', data: metaConfig })
      })
      const data = await res.json()
      if (data.success) {
        setStatusMsg({ type: 'success', text: '¡Credenciales de Meta guardadas exitosamente!' })
        fetchConnections()
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Error al guardar credenciales de Meta.' })
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message })
    } finally {
      setLoading(false)
    }
  }

  // Probar conexión de Meta
  const handleTestMeta = async () => {
    try {
      setLoading(true)
      setStatusMsg({ type: 'info', text: 'Validando credenciales con Meta Graph API...' })
      const res = await fetch('/api/crm/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_meta', data: metaConfig })
      })
      const data = await res.json()
      setStatusMsg({
        type: data.success ? 'success' : 'error',
        text: data.message || (data.success ? 'Conexión válida' : 'Fallo en la prueba')
      })
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message })
    } finally {
      setLoading(false)
    }
  }

  // Guardar credenciales de MercadoLibre
  const handleSaveMeli = async () => {
    try {
      setLoading(true)
      setStatusMsg({ type: 'info', text: 'Guardando configuración de MercadoLibre...' })
      const res = await fetch('/api/crm/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_meli', data: meliConfig })
      })
      const data = await res.json()
      if (data.success) {
        setStatusMsg({ type: 'success', text: '¡Credenciales de MercadoLibre guardadas exitosamente!' })
        fetchConnections()
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Error al guardar.' })
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message })
    } finally {
      setLoading(false)
    }
  }

  // Probar conexión de MercadoLibre
  const handleTestMeli = async () => {
    try {
      setLoading(true)
      setStatusMsg({ type: 'info', text: 'Probando acceso a MercadoLibre API...' })
      const res = await fetch('/api/crm/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_meli', data: meliConfig })
      })
      const data = await res.json()
      setStatusMsg({
        type: data.success ? 'success' : 'error',
        text: data.message
      })
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message })
    } finally {
      setLoading(false)
    }
  }

  // Guardar credenciales de WhatsApp Cloud API
  const handleSaveWhatsApp = async () => {
    try {
      setLoading(true)
      setStatusMsg({ type: 'info', text: 'Guardando configuración de WhatsApp Cloud API...' })
      const res = await fetch('/api/crm/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_whatsapp_cloud', data: waConfig })
      })
      const data = await res.json()
      if (data.success) {
        setStatusMsg({ type: 'success', text: '¡Configuración de WhatsApp guardada exitosamente!' })
        fetchConnections()
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Error al guardar WhatsApp.' })
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message })
    } finally {
      setLoading(false)
    }
  }

  // Probar conexión de WhatsApp
  const handleTestWhatsApp = async () => {
    try {
      setLoading(true)
      setStatusMsg({ type: 'info', text: 'Verificando Phone Number ID con WhatsApp Cloud API...' })
      const res = await fetch('/api/crm/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_whatsapp_cloud', data: waConfig })
      })
      const data = await res.json()
      setStatusMsg({
        type: data.success ? 'success' : 'error',
        text: data.message
      })
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message })
    } finally {
      setLoading(false)
    }
  }

  // Desconectar un canal
  const handleDisconnect = async (provider: string) => {
    if (!confirm(`¿Confirmás desconectar las credenciales de este canal?`)) return
    try {
      setLoading(true)
      await fetch('/api/crm/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect', provider })
      })
      setStatusMsg({ type: 'info', text: 'Canal desconectado.' })
      fetchConnections()
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message })
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}>
      
      <div
        className="w-full max-w-3xl bg-[#0F1117] border border-[#2A2F45] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}>
        
        {/* Cabecera Principal */}
        <div className="px-6 py-4 border-b border-[#1F2337] flex items-center justify-between bg-[#131620]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FACC15]/15 border border-[#FACC15]/30 flex items-center justify-center text-[#FACC15]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                  Conexión de Cuentas y Canales CRM
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                  En Vivo
                </span>
              </div>
              <p className="text-xs text-[#8B8FA8]">
                Configurá tus cuentas para la lectura automática de chats y consultas en tiempo real
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1F2337] text-[#A0A5BD] hover:text-white hover:bg-[#2A2F45] flex items-center justify-center transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alert Bar */}
        {statusMsg && (
          <div
            className={`px-5 py-2.5 text-xs font-bold flex items-center gap-2 border-b ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : statusMsg.type === 'error'
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
            }`}>
            {statusMsg.type === 'success' ? (
              <CheckCircle2 size={15} />
            ) : statusMsg.type === 'error' ? (
              <AlertCircle size={15} />
            ) : (
              <RefreshCw size={15} className="animate-spin" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Pestañas de Selección de Canal */}
        <div className="px-6 pt-3 bg-[#0F1117] border-b border-[#1F2337] flex items-center gap-2 overflow-x-auto">
          {/* Tab 1: Meta */}
          <button
            type="button"
            onClick={() => setActiveTab('meta')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'meta'
                ? 'bg-[#161B26] text-white border-[#1877F2]'
                : 'text-[#8B8FA8] hover:text-white border-transparent'
            }`}>
            <span className="w-2 h-2 rounded-full" style={{ background: metaConfig.connected ? '#22C55E' : '#6B7280' }} />
            <span>Instagram & Facebook</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-black bg-emerald-500/20 text-emerald-400">
              Gratis
            </span>
          </button>

          {/* Tab 2: MercadoLibre */}
          <button
            type="button"
            onClick={() => setActiveTab('mercadolibre')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'mercadolibre'
                ? 'bg-[#161B26] text-white border-[#FFE600]'
                : 'text-[#8B8FA8] hover:text-white border-transparent'
            }`}>
            <span className="w-2 h-2 rounded-full" style={{ background: meliConfig.connected ? '#22C55E' : '#6B7280' }} />
            <span>MercadoLibre</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-black bg-emerald-500/20 text-emerald-400">
              Gratis
            </span>
          </button>

          {/* Tab 3: WhatsApp */}
          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'whatsapp'
                ? 'bg-[#161B26] text-white border-[#25D366]'
                : 'text-[#8B8FA8] hover:text-white border-transparent'
            }`}>
            <span className="w-2 h-2 rounded-full" style={{ background: waConfig.connected ? '#22C55E' : '#6B7280' }} />
            <span>WhatsApp (1 a 1)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-black bg-amber-500/20 text-amber-400">
              1.000 Gratis/mes
            </span>
          </button>
        </div>

        {/* Contenedor del Formulario por Canal */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-[#0A0C12]">

          {/* ══════════════ TAB 1: META (FB, IG Y COMENTARIOS) ══════════════ */}
          {activeTab === 'meta' && (
            <div className="space-y-4">
              {/* Tarjeta Informativa */}
              <div className="p-4 rounded-xl bg-[#141824] border border-[#252A3D] flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1877F2]/20 text-[#1877F2] flex items-center justify-center shrink-0 mt-0.5">
                  <Send size={16} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-white uppercase tracking-wide">
                      Meta Graph API Oficial (Instagram DMs, Messenger y Comentarios)
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      100% Gratuito en la Nube
                    </span>
                  </div>
                  <p className="text-xs text-[#8B8FA8] mt-1 leading-relaxed">
                    Lee en vivo las conversaciones de tus clientes en Instagram (@okmmotors), Facebook Messenger y comentarios en tus autos publicados.
                  </p>
                </div>
              </div>

              {/* Botón de 1-Click OAuth */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#111624] border border-[#1F2337]">
                <div>
                  <span className="text-xs font-bold text-white block">Vinculación Automática (Recomendada)</span>
                  <span className="text-[11px] text-[#8B8FA8]">Iniciá sesión en Facebook para autorizar tu Fan Page e Instagram con 1 toque.</span>
                </div>
                <button
                  type="button"
                  onClick={() => { window.location.href = '/api/facebook/connect' }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1877F2] hover:bg-[#166FE5] text-white flex items-center gap-1.5 transition-all shadow-md hover:scale-105 cursor-pointer">
                  <Link2 size={14} />
                  <span>Vincular con Facebook</span>
                </button>
              </div>

              {/* Campos manuales para ingresar credenciales propias */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#A0A5BD] uppercase tracking-wider">
                    O ingresá tus claves manuales de desarrollador:
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8B8FA8] mb-1">
                      Facebook Page ID
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 10482910481239"
                      value={metaConfig.pageId}
                      onChange={e => setMetaConfig(prev => ({ ...prev, pageId: e.target.value }))}
                      className="input w-full p-2.5 text-xs font-medium bg-[#0E111A]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#8B8FA8] mb-1">
                      Nombre de la Fan Page
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: AutoMotors Oficial"
                      value={metaConfig.pageName}
                      onChange={e => setMetaConfig(prev => ({ ...prev, pageName: e.target.value }))}
                      className="input w-full p-2.5 text-xs font-medium bg-[#0E111A]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-[#8B8FA8]">
                      Page Access Token (Token de Acceso)
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleShowToken('meta')}
                      className="text-[10px] text-[#FACC15] hover:underline flex items-center gap-1">
                      {showTokens['meta'] ? <EyeOff size={11} /> : <Eye size={11} />}
                      <span>{showTokens['meta'] ? 'Ocultar' : 'Ver'}</span>
                    </button>
                  </div>
                  <input
                    type={showTokens['meta'] ? 'text' : 'password'}
                    placeholder="EAA..."
                    value={metaConfig.pageToken}
                    onChange={e => setMetaConfig(prev => ({ ...prev, pageToken: e.target.value }))}
                    className="input w-full p-2.5 text-xs font-mono bg-[#0E111A]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8B8FA8] mb-1">
                      Instagram Business Account ID
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 17841474277477470"
                      value={metaConfig.igUserId}
                      onChange={e => setMetaConfig(prev => ({ ...prev, igUserId: e.target.value }))}
                      className="input w-full p-2.5 text-xs font-medium bg-[#0E111A]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#8B8FA8] mb-1">
                      Usuario de Instagram
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: @okmmotors"
                      value={metaConfig.igUsername}
                      onChange={e => setMetaConfig(prev => ({ ...prev, igUsername: e.target.value }))}
                      className="input w-full p-2.5 text-xs font-medium bg-[#0E111A]"
                    />
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-between pt-3 border-t border-[#1F2337]">
                <button
                  type="button"
                  onClick={() => handleDisconnect('meta')}
                  disabled={loading || !metaConfig.connected}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all disabled:opacity-30 cursor-pointer">
                  Desconectar
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestMeta}
                    disabled={loading}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1F2337] hover:bg-[#2A2F45] border border-[#2A2F45] transition-all cursor-pointer">
                    Probar Conexión
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveMeta}
                    disabled={loading}
                    className="px-5 py-2 rounded-xl text-xs font-extrabold text-black bg-[#FACC15] hover:bg-[#FDE047] transition-all shadow-md flex items-center gap-1.5 cursor-pointer">
                    <Save size={14} />
                    <span>Guardar Credenciales</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ TAB 2: MERCADOLIBRE ══════════════ */}
          {activeTab === 'mercadolibre' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#141824] border border-[#252A3D] flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FFE600]/20 text-[#FFE600] flex items-center justify-center shrink-0 mt-0.5">
                  <MessageSquare size={16} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-white uppercase tracking-wide">
                      MercadoLibre (Preguntas y Consultas en vivo)
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      100% Gratuito Oficial
                    </span>
                  </div>
                  <p className="text-xs text-[#8B8FA8] mt-1 leading-relaxed">
                    Sincroniza y responde preguntas de compradores de MercadoLibre en tiempo real directo desde el CRM.
                  </p>
                </div>
              </div>

              {/* Botón de vinculación OAuth 1-Click */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#111624] border border-[#1F2337]">
                <div>
                  <span className="text-xs font-bold text-white block">Vinculación Oficial 1-Click</span>
                  <span className="text-[11px] text-[#8B8FA8]">Autoriza tu cuenta de MercadoLibre de tu agencia sin copiar tokens manualmente.</span>
                </div>
                <button
                  type="button"
                  onClick={() => { window.location.href = '/api/mercadolibre/connect' }}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-[#FFE600] hover:bg-[#FDE047] text-black flex items-center gap-1.5 transition-all shadow-md hover:scale-105 cursor-pointer">
                  <Link2 size={14} />
                  <span>Vincular MercadoLibre</span>
                </button>
              </div>

              {/* Credenciales de la Aplicación */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-black text-[#A0A5BD] uppercase tracking-wider block">
                  O configurá las credenciales de tu App de MercadoLibre:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8B8FA8] mb-1">
                      App ID (Client ID)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 7284100481716968"
                      value={meliConfig.clientId}
                      onChange={e => setMeliConfig(prev => ({ ...prev, clientId: e.target.value }))}
                      className="input w-full p-2.5 text-xs font-medium bg-[#0E111A]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#8B8FA8] mb-1">
                      Secret Key (Client Secret)
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••••••"
                      value={meliConfig.clientSecret}
                      onChange={e => setMeliConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                      className="input w-full p-2.5 text-xs font-medium bg-[#0E111A]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-[#8B8FA8]">
                      Access Token Directo (Opcional / Test)
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleShowToken('meli')}
                      className="text-[10px] text-[#FACC15] hover:underline flex items-center gap-1">
                      {showTokens['meli'] ? <EyeOff size={11} /> : <Eye size={11} />}
                      <span>{showTokens['meli'] ? 'Ocultar' : 'Ver'}</span>
                    </button>
                  </div>
                  <input
                    type={showTokens['meli'] ? 'text' : 'password'}
                    placeholder="APP_USR-..."
                    value={meliConfig.accessToken}
                    onChange={e => setMeliConfig(prev => ({ ...prev, accessToken: e.target.value }))}
                    className="input w-full p-2.5 text-xs font-mono bg-[#0E111A]"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-between pt-3 border-t border-[#1F2337]">
                <button
                  type="button"
                  onClick={() => handleDisconnect('mercadolibre')}
                  disabled={loading || !meliConfig.connected}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all disabled:opacity-30 cursor-pointer">
                  Desconectar
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestMeli}
                    disabled={loading}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1F2337] hover:bg-[#2A2F45] border border-[#2A2F45] transition-all cursor-pointer">
                    Probar Conexión
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveMeli}
                    disabled={loading}
                    className="px-5 py-2 rounded-xl text-xs font-extrabold text-black bg-[#FACC15] hover:bg-[#FDE047] transition-all shadow-md flex items-center gap-1.5 cursor-pointer">
                    <Save size={14} />
                    <span>Guardar Credenciales</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ TAB 3: WHATSAPP ══════════════ */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#141824] border border-[#252A3D] flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#25D366]/20 text-[#25D366] flex items-center justify-center shrink-0 mt-0.5">
                  <Phone size={16} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-white uppercase tracking-wide">
                      WhatsApp (Chats 1 a 1 de Prospectos)
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      1.000 chats/mes gratis
                    </span>
                  </div>
                  <p className="text-xs text-[#8B8FA8] mt-1 leading-relaxed">
                    Elegí si preferís la API Oficial en la nube de Meta (sin depender de PC encendida) o una sesión web local emparejada por QR.
                  </p>
                </div>
              </div>

              {/* Selector de Modo */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#0E111A] border border-[#1F2337] rounded-xl">
                <button
                  type="button"
                  onClick={() => setWaConfig(prev => ({ ...prev, mode: 'cloud_api' }))}
                  className={`py-2 px-3 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    waConfig.mode === 'cloud_api'
                      ? 'bg-[#25D366] text-black shadow-md'
                      : 'text-[#8B8FA8] hover:text-white'
                  }`}>
                  <Lock size={13} />
                  <span>Meta Cloud API (Oficial 24/7)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWaConfig(prev => ({ ...prev, mode: 'web_session' }))}
                  className={`py-2 px-3 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    waConfig.mode === 'web_session'
                      ? 'bg-[#25D366] text-black shadow-md'
                      : 'text-[#8B8FA8] hover:text-white'
                  }`}>
                  <QrCode size={13} />
                  <span>Sesión Web / QR Local</span>
                </button>
              </div>

              {/* Formulario Modo Cloud API */}
              {waConfig.mode === 'cloud_api' && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#8B8FA8] mb-1">
                        Phone Number ID (ID en Meta)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: 539281049281928"
                        value={waConfig.phoneNumberId}
                        onChange={e => setWaConfig(prev => ({ ...prev, phoneNumberId: e.target.value }))}
                        className="input w-full p-2.5 text-xs font-medium bg-[#0E111A]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#8B8FA8] mb-1">
                        WABA ID (WhatsApp Business Account ID)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: 104829182910291"
                        value={waConfig.wabaId}
                        onChange={e => setWaConfig(prev => ({ ...prev, wabaId: e.target.value }))}
                        className="input w-full p-2.5 text-xs font-medium bg-[#0E111A]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-[#8B8FA8]">
                        System User Token Permanente de Meta
                      </label>
                      <button
                        type="button"
                        onClick={() => toggleShowToken('wa')}
                        className="text-[10px] text-[#FACC15] hover:underline flex items-center gap-1">
                        {showTokens['wa'] ? <EyeOff size={11} /> : <Eye size={11} />}
                        <span>{showTokens['wa'] ? 'Ocultar' : 'Ver'}</span>
                      </button>
                    </div>
                    <input
                      type={showTokens['wa'] ? 'text' : 'password'}
                      placeholder="EAAG..."
                      value={waConfig.accessToken}
                      onChange={e => setWaConfig(prev => ({ ...prev, accessToken: e.target.value }))}
                      className="input w-full p-2.5 text-xs font-mono bg-[#0E111A]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#8B8FA8] mb-1">
                      Número de WhatsApp de la Agencia
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: +54 9 11 2345-6789"
                      value={waConfig.phoneNumber}
                      onChange={e => setWaConfig(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      className="input w-full p-2.5 text-xs font-medium bg-[#0E111A]"
                    />
                  </div>
                </div>
              )}

              {/* Formulario Modo Sesión Web / QR */}
              {waConfig.mode === 'web_session' && (
                <div className="p-5 rounded-xl bg-[#111624] border border-[#1F2337] flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#25D366]/20 text-[#25D366] flex items-center justify-center">
                    <QrCode size={28} />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-white">Emparejamiento por Código QR Local</h5>
                    <p className="text-xs text-[#8B8FA8] max-w-md mt-1">
                      Permite vincular tu WhatsApp actual escaneando un código QR. Es gratis e ilimitado, pero requiere que la PC donde corre el servidor se mantenga encendida.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-[#1F2337] text-[#A0A5BD] border border-[#2A2F45]">
                    Estado: {waConfig.webConnected ? 'Sesión Local Conectada' : 'En espera de vinculación'}
                  </span>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex items-center justify-between pt-3 border-t border-[#1F2337]">
                <button
                  type="button"
                  onClick={() => handleDisconnect('whatsapp_cloud')}
                  disabled={loading || !waConfig.connected}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all disabled:opacity-30 cursor-pointer">
                  Desconectar
                </button>

                <div className="flex items-center gap-2">
                  {waConfig.mode === 'cloud_api' && (
                    <button
                      type="button"
                      onClick={handleTestWhatsApp}
                      disabled={loading}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1F2337] hover:bg-[#2A2F45] border border-[#2A2F45] transition-all cursor-pointer">
                      Probar Conexión
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveWhatsApp}
                    disabled={loading}
                    className="px-5 py-2 rounded-xl text-xs font-extrabold text-black bg-[#FACC15] hover:bg-[#FDE047] transition-all shadow-md flex items-center gap-1.5 cursor-pointer">
                    <Save size={14} />
                    <span>Guardar Configuración</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
