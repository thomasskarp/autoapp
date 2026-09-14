'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Car, Users, Megaphone, BarChart3,
  Settings, LogOut, Zap
} from 'lucide-react'

import { useInfoPrice } from '@/context/info-price-context'

const navItems = [
  { href: '/',              icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/stock',         icon: Car,             label: 'Stock' },
  { href: '/crm',           icon: Users,           label: 'CRM Leads' },
  { href: '/publicaciones', icon: Megaphone,       label: 'Publicaciones' },
  { href: '/reportes',      icon: BarChart3,       label: 'Reportes' },
]

import { useState, useEffect } from 'react'

export function Sidebar() {
  const pathname = usePathname()
  const { showInfoPrice, toggleInfoPrice } = useInfoPrice()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  // To prevent hydration error, render a placeholder with same layout before mount
  const isInfoActive = mounted ? showInfoPrice : false;

  return (
    <aside
      suppressHydrationWarning
      className="fixed left-0 top-0 h-full z-50 flex flex-col items-center py-4 gap-1"
      style={{
        width: '64px',
        background: '#0D0F16',
        borderRight: '1px solid #1F2337',
      }}>

      {/* Interruptor de Precio Info (Botón Rayo Amarillo) */}
      <button
        onClick={toggleInfoPrice}
        title={isInfoActive ? "Precio Info: ACTIVADO (Haz clic para ocultar)" : "Precio Info: DESACTIVADO (Haz clic para mostrar)"}
        className="mb-4 flex items-center justify-center w-10 h-10 rounded-xl transition-all hover:scale-105 active:scale-95 group relative"
        style={{
          background: isInfoActive ? 'linear-gradient(135deg, #FACC15, #EAB308)' : '#1A1D28',
          border: isInfoActive ? 'none' : '1px solid #2A2F45',
          boxShadow: isInfoActive ? '0 0 20px #FACC1540' : 'none',
          cursor: 'pointer'
        }}>
        <Zap size={18} fill={isInfoActive ? '#000000' : 'none'} color={isInfoActive ? '#000000' : '#A0A5BD'} />
        
        {/* Tooltip */}
        <span className="absolute left-full ml-3 px-2.5 py-1 rounded text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl"
          style={{ background: '#1A1D28', color: isInfoActive ? '#FACC15' : '#9CA3AF', border: '1px solid #2A2F45' }}>
          {isInfoActive ? '⚡ Precio Info: MOSTRANDO' : '👁️ Precio Info: OCULTO'}
        </span>
      </button>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1 w-full px-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              title={label}
              prefetch={true}
              className="group relative flex items-center justify-center w-full h-10 rounded-lg transition-all duration-200"
              style={{
                background: isActive ? '#FACC1520' : 'transparent',
                color: isActive ? '#FACC15' : '#555870',
              }}>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r"
                  style={{ background: '#FACC15' }} />
              )}
              <Icon size={20} />
              {/* Tooltip */}
              <span className="absolute left-full ml-2 px-2 py-1 rounded text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
                style={{ background: '#1A1D28', color: '#E8EAED', border: '1px solid #2A2F45' }}>
                {label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="flex flex-col gap-1 w-full px-2">
        <Link href="/configuracion" title="Configuración" prefetch={true}
          className="group relative flex items-center justify-center w-full h-10 rounded-lg transition-all"
          style={{ color: '#555870' }}>
          <Settings size={20} />
          <span className="absolute left-full ml-2 px-2 py-1 rounded text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
            style={{ background: '#1A1D28', color: '#E8EAED', border: '1px solid #2A2F45' }}>
            Configuración
          </span>
        </Link>

        <button onClick={handleLogout} title="Cerrar sesión"
          className="group relative flex items-center justify-center w-full h-10 rounded-lg transition-all"
          style={{ color: '#555870', background: 'none', border: 'none', cursor: 'pointer' }}>
          <LogOut size={18} />
          <span className="absolute left-full ml-2 px-2 py-1 rounded text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
            style={{ background: '#1A1D28', color: '#EF4444', border: '1px solid #2A2F45' }}>
            Cerrar sesión
          </span>
        </button>
      </div>
    </aside>
  )
}
