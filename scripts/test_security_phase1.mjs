async function runSecurityTests() {
  console.log('🛡️ Iniciando Verificación de Seguridad: Fase 1 (Anti-SSRF, JWT & OAuth)...')

  const tests = [
    {
      name: 'SSRF Attack: Localhost internal port bypass',
      url: 'http://localhost:3000/api/proxy-image?url=http://localhost:3000/api/infoauto/versions',
      expected: 403
    },
    {
      name: 'SSRF Attack: AWS/Cloud Metadata IP (169.254.169.254)',
      url: 'http://localhost:3000/api/proxy-image?url=http://169.254.169.254/latest/meta-data/',
      expected: 403
    },
    {
      name: 'SSRF Attack: RFC 1918 Private Subnet (192.168.1.1)',
      url: 'http://localhost:3000/api/proxy-image?url=http://192.168.1.1/',
      expected: 403
    },
    {
      name: 'SSRF Attack: RFC 1918 Private Subnet (10.0.0.5)',
      url: 'http://localhost:3000/api/proxy-image?url=http://10.0.0.5/',
      expected: 403
    },
    {
      name: 'SSRF Attack: Arbitrary Unwhitelisted External Domain',
      url: 'http://localhost:3000/api/proxy-image?url=https://evil-attacker.com/malware.jpg',
      expected: 403
    },
    {
      name: 'Legitimate Request: MercadoLibre CDN (mlstatic.com)',
      url: 'http://localhost:3000/api/proxy-image?url=https://http2.mlstatic.com/frontend-assets/ui-navigation/5.18.9/mercadolibre/logo__large_plus.png',
      expected: 200
    }
  ]

  let allPassed = true

  for (const t of tests) {
    try {
      const res = await fetch(t.url)
      const text = await res.text()
      const pass = res.status === t.expected
      if (!pass) allPassed = false
      const symbol = pass ? '✅' : '❌'
      console.log(`${symbol} [HTTP ${res.status}] ${t.name} (Esperado: ${t.expected})`)
      if (!pass) {
        console.log(`   Detalle de respuesta: ${text.slice(0, 120)}`)
      }
    } catch (err) {
      console.log(`⚠️ Error al conectar con ${t.url}: ${err.message}`)
      allPassed = false
    }
  }

  // Test Session Bypass Check on Proxy / Protected Route
  console.log('\n🔒 Verificando Blindaje de Sesión JWT en Proxy (Rutas Protegidas)...')
  try {
    // Attempt accessing /stock with forged fake cookie
    const forgedRes = await fetch('http://localhost:3000/stock', {
      headers: {
        'Cookie': 'sb-fake-auth-token=corrupt_or_forged_jwt_token_12345'
      },
      redirect: 'manual'
    })

    // The proxy should reject the forged cookie and redirect to /login (HTTP 307 or 302 or 308)
    const isRedirect = forgedRes.status >= 300 && forgedRes.status < 400
    const location = forgedRes.headers.get('location') || ''
    const redirectedToLogin = location.includes('/login')

    if (isRedirect && redirectedToLogin) {
      console.log(`✅ [HTTP ${forgedRes.status}] Ataque con cookie falsa rechazado criptográficamente -> Redirección forzada a: ${location}`)
    } else {
      console.log(`❌ Falla en protección de sesión: Status ${forgedRes.status}, Location: ${location}`)
      allPassed = false
    }
  } catch (err) {
    console.log(`⚠️ Error verificando proxy: ${err.message}`)
  }

  console.log('\n' + (allPassed ? '🎉 TODOS LOS TESTS DE SEGURIDAD PASARON CON ÉXITO.' : '❌ ALGUNOS TESTS FALLARON.'))
}

runSecurityTests()
