'use client'

import { useState } from 'react'
import { Lead } from '@/lib/supabase/types'
import { KanbanBoard } from './kanban-board'
import { OmnichannelInbox } from './omnichannel-inbox'
import { LayoutDashboard, MessageSquare, RefreshCw, Sparkles, Filter } from 'lucide-react'

interface CRMViewContainerProps {
  initialLeads: Lead[]
}

export function CRMViewContainer({ initialLeads }: CRMViewContainerProps) {
  const [viewMode, setViewMode] = useState<'KANBAN' | 'INBOX'>('INBOX')
  const [leads, setLeads] = useState<Lead[]>(initialLeads)

  const unreadCount = leads.filter(l => l.Etapa === 'SIN_RESPONDER').length

  const handleLeadUpdated = (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.ID === updatedLead.ID ? updatedLead : l))
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Selector de Vistas: Chatwoot Omnichannel vs Twenty Kanban */}
      <div className="px-6 py-2 bg-[#0C101A] border-b border-slate-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode('INBOX')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'INBOX'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <MessageSquare size={14} />
            <span>Bandeja Omnicanal (Chatwoot)</span>
            {unreadCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                viewMode === 'INBOX' ? 'bg-black text-amber-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setViewMode('KANBAN')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'KANBAN'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard size={14} />
            <span>Tablero Kanban (Twenty)</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:inline-flex items-center gap-1">
            <Sparkles size={12} className="text-amber-400" />
            <span>IA Gemini 2.5 Activa</span>
          </span>
          <span className="text-xs text-slate-500">
            Total: <strong className="text-slate-300">{leads.length} prospectos</strong>
          </span>
        </div>
      </div>

      {/* Renderizado de la Vista Seleccionada */}
      <div className="flex-1 overflow-hidden p-3 bg-[#080B11]">
        {viewMode === 'INBOX' ? (
          <OmnichannelInbox leads={leads} onLeadUpdated={handleLeadUpdated} />
        ) : (
          <KanbanBoard leads={leads} />
        )}
      </div>
    </div>
  )
}
