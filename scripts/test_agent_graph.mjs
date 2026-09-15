// ─── Verification Test Suite for AutoApp Agent Graph ──────────────────────────
import { processAssistantMessage } from '../src/lib/ai/assistant-agent.js'

async function runTests() {
  console.log('🧪 Iniciando Test Suite del Grafo de Agentes de AutoApp...\n')
  
  const testUserId = 'test_user_' + Date.now()

  // ─── Test 1: Ingesta de Stock (Router -> Extractor -> Valuation -> Copy Fanout -> Checker -> HITL)
  console.log('▶️ Test 1: Ingesta de vehículo con extracción estructurada y Quality Checker...')
  const res1 = await processAssistantMessage({
    userId: testUserId,
    message: 'Ingresá al stock: Toyota Corolla 2021 XEI con 45.000 km, caja automática, nafta, $24.000.000, patente AF123CD',
    photoUrls: ['https://images.unsplash.com/photo-1552519507-da3b142c6e3d']
  })

  console.log('Acción resultante:', res1.action)
  console.log('Ruta de ejecución del grafo:', res1.executionPath)
  console.log('Validación:', res1.validation)
  console.log('Respuesta:\n' + res1.reply + '\n')

  if (res1.action !== 'VEHICLE_CREATED') {
    throw new Error(`Test 1 falló: se esperaba VEHICLE_CREATED pero se obtuvo ${res1.action}`)
  }
  console.log('✅ Test 1 Superado con Éxito.\n')

  // ─── Test 2: Confirmación Humana (HITL: "Sí, publicar") -> Dispatcher Transaccional
  console.log('▶️ Test 2: Confirmación humana para publicar el vehículo pendiente...')
  const res2 = await processAssistantMessage({
    userId: testUserId,
    message: 'Sí, publicalo en las redes y en MercadoLibre'
  })

  console.log('Acción resultante:', res2.action)
  console.log('Ruta de ejecución del grafo:', res2.executionPath)
  console.log('Respuesta:\n' + res2.reply + '\n')

  if (res2.action !== 'VEHICLE_PUBLISHED') {
    throw new Error(`Test 2 falló: se esperaba VEHICLE_PUBLISHED pero se obtuvo ${res2.action}`)
  }
  console.log('✅ Test 2 Superado con Éxito.\n')

  // ─── Test 3: Consulta de Tasación de Permuta (Router -> Appraisal Node)
  console.log('▶️ Test 3: Consulta semántica de tasación de permuta...')
  const res3 = await processAssistantMessage({
    userId: 'user_appraisal_' + Date.now(),
    message: 'Tasame un Chevrolet Cruze 2021 LTZ con 35.000 km que me ofrecen en permuta'
  })

  console.log('Acción resultante:', res3.action)
  console.log('Ruta de ejecución del grafo:', res3.executionPath)
  console.log('Respuesta:\n' + res3.reply + '\n')

  if (res3.action !== 'APPRAISAL_OFFER') {
    throw new Error(`Test 3 falló: se esperaba APPRAISAL_OFFER pero se obtuvo ${res3.action}`)
  }
  console.log('✅ Test 3 Superado con Éxito.\n')

  console.log('🎉 Todos los tests del Grafo de Agentes pasaron exitosamente.')
}

runTests().catch(err => {
  console.error('❌ Error en ejecución de tests:', err)
  process.exit(1)
})
