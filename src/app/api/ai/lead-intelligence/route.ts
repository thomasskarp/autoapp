import { NextRequest, NextResponse } from 'next/server'
import { generateLeadIntelligence } from '@/lib/ai/gemini'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Lead, Interaccion } from '@/lib/supabase/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, persist = true } = body

    let leadData: Partial<Lead> = body.lead || {}
    let interactionsData: Interaccion[] = body.interactions || []

    let supabase: any
    try {
      supabase = createAdminClient()
    } catch {
      supabase = await createClient()
    }

    // Si se pasa leadId, consultamos el estado actual y sus interacciones de la base de datos
    if (leadId) {
      const { data: dbLead, error: leadError } = await supabase
        .from('DB_LEADS')
        .select('*')
        .eq('ID', leadId)
        .single()

      if (!leadError && dbLead) {
        leadData = { ...dbLead, ...leadData }
      }

      // Buscar interacciones asociadas al ID_LEAD o al Teléfono
      const { data: dbInteractions } = await supabase
        .from('DB_INTERACCIONES')
        .select('*')
        .or(`ID_LEAD.eq.${leadId}${leadData.Telefono ? `,Detalle_Conversacion.ilike.%${leadData.Telefono}%` : ''}`)
        .order('created_at', { ascending: true })

      if (dbInteractions && dbInteractions.length > 0) {
        interactionsData = dbInteractions
      }
    }

    // Ejecutar análisis y recomendación comercial con IA
    const intelligence = await generateLeadIntelligence({
      lead: {
        Nombre_Cliente: leadData.Nombre_Cliente,
        Telefono: leadData.Telefono,
        Auto_Interes: leadData.Auto_Interes,
        Notas: leadData.Notas,
        Etapa: leadData.Etapa,
        Presupuesto: leadData.Presupuesto,
      },
      interactions: interactionsData.map(i => ({
        Tipo_Interaccion: i.Tipo_Interaccion,
        Remitente: i.Remitente,
        Detalle_Conversacion: i.Detalle_Conversacion,
        Fecha: i.Fecha,
        created_at: i.created_at,
      })),
    })

    // Si persist es true y tenemos leadId, actualizar en DB_LEADS para que Realtime notifique al Kanban
    if (persist && leadId) {
      await supabase
        .from('DB_LEADS')
        .update({
          Temperatura: intelligence.temperatura,
          Next_Best_Action: intelligence.next_best_action,
          AI_Summary: intelligence.ai_summary,
          updated_at: new Date().toISOString(),
        })
        .eq('ID', leadId)
    }

    return NextResponse.json({
      success: true,
      intelligence,
    })
  } catch (error: any) {
    console.error('[API /api/ai/lead-intelligence] Error procesando análisis:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Error interno evaluando inteligencia del lead',
      },
      { status: 500 }
    )
  }
}
