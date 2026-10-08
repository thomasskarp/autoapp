'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/client'
import {
  Users, UserPlus, Key, Mail, Trash2, Eye, EyeOff,
  CheckCircle2, AlertCircle, Loader2, Sparkles, Copy, Check, RefreshCw,
  Puzzle, ExternalLink
} from 'lucide-react'

interface Vendedor {
  id: string
  email: string
  name: string
  role: 'admin' | 'vendedor'
  createdAt: string
  lastSignIn?: string | null
}

export default function ConfiguracionPage() {
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'vendedor' | null>(null)
  const [checkingRole, setCheckingRole] = useState(true)

  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [loadingList, setLoadingList] = useState(true)

  // Formulario de nuevo vendedor / admin
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [selectedRole, setSelectedRole] = useState<'vendedor' | 'admin'>('vendedor')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // Actualización de rol en tabla
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null)

  // Copiado al portapapeles
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Modal para cambiar contraseña
  const [editingVendedor, setEditingVendedor] = useState<Vendedor | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [changePassError, setChangePassError] = useState<string | null>(null)
  const [changePassSuccess, setChangePassSuccess] = useState(false)

  // Helper para obtener headers de autenticación
  const getAuthHeaders = async (includeContentType = true): Promise<Record<string, string>> => {
    const headers: Record<string, string> = includeContentType ? { 'Content-Type': 'application/json' } : {}
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
    } catch {}
    return headers
  }

  const checkUserRoleAndInit = async () => {
    try {
      setCheckingRole(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const rawRole = user.user_metadata?.role?.toLowerCase()
        const isAdmin = user.email === 'okmmotorschaco@gmail.com' || user.email === 'tomas.skarp@gmail.com' || rawRole === 'admin' || rawRole === 'administrador'
        const role: 'admin' | 'vendedor' = isAdmin ? 'admin' : 'vendedor'
        setCurrentUserRole(role)
        if (role === 'admin') {
          fetchVendedores()
        }
      } else {
        setCurrentUserRole('vendedor')
      }
    } catch (err) {
      console.error('Error verificando rol:', err)
      setCurrentUserRole('vendedor')
    } finally {
      setCheckingRole(false)
    }
  }

  useEffect(() => {
    checkUserRoleAndInit()
  }, [])

  const fetchVendedores = async () => {
    try {
      setLoadingList(true)
      const headers = await getAuthHeaders(false)
      const res = await fetch('/api/vendedores', { headers })
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
      const headers = await getAuthHeaders(true)
      const res = await fetch('/api/vendedores', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, password, name, role: selectedRole }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setFormError(data.error || 'Ocurrió un error al crear el usuario.')
        return
      }

      setFormSuccess(`¡${selectedRole === 'admin' ? 'Administrador' : 'Vendedor'} ${email} creado exitosamente!`)
      setEmail('')
      setPassword('')
      setName('')
      setSelectedRole('vendedor')
      fetchVendedores()
      setTimeout(() => setFormSuccess(null), 5000)
    } catch (err: any) {
      setFormError(err.message || 'Error de conexión al crear usuario.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateRole = async (vendedor: Vendedor, newRole: 'vendedor' | 'admin') => {
    if (vendedor.role === newRole) return
    if (vendedor.email === 'tomas.skarp@gmail.com') return

    try {
      setUpdatingRoleId(vendedor.id)
      const headers = await getAuthHeaders(true)
      const res = await fetch('/api/vendedores', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ id: vendedor.id, role: newRole }),
      })

      const data = await res.json()
      if (data.success) {
        setVendedores(prev => prev.map(v => v.id === vendedor.id ? { ...v, role: newRole } : v))
      } else {
        alert(data.error || 'Error al actualizar rol.')
      }
    } catch (err: any) {
      alert('Error de conexión: ' + err.message)
    } finally {
      setUpdatingRoleId(null)
    }
  }

  const handleDeleteVendedor = async (vendedor: Vendedor) => {
    if (vendedor.email === 'tomas.skarp@gmail.com' || vendedor.email === 'okmmotorschaco@gmail.com') {
      alert('La cuenta del administrador principal no puede ser eliminada.')
      return
    }

    const confirmMsg = `¿Eliminar el acceso a ${vendedor.name} (${vendedor.email})? Ya no podrá ingresar a AutoApp.`
    if (!confirm(confirmMsg)) return

    try {
      const headers = await getAuthHeaders(false)
      const res = await fetch(`/api/vendedores?id=${vendedor.id}`, { method: 'DELETE', headers })
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
      const headers = await getAuthHeaders(true)
      const res = await fetch('/api/vendedores', {
        method: 'PATCH',
        headers,
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

  if (checkingRole) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <Header title="Configuración" />
        <div className="p-12 flex flex-col items-center justify-center gap-2 text-[#8B8FA8]">
          <Loader2 size={24} className="animate-spin text-[#FACC15]" />
        </div>
      </div>
    )
  }

  const isAdmin = currentUserRole === 'admin'

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Header title="Configuración" />

      <div className="p-6 max-w-5xl mx-auto w-full flex flex-col gap-6 animate-in">

        {/* Solo ADMIN puede ver y agregar nuevos vendedores o roles */}
        {isAdmin && (
          <>
            {/* Formulario Principal: AGREGAR NUEVO VENDEDOR / ADMIN */}
            <div className="card p-6 border border-[#1F2337] bg-[#13161F]">
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#1F2337]">
                <div className="w-9 h-9 rounded-lg bg-[#FACC1515] border border-[#FACC1530] flex items-center justify-center text-[#FACC15]">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white">Agregar Nuevo Vendedor</h2>
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
                  {/* Cuadro 1: Correo */}
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

                  {/* Cuadro 2: Contraseña */}
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

                  {/* Cuadro 3: Nombre */}
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

                <div className="flex items-center justify-between pt-2">
                  {/* Selector minimalista de roles con botones */}
                  <div className="inline-flex items-center gap-1 bg-[#0F1117] p-1 rounded-xl border border-[#2A2F45]">
                    <button
                      type="button"
                      onClick={() => setSelectedRole('vendedor')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        selectedRole === 'vendedor'
                          ? 'bg-[#3B82F6] text-white shadow'
                          : 'text-[#8B8FA8] hover:text-white'
                      }`}>
                      Vendedor
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole('admin')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        selectedRole === 'admin'
                          ? 'bg-[#FACC15] text-[#0F1117] shadow'
                          : 'text-[#8B8FA8] hover:text-white'
                      }`}>
                      Admin
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary px-6 py-2.5 text-sm font-black flex items-center gap-2 cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-all">
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Creando...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={16} />
                        <span>Dar de Alta</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Lista de Vendedores y Equipo */}
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
                  <p className="text-xs font-bold">Cargando equipo...</p>
                </div>
              ) : vendedores.length === 0 ? (
                <div className="py-10 text-center text-sm font-semibold text-[#8B8FA8]">
                  No hay miembros registrados todavía. Usa el formulario de arriba para agregar uno.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[#1F2337] text-[11px] font-black uppercase text-[#8B8FA8] tracking-wider">
                        <th className="py-3 px-4">Miembro</th>
                        <th className="py-3 px-4">Correo</th>
                        <th className="py-3 px-4">Rol</th>
                        <th className="py-3 px-4">Alta</th>
                        <th className="py-3 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F2337]/60">
                      {vendedores.map(v => {
                        const isOwner = v.email === 'tomas.skarp@gmail.com' || v.email === 'okmmotorschaco@gmail.com'
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
                              {isOwner ? (
                                <span className="text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider border bg-[#FACC1515] text-[#FACC15] border-[#FACC1540]">
                                  Admin
                                </span>
                              ) : (
                                <div className="inline-flex items-center gap-0.5 bg-[#0F1117] p-0.5 rounded-lg border border-[#2A2F45]">
                                  <button
                                    type="button"
                                    disabled={updatingRoleId === v.id}
                                    onClick={() => handleUpdateRole(v, 'vendedor')}
                                    className={`px-2 py-1 rounded text-[11px] font-black transition-all cursor-pointer ${
                                      v.role === 'vendedor'
                                        ? 'bg-[#3B82F6] text-white shadow'
                                        : 'text-[#8B8FA8] hover:text-white'
                                    }`}>
                                    Vendedor
                                  </button>
                                  <button
                                    type="button"
                                    disabled={updatingRoleId === v.id}
                                    onClick={() => handleUpdateRole(v, 'admin')}
                                    className={`px-2 py-1 rounded text-[11px] font-black transition-all cursor-pointer ${
                                      v.role === 'admin'
                                        ? 'bg-[#FACC15] text-[#0F1117] shadow'
                                        : 'text-[#8B8FA8] hover:text-white'
                                    }`}>
                                    Admin
                                  </button>
                                </div>
                              )}
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
                                  title="Cambiar contraseña de este usuario"
                                  className="p-2 rounded-lg bg-[#141824] hover:bg-[#252A3D] text-[#8B8FA8] hover:text-white transition-all cursor-pointer">
                                  <Key size={14} />
                                </button>

                                {/* Botón dar de baja */}
                                {!isOwner && (
                                  <button
                                    onClick={() => handleDeleteVendedor(v)}
                                    title="Dar de baja el acceso de este usuario"
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
          </>
        )}

        {/* Automatización de Publicaciones (Visible para TODOS: Vendedor y Admin) */}
        <div className="card p-6 border border-[#1F2337] bg-[#13161F] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FACC1515] border border-[#FACC1530] flex items-center justify-center text-[#FACC15] shrink-0">
              <Puzzle size={20} />
            </div>
            <h3 className="text-base font-black text-white">Automatización de Publicaciones</h3>
          </div>

          <a
            href="https://chromewebstore.google.com/detail/dev-auto-cyborg-360/kjfjedgjkehndonpbgkffilaidcdpjob?hl=es"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary px-5 py-2.5 text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer">
            <ExternalLink size={16} />
            <span>Instalar automatización de publicaciones</span>
          </a>
        </div>

      </div>

      {/* Modal para cambiar contraseña */}
      {isAdmin && editingVendedor && (
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
