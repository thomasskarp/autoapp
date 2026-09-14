'use client'

import { Bell, ChevronDown, Building2 } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
  agencyName?: string
  userEmail?: string
  actions?: React.ReactNode
}

export function Header({ title, subtitle, agencyName, actions }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4"
      style={{ borderBottom: '1px solid #1F2337', background: '#0F1117' }}>

      {/* Left: Title + Reserved Agency Name Slot */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: '#FFFFFF' }}>{title}</h1>
        {agencyName ? (
          <span className="text-xs sm:text-sm font-extrabold px-3 py-1 rounded-lg bg-[#1A1D28] border border-[#2A2F45] text-[#FACC15] tracking-wide">
            {agencyName}
          </span>
        ) : (
          /* Reserved slot for agency name configured with login & permissions */
          <span id="agency-name-badge" className="hidden text-xs sm:text-sm font-extrabold px-3 py-1 rounded-lg bg-[#1A1D28] border border-[#2A2F45] text-[#FACC15] tracking-wide" />
        )}
        {subtitle && <span className="text-xs sm:text-sm font-semibold text-[#9CA3AF]">{subtitle}</span>}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {actions}
      </div>
    </header>
  )
}
