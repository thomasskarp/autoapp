import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    // Support both 'files' array and single 'file' or multiple entries
    const rawFiles = [
      ...formData.getAll('files'),
      ...formData.getAll('file'),
    ] as File[]

    const validFiles = rawFiles.filter(f => f && typeof f === 'object' && f.size > 0)

    if (validFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se enviaron imágenes para subir.' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const uploadedUrls: string[] = []

    for (const file of validFiles) {
      const buffer = Buffer.from(await file.arrayBuffer())
      
      let extension = 'jpg'
      const mime = (file.type || '').toLowerCase()
      if (mime.includes('png')) extension = 'png'
      else if (mime.includes('webp')) extension = 'webp'
      else if (mime.includes('gif')) extension = 'gif'
      else if (mime.includes('svg')) extension = 'svg'
      else if (file.name && file.name.includes('.')) {
        const ext = file.name.split('.').pop()?.toLowerCase()
        if (ext && /^[a-z0-9]+$/i.test(ext)) extension = ext
      }

      const contentType = file.type || `image/${extension}`
      const fileName = `vehicles/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from('vehicle-images')
        .upload(fileName, buffer, {
          contentType,
          upsert: true,
        })

      if (uploadError) {
        console.error('[upload-photos] Error subiendo imagen:', uploadError)
        return NextResponse.json(
          { success: false, error: `Error en almacenamiento: ${uploadError.message}` },
          { status: 500 }
        )
      }

      const { data: publicData } = supabase.storage
        .from('vehicle-images')
        .getPublicUrl(fileName)

      if (publicData?.publicUrl) {
        uploadedUrls.push(publicData.publicUrl)
      }
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
    })
  } catch (err: any) {
    console.error('[upload-photos] Excepción:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Error inesperado al subir imágenes' },
      { status: 500 }
    )
  }
}
