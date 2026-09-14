import { NextResponse } from 'next/server'
import { generateMultichannelCopy } from '@/lib/ai/gemini'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { vehicle } = body || {}

    if (!vehicle || (!vehicle.marca && !vehicle.modelo)) {
      return NextResponse.json(
        { success: false, error: 'Datos de vehículo insuficientes para generar copys.' },
        { status: 400 }
      )
    }

    const copy = await generateMultichannelCopy(vehicle)

    return NextResponse.json({
      success: true,
      copy,
      generatedAt: new Date().toISOString()
    })
  } catch (err: any) {
    console.error('[API AI Generate Copy Error]:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Error al generar copys con IA' },
      { status: 500 }
    )
  }
}
