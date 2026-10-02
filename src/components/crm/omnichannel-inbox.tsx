'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Lead, LeadStage, Interaccion } from '@/lib/supabase/types'
import { stageConfig, timeAgo } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  MessageSquare, Search, Send, Lock, Sparkles, Phone, ExternalLink,
  Car, Shield, CheckCircle2, AlertCircle, RefreshCw, User, Calendar,
  ArrowUpRight, Clock, ChevronRight, Tag, HelpCircle, Bot, DollarSign
} from 'lucide-react'

const STAGES: LeadStage[] = [
  'SIN_RESPONDER',
  'VISITA',
  'COTIZACION',
  'FINANCIACION',
  'FOTOS_INFO',
  'CURIOSOS',
  'CERRADO'
]

const TEMP_STYLES: Record<string, { bg: string; color: string; label: string; icon: string }> = {
  CALIENTE: { bg: 'rgba(239, 68, 68, 0.15)', color: '#F87171', label: 'Caliente', icon: '🔥' },
  TIBIO:    { bg: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', label: 'Tibio', icon: '🟡' },
  FRIO:     { bg: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', label: 'Frío', icon: '❄️' },
}

const CANNED_RESPONSES = [
  {
    title: 'Financiación 50%',
    text: '¡Hola! Financiamos con entrega mínima del 50% y el saldo hasta en 24 o 36 cuotas fijas en pesos. Solo con DNI.'
  },
  {
    title: 'Tomamos Permuta',
    text: '¡Hola! Sí, tomamos tu auto usado en parte de pago. Pasame marca, modelo, año y kilometraje para hacerte una cotización inicial.'
  },
  {
    title: 'Coordinar Visita',
    text: '¡Hola! Podés venir a verlo y probarlo en nuestro salón. ¿Qué día y horario te queda más cómodo para esperarte?'
  },
  {
    title: 'Ubicación Showroom',
    text: 'Estamos en Av. Principal 1234. Abrimos de Lunes a Sábados de 9 a 19 hs de corrido. ¡Te esperamos!'
  }
]

interface OmnichannelInboxProps {
  leads: Lead[]
  onLeadUpdated?: (lead: Lead) => void
}

function parseChannel(lead: Lead) {
  const id = lead.ID || ''
  const notas = lead.Notas || ''

  if (id.startsWith('meli_') || notas.includes('MercadoLibre')) {
    const qMatch = notas.match(/ID_PREGUNTA:\s*(\d+)/i)
    return { channel: 'MELI', label: 'MercadoLibre', badge: '🟡 MeLi', color: '#FFE600', questionId: qMatch ? qMatch[1] : undefined }
  }
  if (id.startsWith('ig_dm_') || notas.includes('Instagram DM')) {
    const rMatch = notas.match(/RECIPIENT_ID:\s*(\w+)/i)
    return { channel: 'INSTAGRAM_DM', label: 'Instagram DM', badge: '📸 IG DM', color: '#E1306C', recipientId: rMatch ? rMatch[1] : undefined }
  }
  if (id.startsWith('ig_c_') || notas.includes('Instagram Comentario')) {
    const cMatch = notas.match(/COMMENT_ID:\s*([^\n\r]+)/i)
    return { channel: 'INSTAGRAM_COMMENT', label: 'Instagram Post', badge: '💬 IG Post', color: '#F472B6', commentId: cMatch ? cMatch[1].trim() : undefined }
  }
  if (id.startsWith('fb_msg_') || notas.includes('Facebook Messenger')) {
    const rMatch = notas.match(/RECIPIENT_ID:\s*(\w+)/i)
    return { channel: 'FACEBOOK_MESSENGER', label: 'Messenger', badge: '🔵 Messenger', color: '#60A5FA', recipientId: rMatch ? rMatch[1] : undefined }
  }
  if (id.startsWith('fb_c_') || notas.includes('Facebook Comentario')) {
    const cMatch = notas.match(/COMMENT_ID:\s*([^\n\r]+)/i)
    return { channel: 'FACEBOOK_COMMENT', label: 'Facebook Post', badge: '💬 FB Post', color: '#38BDF8', commentId: cMatch ? cMatch[1].trim() : undefined }
  }
  if (lead.Telefono || notas.includes('WhatsApp')) {
    return { channel: 'WHATSAPP', label: 'WhatsApp', badge: '🟢 WhatsApp', color: '#22C55E' }
  }
  return { channel: 'DIRECT', label: 'Canal Directo', badge: '⚪ Web', color: '#FACC15' }
}

export function OmnichannelInbox({ leads, onLeadUpdated }: OmnichannelInboxProps) {
  const [selectedLeadId, setSelectedLeadId] = useState<string>(leads[0]?.ID || '')
  const [channelFilter, setChannelFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [inputText, setInputText] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [interactions, setInteractions] = useState<Interaccion[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null)
  const [loadingAi, setLoadingAi] = useState(false)
  const [tradeInBrand, setTradeInBrand] = useState('')
  const [tradeInYear, setTradeInYear] = useState('')
  const [tradeInEstimated, setTradeInEstimated] = useState<number | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const selectedLead = useMemo(() => {
    return leads.find(l => l.ID === selectedLeadId) || leads[0] || null
  }, [leads, selectedLeadId])

  // Filtrado de leads para la lista izquierda
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const channelInfo = parseChannel(l)
      const matchesChannel =
        channelFilter === 'ALL' ||
        (channelFilter === 'WHATSAPP' && channelInfo.channel === 'WHATSAPP') ||
        (channelFilter === 'INSTAGRAM' && (channelInfo.channel === 'INSTAGRAM_DM' || channelInfo.channel === 'INSTAGRAM_COMMENT')) ||
        (channelFilter === 'FACEBOOK' && (channelInfo.channel === 'FACEBOOK_MESSENGER' || channelInfo.channel === 'FACEBOOK_COMMENT')) ||
        (channelFilter === 'MELI' && channelInfo.channel === 'MELI')

      if (!matchesChannel) return false

      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        (l.Nombre_Cliente && l.Nombre_Cliente.toLowerCase().includes(q)) ||
        (l.Auto_Interes && l.Auto_Interes.toLowerCase().includes(q)) ||
        (l.Telefono && l.Telefono.toLowerCase().includes(q)) ||
        (l.Notas && l.Notas.toLowerCase().includes(q))
      )
    })
  }, [leads, channelFilter, searchQuery])

  // Cargar historial de mensajes cuando cambia el lead seleccionado
  useEffect(() => {
    if (!selectedLead?.ID) return

    async function loadInteractions() {
      setLoadingMessages(true)
      setAiSuggestion(null)
      try {
        const res = await fetch(`/api/crm/interactions?leadId=${selectedLead!.ID}`)
        const data = await res.json()
        if (data.success && Array.isArray(data.interactions)) {
          setInteractions(data.interactions)
        } else {
          setInteractions([])
        }
      } catch (e) {
        console.warn('Error loading interactions:', e)
        setInteractions([])
      } finally {
        setLoadingMessages(false)
      }
    }

    loadInteractions()
  }, [selectedLead?.ID])

  // Auto-scroll al final del chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [interactions, loadingMessages])

  // Generar sugerencia de IA
  const handleGenerateAi = async () => {
    if (!selectedLead) return
    setLoadingAi(true)
    try {
      const promptText = selectedLead.Notas || selectedLead.Auto_Interes || 'Consulta de compra'
      const res = await fetch('/api/ai/lead-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientMessage: promptText,
          vehicleInfo: selectedLead.Auto_Interes,
          currentStage: selectedLead.Etapa
        })
      })
      const data = await res.json()
      if (data.success && data.suggestion) {
        setAiSuggestion(data.suggestion)
      } else {
        setAiSuggestion(`¡Hola ${selectedLead.Nombre_Cliente?.split(' ')[0] || ''}! Tenemos disponible el ${selectedLead.Auto_Interes || 'vehículo'}. Podés retirar con el 50% de anticipo y financiar el saldo en cuotas fijas. ¿Te gustaría coordinar una visita al showroom?`)
      }
    } catch {
      setAiSuggestion(`¡Hola! Sí, el ${selectedLead.Auto_Interes || 'vehículo'} sigue disponible. Te invitamos a visitarnos para probarlo. ¿Te queda bien hoy o mañana?`)
    } finally {
      setLoadingAi(false)
    }
  }

  // Enviar mensaje o nota interna
  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedLead) return
    const textToSend = inputText.trim()
    setIsSending(true)

    try {
      if (isInternalNote) {
        // Guardar nota interna en DB_INTERACCIONES (Chatwoot private note)
        const res = await fetch('/api/crm/interactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: selectedLead.ID,
            detalle: textToSend,
            remitente: 'NOTA_INTERNA',
            tipo: 'INTERNAL_NOTE',
            vendedor: 'Asesor Comercial'
          })
        })
        const data = await res.json()
        if (data.success && data.interaction) {
          setInteractions(prev => [...prev, data.interaction])
        }
      } else {
        // Enviar respuesta al canal oficial o registrar interacción
        const channelInfo = parseChannel(selectedLead)
        const res = await fetch('/api/crm/reply-channel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: selectedLead.ID,
            channel: channelInfo.channel,
            replyText: textToSend,
            metadata: {
              customerName: selectedLead.Nombre_Cliente,
              questionId: channelInfo.questionId,
              recipientId: channelInfo.recipientId,
              commentId: channelInfo.commentId
            }
          })
        })
        const data = await res.json()

        // Agregar mensaje saliente al chat local
        const newMsg: Interaccion = {
          ID: crypto.randomUUID(),
          ID_LEAD: selectedLead.ID,
          Detalle_Conversacion: textToSend,
          Remitente: 'ASESOR',
          Tipo_Interaccion: channelInfo.channel,
          Vendedor: 'Asesor Comercial',
          Fecha: new Date().toISOString(),
          created_at: new Date().toISOString()
        }
        setInteractions(prev => [...prev, newMsg])

        // Si estaba en SIN_RESPONDER, actualizar a VISITA o FOTOS_INFO
        if (selectedLead.Etapa === 'SIN_RESPONDER') {
          const nextStage: LeadStage = 'VISITA'
          await supabase.from('DB_LEADS').update({ Etapa: nextStage }).eq('ID', selectedLead.ID)
          onLeadUpdated?.({ ...selectedLead, Etapa: nextStage })
        }
      }

      setInputText('')
      setAiSuggestion(null)
    } catch (e) {
      console.warn('Error sending message:', e)
    } finally {
      setIsSending(false)
    }
  }

  // Cambio de etapa desde la ficha 360
  const handleStageChange = async (newStage: LeadStage) => {
    if (!selectedLead) return
    const updated = { ...selectedLead, Etapa: newStage }
    await supabase.from('DB_LEADS').update({ Etapa: newStage }).eq('ID', selectedLead.ID)
    onLeadUpdated?.(updated)
  }

  // Cambio de temperatura desde la ficha 360
  const handleTempChange = async (newTemp: 'CALIENTE' | 'TIBIO' | 'FRIO') => {
    if (!selectedLead) return
    const updated = { ...selectedLead, Temperatura: newTemp }
    await supabase.from('DB_LEADS').update({ Temperatura: newTemp }).eq('ID', selectedLead.ID)
    onLeadUpdated?.(updated)
  }

  // Estimación de tasación rápida (Twenty-style custom valuation)
  const handleEstimateTradeIn = () => {
    if (!tradeInBrand || !tradeInYear) return
    // Cálculo simulado con margen de agencia 20%
    const baseVal = 14500000
    setTradeInEstimated(baseVal * 0.82)
  }

  const activeChannel = selectedLead ? parseChannel(selectedLead) : null

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0A0D14] text-slate-100 border border-slate-800/80 rounded-xl shadow-2xl">
      {/* ======================================================== */}
      {/* 1. COLUMNA IZQUIERDA: LISTA OMNICANAL DE PROSPECTOS     */}
      {/* ======================================================== */}
      <div className="w-80 sm:w-96 flex flex-col border-r border-slate-800/80 bg-[#0F1420]/70 backdrop-blur-md">
        {/* Header con Buscador */}
        <div className="p-3 border-b border-slate-800/80 space-y-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, auto, teléfono..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900/90 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>

          {/* Filtros de Canal (Chatwoot Inboxes) */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'WHATSAPP', label: 'WhatsApp', color: '#22C55E' },
              { id: 'INSTAGRAM', label: 'Instagram', color: '#E1306C' },
              { id: 'MELI', label: 'MercadoLibre', color: '#FFE600' },
              { id: 'FACEBOOK', label: 'Facebook', color: '#3B82F6' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setChannelFilter(tab.id)}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                  channelFilter === tab.id
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Conversaciones */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
          {filteredLeads.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No se encontraron conversaciones con estos filtros.
            </div>
          ) : (
            filteredLeads.map(lead => {
              const ch = parseChannel(lead)
              const isSelected = selectedLead?.ID === lead.ID
              const temp = TEMP_STYLES[lead.Temperatura || 'TIBIO'] || TEMP_STYLES.TIBIO
              const stage = stageConfig[lead.Etapa || 'SIN_RESPONDER'] || stageConfig.SIN_RESPONDER

              return (
                <div
                  key={lead.ID}
                  onClick={() => setSelectedLeadId(lead.ID)}
                  className={`p-3 cursor-pointer transition-all flex items-start gap-3 relative ${
                    isSelected
                      ? 'bg-amber-500/10 border-l-4 border-amber-500'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  {/* Avatar con Insignia de Canal */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-xs shadow-inner">
                      {lead.Nombre_Cliente ? lead.Nombre_Cliente.slice(0, 2).toUpperCase() : 'CL'}
                    </div>
                    <span
                      className="absolute -bottom-1 -right-1 text-[9px] px-1 py-0.2 rounded-full border border-slate-900 font-bold"
                      style={{ backgroundColor: ch.color, color: ch.color === '#FFE600' ? '#000' : '#FFF' }}
                    >
                      {ch.channel === 'WHATSAPP' ? 'WA' : ch.channel.startsWith('IG') ? 'IG' : ch.channel.startsWith('FB') ? 'FB' : 'ML'}
                    </span>
                  </div>

                  {/* Info Resumida */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className="text-xs font-semibold text-slate-200 truncate">
                        {lead.Nombre_Cliente || 'Prospecto sin nombre'}
                      </h4>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">
                        {lead.created_at ? timeAgo(lead.created_at) : 'Hoy'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mb-1">
                      {lead.Auto_Interes && (
                        <span className="text-[10px] font-medium text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/50 truncate max-w-[140px]">
                          🚗 {lead.Auto_Interes}
                        </span>
                      )}
                      <span
                        className="text-[9px] px-1 py-0.5 rounded font-semibold"
                        style={{ backgroundColor: temp.bg, color: temp.color }}
                      >
                        {temp.icon}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      {lead.Notas ? lead.Notas.replace(/\[.*?\]/g, '').trim() : 'Sin mensajes previos'}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. COLUMNA CENTRAL: HILO DE CHAT + NOTAS PRIVADAS        */}
      {/* ======================================================== */}
      {selectedLead ? (
        <div className="flex-1 flex flex-col bg-[#0B0F19]">
          {/* Header del Chat Activo */}
          <div className="p-3 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 text-xs">
                {selectedLead.Nombre_Cliente ? selectedLead.Nombre_Cliente.slice(0, 2).toUpperCase() : 'CL'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-100">
                    {selectedLead.Nombre_Cliente || 'Prospecto'}
                  </h3>
                  {activeChannel && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded font-semibold"
                      style={{ backgroundColor: activeChannel.color + '25', color: activeChannel.color }}
                    >
                      {activeChannel.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <span>Interés: <strong className="text-amber-400">{selectedLead.Auto_Interes || 'General'}</strong></span>
                  {selectedLead.Telefono && <span>• 📞 {selectedLead.Telefono}</span>}
                </p>
              </div>
            </div>

            {/* Selector de Etapa Rápido */}
            <div className="flex items-center gap-2">
              <select
                value={selectedLead.Etapa || 'SIN_RESPONDER'}
                onChange={e => handleStageChange(e.target.value as LeadStage)}
                className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {STAGES.map(st => (
                  <option key={st} value={st}>
                    {stageConfig[st]?.label || st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Área de Mensajes e Historial */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Mensaje original o nota de entrada */}
            {selectedLead.Notas && (
              <div className="flex flex-col items-start max-w-[85%]">
                <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                  <span>Consulta inicial del cliente</span>
                  <span>• {selectedLead.created_at ? timeAgo(selectedLead.created_at) : 'Reciente'}</span>
                </div>
                <div className="bg-slate-800/90 border border-slate-700 text-slate-200 text-xs p-3 rounded-2xl rounded-tl-sm shadow-md">
                  {selectedLead.Notas}
                </div>
              </div>
            )}

            {/* Historial cargado de DB_INTERACCIONES */}
            {loadingMessages ? (
              <div className="flex items-center justify-center py-6 text-xs text-slate-500 gap-2">
                <RefreshCw size={14} className="animate-spin" /> Cargando historial de conversación...
              </div>
            ) : (
              interactions.map(item => {
                const isInternal = (item.Remitente as string) === 'NOTA_INTERNA' || item.Tipo_Interaccion === 'INTERNAL_NOTE'
                const isSeller = item.Remitente === 'ASESOR' || item.Vendedor?.includes('Asesor')

                if (isInternal) {
                  return (
                    <div key={item.ID} className="flex justify-center my-2">
                      <div className="bg-amber-950/40 border border-amber-600/40 rounded-xl p-2.5 max-w-md text-amber-200 text-xs flex items-start gap-2 shadow-inner">
                        <Lock size={13} className="shrink-0 text-amber-400 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-0.5">
                            Nota Interna Privada ({item.Vendedor || 'Equipo'})
                          </p>
                          <p className="text-amber-100/90">{item.Detalle_Conversacion}</p>
                          <span className="text-[9px] text-amber-400/60 mt-1 block">
                            {item.Fecha ? timeAgo(item.Fecha) : 'Ahora'} • No visible para el cliente
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={item.ID}
                    className={`flex flex-col ${isSeller ? 'items-end' : 'items-start'} max-w-[85%] ${isSeller ? 'ml-auto' : ''}`}
                  >
                    <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                      <span>{isSeller ? (item.Vendedor || 'Vos') : (selectedLead.Nombre_Cliente || 'Cliente')}</span>
                      <span>• {item.Fecha ? timeAgo(item.Fecha) : 'Reciente'}</span>
                    </div>
                    <div
                      className={`text-xs p-3 rounded-2xl shadow-md ${
                        isSeller
                          ? 'bg-amber-500 text-black font-medium rounded-tr-sm'
                          : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm'
                      }`}
                    >
                      {item.Detalle_Conversacion}
                    </div>
                  </div>
                )
              })
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Tarjeta de Sugerencia Gemini AI Copilot */}
          {aiSuggestion && (
            <div className="m-3 p-3 bg-gradient-to-r from-amber-950/60 to-purple-950/40 border border-amber-500/40 rounded-xl">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-400 animate-pulse" />
                  Sugerencia de Copiloto IA (Gemini 2.5)
                </span>
                <button
                  onClick={() => setInputText(aiSuggestion)}
                  className="text-[11px] bg-amber-500 hover:bg-amber-400 text-black font-semibold px-2 py-0.5 rounded transition-colors"
                >
                  Insertar en Chat ✍️
                </button>
              </div>
              <p className="text-xs text-slate-200 italic leading-relaxed">
                "{aiSuggestion}"
              </p>
            </div>
          )}

          {/* Plantillas Rápidas (Canned Responses Chatwoot-Style) */}
          <div className="px-3 pt-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none border-t border-slate-800/60">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider shrink-0">
              Respuestas Rápidas:
            </span>
            {CANNED_RESPONSES.map((cr, idx) => (
              <button
                key={idx}
                onClick={() => setInputText(cr.text)}
                className="text-[10px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-md whitespace-nowrap transition-colors border border-slate-700/60"
              >
                {cr.title}
              </button>
            ))}
            <button
              onClick={handleGenerateAi}
              disabled={loadingAi}
              className="text-[10px] bg-purple-900/60 hover:bg-purple-800 text-purple-200 px-2.5 py-1 rounded-md whitespace-nowrap font-medium flex items-center gap-1 transition-colors border border-purple-700/50"
            >
              <Sparkles size={11} className={loadingAi ? 'animate-spin' : ''} />
              {loadingAi ? 'Generando...' : '✨ Sugerir con IA'}
            </button>
          </div>

          {/* Barra de Entrada (Mensaje Oficial vs Nota Privada) */}
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setIsInternalNote(false)}
                className={`text-xs px-3 py-1 rounded-md font-semibold transition-all ${
                  !isInternalNote
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                💬 Mensaje al Cliente
              </button>
              <button
                onClick={() => setIsInternalNote(true)}
                className={`text-xs px-3 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-all ${
                  isInternalNote
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Lock size={12} /> Nota Interna Privada
              </button>
            </div>

            <div className="relative">
              <textarea
                rows={2}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder={
                  isInternalNote
                    ? 'Escribí un comentario interno para el equipo (solo visible para asesores)...'
                    : `Escribí tu respuesta para ${activeChannel?.label || 'el cliente'}...`
                }
                className={`w-full p-2.5 pr-12 text-xs border rounded-xl focus:outline-none transition-colors resize-none ${
                  isInternalNote
                    ? 'bg-amber-950/20 border-amber-700/60 text-amber-100 placeholder-amber-500/50 focus:border-amber-500'
                    : 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-amber-500'
                }`}
              />
              <button
                onClick={handleSendMessage}
                disabled={isSending || !inputText.trim()}
                className={`absolute right-2.5 bottom-3.5 p-2 rounded-lg font-bold transition-all ${
                  inputText.trim() && !isSending
                    ? isInternalNote
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-amber-500 hover:bg-amber-400 text-black'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Send size={14} className={isSending ? 'animate-pulse' : ''} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          Seleccioná un prospecto de la izquierda para comenzar a chatear.
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. COLUMNA DERECHA: FICHA 360° CLIENTE & AUTO (TWENTY)    */}
      {/* ======================================================== */}
      {selectedLead && (
        <div className="w-80 border-l border-slate-800/80 bg-[#0F1420]/80 overflow-y-auto p-4 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Perfil 360° del Prospecto
            </h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Nombre:</span>
                <span className="font-semibold text-slate-200">{selectedLead.Nombre_Cliente || '—'}</span>
              </div>
              {selectedLead.Telefono && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Teléfono:</span>
                  <a
                    href={`https://wa.me/${selectedLead.Telefono.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 font-semibold flex items-center gap-1 hover:underline"
                  >
                    {selectedLead.Telefono}
                    <ArrowUpRight size={11} />
                  </a>
                </div>
              )}
              {selectedLead.Email && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">E-mail:</span>
                  <span className="text-slate-200">{selectedLead.Email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Calificación de Temperatura (🔥/🟡/❄️) */}
          <div className="border-b border-slate-800 pb-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Temperatura Comercial
            </h4>
            <div className="grid grid-cols-3 gap-1.5">
              {(['CALIENTE', 'TIBIO', 'FRIO'] as const).map(temp => {
                const s = TEMP_STYLES[temp]
                const isSelected = (selectedLead.Temperatura || 'TIBIO') === temp
                return (
                  <button
                    key={temp}
                    onClick={() => handleTempChange(temp)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold flex flex-col items-center gap-0.5 border transition-all ${
                      isSelected
                        ? 'border-amber-400 shadow-md scale-102'
                        : 'border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: s.bg, color: s.color }}
                  >
                    <span>{s.icon}</span>
                    <span className="text-[10px]">{s.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Vehículo de Interés (Stock Match) */}
          <div className="border-b border-slate-800 pb-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Car size={14} className="text-amber-400" /> Auto de Interés
            </h4>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-bold text-amber-400">
                {selectedLead.Auto_Interes || 'Sin auto específico asignado'}
              </p>
              {selectedLead.Presupuesto && (
                <p className="text-[11px] text-slate-300">
                  Presupuesto: <strong>${selectedLead.Presupuesto} {selectedLead.Moneda || 'ARS'}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Módulo de Tasación Rápida de Permuta (InfoAuto) */}
          <div className="border-b border-slate-800 pb-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <DollarSign size={14} className="text-emerald-400" /> Tasador de Permuta
            </h4>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Marca y Modelo usado (ej. Palio 1.4)"
                value={tradeInBrand}
                onChange={e => setTradeInBrand(e.target.value)}
                className="w-full text-xs p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Año (ej. 2017)"
                  value={tradeInYear}
                  onChange={e => setTradeInYear(e.target.value)}
                  className="w-1/2 text-xs p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleEstimateTradeIn}
                  className="w-1/2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg border border-slate-700 transition-colors"
                >
                  Estimar Toma
                </button>
              </div>
              {tradeInEstimated && (
                <div className="bg-emerald-950/40 border border-emerald-800/60 p-2.5 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between text-emerald-300">
                    <span>Toma sugerida (-18%):</span>
                    <strong className="text-emerald-400">${tradeInEstimated.toLocaleString('es-AR')}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Próxima Mejor Acción de IA (Next Best Action) */}
          {selectedLead.Next_Best_Action && (
            <div className="bg-amber-950/30 border border-amber-600/40 rounded-xl p-3">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                🎯 Próxima Mejor Acción (IA)
              </span>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                {selectedLead.Next_Best_Action}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
