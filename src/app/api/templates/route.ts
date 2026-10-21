import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { CopyTemplate, DEFAULT_TEMPLATES, GENERIC_TEMPLATES } from '@/lib/services/template-service'
import { getAccountContext } from '@/lib/services/account-context'

export const dynamic = 'force-dynamic'

const STORAGE_BUCKET = 'vehicle-images'

/**
 * GET /api/templates
 * Retorna las plantillas de publicación de la agencia asociada al usuario
 */
export async function GET() {
  try {
    const userClient = await createClient()
    const context = await getAccountContext(userClient)
    const adminSupabase = createAdminClient()

    const configId = context.isOkmAccount
      ? 'CONFIG_PUBLICATION_TEMPLATES'
      : `CONFIG_PUBLICATION_TEMPLATES_${context.agencyId}`

    const storagePath = context.isOkmAccount
      ? 'config/publication_templates.json'
      : `config/templates_${context.agencyId}.json`

    const defaultList = context.isOkmAccount ? DEFAULT_TEMPLATES : GENERIC_TEMPLATES

    // 1. Intentar leer desde la tabla de configuración APP_ENVIOS
    const { data: dbData } = await adminSupabase
      .from('APP_ENVIOS')
      .select('Observaciones')
      .eq('ID', configId)
      .maybeSingle()

    if (dbData?.Observaciones) {
      try {
        const parsed = JSON.parse(dbData.Observaciones) as CopyTemplate[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          return NextResponse.json(
            { success: true, templates: parsed },
            { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
          )
        }
      } catch (e) {
        console.warn('[API Templates] Error parseando Observaciones:', e)
      }
    }

    // 2. Respaldo: intentar leer desde Supabase Storage
    try {
      const { data: fileData } = await adminSupabase.storage
        .from(STORAGE_BUCKET)
        .download(storagePath)

      if (fileData) {
        const text = await fileData.text()
        const parsed = JSON.parse(text) as CopyTemplate[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          return NextResponse.json(
            { success: true, templates: parsed },
            { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
          )
        }
      }
    } catch (e) {}

    // 3. Fallback a plantillas base
    return NextResponse.json(
      { success: true, templates: defaultList },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    )
  } catch (err: any) {
    console.error('[API Templates] GET Error:', err)
    return NextResponse.json(
      { success: false, error: err.message, templates: GENERIC_TEMPLATES },
      { status: 500 }
    )
  }
}

/**
 * POST /api/templates
 * Guarda o actualiza las plantillas en Supabase para la agencia del usuario
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { templates } = body

    if (!templates || !Array.isArray(templates)) {
      return NextResponse.json({ success: false, error: 'Payload de plantillas inválido' }, { status: 400 })
    }

    const userClient = await createClient()
    const context = await getAccountContext(userClient)
    const adminSupabase = createAdminClient()

    const configId = context.isOkmAccount
      ? 'CONFIG_PUBLICATION_TEMPLATES'
      : `CONFIG_PUBLICATION_TEMPLATES_${context.agencyId}`

    const storagePath = context.isOkmAccount
      ? 'config/publication_templates.json'
      : `config/templates_${context.agencyId}.json`

    const jsonString = JSON.stringify(templates)

    // 1. Guardar en APP_ENVIOS
    const { error: upsertErr } = await adminSupabase
      .from('APP_ENVIOS')
      .upsert({
        ID: configId,
        Patente: 'CONFIG',
        Vehiculo: 'TEMPLATES',
        Cliente_Nombre: context.agencyId,
        Observaciones: jsonString
      }, { onConflict: 'ID' })

    if (upsertErr) {
      console.error('[API Templates] Error upserting en APP_ENVIOS:', upsertErr)
    }

    // 2. Respaldo dual en Supabase Storage
    try {
      const blob = new Blob([jsonString], { type: 'application/json' })
      await adminSupabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, blob, { upsert: true })
    } catch (storageErr) {
      console.warn('[API Templates] Error en respaldo de Storage:', storageErr)
    }

    return NextResponse.json({ success: true, count: templates.length, agencyId: context.agencyId })
  } catch (err: any) {
    console.error('[API Templates] POST Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
