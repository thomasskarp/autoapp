'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Vehicle } from '@/lib/supabase/types'
import { vehicleName, formatPrice, formatKm } from '@/lib/utils'
import { publishToFacebookMarketplace, publishToInstagramFeed, publishToWhatsAppStatus, publishToMercadoLibre } from '@/lib/publisher'
import { X, Megaphone, Loader2, CheckCircle2, Copy, ExternalLink, Sparkles, Zap } from 'lucide-react'

interface Props {
  vehicle: Vehicle | null
  onClose: () => void
}

export function PublishModal({ vehicle, onClose }: Props) {
  const [mounted, setMounted] = useState(false)
  const [loadingPlatform, setLoadingPlatform] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [completedPlatform, setCompletedPlatform] = useState<string | null>(null)
  const [copiedFicha, setCopiedFicha] = useState(false)

  // AI Multichannel Copy Generator State
  const [showAICopy, setShowAICopy] = useState(false)
  const [loadingAI, setLoadingAI] = useState(false)
  const [aiCopy, setAiCopy] = useState<any | null>(null)
  const [activeChannel, setActiveChannel] = useState<'instagram' | 'facebook' | 'mercadolibre' | 'whatsapp'>('instagram')
  const [copiedAIKey, setCopiedAIKey] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!vehicle || !mounted) return null

  const handleGenerateAICopy = async () => {
    try {
      setLoadingAI(true)
      setShowAICopy(true)
      const res = await fetch('/api/ai/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle: {
            marca: vehicle.Marca,
            modelo: vehicle.Modelo,
            version: vehicle.Version,
            anio: vehicle.Año,
            km: vehicle.Km,
            precio_venta: vehicle.Precio_Venta,
            precio_entrega: vehicle.Precio_entrega,
            combustible: vehicle.Tipo_Combustible,
            transmision: vehicle.Transmision,
            estado: vehicle.Estado,
            descripcion: vehicle.Descripcion,
            tipo: vehicle.Tipo_Vehiculo
          }
        })
      })

      const data = await res.json()
      if (data.success && data.copy) {
        setAiCopy(data.copy)
      } else {
        alert('Aviso: ' + (data.error || 'No se pudo generar el copy'))
      }
    } catch (err: any) {
      alert('Error al contactar el motor de IA: ' + err.message)
    } finally {
      setLoadingAI(false)
    }
  }

  const handleCopyAIText = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedAIKey(key)
    setTimeout(() => setCopiedAIKey(null), 2000)
  }

  const handlePublishMeli = async () => {
    try {
      setLoadingPlatform('MELI')
      setStatusMsg('Publicando automáticamente en MercadoLibre VIS API...')
      const res = await publishToMercadoLibre(vehicle, (msg) => setStatusMsg(msg))
      setCompletedPlatform('MELI')
      if (res.url) {
        setTimeout(() => {
          window.open(res.url, '_blank')
        }, 1000)
      }
    } catch (err: any) {
      alert('Error al publicar en MercadoLibre: ' + err.message)
    } finally {
      setLoadingPlatform(null)
    }
  }

  const handlePublishFB = async () => {
    try {
      setLoadingPlatform('FB')
      setStatusMsg('Preparando imágenes para Facebook Marketplace...')
      const customCopy = aiCopy?.facebook?.description
      const customTitle = aiCopy?.facebook?.title
      await publishToFacebookMarketplace(vehicle, (msg) => setStatusMsg(msg), { customCopy, customTitle })
      setCompletedPlatform('FB')
    } catch (err: any) {
      alert('Error al enviar la tarea: ' + err.message)
    } finally {
      setLoadingPlatform(null)
    }
  }

  const handlePublishIG = async () => {
    try {
      setLoadingPlatform('IG')
      setStatusMsg('Preparando imágenes para Instagram...')
      const customCaption = aiCopy?.instagram?.caption
      await publishToInstagramFeed(vehicle, (msg) => setStatusMsg(msg), { customCaption })
      setCompletedPlatform('IG')
    } catch (err: any) {
      alert('Error al enviar la tarea: ' + err.message)
    } finally {
      setLoadingPlatform(null)
    }
  }

  const handlePublishWA = async () => {
    try {
      setLoadingPlatform('WA')
      setStatusMsg('Procesando foto de portada y ficha para WhatsApp...')
      const customStatusText = aiCopy?.whatsapp?.status_text
      await publishToWhatsAppStatus(vehicle, (msg) => setStatusMsg(msg), { customStatusText })
      setCompletedPlatform('WA')
    } catch (err: any) {
      alert('Error al procesar para WhatsApp: ' + err.message)
    } finally {
      setLoadingPlatform(null)
    }
  }

  const handleCopyFicha = () => {
    const pVenta = vehicle.Precio_Venta ?? 0
    const pEntregaCalc = (vehicle.Precio_entrega && vehicle.Precio_entrega > 0)
      ? vehicle.Precio_entrega
      : (pVenta > 0 ? pVenta * 0.5 : 0)

    const text = `🚗 *${vehicleName(vehicle)}* (${vehicle.Año ?? ''})
Km: ${formatKm(vehicle.Km)}
💰 Precio de Venta: ${formatPrice(pVenta)}
💵 Anticipo mínimo: ${formatPrice(pEntregaCalc)}

📋 Estado: ${vehicle.Estado ?? 'DISPONIBLE'}
⛽ Combustible: ${vehicle.Tipo_Combustible ?? 'Nafta'} | Caja: ${vehicle.Transmision ?? 'Manual'}
📝 ${vehicle.Descripcion ?? ''}`.trim()

    navigator.clipboard.writeText(text)
    setCopiedFicha(true)
    setTimeout(() => setCopiedFicha(false), 2000)
  }

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
      onClick={onClose}>
      
      <div className="card w-full max-w-lg flex flex-col overflow-hidden shadow-2xl"
        style={{ background: '#0F1117', border: '1px solid #2A2F45' }}
        onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid #1F2337', background: '#13161F' }}>
          
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: '#FACC1520', color: '#FACC15' }}>
              <Megaphone size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: '#E8EAED' }}>
                Publicar {vehicleName(vehicle)}
              </h3>
              <p className="text-[11px]" style={{ color: '#8B8FA8' }}>
                Seleccioná la red social de destino
              </p>
            </div>
          </div>

          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ color: '#8B8FA8', background: '#1E2130', border: 'none', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          
          {/* AI Copywriter Section */}
          <div className="card p-4 flex flex-col gap-3 rounded-xl border border-[#FACC1540] bg-gradient-to-r from-[#FACC1508] to-[#13161F]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#FACC1520] text-[#FACC15]">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#E8EAED] flex items-center gap-1.5">
                    <span>Copywriter Automotriz con IA</span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#FACC1520] text-[#FACC15]">GEMINI 2.5</span>
                  </h4>
                  <p className="text-[10px] text-[#8B8FA8]">
                    Genera textos persuasivos adaptados para cada plataforma en 1 clic
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateAICopy}
                disabled={loadingAI}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FACC15] hover:bg-[#FDE047] text-black transition-colors cursor-pointer flex items-center gap-1.5">
                {loadingAI ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                <span>{loadingAI ? 'Pensando...' : aiCopy ? 'Regenerar' : 'Generar Copys'}</span>
              </button>
            </div>

            {/* AI Copy Result Drawer */}
            {aiCopy && (
              <div className="mt-2 pt-3 border-t border-[#1F2337] flex flex-col gap-3 animate-in">
                {/* Channel Selector Tabs */}
                <div className="flex items-center gap-1 bg-[#0B0D13] p-1 rounded-lg border border-[#1F2337]">
                  <button
                    type="button"
                    onClick={() => setActiveChannel('instagram')}
                    className={`flex-1 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      activeChannel === 'instagram' ? 'bg-[#E1306C] text-white' : 'text-[#8B8FA8] hover:text-white'
                    }`}>
                    📸 Instagram
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveChannel('facebook')}
                    className={`flex-1 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      activeChannel === 'facebook' ? 'bg-[#1877F2] text-white' : 'text-[#8B8FA8] hover:text-white'
                    }`}>
                    🛒 Facebook
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveChannel('mercadolibre')}
                    className={`flex-1 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      activeChannel === 'mercadolibre' ? 'bg-[#FFE600] text-black' : 'text-[#8B8FA8] hover:text-white'
                    }`}>
                    🟡 MercadoLibre
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveChannel('whatsapp')}
                    className={`flex-1 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      activeChannel === 'whatsapp' ? 'bg-[#25D366] text-black' : 'text-[#8B8FA8] hover:text-white'
                    }`}>
                    💬 WhatsApp
                  </button>
                </div>

                {/* Tab Content Display */}
                <div className="bg-[#0B0D13] p-3 rounded-lg border border-[#1F2337] text-xs text-[#C5C9D6] relative">
                  {activeChannel === 'instagram' && (
                    <div className="flex flex-col gap-2">
                      <div className="font-semibold text-white">{aiCopy.instagram.hook}</div>
                      <div className="whitespace-pre-line text-[11px] leading-relaxed text-[#9CA3AF]">{aiCopy.instagram.caption}</div>
                      <div className="text-[10px] text-[#FACC15] font-mono">{aiCopy.instagram.hashtags.join(' ')}</div>
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleCopyAIText(`${aiCopy.instagram.hook}\n\n${aiCopy.instagram.caption}\n\n${aiCopy.instagram.hashtags.join(' ')}`, 'ig')}
                          className="px-2.5 py-1 rounded text-[10px] font-bold bg-[#1F2337] hover:bg-[#2B314C] text-white flex items-center gap-1 cursor-pointer">
                          {copiedAIKey === 'ig' ? <CheckCircle2 size={12} className="text-green-400" /> : <Copy size={12} />}
                          <span>{copiedAIKey === 'ig' ? '¡Copiado!' : 'Copiar Texto IG'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {activeChannel === 'facebook' && (
                    <div className="flex flex-col gap-2">
                      <div className="font-bold text-white text-xs">{aiCopy.facebook.title}</div>
                      <div className="whitespace-pre-line text-[11px] leading-relaxed text-[#9CA3AF]">{aiCopy.facebook.description}</div>
                      <ul className="list-disc pl-4 text-[10px] text-[#C5C9D6] space-y-0.5">
                        {aiCopy.facebook.key_features.map((feat: string, idx: number) => (
                          <li key={idx}>{feat}</li>
                        ))}
                      </ul>
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleCopyAIText(`${aiCopy.facebook.title}\n\n${aiCopy.facebook.description}\n\n${aiCopy.facebook.key_features.join('\n• ')}`, 'fb')}
                          className="px-2.5 py-1 rounded text-[10px] font-bold bg-[#1F2337] hover:bg-[#2B314C] text-white flex items-center gap-1 cursor-pointer">
                          {copiedAIKey === 'fb' ? <CheckCircle2 size={12} className="text-green-400" /> : <Copy size={12} />}
                          <span>{copiedAIKey === 'fb' ? '¡Copiado!' : 'Copiar Texto FB'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {activeChannel === 'mercadolibre' && (
                    <div className="flex flex-col gap-2">
                      <div className="font-bold text-[#FFE600] text-xs">{aiCopy.mercadolibre.title}</div>
                      <div className="whitespace-pre-line text-[11px] leading-relaxed text-[#9CA3AF] font-mono">{aiCopy.mercadolibre.description}</div>
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleCopyAIText(`${aiCopy.mercadolibre.title}\n\n${aiCopy.mercadolibre.description}`, 'meli')}
                          className="px-2.5 py-1 rounded text-[10px] font-bold bg-[#1F2337] hover:bg-[#2B314C] text-white flex items-center gap-1 cursor-pointer">
                          {copiedAIKey === 'meli' ? <CheckCircle2 size={12} className="text-green-400" /> : <Copy size={12} />}
                          <span>{copiedAIKey === 'meli' ? '¡Copiado!' : 'Copiar Ficha MeLi'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {activeChannel === 'whatsapp' && (
                    <div className="flex flex-col gap-2">
                      <div className="text-[10px] font-bold text-[#25D366] uppercase tracking-wider">Texto para Estados:</div>
                      <div className="text-[11px] text-white bg-[#13161F] p-2 rounded border border-[#1F2337]">{aiCopy.whatsapp.status_text}</div>
                      <div className="text-[10px] font-bold text-[#8B8FA8] uppercase tracking-wider mt-1">Pitch Directo para Chats:</div>
                      <div className="whitespace-pre-line text-[11px] text-[#9CA3AF] bg-[#13161F] p-2 rounded border border-[#1F2337]">{aiCopy.whatsapp.chat_pitch}</div>
                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyAIText(aiCopy.whatsapp.status_text, 'wa_status')}
                          className="px-2.5 py-1 rounded text-[10px] font-bold bg-[#1F2337] hover:bg-[#2B314C] text-white flex items-center gap-1 cursor-pointer">
                          {copiedAIKey === 'wa_status' ? <CheckCircle2 size={12} className="text-green-400" /> : <Copy size={12} />}
                          <span>{copiedAIKey === 'wa_status' ? '¡Copiado!' : 'Copiar Estado'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyAIText(aiCopy.whatsapp.chat_pitch, 'wa_chat')}
                          className="px-2.5 py-1 rounded text-[10px] font-bold bg-[#25D366] text-black hover:bg-[#20bd5a] flex items-center gap-1 cursor-pointer">
                          {copiedAIKey === 'wa_chat' ? <CheckCircle2 size={12} className="text-black" /> : <Copy size={12} />}
                          <span>{copiedAIKey === 'wa_chat' ? '¡Copiado!' : 'Copiar Pitch Chat'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Option 0: MercadoLibre VIS Direct */}
          <div className="card p-4 flex items-center justify-between transition-all hover:bg-[#1A1D28]"
            style={{ background: '#13161F', border: '1px solid #FFE60050' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black"
                style={{ background: '#FFE60020', color: '#FFE600' }}>
                <Zap size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold" style={{ color: '#E8EAED' }}>MercadoLibre</h4>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#FFE60020] text-[#FFE600]">VIS OFICIAL</span>
                </div>
                <p className="text-[11px]" style={{ color: '#8B8FA8' }}>
                  Publicación directa 100% automática por API oficial
                </p>
              </div>
            </div>

            <button
              onClick={handlePublishMeli}
              disabled={loadingPlatform !== null}
              className="btn-primary text-xs font-black"
              style={{ background: '#FFE600', color: '#000000', padding: '8px 14px' }}>
              {loadingPlatform === 'MELI' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {completedPlatform === 'MELI' ? '¡Publicado!' : 'Publicar'}
            </button>
          </div>

          {/* Option 1: Facebook Marketplace */}
          <div className="card p-4 flex items-center justify-between transition-all hover:bg-[#1A1D28]"
            style={{ background: '#13161F', border: '1px solid #1877F240' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: '#1877F220', color: '#1877F2' }}>
                <ExternalLink size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold" style={{ color: '#E8EAED' }}>Facebook Marketplace</h4>
                <p className="text-[11px]" style={{ color: '#8B8FA8' }}>
                  Carga automática de fotos, datos y precio vía extensión
                </p>
              </div>
            </div>

            <button
              onClick={handlePublishFB}
              disabled={loadingPlatform !== null}
              className="btn-primary text-xs"
              style={{ background: '#1877F2', padding: '8px 14px' }}>
              {loadingPlatform === 'FB' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {completedPlatform === 'FB' ? '¡Publicando!' : 'Publicar'}
            </button>
          </div>

          {/* Option 2: Instagram Feed */}
          <div className="card p-4 flex items-center justify-between transition-all hover:bg-[#1A1D28]"
            style={{ background: '#13161F', border: '1px solid #E1306C40' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: '#E1306C20', color: '#E1306C' }}>
                <ExternalLink size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold" style={{ color: '#E8EAED' }}>Instagram Feed</h4>
                <p className="text-[11px]" style={{ color: '#8B8FA8' }}>
                  Autopublicación de post con fotos y descripción formateada
                </p>
              </div>
            </div>

            <button
              onClick={handlePublishIG}
              disabled={loadingPlatform !== null}
              className="btn-primary text-xs"
              style={{ background: '#E1306C', padding: '8px 14px' }}>
              {loadingPlatform === 'IG' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {completedPlatform === 'IG' ? '¡Publicando!' : 'Publicar'}
            </button>
          </div>

          {/* Option 3: WhatsApp Estado / Directo */}
          <div className="card p-4 flex items-center justify-between transition-all hover:bg-[#1A1D28]"
            style={{ background: '#13161F', border: '1px solid #25D36640' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: '#25D36620', color: '#25D366' }}>
                <ExternalLink size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold" style={{ color: '#E8EAED' }}>WhatsApp Estado</h4>
                <p className="text-[11px]" style={{ color: '#8B8FA8' }}>
                  Descarga imagen de portada, copia ficha y abre WhatsApp
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyFicha}
                className="btn-ghost text-xs"
                style={{ borderColor: '#25D36640', color: '#25D366', padding: '8px 10px' }}>
                {copiedFicha ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                {copiedFicha ? '¡Copiado!' : 'Ficha'}
              </button>

              <button
                onClick={handlePublishWA}
                disabled={loadingPlatform !== null}
                className="btn-primary text-xs"
                style={{ background: '#25D366', color: '#000', padding: '8px 14px' }}>
                {loadingPlatform === 'WA' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {completedPlatform === 'WA' ? '¡Iniciado!' : 'Publicar'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>,
    document.body
  )
}
