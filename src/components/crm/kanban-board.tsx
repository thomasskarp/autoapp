'use client'

import { useState, useMemo, useEffect } from 'react'
import { Lead, LeadStage } from '@/lib/supabase/types'
import { stageConfig } from '@/lib/utils'
import { LeadCard } from './lead-card'
import { LeadDetail } from './lead-detail'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Search, ChevronDown, Radio } from 'lucide-react'

const STAGES: LeadStage[] = ['NUEVO', 'CONTACTADO', 'INTERESADO', 'PROPUESTA', 'CERRADO']
const DEFAULT_STAGE_LIMIT = 12

export function KanbanBoard({ leads }: { leads: Lead[] }) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads)
  const [searchLead, setSearchLead] = useState('')
  const [stageLimits, setStageLimits] = useState<Record<string, number>>({})
  const [realtimeConnected, setRealtimeConnected] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  // Sincronizar props entrantes
  useEffect(() => {
    setLocalLeads(leads)
  }, [leads])

  // Suscripción Realtime a eventos de DB_LEADS (WhatsApp Bot / CRM updates)
  useEffect(() => {
    const channel = supabase
      .channel('crm-leads-realtime')
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

  // Filter leads by search term (name, phone, vehicle of interest)
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
    // Persist
    await supabase.from('DB_LEADS').update({ Etapa: newStage }).eq('ID', leadId)
  }

  const loadMoreForStage = (stage: string, step: number = 10) => {
    setStageLimits(prev => ({
      ...prev,
      [stage]: (prev[stage] || DEFAULT_STAGE_LIMIT) + step
    }))
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search & Filter Bar for CRM */}
      <div className="p-3 border-b border-[#1F2337] bg-[#0F1117] flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8FA8]" />
          <input
            type="text"
            className="input pl-9 text-xs py-1.5 w-full font-medium"
            placeholder="Buscar por cliente, teléfono o auto..."
            value={searchLead}
            onChange={e => setSearchLead(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-[#8B8FA8] font-semibold">
          {/* Indicador Realtime */}
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#131620] border border-[#1F2337] text-[10px]">
            <span className={`w-2 h-2 rounded-full ${realtimeConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className={realtimeConnected ? 'text-emerald-400 font-bold' : 'text-amber-400 font-medium'}>
              {realtimeConnected ? 'En vivo (Realtime)' : 'Conectando Realtime...'}
            </span>
          </span>

          <span>Total: <strong className="text-white">{filteredLeads.length}</strong> leads</span>
          {searchLead && (
            <button
              onClick={() => setSearchLead('')}
              className="text-[11px] text-[#FACC15] hover:underline cursor-pointer bg-none border-none">
              Limpiar filtro
            </button>
          )}
        </div>
      </div>

      <div className="flex h-full flex-1 overflow-hidden">
        {/* Kanban columns */}
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-3 h-full min-w-max">
            {STAGES.map(stage => {
              const cfg = stageConfig[stage]
              const allColumnLeads = filteredLeads.filter(l => (l.Etapa ?? 'NUEVO') === stage)
              const limit = stageLimits[stage] || DEFAULT_STAGE_LIMIT
              const visibleLeads = allColumnLeads.slice(0, limit)
              const hasMore = allColumnLeads.length > limit
              const remaining = allColumnLeads.length - limit

              return (
                <div key={stage}
                  className="flex flex-col rounded-xl w-68 flex-shrink-0"
                  style={{ background: '#0F1117', border: '1px solid #1F2337' }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={async e => {
                    e.preventDefault()
                    const leadId = e.dataTransfer.getData('leadId')
                    if (leadId) await moveCard(leadId, stage)
                  }}>

                  {/* Column Header */}
                  <div className="flex items-center justify-between px-3 py-3"
                    style={{ borderBottom: '1px solid #1F2337' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${cfg.color}20`, color: cfg.color }}>
                        {allColumnLeads.length}
                      </span>
                    </div>
                  </div>

                  {/* Cards with Virtual Batch Limit */}
                  <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
                    {visibleLeads.map(lead => (
                      <LeadCard
                        key={lead.ID}
                        lead={lead}
                        isSelected={selectedLead?.ID === lead.ID}
                        onClick={() => setSelectedLead(lead)}
                      />
                    ))}

                    {/* Load More Button for Dense Lead Columns */}
                    {hasMore && (
                      <button
                        onClick={() => loadMoreForStage(stage, 10)}
                        className="py-2 px-3 text-[11px] font-bold rounded-lg bg-[#161923] hover:bg-[#1F2337] text-[#8B8FA8] hover:text-white border border-[#262B40] transition-colors cursor-pointer flex items-center justify-center gap-1 mt-1">
                        <ChevronDown size={13} />
                        <span>Cargar {Math.min(10, remaining)} más (+{remaining})</span>
                      </button>
                    )}

                    {allColumnLeads.length === 0 && (
                      <div className="flex-1 flex items-center justify-center py-8 rounded-lg border border-dashed"
                        style={{ borderColor: '#1F2337' }}>
                        <p className="text-xs" style={{ color: '#555870' }}>Sin leads</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Detail panel */}
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
