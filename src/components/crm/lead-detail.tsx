'use client'

import { useState, useEffect } from 'react'
import { Lead, LeadStage, Interaccion } from '@/lib/supabase/types'
import { stageConfig, timeAgo } from '@/lib/utils'
import {
  X, Phone, MessageCircle, Car, FileText, User, Sparkles,
  Send, RefreshCw, AlertCircle, ArrowUpRight, CheckCircle2,
  DollarSign, Bot, MessageSquare, Zap, Calendar, Camera, HelpCircle, Check
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
  CALIENTE: { bg: 'rgba(239, 68, 68, 0.18)', color: '#F87171', label: 'Caliente', icon: '🔥' },
  TIBIO:    { bg: 'rgba(245, 158, 11, 0.18)', color: '#FBBF24', label: 'Tibio', icon: '🟡' },
  FRIO:     { bg: 'rgba(59, 130, 246, 0.18)', color: '#60A5FA', label: 'Frío', icon: '❄️' },
}

interface Props {
  lead: Lead
  onClose: () => void
  onStageChange: (id: string, stage: LeadStage) => void
  onLeadUpdated?: (updatedLead: Lead) => void
}

function parseChannelInfo(lead: Lead) {
  const id = lead.ID || ''
  const notas = lead.Notas || ''

  if (id.startsWith('meli_') || notas.includes('MercadoLibre')) {
    const qMatch = notas.match(/ID_PREGUNTA:\s*(\d+)/i)
    return {
      channel: 'MELI',
      label: 'MercadoLibre',
      color: '#FFE600',
      questionId: qMatch ? qMatch[1] : undefined
    }
  }
  if (id.startsWith('ig_dm_') || notas.includes('Instagram DM')) {
    const rMatch = notas.match(/RECIPIENT_ID:\s*(\w+)/i)
    return {
      channel: 'INSTAGRAM_DM',
      label: 'Instagram DM (@okmmotors)',
      color: '#E1306C',
      recipientId: rMatch ? rMatch[1] : undefined
    }
  }
  if (id.startsWith('ig_c_') || notas.includes('Instagram Comentario')) {
    const cMatch = notas.match(/COMMENT_ID:\s*([^\n\r]+)/i)
    return {
      channel: 'INSTAGRAM_COMMENT',
      label: 'Instagram Comentario (@okmmotors)',
      color: '#F472B6',
      commentId: cMatch ? cMatch[1].trim() : undefined
    }
  }
  if (id.startsWith('fb_msg_') || notas.includes('Facebook Messenger')) {
    const rMatch = notas.match(/RECIPIENT_ID:\s*(\w+)/i)
    return {
      channel: 'FACEBOOK_MESSENGER',
      label: 'Facebook Messenger',
      color: '#60A5FA',
      recipientId: rMatch ? rMatch[1] : undefined
    }
  }
  if (id.startsWith('fb_c_') || notas.includes('Facebook Comentario')) {
    const cMatch = notas.match(/COMMENT_ID:\s*([^\n\r]+)/i)
    return {
      channel: 'FACEBOOK_COMMENT',
      label: 'Facebook Comentario',
      color: '#38BDF8',
      commentId: cMatch ? cMatch[1].trim() : undefined
    }
  }
  if (lead.Telefono || notas.includes('WhatsApp')) {
    return {
      channel: 'WHATSAPP',
      label: 'WhatsApp',
      color: '#22C55E'
    }
  }
  return {
    channel: 'DIRECT',
    label: 'Canal Directo',
    color: '#FACC15'
  }
}

function extractCustomerQuestion(lead: Lead): string {
  if (!lead.Notas) return 'Consulta por vehículo en venta.'
  const qMatch = lead.Notas.match(/"([^"]+)"/)
  if (qMatch && qMatch[1]) return qMatch[1].trim()
  return lead.Notas.split('\n')[0].replace(/^\[[^\]]+\]\s*/, '').trim() || lead.Notas
}

