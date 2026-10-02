import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import fs from 'fs'
import path from 'path'
import os from 'os'

// Transcode video to Meta Graph API compliant MP4 (H.264 + AAC + faststart)
async function transcodeToMetaMP4(inputBuffer: Buffer): Promise<Buffer> {
  let ffmpegPath: string | null = null
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('ffmpeg-static')
    ffmpegPath = (mod && mod.default) ? mod.default : mod
  } catch (e) {
    console.warn('[upload-video] ffmpeg-static no disponible:', e)
  }

  if (!ffmpegPath) {
    console.warn('[upload-video] Binario de ffmpeg no configurado, usando buffer original')
    return inputBuffer
  }

  const timestamp = Date.now()
  const tmpIn = path.join(os.tmpdir(), `autoapp_in_${timestamp}.webm`)
  const tmpOut = path.join(os.tmpdir(), `autoapp_out_${timestamp}.mp4`)

  try {
    fs.writeFileSync(tmpIn, inputBuffer)

    return await new Promise<Buffer>((resolve) => {
      // H.264 High Profile 1080p Ultra-HD (CRF 15 visually lossless + 192k AAC)
      const args = [
        '-y',
        '-i', tmpIn,
        '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
        '-c:v', 'libx264',
        '-profile:v', 'high',
        '-level:v', '4.2',
        '-pix_fmt', 'yuv420p',
        '-preset', 'medium',
        '-crf', '15',
        '-maxrate', '22M',
        '-bufsize', '44M',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        '-movflags', '+faststart',
        tmpOut
      ]

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { execFile } = require('child_process')
      execFile(/*turbopackIgnore: true*/ ffmpegPath, args, { timeout: 45000 }, (err: any) => {
        if (err) {
          console.error('[upload-video] Error en transcodificación ffmpeg:', err)
          try { if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn) } catch (e) {}
          try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut) } catch (e) {}
          return resolve(inputBuffer) // Fallback al original
        }

        try {
          const outBuffer = fs.readFileSync(tmpOut)
          try { if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn) } catch (e) {}
          try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut) } catch (e) {}
          console.log(`[upload-video] Video transcodificado exitosamente a MP4 (${outBuffer.length} bytes)`)
          resolve(outBuffer)
        } catch (readErr) {
          resolve(inputBuffer)
        }
      })
    })
  } catch (err) {
    console.error('[upload-video] Excepción en proceso ffmpeg:', err)
    return inputBuffer
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'reels'
    const vehicleId = (formData.get('vehicleId') as string) || 'vehicle'

    if (!file) {
      return NextResponse.json({ success: false, error: 'No se envió ningún archivo de video o imagen' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const rawBuffer = Buffer.from(await file.arrayBuffer())

    const isImage = file.type.includes('image') || file.type.includes('png') || file.type.includes('jpeg') || file.type.includes('jpg')
    let finalBuffer: Buffer = rawBuffer
    let extension = 'mp4'
    let contentType = 'video/mp4'

    if (isImage) {
      extension = file.type.includes('png') ? 'png' : 'jpg'
      contentType = file.type || 'image/jpeg'
    } else {
      // Transcodificar a MP4 estricto para Meta Graph API
      finalBuffer = await transcodeToMetaMP4(rawBuffer)
      extension = 'mp4'
      contentType = 'video/mp4'
    }

    const fileName = `${folder}/${vehicleId}_${Date.now()}.${extension}`

    const { error } = await supabase.storage
      .from('vehicle-images')
      .upload(fileName, finalBuffer as any, {
        contentType,
        upsert: true
      })

    if (error) {
      return NextResponse.json({ success: false, error: `Error en Supabase Storage: ${error.message}` }, { status: 500 })
    }

    const { data: publicData } = supabase.storage
      .from('vehicle-images')
      .getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      publicUrl: publicData.publicUrl,
      fileName
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
