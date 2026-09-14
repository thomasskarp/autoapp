async function runPhase3AITests() {
  console.log('🧠 Iniciando Verificación de Fase 3: Módulo de IA Automotriz con Gemini SDK...\n')

  // 1. Test Multichannel Copy Generator
  console.log('1️⃣ Probando Endpoint /api/ai/generate-copy...')
  const testVehicle = {
    marca: 'Volkswagen',
    modelo: 'Amarok V6 Extreme',
    version: '4x4 Automática',
    anio: 2023,
    km: 35000,
    precio_venta: 38500000,
    precio_entrega: 18000000,
    combustible: 'Diésel',
    transmision: 'Automática',
    estado: 'DISPONIBLE',
    descripcion: 'Único dueño, service oficial al día, cubiertas Michelin nuevas, enganche Bracco.'
  }

  try {
    const copyRes = await fetch('http://localhost:3000/api/ai/generate-copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicle: testVehicle })
    })

    const copyData = await copyRes.json()
    if (copyRes.ok && copyData.success && copyData.copy) {
      console.log('✅ Generación de Copys Multicanal Exitosa:')
      console.log('   📸 Instagram Hook:', copyData.copy.instagram.hook)
      console.log('   📸 Instagram Hashtags:', copyData.copy.instagram.hashtags.slice(0, 4).join(' '))
      console.log('   🛒 Facebook Title:', copyData.copy.facebook.title)
      console.log('   🟡 MercadoLibre Title:', copyData.copy.mercadolibre.title)
      console.log('   💬 WhatsApp Pitch:', copyData.copy.whatsapp.chat_pitch.slice(0, 100) + '...')
    } else {
      console.error('❌ Falló la generación de copy:', copyData)
    }
  } catch (err) {
    console.error('❌ Excepción al probar /api/ai/generate-copy:', err.message)
  }

  // 2. Test Smart Appraisal
  console.log('\n2️⃣ Probando Endpoint /api/ai/smart-appraisal...')
  try {
    const appraisalRes = await fetch('http://localhost:3000/api/ai/smart-appraisal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Toyota Hilux SRV 4x4 2022 con 60000 km',
        declaredPrice: 34000000
      })
    })

    const appraisalData = await appraisalRes.json()
    if (appraisalRes.ok && appraisalData.success && appraisalData.appraisal) {
      const a = appraisalData.appraisal
      console.log('✅ Tasación Inteligente y Matching Semántico Exitoso:')
      console.log(`   🚘 Unidad Identificada: ${a.matched_brand} ${a.matched_model} ${a.matched_version} (${a.year})`)
      console.log(`   📋 Precio de Tabla InfoAuto: $${Number(a.estimated_table_price).toLocaleString('es-AR')}`)
      console.log(`   💰 Precio Venta Sugerido: $${Number(a.suggested_sale_price).toLocaleString('es-AR')}`)
      console.log(`   🤝 Precio Toma / Compra: $${Number(a.suggested_purchase_price).toLocaleString('es-AR')}`)
      console.log(`   📈 Margen Bruto Estimado: ${a.estimated_margin_percentage}%`)
      console.log(`   ⚡ Liquidez: ${a.liquidity_rating} | Rationale: ${a.commercial_rationale}`)
    } else {
      console.error('❌ Falló la tasación inteligente:', appraisalData)
    }
  } catch (err) {
    console.error('❌ Excepción al probar /api/ai/smart-appraisal:', err.message)
  }
}

runPhase3AITests()
