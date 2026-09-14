import { NextResponse } from 'next/server'
import { processAssistantMessage } from '@/lib/ai/assistant-agent'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId = 'default_user', message, photoUrls = [] } = body || {}

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ success: false, error: 'Mensaje requerido' }, { status: 400 })
    }

    const result = await processAssistantMessage({
      userId,
      message,
      photoUrls
    })

    return NextResponse.json({
      success: true,
      ...result
    })
  } catch (err: any) {
    console.error('[Assistant API Error]:', err)
    return NextResponse.json({ success: false, error: err.message || 'Error en el asistente' }, { status: 500 })
  }
}
