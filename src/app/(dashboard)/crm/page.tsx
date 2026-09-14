import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { KanbanBoard } from '@/components/crm/kanban-board'
import { Lead } from '@/lib/supabase/types'
import { Plus } from 'lucide-react'

export default async function CRMPage() {
  const supabase = await createClient()

  const { data: leads } = await supabase
    .from('DB_LEADS')
    .select('*')
    .order('created_at', { ascending: false })

  const allLeads: Lead[] = leads ?? []

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        title="CRM — Gestión de Leads"
        subtitle={`${allLeads.length} leads en total`}
        actions={
          <button className="btn-primary">
            <Plus size={16} /> Nuevo Lead
          </button>
        }
      />
      <div className="flex-1 overflow-hidden">
        <KanbanBoard leads={allLeads} />
      </div>
    </div>
  )
}
