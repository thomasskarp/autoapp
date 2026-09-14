'use client'

import { useState, useEffect } from 'react'
import { Lead, LeadStage, Interaccion } from '@/lib/supabase/types'
import { stageConfig, timeAgo } from '@/lib/utils'
import {
  X, Phone, MessageCircle, Car, FileText, User, Sparkles,
  Send, RefreshCw, AlertCircle, ArrowUpRight, CheckCircle2,
  DollarSign, Bot, MessageSquare
} from 'lucide-react'

const STAGES: LeadStage[] = ['NUEVO', 'CONTACTADO', 'INTERESADO', 'PROPUESTA', 'CERRADO']

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

export function LeadDetail({ lead, onClose, onStageChange, onLeadUpdated }: Props) {
  const [activeTab, setActiveTab] = useState<'INFO' | 'AI' | 'CHAT'>('AI')
  const [analyzing, setAnalyzing] = useState(false)
  const [currentLead, setCurrentLead] = useState<Lead>(lead)
  const [quickReply, setQuickReply] = useState<string>('')
  const [tempRationale, setTempRationale] = useState<string>('')
  
  // Chat / Interacciones
  const [interactions, setInteractions] = useState<Interaccion[]>([])
  const [loadingChat, setLoadingChat] = useState(false)
  const [newMsgText, setNewMsgText] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)

  const currentStage = currentLead.Etapa ?? 'NUEVO'
  const currentIdx = STAGES.indexOf(currentStage as LeadStage)
  const temp = currentLead.Temperatura ? TEMP_STYLES[currentLead.Temperatura] : TEMP_STYLES.TIBIO

  // Sincronizar si cambia el prop lead
  useEffect(() => {
    setCurrentLead(lead)
    fetchInteractions(lead.ID)
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

  const handleRunAIIntelligence = async () => {
    try {
      setAnalyzing(true)
      const res = await fetch('/api/ai/lead-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: currentLead.ID,
          lead: currentLead,
          interactions: interactions,
          persist: true,
        }),
      })

      const data = await res.json()
      if (data.success && data.intelligence) {
        const intel = data.intelligence
        const updated: Lead = {
          ...currentLead,
          Temperatura: intel.temperatura,
          Next_Best_Action: intel.next_best_action,
          AI_Summary: intel.ai_summary,
        }
        setCurrentLead(updated)
        setQuickReply(intel.whatsapp_quick_reply)
        setTempRationale(intel.temperature_rationale)
        if (onLeadUpdated) onLeadUpdated(updated)
      } else {
        alert(data.error || 'No se pudo generar el análisis de IA')
      }
    } catch (err: any) {
      console.error('Error llamando IA:', err)
      alert('Error en conexión con el motor de IA')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSendInteraction = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newMsgText.trim()) return

    try {
      setSendingMsg(true)
      const res = await fetch('/api/crm/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: currentLead.ID,
          detalle: newMsgText.trim(),
          remitente: 'ASESOR',
          tipo: 'WHATSAPP',
          patente: currentLead.Auto_Interes || null,
        }),
      })
      const data = await res.json()
      if (data.success && data.interaction) {
        setInteractions(prev => [...prev, data.interaction])
        setNewMsgText('')
      }
    } catch (err) {
      console.error('Error enviando mensaje:', err)
    } finally {
      setSendingMsg(false)
    }
  }

  const openWhatsApp = (customText?: string) => {
    if (!currentLead.Telefono) return
    const clean = currentLead.Telefono.replace(/\D/g, '')
    const msgParam = customText ? `?text=${encodeURIComponent(customText)}` : ''
    window.open(`https://wa.me/54${clean}${msgParam}`, '_blank')
  }

  return (
    <div className="w-96 flex-shrink-0 flex flex-col h-full bg-[#0D0F16] border-l border-[#1F2337] shadow-2xl animate-in">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1F2337] bg-[#11131C]">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm bg-[#FACC1520] text-[#FACC15] flex-shrink-0">
            {currentLead.Nombre_Cliente?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-[#E8EAED] truncate">{currentLead.Nombre_Cliente}</p>
              {temp && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 flex-shrink-0"
                  style={{ background: temp.bg, color: temp.color }}>
                  <span>{temp.icon}</span>
                  <span>{temp.label}</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#8B8FA8] truncate">{currentLead.Telefono ?? 'Sin teléfono'}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8B8FA8] hover:text-white hover:bg-[#1E2130] transition-colors cursor-pointer border-none bg-transparent">
          <X size={16} />
        </button>
      </div>

      {/* Nav Tabs */}
      <div className="flex border-b border-[#1F2337] bg-[#0F1117] text-xs font-semibold px-2">
        <button
          onClick={() => setActiveTab('AI')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'AI' ? 'border-[#FACC15] text-[#FACC15]' : 'border-transparent text-[#8B8FA8] hover:text-white'
          }`}>
          <Sparkles size={13} />
          <span>Copiloto IA</span>
        </button>

        <button
          onClick={() => setActiveTab('CHAT')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'CHAT' ? 'border-[#25D366] text-[#25D366]' : 'border-transparent text-[#8B8FA8] hover:text-white'
          }`}>
          <MessageSquare size={13} />
          <span>Conversación ({interactions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('INFO')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'INFO' ? 'border-[#60A5FA] text-[#60A5FA]' : 'border-transparent text-[#8B8FA8] hover:text-white'
          }`}>
          <FileText size={13} />
          <span>Ficha</span>
        </button>
      </div>

      {/* Main Body per Tab */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

        {/* TAB 1: COPILOTO IA & NEXT BEST ACTION */}
        {activeTab === 'AI' && (
          <div className="flex flex-col gap-3.5 animate-in">
            {/* Action Bar */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B8FA8] flex items-center gap-1">
                <Bot size={13} className="text-[#FACC15]" />
                Inteligencia Comercial Gemini
              </span>
              <button
                onClick={handleRunAIIntelligence}
                disabled={analyzing}
                className="btn-primary text-[11px] py-1.5 px-3 flex items-center gap-1.5 font-bold cursor-pointer bg-[#FACC15] text-black hover:bg-[#FDE047]">
                <RefreshCw size={12} className={analyzing ? 'animate-spin' : ''} />
                <span>{analyzing ? 'Analizando...' : 'Actualizar IA'}</span>
              </button>
            </div>

            {/* Tarjeta de Temperatura */}
            <div className="p-3 rounded-xl border flex flex-col gap-1.5"
              style={{ background: temp.bg, borderColor: `${temp.color}40` }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C5C9D6]">
                  Temperatura del Lead
                </span>
                <span className="text-xs font-black px-2 py-0.5 rounded-full"
                  style={{ background: `${temp.color}30`, color: temp.color }}>
                  {temp.icon} {temp.label.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-[#E8EAED] leading-relaxed">
                {tempRationale || (
                  currentLead.Temperatura === 'CALIENTE'
                    ? 'Lead con alta urgencia de compra o confirmación de anticipo. Prioridad máxima de atención.'
                    : currentLead.Temperatura === 'FRIO'
                    ? 'Baja interacción reciente o solo consulta de precios sin avance.'
                    : 'Evaluando opciones comerciales y financiamiento disponible.'
                )}
              </p>
            </div>

            {/* Next Best Action Card */}
            <div className="p-3.5 rounded-xl border border-[#FACC1550] bg-gradient-to-br from-[#FACC1510] to-[#131620] flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#FACC15]">
                <Sparkles size={14} />
                <span>Next Best Action (Acción Inmediata)</span>
              </div>
              <p className="text-xs text-white font-medium leading-relaxed">
                {currentLead.Next_Best_Action || 'Haz clic en "Actualizar IA" para que Gemini formule la estrategia óptima de cierre para este cliente.'}
              </p>
            </div>

            {/* Resumen Ejecutivo IA */}
            {currentLead.AI_Summary && (
              <div className="p-3 rounded-xl bg-[#131620] border border-[#1F2337] flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B8FA8]">
                  Resumen Ejecutivo de la Cuenta
                </span>
                <p className="text-xs text-[#C5C9D6] leading-relaxed">
                  {currentLead.AI_Summary}
                </p>
              </div>
            )}

            {/* Respuesta Rápida Sugerida por IA */}
            {quickReply && (
              <div className="p-3 rounded-xl bg-[#131620] border border-[#25D36640] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#25D366] flex items-center gap-1">
                    <MessageCircle size={12} /> Mensaje Sugerido para WhatsApp
                  </span>
                  <button
                    onClick={() => openWhatsApp(quickReply)}
                    className="text-[10px] font-bold text-[#25D366] hover:underline flex items-center gap-0.5 cursor-pointer bg-none border-none">
                    <span>Enviar</span>
                    <ArrowUpRight size={11} />
                  </button>
                </div>
                <p className="text-xs text-[#E8EAED] italic bg-[#0A0C12] p-2.5 rounded-lg border border-[#1F2337] leading-relaxed">
                  "{quickReply}"
                </p>
                <button
                  onClick={() => openWhatsApp(quickReply)}
                  className="btn-primary text-xs py-2 justify-center flex items-center gap-1.5 font-bold cursor-pointer bg-[#25D366] text-black hover:bg-[#20bd5a]">
                  <MessageCircle size={14} />
                  <span>Enviar Respuesta Sugerida por WhatsApp</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CONVERSACIÓN / HISTORIAL EN TIEMPO REAL */}
        {activeTab === 'CHAT' && (
          <div className="flex flex-col h-full flex-1 gap-3 animate-in">
            {/* Interaction List */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 max-h-[380px] pr-1">
              {loadingChat ? (
                <div className="py-8 text-center text-xs text-[#8B8FA8] flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Cargando mensajes...</span>
                </div>
              ) : interactions.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#555870] border border-dashed border-[#1F2337] rounded-xl flex flex-col items-center gap-2">
                  <MessageSquare size={20} className="text-[#3A3F55]" />
                  <span>No hay mensajes registrados aún para este lead.</span>
                </div>
              ) : (
                interactions.map(it => {
                  const isClient = it.Remitente === 'CLIENTE'
                  return (
                    <div
                      key={it.ID}
                      className={`flex flex-col max-w-[85%] p-2.5 rounded-xl text-xs ${
                        isClient
                          ? 'self-start bg-[#1A1E2C] border border-[#2A3148] text-[#E8EAED]'
                          : 'self-end bg-[#25D36620] border border-[#25D36640] text-white'
                      }`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#8B8FA8]">
                          {isClient ? currentLead.Nombre_Cliente : (it.Remitente === 'BOT' ? '🤖 Bot AutoApp' : 'Asesor')}
                        </span>
                        <span className="text-[9px] text-[#555870]">
                          {it.created_at ? new Date(it.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{it.Detalle_Conversacion}</p>
                    </div>
                  )
                })
              )}
            </div>

            {/* Send New Message Box */}
            <form onSubmit={handleSendInteraction} className="mt-auto flex items-center gap-2 pt-2 border-t border-[#1F2337]">
              <input
                type="text"
                className="input text-xs flex-1 py-2 font-medium"
                placeholder="Registrar nota o mensaje enviado..."
                value={newMsgText}
                onChange={e => setNewMsgText(e.target.value)}
              />
              <button
                type="submit"
                disabled={sendingMsg || !newMsgText.trim()}
                className="btn-primary text-xs py-2 px-3 font-bold flex items-center justify-center gap-1 cursor-pointer">
                <Send size={13} />
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: FICHA TÉCNICA DEL PROSPECTO */}
        {activeTab === 'INFO' && (
          <div className="flex flex-col gap-4 animate-in">
            {/* Auto de Interés */}
            {currentLead.Auto_Interes && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#131620] border border-[#1F2337]">
                <Car size={15} className="text-[#FACC15] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#555870] mb-0.5">Auto de interés</p>
                  <p className="text-sm font-semibold text-[#E8EAED]">{currentLead.Auto_Interes}</p>
                </div>
              </div>
            )}

            {/* Presupuesto */}
            {currentLead.Presupuesto && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#131620] border border-[#1F2337]">
                <DollarSign size={15} className="text-[#60A5FA] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#555870] mb-0.5">Presupuesto Estimado</p>
                  <p className="text-sm font-bold text-[#60A5FA]">{currentLead.Moneda || 'ARS'} {currentLead.Presupuesto}</p>
                </div>
              </div>
            )}

            {/* Notas del Vendedor */}
            {currentLead.Notas && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#131620] border border-[#1F2337]">
                <FileText size={15} className="text-[#FDE047] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#555870] mb-0.5">Notas del Asesor</p>
                  <p className="text-xs text-[#C5C9D6] leading-relaxed">{currentLead.Notas}</p>
                </div>
              </div>
            )}

            {/* Fecha de Creación */}
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#131620] border border-[#1F2337]">
              <User size={15} className="text-[#F59E0B] flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#555870] mb-0.5">Ingresó al sistema</p>
                <p className="text-xs text-[#E8EAED]">{timeAgo(currentLead.created_at)}</p>
              </div>
            </div>

            {/* Selector de Etapa */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#1F2337]">
              <p className="text-xs font-bold text-[#8B8FA8] uppercase tracking-wider">Mover Etapa en Kanban</p>
              <div className="flex flex-col gap-1.5">
                {STAGES.map(stage => {
                  const cfg = stageConfig[stage]
                  const isSelected = currentStage === stage
                  return (
                    <button
                      key={stage}
                      onClick={() => onStageChange(currentLead.ID, stage)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-left cursor-pointer"
                      style={{
                        background: isSelected ? `${cfg.color}20` : '#131620',
                        color: isSelected ? cfg.color : '#8B8FA8',
                        border: `1px solid ${isSelected ? `${cfg.color}50` : '#1F2337'}`,
                        fontWeight: isSelected ? 700 : 400,
                      }}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                      <span>{cfg.label}</span>
                      {isSelected && <span className="ml-auto text-[10px] font-bold">● Etapa Actual</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Quick Action Footer */}
      <div className="p-3 bg-[#11131C] border-t border-[#1F2337] flex gap-2">
        <button
          onClick={() => openWhatsApp()}
          className="btn-primary flex-1 justify-center text-xs py-2 font-bold flex items-center gap-1.5 cursor-pointer bg-[#25D366] text-black hover:bg-[#20bd5a]"
          disabled={!currentLead.Telefono}>
          <MessageCircle size={14} />
          <span>Abrir WhatsApp</span>
        </button>
        {currentLead.Telefono && (
          <a
            href={`tel:${currentLead.Telefono}`}
            className="btn-ghost flex-1 justify-center text-xs py-2 font-bold flex items-center gap-1.5 cursor-pointer">
            <Phone size={14} />
            <span>Llamar</span>
          </a>
        )}
      </div>

    </div>
  )
}
