import { NextRequest, NextResponse } from 'next/server'
import { removeBackground } from '@imgly/background-removal-node'
// In-memory cache to avoid re-processing identical images
const cutoutCache = new Map<string, string>()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { imageUrl, imageBase64 } = body

    const cacheKey = imageUrl || (imageBase64 ? imageBase64.substring(0, 100) + imageBase64.length : null)
    if (cacheKey && cutoutCache.has(cacheKey)) {
      return NextResponse.json({
        success: true,
        cutoutUrl: cutoutCache.get(cacheKey)
      })
    }

    let inputBuffer: Buffer | null = null

    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')
      inputBuffer = Buffer.from(cleanBase64, 'base64')
    } else if (imageUrl) {
      const res = await fetch(imageUrl)
      if (!res.ok) {
        return NextResponse.json({ error: `Failed to fetch image: ${res.statusText}` }, { status: 400 })
      }
      const arrayBuffer = await res.arrayBuffer()
      inputBuffer = Buffer.from(arrayBuffer)
    }

    if (!inputBuffer) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const blob = new Blob([new Uint8Array(inputBuffer)], { type: 'image/png' })
    const resultBlob = await removeBackground(blob)
    const arrayBuffer = await resultBlob.arrayBuffer()
    const resultBuffer = Buffer.from(arrayBuffer)

    // Return transparent PNG base64
    const base64 = `data:image/png;base64,${resultBuffer.toString('base64')}`

    if (cacheKey) {
      cutoutCache.set(cacheKey, base64)
    }

    return NextResponse.json({
      success: true,
      cutoutUrl: base64
    })
  } catch (error: any) {
    console.error('Error removing background:', error)
    return NextResponse.json({ error: error.message || 'Error processing cutout' }, { status: 500 })
  }
}
