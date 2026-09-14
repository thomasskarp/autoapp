import { NextResponse } from 'next/server'
import { smartAppraisalMatch } from '@/lib/ai/gemini'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { query, declaredPrice } = body || {}

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json(
        { success: false, error: 'Debe ingresar una descripción o modelo para realizar la tasación.' },
        { status: 400 }
      )
    }

    const appraisal = await smartAppraisalMatch(query.trim(), declaredPrice)

    return NextResponse.json({
      success: true,
      appraisal,
      calculatedAt: new Date().toISOString()
    })
  } catch (err: any) {
    console.error('[API AI Smart Appraisal Error]:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Error al calcular tasación inteligente' },
      { status: 500 }
    )
  }
}
