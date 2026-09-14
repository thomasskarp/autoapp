'use client'

import Link from 'next/link'
import { timeAgo, stageConfig } from '@/lib/utils'
import { Lead } from '@/lib/supabase/types'
import { ArrowRight } from 'lucide-react'

export function RecentLeads({ leads }: { leads: Lead[] }) {
  return (
    <div className="card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold" style={{ color: '#E8EAED' }}>Últimos Leads</h3>
          <p className="text-xs mt-0.5" style={{ color: '#8B8FA8' }}>Actividad reciente</p>
        </div>
        <Link href="/crm" className="flex items-center gap-1 text-xs font-medium transition-colors"
          style={{ color: '#FACC15' }}>
          Ver todos <ArrowRight size={12} />
        </Link>
      </div>

      <div className="flex flex-col gap-2 flex-1">
        {leads.length === 0 ? (
          <div className="flex items-center justify-center flex-1" style={{ color: '#555870' }}>
            <p className="text-sm">Sin leads aún</p>
          </div>
        ) : (
          leads.map(lead => {
            const stage = stageConfig[lead.Etapa ?? 'NUEVO']
            return (
              <Link key={lead.ID} href={`/crm/${lead.ID}`}
                className="flex items-center gap-3 p-2.5 rounded-lg transition-all hover:bg-[#1A1D28]">

                {/* Avatar */}
                <div className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold flex-shrink-0"
                  style={{ background: '#FACC1520', color: '#FACC15' }}>
                  {lead.Nombre_Cliente?.[0]?.toUpperCase() ?? '?'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#E8EAED' }}>
                    {lead.Nombre_Cliente}
                  </p>
                  <p className="text-xs truncate" style={{ color: '#8B8FA8' }}>
                    {lead.Auto_Interes ?? '—'}
                  </p>
                </div>

                {/* Stage + time */}
                <div className="flex flex-col items-end gap-1">
                  <span className="badge text-[10px]"
                    style={{ background: `${stage?.color}18`, color: stage?.color, borderColor: `${stage?.color}30`, padding: '2px 6px' }}>
                    {stage?.label ?? lead.Etapa}
                  </span>
                  <span className="text-[10px]" style={{ color: '#555870' }}>{timeAgo(lead.created_at)}</span>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
