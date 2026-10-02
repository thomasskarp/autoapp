import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { customerName, messageHistory = [], lastMessage, vehicleContext } = body

    if (!lastMessage && messageHistory.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Se requiere al menos un mensaje del cliente'
      }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        success: true,
        suggestion: `¡Hola ${customerName || ''}! Sí, lo tenemos disponible para entrega inmediata. ¿Te gustaría coordinar una visita a la agencia o que te pasemos la ficha técnica completa por WhatsApp?`
      })
    }

    const formattedHistory = messageHistory
      .slice(-6)
      .map((m: any) => `${m.isFromAgency ? 'Agencia' : (m.fromName || 'Cliente')}: "${m.text}"`)
      .join('\n')

    const prompt = `Sos el asesor de ventas automotor estrella de la concesionaria oficial SK automotores / @okmmotors en Argentina.
Estás respondiendo un mensaje directo (DM de Instagram o Facebook Messenger) a un cliente interesado en comprar un vehículo.

Datos del cliente: ${customerName || 'Cliente interesado'}
${vehicleContext ? `Vehículo consultado: "${vehicleContext}"` : ''}

Historial reciente de la conversación:
${formattedHistory || `Cliente: "${lastMessage}"`}

Último mensaje recibido del cliente:
"${lastMessage}"

Instrucciones para redactar la respuesta:
1. Tono cercano, profesional, persuasivo y cálido (usá voseo argentino: "Hola", "podés", "tenemos", "te invitamos", etc.).
2. Longitud concisa: 2 a 4 oraciones como máximo.
3. Si pregunta por precio o financiación: aclará que tenemos financiación con entrega mínima (anticipo desde 50% y cuotas fijas) y tomamos usados como parte de pago al mejor valor de plaza.
4. Incluí siempre una llamada a la acción clara para dar el siguiente paso (por ejemplo: "¿Te gustaría pasar por la agencia a verlo o preferís que te pasemos fotos y ficha por WhatsApp?").
5. Devolvé ÚNICAMENTE el texto de la respuesta, sin comillas ni encabezados.`

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 250
        }
      })
    })

    const data = await res.json()
    const suggestion = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

    return NextResponse.json({
      success: true,
      suggestion: suggestion || `¡Hola! Sí, está disponible con entrega inmediata. Podés retirar con entrega mínima y financiar el resto en cuotas fijas. ¿Querés que coordinemos para que lo veas hoy?`
    })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 })
  }
}
