import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { CopyTemplate, DEFAULT_TEMPLATES } from '@/lib/services/template-service'

export const dynamic = 'force-dynamic'

const CONFIG_ID = 'CONFIG_PUBLICATION_TEMPLATES'
const STORAGE_BUCKET = 'vehicle-images'
const STORAGE_PATH = 'config/publication_templates.json'

/**
 * GET /api/templates
 * Retorna todas las plantillas de publicación de la agencia sincronizadas en la nube (Supabase)
 */
export async function GET() {
  try {
    const supabase = createAdminClient()

    // 1. Intentar leer desde la tabla de configuración APP_ENVIOS
    const { data: dbData, error: dbErr } = await supabase
      .from('APP_ENVIOS')
      .select('Observaciones')
      .eq('ID', CONFIG_ID)
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
      const { data: fileData, error: storageErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(STORAGE_PATH)

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
    } catch (e) {
      // Ignorar si no existe el archivo aún
    }

    // Si aún no hay guardadas en la nube, devolver plantillas oficiales predeterminadas
    return NextResponse.json(
      { success: true, templates: DEFAULT_TEMPLATES },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    )
  } catch (err: any) {
    console.error('[API Templates] GET Error:', err)
    return NextResponse.json(
      { success: false, error: err.message, templates: DEFAULT_TEMPLATES },
      { status: 500 }
    )
  }
}

/**
 * POST /api/templates
 * Guarda o actualiza las plantillas en Supabase para que estén disponibles para todos los vendedores
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { templates } = body

    if (!templates || !Array.isArray(templates)) {
      return NextResponse.json({ success: false, error: 'Payload de plantillas inválido' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const jsonString = JSON.stringify(templates)

    // 1. Guardar en APP_ENVIOS
    const { error: upsertErr } = await supabase
      .from('APP_ENVIOS')
      .upsert({
        ID: CONFIG_ID,
        Patente: 'CONFIG',
        Vehiculo: 'TEMPLATES',
        Cliente_Nombre: 'ADMIN_TEMPLATES',
        Observaciones: jsonString
      })

    if (upsertErr) {
      console.error('[API Templates] Error upserting en APP_ENVIOS:', upsertErr)
    }

    // 2. Respaldo dual en Supabase Storage
    try {
      const blob = new Blob([jsonString], { type: 'application/json' })
      const { error: uploadErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(STORAGE_PATH, blob, {
          contentType: 'application/json',
          upsert: true
        })

      if (uploadErr) {
        console.warn('[API Templates] Storage backup notice:', uploadErr.message)
      }
    } catch (storageException) {
      console.warn('[API Templates] Exception en storage backup:', storageException)
    }

    return NextResponse.json({
      success: true,
      count: templates.length,
      syncedAt: new Date().toISOString()
    })
  } catch (err: any) {
    console.error('[API Templates] POST Error:', err)
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    )
  }
}