export function LeadDetail({ lead, onClose, onStageChange, onLeadUpdated }: Props) {
  // Default to CHAT view so salesperson can reply immediately
  const [activeTab, setActiveTab] = useState<'CHAT' | 'AI' | 'INFO'>('CHAT')
  const [currentLead, setCurrentLead] = useState<Lead>(lead)
  
  // Chat / Interacciones
  const [interactions, setInteractions] = useState<Interaccion[]>([])
  const [loadingChat, setLoadingChat] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [isSendingReply, setIsSendingReply] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [analyzingLead, setAnalyzingLead] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null)

  const currentStage = (currentLead.Etapa ?? 'SIN_RESPONDER') as LeadStage
  const stage = stageConfig[currentStage] || stageConfig['SIN_RESPONDER']
  const temp = currentLead.Temperatura ? TEMP_STYLES[currentLead.Temperatura] : TEMP_STYLES.TIBIO
  const channelInfo = parseChannelInfo(currentLead)
  const customerQuestion = extractCustomerQuestion(currentLead)

  // Sincronizar si cambia el lead seleccionado
  useEffect(() => {
    setCurrentLead(lead)
    fetchInteractions(lead.ID)
    setReplyText('')
    setFeedbackMsg(null)
  }, [lead.ID])

  const fetchInteractions = async (id: string) => {
    try {
      setLoadingChat(true)
      const res = await fetch(`/api/crm/interactions?leadId=${encodeURIComponent(id)}`)
      const data = await res.json()
      if (data.success && Array.isArray(data.interactions)) {
        setInteractions(data.interactions)
      }
    } catch (err) {
      console.error('Error cargando interacciones:', err)
    } finally {
      setLoadingChat(false)
    }
  }

  // Despachar respuesta directa al canal correspondiente y auto-clasificar con IA
  const handleSendReply = async (manualClassification?: LeadStage) => {
    if (!replyText.trim()) return

    try {
      setIsSendingReply(true)
      setFeedbackMsg('Enviando respuesta al canal y clasificando con IA...')

      const res = await fetch('/api/crm/reply-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: currentLead.ID,
          channel: channelInfo.channel,
          replyText: replyText.trim(),
          manualStage: manualClassification,
          metadata: {
            questionId: (channelInfo as any).questionId,
            commentId: (channelInfo as any).commentId,
            recipientId: (channelInfo as any).recipientId,
            customerName: currentLead.Nombre_Cliente,
            vehicleTitle: currentLead.Auto_Interes,
            lastCustomerMessage: customerQuestion,
            existingNotas: currentLead.Notas
          }
        })
      })

      const data = await res.json()

      if (data.success) {
        const nextStage = data.newStage as LeadStage
        const updated = {
          ...currentLead,
          Etapa: nextStage,
          Notas: `${currentLead.Notas || ''}\n\n[Respuesta Enviada]: "${replyText.trim()}"`
        }
        setCurrentLead(updated)
        onStageChange(currentLead.ID, nextStage)
        if (onLeadUpdated) onLeadUpdated(updated)

        // Refrescar historial
        fetchInteractions(currentLead.ID)
        setReplyText('')

        const stageLabel = stageConfig[nextStage]?.label || nextStage
        setFeedbackMsg(`¡Respuesta enviada con éxito! Cliente clasificado en: "${stageLabel}".`)
        setTimeout(() => setFeedbackMsg(null), 5000)
      } else {
        alert('Aviso al responder: ' + (data.error || 'Error desconocido'))
      }
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setIsSendingReply(false)
    }
  }

  // Generar sugerencia de respuesta comercial con Gemini IA
  const handleSuggestAI = async () => {
    try {
      setIsGeneratingAI(true)
      const res = await fetch('/api/meta/messages/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: currentLead.Nombre_Cliente,
          lastMessage: customerQuestion,
          vehicleContext: currentLead.Auto_Interes
        })
      })
      const data = await res.json()
      if (data.success && data.suggestion) {
        setReplyText(data.suggestion)
      }
    } catch (e: any) {
      alert('No se pudo generar la sugerencia IA: ' + e.message)
    } finally {
      setIsGeneratingAI(false)
    }
  }

  // Clasificación rápida de etapa con 1 clic
  const handleManualStageClick = async (targetStage: LeadStage) => {
    onStageChange(currentLead.ID, targetStage)
    const updated = { ...currentLead, Etapa: targetStage }
    setCurrentLead(updated)
    if (onLeadUpdated) onLeadUpdated(updated)
    setFeedbackMsg(`Cliente movido a: "${stageConfig[targetStage]?.label}".`)
    setTimeout(() => setFeedbackMsg(null), 3000)
  }

  const openWhatsApp = (msg?: string) => {
    const phone = currentLead.Telefono?.replace(/[^0-9]/g, '')
    if (!phone) return
    const text = msg || `¡Hola ${currentLead.Nombre_Cliente}! Te escribimos de la concesionaria por tu consulta sobre el ${currentLead.Auto_Interes || 'vehículo'}.`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="w-full sm:w-96 md:w-[420px] bg-[#0A0C13] border-l border-[#1F2337] flex flex-col h-full shadow-2xl animate-in z-20 overflow-hidden">
      {/* Drawer Header */}
      <div className="p-4 border-b border-[#1F2337] bg-[#0E111A]">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px] font-black px-2 py-0.5 rounded-full border"
                style={{
                  background: `${channelInfo.color}20`,
                  color: channelInfo.color,
                  borderColor: `${channelInfo.color}40`
                }}>
                {channelInfo.label}
              </span>

              <span
                className="text-[10px] font-black px-2 py-0.5 rounded-full border"
                style={{
                  background: `${stage.color}15`,
                  color: stage.color,
                  borderColor: `${stage.color}40`
                }}>
                {stage.label}
              </span>
            </div>

            <h3 className="text-base font-black text-white truncate">
              {currentLead.Nombre_Cliente}
            </h3>

            {currentLead.Auto_Interes && (
              <p className="text-xs text-[#94A3B8] font-semibold truncate flex items-center gap-1 mt-0.5">
                <Car size={12} className="text-[#38BDF8]" />
                <span>{currentLead.Auto_Interes}</span>
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[#1C2030] text-[#8B8FA8] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 bg-[#131724] p-1 rounded-xl border border-[#1F2337]">
          <button
            onClick={() => setActiveTab('CHAT')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'CHAT' ? 'bg-[#38BDF8] text-black shadow-md' : 'text-[#8B8FA8] hover:text-white'
            }`}>
            <MessageSquare size={13} />
            <span>Chat en Vivo</span>
          </button>

          <button
            onClick={() => setActiveTab('AI')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'AI' ? 'bg-[#FACC15] text-black shadow-md' : 'text-[#8B8FA8] hover:text-white'
            }`}>
            <Sparkles size={13} />
            <span>Estrategia IA</span>
          </button>

          <button
            onClick={() => setActiveTab('INFO')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'INFO' ? 'bg-[#8B5CF6] text-white shadow-md' : 'text-[#8B8FA8] hover:text-white'
            }`}>
            <FileText size={13} />
            <span>Ficha Lead</span>
          </button>
        </div>
      </div>

      {/* Feedback message banner */}
      {feedbackMsg && (
        <div className="px-4 py-2 bg-[#22C55E15] border-b border-[#22C55E30] text-xs font-bold text-[#22C55E] flex items-center justify-between animate-in">
          <span>{feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-[10px] text-[#8B8FA8] hover:text-white">✕</button>
        </div>
      )}

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: CHAT EN VIVO & RESPUESTA OMNICANAL */}
        {activeTab === 'CHAT' && (
          <div className="flex flex-col h-full gap-3 animate-in">
            {/* Customer Inquiry Bubble */}
            <div className="p-3.5 rounded-2xl bg-[#121622] border border-[#232A3E] flex flex-col gap-1.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#38BDF8] flex items-center gap-1">
                  <User size={12} />
                  <span>Mensaje de {currentLead.Nombre_Cliente}:</span>
                </span>
                <span className="text-[10px] font-mono text-[#64748B]">
                  {timeAgo(currentLead.created_at)}
                </span>
              </div>
              <p className="text-xs text-[#F1F5F9] font-medium leading-relaxed italic bg-[#0A0C12] p-2.5 rounded-xl border border-[#1A1F30]">
                &quot;{customerQuestion}&quot;
              </p>
            </div>

            {/* Interaction History from CRM */}
            <div className="flex-1 overflow-y-auto max-h-48 space-y-2 pr-1">
              {loadingChat ? (
                <div className="py-4 text-center text-xs text-[#8B8FA8] flex items-center justify-center gap-2">
                  <RefreshCw size={13} className="animate-spin text-[#38BDF8]" />
                  <span>Cargando historial...</span>
                </div>
              ) : interactions.length === 0 ? (
                <p className="text-[11px] text-center text-[#555870] py-2">
                  Sin respuestas anteriores registradas para este chat.
                </p>
              ) : (
                interactions.map(it => (
                  <div
                    key={it.ID}
                    className="p-2.5 rounded-xl text-xs bg-[#171B28] border border-[#242C40] flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[10px] text-[#8B8FA8]">
                      <span className="font-bold text-[#38BDF8]">{it.Vendedor || 'Agencia'}</span>
                      <span>{it.Fecha ? new Date(it.Fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    </div>
                    <p className="text-[#E2E8F0] leading-snug">{it.Detalle_Conversacion}</p>
                  </div>
                ))
              )}
            </div>

            {/* In-place Reply Composer */}
            <div className="mt-auto flex flex-col gap-2.5 pt-2 border-t border-[#1F2337]">
              {/* AI Suggest Button */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleSuggestAI}
                  disabled={isGeneratingAI}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#FACC15] bg-[#FACC1515] hover:bg-[#FACC1525] border border-[#FACC1535] transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50">
                  {isGeneratingAI ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Generando con Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} />
                      <span>⚡ Sugerir Respuesta con IA</span>
                    </>
                  )}
                </button>

                <span className="text-[10px] text-[#8B8FA8] font-mono">
                  Canal: {channelInfo.label}
                </span>
              </div>

              {/* Textarea */}
              <textarea
                rows={3}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder={`Escribe la respuesta para enviar por ${channelInfo.label}...`}
                className="input w-full p-2.5 text-xs font-medium resize-none bg-[#121622] rounded-xl border-[#232A3E]"
              />

              {/* Send and Classify Action Button */}
              <button
                type="button"
                onClick={() => handleSendReply()}
                disabled={isSendingReply || !replyText.trim()}
                className="w-full py-2.5 rounded-xl text-xs font-black text-white bg-[#38BDF8] hover:bg-[#0284c7] disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] cursor-pointer">
                {isSendingReply ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Despachando y clasificando...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Enviar Respuesta y Clasificar con IA</span>
                  </>
                )}
              </button>

              {/* 1-Click Classification Buttons */}
              <div className="pt-2 border-t border-[#1F2337] flex flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#8B8FA8]">
                  O Clasificar Directamente con 1 Clic:
                </span>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleManualStageClick('VISITA')}
                    className="p-2 rounded-xl text-[11px] font-bold text-[#60A5FA] bg-[#3B82F615] hover:bg-[#3B82F625] border border-[#3B82F630] transition-all flex items-center gap-1.5">
                    <Calendar size={12} />
                    <span>📅 Visita al Salón</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleManualStageClick('COTIZACION')}
                    className="p-2 rounded-xl text-[11px] font-bold text-[#F472B6] bg-[#EC489915] hover:bg-[#EC489925] border border-[#EC489930] transition-all flex items-center gap-1.5">
                    <DollarSign size={12} />
                    <span>💰 Cotización / Usado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleManualStageClick('FINANCIACION')}
                    className="p-2 rounded-xl text-[11px] font-bold text-[#A78BFA] bg-[#8B5CF615] hover:bg-[#8B5CF625] border border-[#8B5CF630] transition-all flex items-center gap-1.5">
                    <FileText size={12} />
                    <span>📑 Financiación</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleManualStageClick('FOTOS_INFO')}
                    className="p-2 rounded-xl text-[11px] font-bold text-[#22D3EE] bg-[#06B6D415] hover:bg-[#06B6D425] border border-[#06B6D430] transition-all flex items-center gap-1.5">
                    <Camera size={12} />
                    <span>📸 Fotos / Info</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleManualStageClick('CURIOSOS')}
                    className="p-2 rounded-xl text-[11px] font-bold text-[#94A3B8] bg-[#6B728015] hover:bg-[#6B728025] border border-[#6B728030] transition-all flex items-center gap-1.5">
                    <HelpCircle size={12} />
                    <span>👀 Curioso / Sin Avance</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleManualStageClick('CERRADO')}
                    className="p-2 rounded-xl text-[11px] font-bold text-[#34D399] bg-[#10B98115] hover:bg-[#10B98125] border border-[#10B98130] transition-all flex items-center gap-1.5">
                    <Check size={12} />
                    <span>✅ Venta Cerrada</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ESTRATEGIA IA & GEMINI INTELLIGENCE */}
        {activeTab === 'AI' && (
          <div className="flex flex-col gap-3.5 animate-in">
            {/* Next Best Action */}
            <div className="p-3.5 rounded-2xl bg-[#121622] border border-[#FACC1530] flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#FACC15] flex items-center gap-1">
                <Sparkles size={12} /> Próxima Mejor Acción Sugerida (IA)
              </span>
              <p className="text-xs text-[#E2E8F0] font-semibold leading-relaxed">
                {currentLead.Next_Best_Action || 'Enviar propuesta con cuotas fijas o invitar a ver la unidad en el salón de ventas para acelerar el cierre.'}
              </p>
            </div>

            {/* AI Summary */}
            {currentLead.AI_Summary && (
              <div className="p-3.5 rounded-2xl bg-[#121622] border border-[#1F2337] flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B8FA8]">
                  Resumen Ejecutivo
                </span>
                <p className="text-xs text-[#CBD5E1] leading-relaxed">
                  {currentLead.AI_Summary}
                </p>
              </div>
            )}

            {/* WhatsApp Quick Trigger if available */}
            {currentLead.Telefono && (
              <div className="p-3.5 rounded-2xl bg-[#25D36610] border border-[#25D36630] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#22C55E] flex items-center gap-1">
                    <MessageCircle size={14} /> WhatsApp Disponible
                  </span>
                  <span className="text-[11px] font-mono text-white font-bold">{currentLead.Telefono}</span>
                </div>
                <button
                  type="button"
                  onClick={() => openWhatsApp()}
                  className="w-full py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-black font-black text-xs transition-all flex items-center justify-center gap-2 shadow-md">
                  <MessageCircle size={14} />
                  <span>Abrir Conversación en WhatsApp</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FICHA DEL LEAD */}
        {activeTab === 'INFO' && (
          <div className="flex flex-col gap-3 animate-in">
            {currentLead.Auto_Interes && (
              <div className="p-3 rounded-xl bg-[#121622] border border-[#1F2337] flex items-center gap-2.5">
                <Car size={16} className="text-[#38BDF8]" />
                <div>
                  <span className="text-[10px] text-[#8B8FA8] uppercase font-bold block">Vehículo de Interés</span>
                  <span className="text-xs font-bold text-white">{currentLead.Auto_Interes}</span>
                </div>
              </div>
            )}

            {currentLead.Presupuesto && (
              <div className="p-3 rounded-xl bg-[#121622] border border-[#1F2337] flex items-center gap-2.5">
                <DollarSign size={16} className="text-[#FACC15]" />
                <div>
                  <span className="text-[10px] text-[#8B8FA8] uppercase font-bold block">Presupuesto Estimado</span>
                  <span className="text-xs font-bold text-white">{currentLead.Presupuesto}</span>
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-[#121622] border border-[#1F2337] flex items-center gap-2.5">
              <User size={16} className="text-[#A78BFA]" />
              <div>
                <span className="text-[10px] text-[#8B8FA8] uppercase font-bold block">Ingreso al CRM</span>
                <span className="text-xs font-bold text-white">{timeAgo(currentLead.created_at)}</span>
              </div>
            </div>

            {currentLead.Notas && (
              <div className="p-3 rounded-xl bg-[#121622] border border-[#1F2337] flex flex-col gap-1">
                <span className="text-[10px] text-[#8B8FA8] uppercase font-bold">Detalle y Metadatos</span>
                <p className="text-xs text-[#94A3B8] font-mono leading-relaxed whitespace-pre-wrap">
                  {currentLead.Notas}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Footer if phone exists */}
      {currentLead.Telefono && (
        <div className="p-3 bg-[#0A0C13] border-t border-[#1F2337] flex items-center gap-2">
          <button
            onClick={() => openWhatsApp()}
            className="flex-1 py-2 px-3 rounded-xl bg-[#25D36620] hover:bg-[#25D36630] border border-[#25D36640] text-xs font-bold text-[#22C55E] flex items-center justify-center gap-1.5 transition-all">
            <MessageCircle size={14} />
            <span>WhatsApp</span>
          </button>
          <a
            href={`tel:${currentLead.Telefono}`}
            className="flex-1 py-2 px-3 rounded-xl bg-[#1A1E2E] hover:bg-[#252B42] border border-[#1F2337] text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all">
            <Phone size={14} />
            <span>Llamar</span>
          </a>
        </div>
      )}
    </div>
  )
}
