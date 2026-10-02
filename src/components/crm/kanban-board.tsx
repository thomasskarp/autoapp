'use client'

import { useState, useMemo, useEffect } from 'react'
import { Lead, LeadStage } from '@/lib/supabase/types'
import { stageConfig } from '@/lib/utils'
import { LeadCard } from './lead-card'
import { LeadDetail } from './lead-detail'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Search, ChevronDown, RefreshCw, MessageSquare, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react'

const STAGES: LeadStage[] = [
  'SIN_RESPONDER',
  'VISITA',
  'COTIZACION',
  'FINANCIACION',
  'FOTOS_INFO',
  'CURIOSOS',
  'CERRADO'
]

const DEFAULT_STAGE_LIMIT = 20

function normalizeLeadStage(rawStage?: string): LeadStage {
  if (!rawStage || rawStage === 'NUEVO') return 'SIN_RESPONDER'
  if (rawStage === 'CONTACTADO') return 'FOTOS_INFO'
  if (rawStage === 'INTERESADO') return 'COTIZACION'
  if (rawStage === 'PROPUESTA') return 'FINANCIACION'
  if (rawStage === 'PERDIDO') return 'CURIOSOS'
  return rawStage as LeadStage
}

export function KanbanBoard({ leads }: { leads: Lead[] }) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads)
  const [searchLead, setSearchLead] = useState('')
  const [stageLimits, setStageLimits] = useState<Record<string, number>>({})
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [isSyncingChannels, setIsSyncingChannels] = useState(false)
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  // Sincronizar props entrantes
  useEffect(() => {
    setLocalLeads(leads)
  }, [leads])

  // Sincronización automática de todos los canales de venta al montar
  useEffect(() => {
    handleSyncAllChannels(true)
  }, [])

  // Suscripción Realtime a eventos de DB_LEADS
  useEffect(() => {
    const channel = supabase
      .channel('crm-leads-realtime-v2')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'DB_LEADS' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newLead = payload.new as Lead
            setLocalLeads(prev => {
              if (prev.some(l => l.ID === newLead.ID)) return prev
              return [newLead, ...prev]
            })
          } else if (payload.eventType === 'UPDATE') {
            const updatedLead = payload.new as Lead
            setLocalLeads(prev => prev.map(l => l.ID === updatedLead.ID ? updatedLead : l))
            setSelectedLead(prev => prev?.ID === updatedLead.ID ? updatedLead : prev)
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any)?.ID
            setLocalLeads(prev => prev.filter(l => l.ID !== oldId))
            setSelectedLead(prev => prev?.ID === oldId ? null : prev)
          }
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // Función para sincronizar en tiempo real los canales (MeLi, IG, FB, etc.)
  const handleSyncAllChannels = async (silent: boolean = false) => {
    try {
      setIsSyncingChannels(true)
      if (!silent) setSyncStatusMsg('Sincronizando chats de MercadoLibre, Instagram y Facebook...')
      const res = await fetch('/api/crm/sync-channels', { method: 'POST' })
      const data = await res.json()

      if (data.success && Array.isArray(data.leads) && data.leads.length > 0) {
        setLocalLeads(prev => {
          const map = new Map(prev.map(l => [l.ID, l]))
          for (const newL of data.leads) {
            map.set(newL.ID, newL)
          }
          return Array.from(map.values())
        })
        if (!silent) setSyncStatusMsg(`¡Sincronizado! Se centralizaron ${data.totalSynced} chats entrantes.`)
      } else if (!silent) {
        setSyncStatusMsg('Bandejas al día: no hay nuevos chats sin responder.')
      }
    } catch (e: any) {
      if (!silent) setSyncStatusMsg('Aviso: Error al sincronizar algunos canales.')
    } finally {
      setIsSyncingChannels(false)
      if (!silent) {
        setTimeout(() => setSyncStatusMsg(null), 4000)
      }
    }
  }

  // Filter leads by search term (name, phone, vehicle of interest, message notes)
  const filteredLeads = useMemo(() => {
    if (!searchLead.trim()) return localLeads
    const q = searchLead.toLowerCase().trim()
    return localLeads.filter(l =>
      (l.Nombre_Cliente && l.Nombre_Cliente.toLowerCase().includes(q)) ||
      (l.Telefono && l.Telefono.toLowerCase().includes(q)) ||
      (l.Auto_Interes && l.Auto_Interes.toLowerCase().includes(q)) ||
      (l.Notas && l.Notas.toLowerCase().includes(q))
    )
  }, [localLeads, searchLead])

  const moveCard = async (leadId: string, newStage: LeadStage) => {
    // Optimistic update
    setLocalLeads(prev =>
      prev.map(l => l.ID === leadId ? { ...l, Etapa: newStage } : l)
    )
    if (selectedLead?.ID === leadId) {
      setSelectedLead(prev => prev ? { ...prev, Etapa: newStage } : null)
    }
    // Persist to Supabase
    await supabase.from('DB_LEADS').update({ Etapa: newStage }).eq('ID', leadId)
  }

  const loadMoreForStage = (stage: string, step: number = 10) => {
    setStageLimits(prev => ({
      ...prev,
      [stage]: (prev[stage] || DEFAULT_STAGE_LIMIT) + step
    }))
  }

  // Conteo de chats sin responder
  const pendingCount = useMemo(() => {
    return localLeads.filter(l => normalizeLeadStage(l.Etapa) === 'SIN_RESPONDER').length
  }, [localLeads])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top CRM Toolbar: Search, Channel Sync & Status */}
      <div className="p-3 sm:p-3.5 border-b border-[#1F2337] bg-[#0A0C12] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[280px] max-w-md">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8FA8]" />
            <input
              type="text"
              className="input pl-9 text-xs py-2 w-full font-medium bg-[#121520]"
              placeholder="Buscar por cliente, mensaje, auto o teléfono..."
              value={searchLead}
              onChange={e => setSearchLead(e.target.value)}
            />
          </div>

          {searchLead && (
            <button
              onClick={() => setSearchLead('')}
              className="text-[11px] font-bold text-[#FACC15] hover:underline cursor-pointer bg-none border-none whitespace-nowrap">
              Limpiar
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Sync Button */}
          <button
            type="button"
            onClick={() => handleSyncAllChannels(false)}
            disabled={isSyncingChannels}
            title="Consultar y centralizar mensajes y preguntas de MercadoLibre, Instagram y Facebook"
            className="px-3.5 py-2 rounded-xl text-xs font-black text-white bg-[#1A1E2E] hover:bg-[#252B42] border border-[#38BDF840] transition-all flex items-center gap-2 shadow-md hover:scale-105 disabled:opacity-50">
            <RefreshCw size={13} className={`text-[#38BDF8] ${isSyncingChannels ? 'animate-spin' : ''}`} />
            <span>{isSyncingChannels ? 'Sincronizando...' : 'Sincronizar Canales'}</span>
          </button>

          {/* Pending Alerts Pill */}
          {pendingCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EF444415] border border-[#EF444435] text-xs font-black text-[#EF4444] animate-pulse">
              <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
              <span>{pendingCount} sin responder</span>
            </span>
          )}

          {/* Indicador Realtime */}
          <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#121520] border border-[#1F2337] text-[11px]">
            <span className={`w-2 h-2 rounded-full ${realtimeConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className={realtimeConnected ? 'text-emerald-400 font-bold' : 'text-amber-400 font-medium'}>
              {realtimeConnected ? 'En vivo' : 'Conectando...'}
            </span>
          </span>

          <span className="text-xs text-[#8B8FA8] font-bold hidden sm:inline">
            Total: <strong className="text-white">{filteredLeads.length}</strong>
          </span>
        </div>
      </div>

      {/* Sync Status Banner if active */}
      {syncStatusMsg && (
        <div className="px-4 py-2 bg-[#38BDF815] border-b border-[#38BDF830] flex items-center justify-between text-xs text-[#38BDF8] animate-in font-medium">
          <div className="flex items-center gap-2">
            <Sparkles size={14} />
            <span>{syncStatusMsg}</span>
          </div>
          <button onClick={() => setSyncStatusMsg(null)} className="text-[10px] text-[#8B8FA8] hover:text-white">
            Cerrar
          </button>
        </div>
      )}

      {/* Kanban Board with 7 Automotive Sales Columns */}
      <div className="flex h-full flex-1 overflow-hidden bg-[#07080C]">
        <div className="flex-1 overflow-x-auto p-3 sm:p-4">
          <div className="flex gap-3.5 h-full min-w-max pb-2">
            {STAGES.map(stage => {
              const cfg = stageConfig[stage] || { label: stage, color: '#8B8FA8', bg: '' }
              const allColumnLeads = filteredLeads.filter(l => normalizeLeadStage(l.Etapa) === stage)
              const limit = stageLimits[stage] || DEFAULT_STAGE_LIMIT
              const visibleLeads = allColumnLeads.slice(0, limit)
              const hasMore = allColumnLeads.length > limit
              const remaining = allColumnLeads.length - limit
              const isUnansweredCol = stage === 'SIN_RESPONDER'

              return (
                <div
                  key={stage}
                  className={`flex flex-col rounded-2xl w-72 sm:w-80 flex-shrink-0 transition-all ${
                    isUnansweredCol && allColumnLeads.length > 0
                      ? 'bg-[#0E111A] border-2 border-[#FACC1560] shadow-xl'
                      : 'bg-[#0C0E16] border border-[#1A1E2C]'
                  }`}
                  onDragOver={e => e.preventDefault()}
                  onDrop={async e => {
                    e.preventDefault()
                    const leadId = e.dataTransfer.getData('leadId')
                    if (leadId) await moveCard(leadId, stage)
                  }}>

                  {/* Column Header */}
                  <div className="flex items-center justify-between px-3.5 py-3 border-b border-[#1A1E2C] bg-[#0F121C] rounded-t-2xl">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: cfg.color, boxShadow: `0 0 8px ${cfg.color}` }}
                      />
                      <span className="text-xs font-black uppercase tracking-wide truncate text-white" title={cfg.label}>
                        {cfg.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span
                        className="text-xs font-black px-2.5 py-0.5 rounded-full border"
                        style={{
                          background: `${cfg.color}15`,
                          color: cfg.color,
                          borderColor: `${cfg.color}35`
                        }}>
                        {allColumnLeads.length}
                      </span>
                    </div>
                  </div>

                  {/* Cards Scrollable Stream */}
                  <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2.5">
                    {visibleLeads.map(lead => (
                      <LeadCard
                        key={lead.ID}
                        lead={lead}
                        isSelected={selectedLead?.ID === lead.ID}
                        onClick={() => setSelectedLead(lead)}
                      />
                    ))}

                    {hasMore && (
                      <button
                        onClick={() => loadMoreForStage(stage, 10)}
                        className="py-2 px-3 text-[11px] font-bold rounded-xl bg-[#141824] hover:bg-[#1D2335] text-[#8B8FA8] hover:text-white border border-[#242C42] transition-colors cursor-pointer flex items-center justify-center gap-1 mt-1">
                        <ChevronDown size={13} />
                        <span>Cargar {Math.min(10, remaining)} más (+{remaining})</span>
                      </button>
                    )}

                    {allColumnLeads.length === 0 && (
                      <div className="flex-1 flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-[#1A1E2C] text-center p-4">
                        <p className="text-xs font-semibold text-[#555870]">Sin chats en esta etapa</p>
                        {isUnansweredCol && (
                          <p className="text-[10px] text-[#424558] mt-1">
                            Los mensajes nuevos aparecerán aquí automáticamente
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* In-place Omnichannel Chat Drawer */}
        {selectedLead && (
          <LeadDetail
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onStageChange={moveCard}
            onLeadUpdated={(updated) => {
              setLocalLeads(prev => prev.map(l => l.ID === updated.ID ? updated : l))
              setSelectedLead(updated)
            }}
          />
        )}
      </div>
    </div>
  )
}
