'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Car, Loader2, Eye, EyeOff, Building2, UserPlus, LogIn } from 'lucide-react'

export default function LoginPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    // Al entrar a /login, limpiar cualquier sesión o cookie anterior
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    supabase.auth.signOut().catch(() => {})
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 1. Iniciar sesión vía Server Endpoint (Set-Cookie HTTP seguro)
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const result = await res.json()

      if (!res.ok || result.error) {
        // Fallback directo a cliente Supabase
        const { error: clientErr } = await supabase.auth.signInWithPassword({ email, password })
        if (clientErr) {
          setError(result.error || clientErr.message || 'Credenciales incorrectas.')
          setLoading(false)
          return
        }
      } else {
        // Sincronizar también sesión en cliente
        await supabase.auth.signInWithPassword({ email, password }).catch(() => {})
      }

      // Redirigir al panel principal
      window.location.replace('/stock')
    } catch (err: any) {
      console.error('[Login] Error:', err)
      setError(err?.message || 'Error de conexión con el servidor.')
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    if (!agencyName.trim()) {
      setError('Por favor ingresá el nombre de tu concesionaria o agencia.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          agencyName: agencyName.trim(),
        }),
      })

      const result = await res.json()

      if (!res.ok || !result.success) {
        setError(result.error || 'Error al crear la cuenta.')
        setLoading(false)
        return
      }

      setSuccessMsg('¡Cuenta creada con éxito! Ingresando al panel...')

      // Iniciar sesión inmediatamente
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      await supabase.auth.signInWithPassword({ email, password }).catch(() => {})

      setTimeout(() => {
        window.location.replace('/stock')
      }, 500)
    } catch (err: any) {
      console.error('[Register] Error:', err)
      setError(err?.message || 'Error interno al registrarse.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #FACC1518 0%, #08090E 60%)' }}>

      <div className="w-full max-w-sm animate-in">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #FACC15, #4F46E5)', boxShadow: '0 0 40px #FACC1540' }}>
            <Car size={28} color="#fff" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#E8EAED' }}>AutoApp</h1>
          <p className="text-sm mt-1" style={{ color: '#8B8FA8' }}>Software Integral para Agencias de Autos</p>
        </div>

        {/* Card Principal */}
        <div className="card p-6">
          {/* Selector de Pestañas: Ingresar / Crear Cuenta */}
          <div className="flex bg-[#12141D] p-1 rounded-xl border border-[#2A2F45] mb-5">
            <button
              type="button"
              onClick={() => { setTab('login'); setError(null); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                tab === 'login'
                  ? 'bg-[#FACC15] text-[#0A0B10] shadow-md'
                  : 'text-[#8B8FA8] hover:text-white'
              }`}>
              <LogIn size={14} /> Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => { setTab('register'); setError(null); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                tab === 'register'
                  ? 'bg-[#FACC15] text-[#0A0B10] shadow-md'
                  : 'text-[#8B8FA8] hover:text-white'
              }`}>
              <UserPlus size={14} /> Crear Cuenta
            </button>
          </div>

          {tab === 'login' ? (
            <div>
              <h2 className="text-lg font-semibold mb-1" style={{ color: '#E8EAED' }}>Iniciar sesión</h2>
              <p className="text-xs mb-5" style={{ color: '#8B8FA8' }}>Ingresá a tu panel con tus credenciales</p>

              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#8B8FA8' }}>Email</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="tu@agencia.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#8B8FA8' }}>Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="input pr-10"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: '#555870', cursor: 'pointer', background: 'none', border: 'none' }}>
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg p-3 text-xs"
                    style={{ background: '#EF444415', color: '#EF4444', border: '1px solid #EF444430' }}>
                    {error}
                  </div>
                )}

                <button type="submit" className="btn-primary justify-center w-full mt-1" disabled={loading}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  {loading ? 'Ingresando...' : 'Ingresar'}
                </button>
              </form>

              <p className="text-xs text-center mt-4" style={{ color: '#555870' }}>
                ¿Sos vendedor? Ingresá con los datos otorgados por tu administrador.
              </p>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-semibold mb-1" style={{ color: '#E8EAED' }}>Nueva Concesionaria</h2>
              <p className="text-xs mb-5" style={{ color: '#8B8FA8' }}>Creá tu cuenta de agencia independiente en 1 minuto</p>

              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#8B8FA8' }}>
                    Nombre de la Agencia / Concesionaria
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="input pl-9"
                      placeholder="Ej. Automotores del Norte"
                      value={agencyName}
                      onChange={e => setAgencyName(e.target.value)}
                      required
                    />
                    <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555870]" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#8B8FA8' }}>Email Administrador</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="admin@miagencia.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#8B8FA8' }}>Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="input pr-10"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: '#555870', cursor: 'pointer', background: 'none', border: 'none' }}>
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg p-3 text-xs"
                    style={{ background: '#EF444415', color: '#EF4444', border: '1px solid #EF444430' }}>
                    {error}
                  </div>
                )}

                {successMsg && (
                  <div className="rounded-lg p-3 text-xs"
                    style={{ background: '#10B98115', color: '#10B981', border: '1px solid #10B98130' }}>
                    {successMsg}
                  </div>
                )}

                <button type="submit" className="btn-primary justify-center w-full mt-1" disabled={loading}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  {loading ? 'Registrando cuenta...' : 'Crear mi Cuenta Gratis'}
                </button>
              </form>

              <p className="text-xs text-center mt-4" style={{ color: '#555870' }}>
                Tu cuenta iniciará limpia y podrás cargar tu propio stock y conectar tus redes.
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#555870' }}>
          © {new Date().getFullYear()} AutoApp · Todos los derechos reservados
        </p>
      </div>
    </main>
  )
}
