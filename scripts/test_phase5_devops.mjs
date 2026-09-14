// ============================================================
// AutoApp — Test Suite: Fase 5 (DevOps, Producción y Healthcheck)
// Ejecutar con: node scripts/test_phase5_devops.mjs
// ============================================================

import fs from 'fs'
import path from 'path'

const BASE_URL = 'http://localhost:3000'

async function runDevOpsTests() {
  console.log('🚀 Iniciando Verificación de Fase 5: DevOps, Configuración Cloud y Healthcheck...\n')

  // ─── 1. Test Endpoint /api/health ───
  console.log('1️⃣ Probando Endpoint de Diagnóstico /api/health...')
  try {
    const res = await fetch(`${BASE_URL}/api/health`)
    const data = await res.json()

    console.log(`   HTTP Status: ${res.status}`)
    console.log(`   Estado General: ${data.status.toUpperCase()}`)
    console.log(`   Uptime: ${data.uptimeSeconds} segundos | Entorno: ${data.environment}`)
    console.log('   Chequeos:')
    for (const [key, val] of Object.entries(data.checks)) {
      const icon = val.status === 'pass' ? '✅' : '⚠️'
      console.log(`     ${icon} ${key}: [${val.status.toUpperCase()}] ${val.message || ''} ${val.latencyMs ? `(${val.latencyMs}ms)` : ''}`)
    }

    if (data.status !== 'healthy' && data.status !== 'degraded') {
      throw new Error(`Estado de salud inesperado: ${data.status}`)
    }
  } catch (err) {
    console.error('❌ Error testeando /api/health:', err.message)
    process.exit(1)
  }

  // ─── 2. Verificación de Artefactos de Contenerización Docker ───
  console.log('\n2️⃣ Verificando Artefactos de Contenerización (Docker & Compose)...')
  const filesToCheck = [
    'Dockerfile',
    '.dockerignore',
    'docker-compose.yml',
    '.env.production.example',
    'DEPLOYMENT_GUIDE.md',
  ]

  for (const file of filesToCheck) {
    const filePath = path.resolve(process.cwd(), file)
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath)
      console.log(`   ✅ ${file} presente (${stats.size} bytes)`)
    } else {
      console.error(`   ❌ Falta archivo crítico: ${file}`)
      process.exit(1)
    }
  }

  // ─── 3. Verificación del Paquete de la Extensión Chrome Auto-Cyborg 360 ───
  console.log('\n3️⃣ Verificando Empaquetado de la Extensión Chrome (Auto-Cyborg 360)...')
  const extManifestPath = path.resolve(process.cwd(), 'extension/auto-cyborg-360/manifest.json')
  if (fs.existsSync(extManifestPath)) {
    const manifestContent = JSON.parse(fs.readFileSync(extManifestPath, 'utf-8'))
    console.log(`   ✅ manifest.json encontrado: ${manifestContent.name} (v${manifestContent.version})`)
    console.log(`   Manifest Version: ${manifestContent.manifest_version} | Permissions: ${manifestContent.permissions.join(', ')}`)
  } else {
    console.error('   ❌ Falta manifest.json en extension/auto-cyborg-360')
    process.exit(1)
  }

  const extFiles = ['background.js', 'content.js', 'popup.html', 'README.md']
  for (const f of extFiles) {
    const p = path.resolve(process.cwd(), 'extension/auto-cyborg-360', f)
    if (fs.existsSync(p)) {
      console.log(`   ✅ extension/auto-cyborg-360/${f} presente`)
    } else {
      console.error(`   ❌ Falta extension/auto-cyborg-360/${f}`)
      process.exit(1)
    }
  }

  console.log('\n🎉 TODOS LOS CHEQUEOS DE FASE 5 (DEVOPS & PRODUCCIÓN) PASARON SATISFACTORIAMENTE.')
}

runDevOpsTests().catch(err => {
  console.error('❌ Error en ejecución de tests de Fase 5:', err)
  process.exit(1)
})
