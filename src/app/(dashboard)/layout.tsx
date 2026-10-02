import { Sidebar } from '@/components/layout/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#08090E]" suppressHydrationWarning>
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden" style={{ marginLeft: '64px' }}>
        {children}
      </main>
    </div>
  )
}
