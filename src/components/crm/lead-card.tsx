'use client'

import { Lead } from '@/lib/supabase/types'
import { timeAgo, stageConfig } from '@/lib/utils'
import { Car, MessageSquare, Clock, Send, Zap, MessageCircle, ArrowRight } from 'lucide-react'

interface ChannelStyle {
  bg: string
  color: string
  border: string
  label: string
  iconType: 'meli' | 'ig_dm' | 'ig_comment' | 'fb_msg' | 'fb_comment' | 'wa' | 'direct'
}

function detectChannel(lead: Lead): ChannelStyle {
  const id = lead.ID || ''
  const notas = lead.Notas || ''
  const tipo = (lead as any).Tipo_Interaccion || (lead as any).Origen || ''
  const combined = `${id} ${notas} ${tipo}`.toLowerCase()

  if (id.startsWith('meli_') || combined.includes('mercadolibre') || combined.includes('meli')) {
    return { bg: '#FFE60020', color: '#FFE600', border: '#FFE60040', label: 'MercadoLibre', iconType: 'meli' }
  }
  if (id.startsWith('ig_dm_') || combined.includes('instagram dm')) {
    return { bg: '#E1306C20', color: '#E1306C', border: '#E1306C40', label: 'Instagram DM', iconType: 'ig_dm' }
  }
  if (id.startsWith('ig_c_') || combined.includes('instagram')) {
    return { bg: '#E1306C15', color: '#F472B6', border: '#E1306C30', label: 'Instagram Post', iconType: 'ig_comment' }
  }
  if (id.startsWith('fb_msg_') || combined.includes('facebook messenger') || combined.includes('messenger')) {
    return { bg: '#1877F220', color: '#60A5FA', border: '#1877F240', label: 'FB Messenger', iconType: 'fb_msg' }
  }
  if (id.startsWith('fb_c_') || combined.includes('facebook')) {
    return { bg: '#1877F215', color: '#38BDF8', border: '#1877F230', label: 'Facebook Muro', iconType: 'fb_comment' }
  }
  if (lead.Telefono || combined.includes('whatsapp') || combined.includes('wa')) {
    return { bg: '#25D36620', color: '#22C55E', border: '#25D36640', label: 'WhatsApp', iconType: 'wa' }
  }
  return { bg: '#FACC1520', color: '#FACC15', border: '#FACC1530', label: 'Web Directo', iconType: 'direct' }
}

function extractLastMessage(lead: Lead): string {
  if (!lead.Notas) return 'Cliente interesado en consultar por el vehículo.'
  const quoteMatch = lead.Notas.match(/"([^"]+)"/)
  if (quoteMatch && quoteMatch[1]) return quoteMatch[1].trim()
  const firstLine = lead.Notas.split('\n')[0].replace(/^\[[^\]]+\]\s*/, '').trim()
  return firstLine || 'Consulta recibida en salón'
}

interface Props {
  lead: Lead
  isSelected: boolean
  onClick: () => void
}

export function LeadCard({ lead, isSelected, onClick }: Props) {
  const channel = detectChannel(lead)
  const currentStage = lead.Etapa ?? 'SIN_RESPONDER'
  const stage = stageConfig[currentStage] || stageConfig['SIN_RESPONDER']
  const messagePreview = extractLastMessage(lead)
  const isUnanswered = currentStage === 'SIN_RESPONDER' || currentStage === 'NUEVO'

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('leadId', lead.ID)
  }

  return (
    <div
      className={`p-3.5 rounded-2xl cursor-pointer select-none relative group transition-all duration-200 shadow-md ${
        isSelected
          ? 'bg-[#181B27] border-2 border-[#FACC15] shadow-xl scale-[1.02]'
          : 'bg-[#10131D] border border-[#1E2235] hover:border-[#343A54] hover:bg-[#141724]'
      }`}
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: stage.color
      }}>

      {/* Card Header: Channel Badge + Time */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <span
          className="text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 border"
          style={{ background: channel.bg, color: channel.color, borderColor: channel.border }}>
          {channel.iconType === 'meli' && <Zap size={10} />}
          {(channel.iconType === 'ig_dm' || channel.iconType === 'fb_msg') && <Send size={10} />}
          {(channel.iconType === 'ig_comment' || channel.iconType === 'fb_comment') && <MessageSquare size={10} />}
          {channel.iconType === 'wa' && <MessageCircle size={10} />}
          <span>{channel.label}</span>
        </span>

        <div className="flex items-center gap-1 text-[#8B8FA8] text-[10px] font-mono">
          <Clock size={10} className="text-[#64748B]" />
          <span>{timeAgo(lead.created_at)}</span>
        </div>
      </div>

      {/* Customer Name */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-xs sm:text-sm font-black text-white truncate leading-tight">
          {lead.Nombre_Cliente}
        </p>

        {isUnanswered && (
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-[#EF444420] text-[#EF4444] border border-[#EF444440] flex items-center gap-1 animate-pulse flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
            <span>Sin responder</span>
          </span>
        )}
      </div>

      {/* Car of interest */}
      {lead.Auto_Interes && (
        <div className="flex items-center gap-1.5 mb-2.5">
          <Car size={12} className="text-[#60A5FA] flex-shrink-0" />
          <span className="text-xs font-semibold truncate text-[#94A3B8]">
            {lead.Auto_Interes}
          </span>
        </div>
      )}

      {/* Live Chat Message Preview Bubble */}
      <div className="p-2.5 rounded-xl bg-[#080A10] border border-[#1A1E2E] flex items-start gap-2 mb-2.5 group-hover:border-[#2A314A] transition-colors">
        <MessageSquare size={13} className="text-[#38BDF8] flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#E2E8F0] font-medium leading-relaxed line-clamp-2 italic">
          &quot;{messagePreview}&quot;
        </p>
      </div>

      {/* Card Action Button: Open Chat */}
      <div className="flex items-center justify-between pt-1 border-t border-[#1A1E2E]">
        <span className="text-[10px] font-bold text-[#8B8FA8] uppercase tracking-wider">
          {stage.label}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
          className="px-2.5 py-1 rounded-lg text-[11px] font-black text-[#38BDF8] bg-[#38BDF815] hover:bg-[#38BDF825] border border-[#38BDF830] transition-all flex items-center gap-1 group-hover:scale-105">
          <MessageCircle size={11} />
          <span>Responder Chat</span>
          <ArrowRight size={11} />
        </button>
      </div>
    </div>
  )
}
