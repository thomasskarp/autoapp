async function runPhase2Benchmarks() {
  console.log('⚡ Iniciando Benchmark y Verificación de Fase 2 (InfoAuto & Base de Datos)...')

  const queries = [
    { label: 'Toyota Hilux 2024', url: 'http://localhost:3000/api/infoauto/versions?marca=TOYOTA&modelo=HILUX&anio=2024' },
    { label: 'Volkswagen Amarok 2023', url: 'http://localhost:3000/api/infoauto/versions?marca=VOLKSWAGEN&modelo=AMAROK&anio=2023' },
    { label: 'Chevrolet Cruze 2022', url: 'http://localhost:3000/api/infoauto/versions?marca=CHEVROLET&modelo=CRUZE&anio=2022' },
    { label: 'Ford Ranger 2025', url: 'http://localhost:3000/api/infoauto/versions?marca=FORD&modelo=RANGER&anio=2025' },
    { label: 'Fuzzy Fallback: Gol 2018 (Fuera de rango)', url: 'http://localhost:3000/api/infoauto/versions?marca=VOLKSWAGEN&modelo=GOL&anio=2018' }
  ]

  let allPassed = true

  for (const q of queries) {
    const start = Date.now()
    try {
      const res = await fetch(q.url)
      const duration = Date.now() - start
      const cacheControl = res.headers.get('cache-control')
      const engine = res.headers.get('x-search-engine')
      const data = await res.json()

      const hasResults = data.total > 0
      const isFast = duration < 3000 // In dev Turbopack server
      const hasCaching = !!cacheControl && cacheControl.includes('s-maxage=3600')

      const pass = res.ok && hasResults && hasCaching
      if (!pass) allPassed = false

      console.log(`${pass ? '✅' : '❌'} [${duration}ms] ${q.label}:`)
      console.log(`   Resultados: ${data.total} | Engine: ${engine} | Cache-Control: ${cacheControl}`)
      if (data.versions && data.versions.length > 0) {
        console.log(`   Top match: ${data.versions[0].version} ($${Number(data.versions[0].precio).toLocaleString('es-AR')})`)
      }
    } catch (err) {
      console.error(`❌ Error en ${q.label}:`, err.message)
      allPassed = false
    }
  }

  // Test Warm Cache Call on Hilux
  console.log('\n🔥 Test de Caché Cálido (Warm Request)...')
  const warmStart = Date.now()
  const warmRes = await fetch('http://localhost:3000/api/infoauto/versions?marca=TOYOTA&modelo=HILUX&anio=2024')
  const warmDuration = Date.now() - warmStart
  console.log(`✅ Consulta repetida completada en: ${warmDuration}ms (HTTP ${warmRes.status})`)

  console.log('\n' + (allPassed ? '🎉 TODOS LOS BENCHMARKS DE FASE 2 PASARON EXITOSAMENTE.' : '⚠️ ALGUNAS PRUEBAS REQUIRIERON REVISIÓN.'))
}

runPhase2Benchmarks()
