'use client'

import Link from 'next/link'
import { timeAgo, stageConfig } from '@/lib/utils'
import { Lead } from '@/lib/supabase/types'
import { ArrowRight } from 'lucide-react'

const stageBadgeClasses: Record<string, string> = {
  SIN_RESPONDER: 'bg-amber-500/10 text-yellow-400 border-amber-500/30',
  VISITA:        'bg-blue-500/10 text-blue-400 border-blue-500/30',
  COTIZACION:    'bg-pink-500/10 text-pink-400 border-pink-500/30',
  FINANCIACION:  'bg-violet-500/10 text-violet-400 border-violet-500/30',
  FOTOS_INFO:    'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  CURIOSOS:      'bg-gray-500/10 text-gray-400 border-gray-500/30',
  CERRADO:       'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  NUEVO:         'bg-amber-500/10 text-yellow-400 border-amber-500/30',
  CONTACTADO:    'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  INTERESADO:    'bg-pink-500/10 text-pink-400 border-pink-500/30',
  PROPUESTA:     'bg-violet-500/10 text-violet-400 border-violet-500/30',
  PERDIDO:       'bg-gray-500/10 text-gray-400 border-gray-500/30',
}

export function RecentLeads({ leads }: { leads: Lead[] }) {
  return (
    <div className="card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-[#E8EAED]">Últimos Leads</h3>
          <p className="text-xs mt-0.5 text-[#8B8FA8]">Actividad reciente</p>
        </div>
        <Link href="/crm" className="flex items-center gap-1 text-xs font-medium transition-colors text-yellow-400 hover:text-yellow-300">
          Ver todos <ArrowRight size={12} />
        </Link>
      </div>

      <div className="flex flex-col gap-2 flex-1">
        {leads.length === 0 ? (
          <div className="flex items-center justify-center flex-1 text-[#555870]">
            <p className="text-sm">Sin leads aún</p>
          </div>
        ) : (
          leads.map(lead => {
            const stage = stageConfig[lead.Etapa ?? 'NUEVO']
            return (
              <Link key={lead.ID} href={`/crm/${lead.ID}`}
                className="flex items-center gap-3 p-2.5 rounded-lg transition-all hover:bg-[#1A1D28]">

                {/* Avatar */}
                <div className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold flex-shrink-0 bg-yellow-400/15 text-yellow-400">
                  {lead.Nombre_Cliente?.[0]?.toUpperCase() ?? '?'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-[#E8EAED]">
                    {lead.Nombre_Cliente}
                  </p>
                  <p className="text-xs truncate text-[#8B8FA8]">
                    {lead.Auto_Interes ?? '—'}
                  </p>
                </div>

                {/* Stage + time */}
                <div className="flex flex-col items-end gap-1">
                  <span className={`badge text-[10px] px-1.5 py-0.5 border ${stageBadgeClasses[lead.Etapa ?? 'NUEVO'] || 'bg-gray-500/10 text-gray-400 border-gray-500/30'}`}>
                    {stage?.label ?? lead.Etapa}
                  </span>
                  <span className="text-[10px] text-[#555870]">{timeAgo(lead.created_at)}</span>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
