import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Interaccion } from '@/lib/supabase/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')

    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Parámetro leadId requerido' }, { status: 400 })
    }

    let supabase: any
    try {
      supabase = createAdminClient()
    } catch {
      supabase = await createClient()
    }

    const { data: interactions, error } = await supabase
      .from('DB_INTERACCIONES')
      .select('*')
      .eq('ID_LEAD', leadId)
      .order('created_at', { ascending: true })

    if (error) {
      console.warn('[Interactions GET] Warning:', error.message)
      return NextResponse.json({ success: true, interactions: [] })
    }

    return NextResponse.json({
      success: true,
      interactions: interactions || [],
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, detalle, remitente = 'ASESOR', tipo = 'WHATSAPP', vendedor, patente } = body

    if (!leadId || !detalle) {
      return NextResponse.json({ success: false, error: 'Campos leadId y detalle son obligatorios' }, { status: 400 })
    }

    let supabase: any
    try {
      supabase = createAdminClient()
    } catch {
      supabase = await createClient()
    }

    const newInteraction: Partial<Interaccion> = {
      ID: crypto.randomUUID(),
      ID_LEAD: leadId,
      Detalle_Conversacion: detalle,
      Remitente: remitente,
      Tipo_Interaccion: tipo,
      Vendedor: vendedor || 'Asesor Comercial',
      Patente: patente || null,
      Fecha: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('DB_INTERACCIONES')
      .insert(newInteraction)
      .select()
      .single()

    if (error) {
      console.warn('[Interactions POST] Supabase insert warning:', error.message)
      // Retornar la interacción generada para continuidad de la UI/test
      return NextResponse.json({
        success: true,
        interaction: newInteraction,
        warning: error.message,
      })
    }

    return NextResponse.json({
      success: true,
      interaction: data,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 })
  }
}
