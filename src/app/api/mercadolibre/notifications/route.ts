import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log('[MercadoLibre Webhook Notification]:', JSON.stringify(body))
    // MercadoLibre requires HTTP 200 OK fast response to confirm receipt
    return NextResponse.json({ status: 'received' }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ status: 'ok' }, { status: 200 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Webhook listening' }, { status: 200 })
}
