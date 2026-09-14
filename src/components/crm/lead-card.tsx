'use client'

import { Lead } from '@/lib/supabase/types'
import { timeAgo, stageConfig } from '@/lib/utils'
import { Car, MessageCircle, Clock, Sparkles } from 'lucide-react'

const SOURCE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  ML:        { bg: '#F59E0B20', color: '#F59E0B', label: 'MercadoLibre' },
  ML_CHAT:   { bg: '#F59E0B20', color: '#F59E0B', label: 'MercadoLibre' },
  WHATSAPP:  { bg: '#25D36620', color: '#25D366', label: 'WhatsApp' },
  WA:        { bg: '#25D36620', color: '#25D366', label: 'WhatsApp' },
  FACEBOOK:  { bg: '#1877F220', color: '#1877F2', label: 'Facebook' },
  FB:        { bg: '#1877F220', color: '#1877F2', label: 'Facebook' },
  INSTAGRAM: { bg: '#E1306C20', color: '#E1306C', label: 'Instagram' },
  IG:        { bg: '#E1306C20', color: '#E1306C', label: 'Instagram' },
}

const TEMP_STYLES: Record<string, { bg: string; color: string; label: string; icon: string }> = {
  CALIENTE: { bg: 'rgba(239, 68, 68, 0.18)', color: '#F87171', label: 'Caliente', icon: '🔥' },
  TIBIO:    { bg: 'rgba(245, 158, 11, 0.18)', color: '#FBBF24', label: 'Tibio', icon: '🟡' },
  FRIO:     { bg: 'rgba(59, 130, 246, 0.18)', color: '#60A5FA', label: 'Frío', icon: '❄️' },
}

function detectSource(lead: Lead) {
  const keys = Object.keys(SOURCE_STYLES)
  const tipo = (lead as any).Tipo_Interaccion ?? (lead as any).Origen ?? ''
  const found = keys.find(k => tipo.toUpperCase().includes(k))
  return found ? SOURCE_STYLES[found] : { bg: '#FACC1520', color: '#FACC15', label: 'Directo' }
}

interface Props {
  lead: Lead
  isSelected: boolean
  onClick: () => void
}

export function LeadCard({ lead, isSelected, onClick }: Props) {
  const source = detectSource(lead)
  const stage = stageConfig[lead.Etapa ?? 'NUEVO']
  const tempStyle = lead.Temperatura ? TEMP_STYLES[lead.Temperatura] : TEMP_STYLES.TIBIO

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('leadId', lead.ID)
  }

  return (
    <div
      className="card card-hover p-3 cursor-pointer select-none relative group"
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      style={{
        borderColor: isSelected ? '#FACC15' : undefined,
        borderLeft: `3px solid ${stage.color}`,
        borderRadius: '10px',
        transition: 'all 0.15s',
      }}>

      {/* Header with Name & Temperature Badge */}
      <div className="flex items-start justify-between gap-1.5 mb-1.5">
        <p className="text-sm font-semibold text-[#E8EAED] truncate leading-tight">
          {lead.Nombre_Cliente}
        </p>

        {tempStyle && (
          <span
            className="text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1 flex-shrink-0"
            style={{ background: tempStyle.bg, color: tempStyle.color }}
            title={`Temperatura: ${tempStyle.label}`}>
            <span>{tempStyle.icon}</span>
            <span>{tempStyle.label}</span>
          </span>
        )}
      </div>

      {/* Car interest */}
      {lead.Auto_Interes && (
        <div className="flex items-center gap-1.5 mb-2">
          <Car size={11} style={{ color: '#555870', flexShrink: 0 }} />
          <span className="text-xs truncate text-[#8B8FA8]">{lead.Auto_Interes}</span>
        </div>
      )}

      {/* AI Next Best Action Preview */}
      {lead.Next_Best_Action && (
        <div className="mb-2 p-1.5 rounded bg-[#131620] border border-[#FACC1520] flex items-start gap-1 text-[10px] text-[#FDE047] leading-tight">
          <Sparkles size={10} className="text-[#FACC15] mt-0.5 flex-shrink-0" />
          <span className="truncate">{lead.Next_Best_Action}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: source.bg, color: source.color }}>
          {source.label}
        </span>
        <div className="flex items-center gap-1">
          <Clock size={10} style={{ color: '#555870' }} />
          <span className="text-[10px]" style={{ color: '#555870' }}>{timeAgo(lead.created_at)}</span>
        </div>
      </div>
    </div>
  )
}
