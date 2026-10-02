'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import {
  Users, UserPlus, Key, Mail, Shield, Trash2, Eye, EyeOff,
  CheckCircle2, AlertCircle, Loader2, Sparkles, Copy, Check, RefreshCw
} from 'lucide-react'

interface Vendedor {
  id: string
  email: string
  name: string
  role: string
  createdAt: string
  lastSignIn?: string | null
}

export default function ConfiguracionPage() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [loadingList, setLoadingList] = useState(true)

  // Formulario de nuevo vendedor
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // Copiado al portapapeles
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [copiedCreds, setCopiedCreds] = useState(false)

  // Modal para cambiar contraseña
  const [editingVendedor, setEditingVendedor] = useState<Vendedor | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [changePassError, setChangePassError] = useState<string | null>(null)
  const [changePassSuccess, setChangePassSuccess] = useState(false)

  const fetchVendedores = async () => {
    try {
      setLoadingList(true)
      const res = await fetch('/api/vendedores')
      const data = await res.json()
      if (data.success && Array.isArray(data.users)) {
        setVendedores(data.users)
      }
    } catch (err) {
      console.error('Error cargando vendedores:', err)
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    fetchVendedores()
  }, [])

  // Generador de contraseñas fáciles de recordar y seguras
  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let generated = 'Auto'
    for (let i = 0; i < 4; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    generated += '2026'
    setPassword(generated)
    setShowPassword(true)
  }

  const handleCreateVendedor = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    if (!email || !email.includes('@')) {
      setFormError('Por favor ingresa un correo electrónico válido.')
      return
    }

    if (!password || password.length < 6) {
      setFormError('La contraseña debe tener un mínimo de 6 caracteres.')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch('/api/vendedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setFormError(data.error || 'Ocurrió un error al crear el vendedor.')
        return
      }

      setFormSuccess(`¡Vendedor ${email} creado exitosamente!`)
      setEmail('')
      setPassword('')
      setName('')
      fetchVendedores()
      setTimeout(() => setFormSuccess(null), 5000)
    } catch (err: any) {
      setFormError(err.message || 'Error de conexión al crear vendedor.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteVendedor = async (vendedor: Vendedor) => {
    if (vendedor.email === 'tomas.skarp@gmail.com') {
      alert('La cuenta del administrador principal no puede ser eliminada.')
      return
    }

    const confirmMsg = `¿Eliminar el acceso a ${vendedor.name} (${vendedor.email})? Ya no podrá ingresar a AutoApp.`
    if (!confirm(confirmMsg)) return

    try {
      const res = await fetch(`/api/vendedores?id=${vendedor.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setVendedores(prev => prev.filter(v => v.id !== vendedor.id))
      } else {
        alert(data.error || 'Error al eliminar el vendedor.')
      }
    } catch (err: any) {
      alert('Error de conexión: ' + err.message)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingVendedor) return
    setChangePassError(null)

    if (!newPassword || newPassword.length < 6) {
      setChangePassError('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }

    try {
      setSavingPassword(true)
      const res = await fetch('/api/vendedores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingVendedor.id, newPassword }),
      })

      const data = await res.json()
      if (data.success) {
        setChangePassSuccess(true)
        setTimeout(() => {
          setChangePassSuccess(false)
          setEditingVendedor(null)
          setNewPassword('')
        }, 1500)
      } else {
        setChangePassError(data.error || 'Error al cambiar la contraseña.')
      }
    } catch (err: any) {
      setChangePassError(err.message || 'Error de conexión.')
    } finally {
      setSavingPassword(false)
    }
  }

  const copySellerAccessInstructions = (vendedor: Vendedor) => {
    const text = `🚗 *ACCESO A AUTOAPP (OKM MOTORS)*\n\nHola ${vendedor.name}, ya tenés habilitado tu usuario en la plataforma:\n\n🔗 *Link de ingreso:* https://autoapp.vercel.app/login\n📧 *Usuario:* ${vendedor.email}\n🔑 *Contraseña:* (La clave que te fue asignada)\n\n¡Ya podés ingresar a consultar stock y publicar autos!`
    navigator.clipboard.writeText(text)
    setCopiedId(vendedor.id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Header
        title="Configuración"
        subtitle="Gestión de vendedores, accesos y equipo de la concesionaria"
      />

      <div className="p-6 max-w-5xl mx-auto w-full flex flex-col gap-6 animate-in">

        {/* Tarjeta de Información de Producción */}
        <div className="card p-4 flex flex-wrap items-center justify-between gap-3 border border-[#FACC1530] bg-[#FACC1508]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FACC1520] border border-[#FACC1540] flex items-center justify-center text-[#FACC15] shrink-0">
              <Shield size={20} />
            </div>
            <div>
              <p className="text-sm font-black text-white">Enlace oficial de ingreso para vendedores</p>
              <p className="text-xs font-semibold text-[#8B8FA8]">Los vendedores que des de alta aquí podrán iniciar sesión desde este enlace:</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-[#0F1117] border border-[#2A2F45] text-[#FACC15]">
              https://autoapp.vercel.app/login
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText('https://autoapp.vercel.app/login')
                setCopiedCreds(true)
                setTimeout(() => setCopiedCreds(false), 2000)
              }}
              title="Copiar enlace"
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-[#1F2337] hover:bg-[#2A2F45] text-white flex items-center gap-1.5 cursor-pointer">
              {copiedCreds ? <Check size={14} className="text-[#22C55E]" /> : <Copy size={14} />}
              <span>{copiedCreds ? '¡Copiado!' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Formulario Principal: AGREGAR NUEVO VENDEDOR */}
        <div className="card p-6 border border-[#1F2337] bg-[#13161F]">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#1F2337]">
            <div className="w-9 h-9 rounded-lg bg-[#FACC1515] border border-[#FACC1530] flex items-center justify-center text-[#FACC15]">
              <UserPlus size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">Agregar Nuevo Vendedor</h2>
              <p className="text-xs font-medium text-[#8B8FA8]">Crea el acceso asignándole correo y contraseña para que pueda ingresar a AutoApp</p>
            </div>
          </div>

          <form onSubmit={handleCreateVendedor} className="flex flex-col gap-4">
            {formError && (
              <div className="p-3.5 rounded-xl text-xs font-bold bg-[#EF444415] border border-[#EF444430] text-[#EF4444] flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3.5 rounded-xl text-xs font-bold bg-[#22C55E15] border border-[#22C55E30] text-[#22C55E] flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Cuadro 1: Correo del vendedor */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A0A5BD] mb-1.5 flex items-center gap-1.5">
                  <Mail size={13} className="text-[#FACC15]" />
                  <span>Correo del Vendedor *</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="ej: vendedor@okmmotors.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input w-full font-medium text-sm py-2.5 px-3"
                />
              </div>

              {/* Cuadro 2: Contraseña asignada */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#A0A5BD] flex items-center gap-1.5">
                    <Key size={13} className="text-[#FACC15]" />
                    <span>Contraseña Asignada *</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] font-bold text-[#FACC15] hover:underline flex items-center gap-1 cursor-pointer">
                    <Sparkles size={11} />
                    <span>Generar</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input w-full font-medium text-sm py-2.5 px-3 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8FA8] hover:text-white transition-colors cursor-pointer">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Cuadro Opcional: Nombre del Vendedor */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A0A5BD] mb-1.5 flex items-center gap-1.5">
                  <Users size={13} className="text-[#FACC15]" />
                  <span>Nombre / Apodo (Opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="ej: Carlos Gómez"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input w-full font-medium text-sm py-2.5 px-3"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary px-6 py-2.5 text-sm font-black flex items-center gap-2 cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-all">
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Creando Vendedor...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    <span>Dar de Alta Vendedor</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Lista de Vendedores Activos */}
        <div className="card p-6 border border-[#1F2337] bg-[#13161F]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1F2337]">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-[#FACC15]" />
              <h3 className="text-base font-black text-white">Vendedores y Equipo ({vendedores.length})</h3>
            </div>
            <button
              onClick={fetchVendedores}
              title="Actualizar lista"
              className="p-1.5 rounded-lg bg-[#1A1D28] hover:bg-[#252A3D] text-[#8B8FA8] hover:text-white transition-colors cursor-pointer">
              <RefreshCw size={14} className={loadingList ? 'animate-spin' : ''} />
            </button>
          </div>

          {loadingList ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#8B8FA8]">
              <Loader2 size={24} className="animate-spin text-[#FACC15]" />
              <p className="text-xs font-bold">Cargando vendedores...</p>
            </div>
          ) : vendedores.length === 0 ? (
            <div className="py-10 text-center text-sm font-semibold text-[#8B8FA8]">
              No hay vendedores registrados todavía. Usa el formulario de arriba para agregar uno.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#1F2337] text-[11px] font-black uppercase text-[#8B8FA8] tracking-wider">
                    <th className="py-3 px-4">Vendedor</th>
                    <th className="py-3 px-4">Correo</th>
                    <th className="py-3 px-4">Rol</th>
                    <th className="py-3 px-4">Alta</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2337]/60">
                  {vendedores.map(v => {
                    const isOwner = v.email === 'tomas.skarp@gmail.com'
                    return (
                      <tr key={v.id} className="hover:bg-[#1A1D28]/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#FACC1515] border border-[#FACC1530] text-[#FACC15] font-black text-xs flex items-center justify-center">
                              {v.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-sm font-bold text-white">{v.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-[#E5E7EB]">
                          {v.email}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                            isOwner
                              ? 'bg-[#FACC1515] text-[#FACC15] border-[#FACC1540]'
                              : 'bg-[#3B82F615] text-[#3B82F6] border-[#3B82F640]'
                          }`}>
                            {isOwner ? 'Dueño / Admin' : 'Vendedor'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-[#8B8FA8]">
                          {new Date(v.createdAt).toLocaleDateString('es-AR')}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Botón copiar mensaje de acceso para WhatsApp */}
                            <button
                              onClick={() => copySellerAccessInstructions(v)}
                              title="Copiar mensaje de acceso para enviarle por WhatsApp"
                              className="p-2 rounded-lg bg-[#141824] hover:bg-[#252A3D] text-[#8B8FA8] hover:text-[#FACC15] transition-all cursor-pointer">
                              {copiedId === v.id ? <Check size={14} className="text-[#22C55E]" /> : <Copy size={14} />}
                            </button>

                            {/* Botón cambiar contraseña */}
                            <button
                              onClick={() => {
                                setEditingVendedor(v)
                                setNewPassword('')
                                setChangePassError(null)
                                setChangePassSuccess(false)
                              }}
                              title="Cambiar contraseña de este vendedor"
                              className="p-2 rounded-lg bg-[#141824] hover:bg-[#252A3D] text-[#8B8FA8] hover:text-white transition-all cursor-pointer">
                              <Key size={14} />
                            </button>

                            {/* Botón dar de baja */}
                            {!isOwner && (
                              <button
                                onClick={() => handleDeleteVendedor(v)}
                                title="Dar de baja el acceso de este vendedor"
                                className="p-2 rounded-lg bg-[#141824] hover:bg-[#EF444420] text-[#8B8FA8] hover:text-[#EF4444] transition-all cursor-pointer">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Modal para cambiar contraseña */}
      {editingVendedor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in">
          <div className="card w-full max-w-md p-6 border border-[#2A2F45] bg-[#0F1117] shadow-2xl rounded-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2337]">
              <div>
                <h3 className="text-base font-black text-white">Cambiar Contraseña</h3>
                <p className="text-xs text-[#8B8FA8]">Para {editingVendedor.name} ({editingVendedor.email})</p>
              </div>
              <button
                onClick={() => setEditingVendedor(null)}
                className="text-[#8B8FA8] hover:text-white p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
              {changePassError && (
                <div className="p-3 rounded-lg text-xs font-bold bg-[#EF444415] border border-[#EF444430] text-[#EF4444]">
                  {changePassError}
                </div>
              )}

              {changePassSuccess && (
                <div className="p-3 rounded-lg text-xs font-bold bg-[#22C55E15] border border-[#22C55E30] text-[#22C55E]">
                  ¡Contraseña actualizada con éxito!
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-[#A0A5BD] mb-1">Nueva Contraseña</label>
                <input
                  type="text"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="input w-full py-2 px-3 text-sm font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingVendedor(null)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-[#8B8FA8] hover:text-white cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="btn-primary px-5 py-2 text-xs font-black flex items-center gap-1.5 cursor-pointer">
                  {savingPassword ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>{savingPassword ? 'Guardando...' : 'Actualizar Clave'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
