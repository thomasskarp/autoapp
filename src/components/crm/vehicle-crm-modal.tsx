'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Vehicle } from '@/lib/supabase/types'
import { formatPrice, vehicleName, getVehicleCoverImage, formatDisplayPatent } from '@/lib/utils'
import {
  ArrowLeft,
  X,
  Settings,
  Users,
  MessageSquare,
  Send,
  MessageCircle,
  Video,
  Paperclip
} from 'lucide-react'
import { CRMConnectionsModal } from './crm-connections-modal'

interface VehicleCrmModalProps {
  vehicle: Vehicle | null
  onClose: () => void
}

const CHANNELS = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    color: '#25D366',
    icon: MessageSquare,
  },
  {
    id: 'dms',
    name: 'DMs',
    color: '#E1306C',
    icon: Send,
  },
  {
    id: 'comentarios',
    name: 'Comentarios',
    color: '#3B82F6',
    icon: MessageCircle,
  },
  {
    id: 'grupos',
    name: 'Grupos',
    color: '#A855F7',
    icon: Users,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    color: '#00F2FE',
    icon: Video,
  },
]

export function VehicleCrmModal({ vehicle, onClose }: VehicleCrmModalProps) {
  const [mounted, setMounted] = useState(false)
  const [showConnectionsModal, setShowConnectionsModal] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!vehicle || !mounted) return null

  const coverImg = getVehicleCoverImage(vehicle)

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-[#07090E] flex flex-col h-screen w-screen overflow-hidden p-3 sm:p-4 select-none animate-in fade-in duration-150">
      
      {/* Top Bar Minimalista */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0F1117] border border-[#1F2337] rounded-xl mb-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            title="Volver"
            className="w-8 h-8 rounded-lg bg-[#141824] hover:bg-[#1F2337] border border-[#252A3D] text-[#A0A5BD] hover:text-white flex items-center justify-center transition-all cursor-pointer">
            <ArrowLeft size={16} />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-8 rounded-lg overflow-hidden bg-[#1A1D28] border border-[#2A2F45] flex items-center justify-center shrink-0">
              {coverImg ? (
                <img
                  src={coverImg}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[8px] font-bold text-[#555870]">SIN FOTO</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-tight truncate max-w-[280px] sm:max-w-md">
                {vehicleName(vehicle)}
              </h3>
              {vehicle.Precio_Venta && (
                <span className="text-xs font-black text-[#FACC15] px-2 py-0.5 rounded bg-[#FACC1515] border border-[#FACC1530]">
                  {formatPrice(vehicle.Precio_Venta)}
                </span>
              )}
              {formatDisplayPatent(vehicle.Patente) && (
                <span className="text-[10px] font-mono font-bold text-[#A0A5BD] px-1.5 py-0.5 rounded bg-[#1A1D28] border border-[#2A2F45]">
                  {formatDisplayPatent(vehicle.Patente)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Botones de acción cockpit */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowConnectionsModal(true)}
            title="Configurar Cuentas y Canales CRM"
            className="w-8 h-8 rounded-lg bg-[#141824] hover:bg-[#1F2337] border border-[#252A3D] text-[#A0A5BD] hover:text-[#FACC15] flex items-center justify-center transition-all cursor-pointer">
            <Settings size={16} />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#141824] hover:bg-[#1F2337] border border-[#252A3D] text-[#8B8FA8] hover:text-white flex items-center justify-center transition-all cursor-pointer">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Recuadro Grande con Ventanas de Chat */}
      <div className="flex-1 bg-[#0F1117] border border-[#1F2337] rounded-2xl p-3 sm:p-3.5 overflow-hidden flex flex-col min-h-0">
        {/* Grid de 5 Ventanas de Chat (Comentarios, DMs, WhatsApp, Grupos, TikTok) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 h-full overflow-hidden">
          {CHANNELS.map((ch) => {
            const IconComponent = ch.icon
            return (
              <div
                key={ch.id}
                className="flex flex-col h-full bg-[#0B0D13] border border-[#1F2337] rounded-xl overflow-hidden min-h-0">
                
                {/* Header de la ventana de chat */}
                <div className="px-3 py-2.5 bg-[#12151F] border-b border-[#1F2337] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: `${ch.color}20`, color: ch.color }}>
                      <IconComponent size={14} />
                    </div>
                    <span className="text-xs font-extrabold text-white tracking-wide">
                      {ch.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: ch.color, boxShadow: `0 0 6px ${ch.color}` }}
                    />
                  </div>
                </div>

                {/* Cuerpo de la ventana de chat (Caja vacía, minimalista sin texto) */}
                <div className="flex-1 bg-[#08090E]/60 p-3 flex flex-col justify-end overflow-hidden relative">
                  {/* Sutil estructura fantasma minimalista de mensajes vacíos */}
                  <div className="flex flex-col gap-2 w-full opacity-20 pointer-events-none mt-auto">
                    <div className="w-3/4 h-8 rounded-xl bg-white/[0.04] self-start border border-white/[0.04]" />
                    <div className="w-2/3 h-8 rounded-xl bg-white/[0.06] self-end border border-white/[0.05]" />
                    <div className="w-1/2 h-8 rounded-xl bg-white/[0.04] self-start border border-white/[0.04]" />
                  </div>
                </div>

                {/* Caja de texto inferior (Input vacío) */}
                <div className="p-2.5 bg-[#12151F] border-t border-[#1F2337] shrink-0">
                  <div className="flex items-center gap-1.5 bg-[#0B0D13] border border-[#252836] rounded-xl px-2.5 py-1.5 focus-within:border-[#FACC1580] transition-colors">
                    <Paperclip size={14} className="text-[#555870] shrink-0 hover:text-white transition-colors cursor-pointer" />
                    <input
                      type="text"
                      placeholder=""
                      className="bg-transparent flex-1 text-xs text-white outline-none min-w-0"
                    />
                    <button
                      type="button"
                      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-transform active:scale-95"
                      style={{ background: ch.color, color: '#000000' }}>
                      <Send size={11} />
                    </button>
                  </div>
                </div>

              </div>
            )
          })}
        </div>
      </div>

      {/* Modal de Conexión de Canales y Cuentas CRM */}
      <CRMConnectionsModal
        isOpen={showConnectionsModal}
        onClose={() => setShowConnectionsModal(false)}
      />
    </div>,
    document.body
  )
}
