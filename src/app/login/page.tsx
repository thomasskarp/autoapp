'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Car, Loader2, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Credenciales incorrectas. Verificá tu email y contraseña.')
      setLoading(false)
    } else {
      window.location.href = '/'
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #FACC1518 0%, #08090E 60%)' }}>

      <div className="w-full max-w-sm animate-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #FACC15, #4F46E5)', boxShadow: '0 0 40px #FACC1540' }}>
            <Car size={28} color="#fff" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#E8EAED' }}>AutoApp</h1>
          <p className="text-sm mt-1" style={{ color: '#8B8FA8' }}>Software para Agencias de Autos</p>
        </div>

        {/* Card */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-1" style={{ color: '#E8EAED' }}>Iniciar sesión</h2>
          <p className="text-sm mb-6" style={{ color: '#8B8FA8' }}>Ingresá a tu panel de gestión</p>

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
              <div className="rounded-lg p-3 text-sm"
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
            ¿No tenés cuenta? Contactá al administrador de tu agencia.
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#555870' }}>
          © {new Date().getFullYear()} AutoApp · Todos los derechos reservados
        </p>
      </div>
    </main>
  )
}
