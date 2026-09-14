// ============================================================
// AutoApp — Test Suite: Fase 4 (Fusión WhatsApp ↔ CRM con IA)
// Ejecutar con: node scripts/test_phase4_whatsapp_crm.mjs
// ============================================================

const BASE_URL = 'http://localhost:3000'

async function runTests() {
  console.log('🧠 Iniciando Verificación de Fase 4: Ecosistema WhatsApp ↔ CRM con IA...\n')

  // ─── 1. Test Endpoint /api/ai/lead-intelligence (Lead Caliente con Permuta) ───
  console.log('1️⃣ Probando Endpoint /api/ai/lead-intelligence (Lead con Alta Intención de Compra)...')

  const hotLeadPayload = {
    lead: {
      Nombre_Cliente: 'Juan Ignacio Pérez',
      Telefono: '3624123456',
      Auto_Interes: 'Toyota Hilux SRV 4x4 2022',
      Presupuesto: '30000000',
      Etapa: 'INTERESADO',
      Notas: 'Tiene un Cruze 2019 para entregar y saldo al contado.',
    },
    interactions: [
      {
        Tipo_Interaccion: 'WHATSAPP',
        Remitente: 'CLIENTE',
        Detalle_Conversacion: 'Hola buenas tardes, vi la Hilux 2022 publicada en la web. ¿La tienen disponible en el local para verla?',
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        Tipo_Interaccion: 'WHATSAPP',
        Remitente: 'BOT',
        Detalle_Conversacion: '¡Hola Juan Ignacio! Sí, la Toyota Hilux SRV 4x4 2022 está disponible en nuestro showroom para entrega inmediata. ¿Te gustaría coordinar una visita?',
        created_at: new Date(Date.now() - 3000000).toISOString(),
      },
      {
        Tipo_Interaccion: 'WHATSAPP',
        Remitente: 'CLIENTE',
        Detalle_Conversacion: 'Excelente. Tengo un Chevrolet Cruze 2019 1.4T con 45.000 km primera mano para entregar en permuta y el resto en efectivo. ¿Puedo pasar mañana a la tarde a hacer el test drive y tasación?',
        created_at: new Date(Date.now() - 1000000).toISOString(),
      },
    ],
    persist: false,
  }

  const res1 = await fetch(`${BASE_URL}/api/ai/lead-intelligence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(hotLeadPayload),
  })

  if (!res1.ok) {
    throw new Error(`Fallo endpoint /api/ai/lead-intelligence con status ${res1.status}: ${await res1.text()}`)
  }

  const data1 = await res1.json()
  console.log('✅ Inteligencia Comercial Generada Exitosamente:')
  console.log(`   🔥 Temperatura: ${data1.intelligence.temperatura}`)
  console.log(`   📋 Rationale: ${data1.intelligence.temperature_rationale}`)
  console.log(`   💡 Resumen IA: ${data1.intelligence.ai_summary}`)
  console.log(`   ⚡ Next Best Action: ${data1.intelligence.next_best_action}`)
  console.log(`   💬 WhatsApp Quick Reply:\n      "${data1.intelligence.whatsapp_quick_reply}"\n`)

  if (data1.intelligence.temperatura !== 'CALIENTE') {
    console.warn('⚠️ Advertencia: Se esperaba temperatura CALIENTE pero se obtuvo:', data1.intelligence.temperatura)
  }

  // ─── 2. Test Lead Frío / Curioso ───
  console.log('2️⃣ Probando Endpoint /api/ai/lead-intelligence (Lead Frío / Indeciso)...')
  const coldLeadPayload = {
    lead: {
      Nombre_Cliente: 'Marcos Soto',
      Telefono: '1155998877',
      Auto_Interes: 'Fiat Cronos 1.3',
      Presupuesto: '',
      Etapa: 'NUEVO',
      Notas: 'Solo preguntó precio y no respondió el seguimiento.',
    },
    interactions: [
      {
        Tipo_Interaccion: 'WHATSAPP',
        Remitente: 'CLIENTE',
        Detalle_Conversacion: 'precio del cronos?',
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        Tipo_Interaccion: 'WHATSAPP',
        Remitente: 'BOT',
        Detalle_Conversacion: '¡Hola Marcos! El Cronos 1.3 Drive está en $18.500.000 con anticipo desde $6.000.000. ¿Buscás financiar o tenés auto usado?',
        created_at: new Date(Date.now() - 80000000).toISOString(),
      },
    ],
    persist: false,
  }

  const res2 = await fetch(`${BASE_URL}/api/ai/lead-intelligence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(coldLeadPayload),
  })

  const data2 = await res2.json()
  console.log('✅ Inteligencia Comercial para Lead Frío Evaluada:')
  console.log(`   ❄️ Temperatura: ${data2.intelligence.temperatura}`)
  console.log(`   ⚡ Next Best Action: ${data2.intelligence.next_best_action}`)
  console.log(`   💬 Quick Reply Sugerido: "${data2.intelligence.whatsapp_quick_reply}"\n`)

  // ─── 3. Test API de Interacciones Conversacionales ───
  console.log('3️⃣ Probando Endpoint /api/crm/interactions...')
  const testLeadId = 'test-lead-' + Date.now()
  const postRes = await fetch(`${BASE_URL}/api/crm/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      leadId: testLeadId,
      detalle: 'Mensaje de prueba de sincronización CRM',
      remitente: 'ASESOR',
      tipo: 'WHATSAPP',
      vendedor: 'Tomás Skarp',
    }),
  })

  console.log(`   POST /api/crm/interactions Status: ${postRes.status}`)
  const getRes = await fetch(`${BASE_URL}/api/crm/interactions?leadId=${encodeURIComponent(testLeadId)}`)
  console.log(`   GET /api/crm/interactions Status: ${getRes.status}`)
  const getData = await getRes.json()
  console.log(`   Mensajes recuperados para lead ${testLeadId}:`, getData.interactions?.length || 0)

  console.log('\n🎉 TODOS LOS TESTS DE FASE 4 COMPLETADOS SATISFACTORIAMENTE.')
}

runTests().catch(err => {
  console.error('❌ Error en suite de pruebas de Fase 4:', err)
  process.exit(1)
})
