// AutoApp — Script de Configuración Automática de Supabase
// Ejecuta: node scripts/setup-supabase.js

const SUPABASE_URL = 'https://ycbvjnydxrhygtvusowr.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljYnZqbnlkeHJoeWd0dnVzb3dyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY2MDA2MywiZXhwIjoyMTAyMjM2MDYzfQ.VqC5QAIQtQmil3CVTUAY3fGfFpNE_FHh_V2TdwwRqPw'

const AGENCY_ID = 'a1000000-0000-0000-0000-000000000001'
const USER_EMAIL = process.argv[2] || 'admin@sarmientoautomotores.com'
const USER_PASSWORD = process.argv[3] || 'AutoApp2026!'
const USER_NAME = process.argv[4] || 'Admin Sarmiento'

const headers = {
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal'
}

async function runSQL(sql) {
  // Try Supabase pg endpoint
  const res = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql })
  })
  if (res.ok) return await res.json()
  
  // Try REST RPC endpoint
  const res2 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sql })
  })
  if (res2.ok) return await res2.json()
  
  return null
}

async function createTable_agencies() {
  return await fetch(`${SUPABASE_URL}/rest/v1/agencies?select=id&limit=1`, { headers })
}

async function step1_checkTables() {
  console.log('\n📊 Verificando tablas existentes...')
  
  const checks = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/agencies?select=id&limit=1`, { headers }),
    fetch(`${SUPABASE_URL}/rest/v1/user_profiles?select=id&limit=1`, { headers }),
    fetch(`${SUPABASE_URL}/rest/v1/agency_visibility?select=id&limit=1`, { headers }),
  ])
  
  const [agenciesOk, profilesOk, visibilityOk] = checks.map(r => r.status !== 404 && r.status !== 400)
  
  console.log(`  agencies:          ${agenciesOk ? '✅ existe' : '❌ no existe (crear manualmente)'}`)
  console.log(`  user_profiles:     ${profilesOk ? '✅ existe' : '❌ no existe (crear manualmente)'}`)
  console.log(`  agency_visibility: ${visibilityOk ? '✅ existe' : '❌ no existe (crear manualmente)'}`)
  
  return { agenciesOk, profilesOk, visibilityOk }
}

async function step2_checkColumns() {
  console.log('\n📊 Verificando columna agency_id en DB_STOCK...')
  
  const res = await fetch(`${SUPABASE_URL}/rest/v1/DB_STOCK?select=agency_id&limit=1`, { headers })
  const hasCol = res.status !== 400
  
  console.log(`  DB_STOCK.agency_id:  ${hasCol ? '✅ existe' : '❌ no existe (agregar manualmente)'}`)
  
  const res2 = await fetch(`${SUPABASE_URL}/rest/v1/DB_LEADS?select=agency_id&limit=1`, { headers })
  const hasCol2 = res2.status !== 400
  console.log(`  DB_LEADS.agency_id:  ${hasCol2 ? '✅ existe' : '❌ no existe (agregar manualmente)'}`)
  
  return { stockHasAgency: hasCol, leadsHasAgency: hasCol2 }
}

async function step3_insertAgency(agenciesOk) {
  if (!agenciesOk) {
    console.log('\n⚠️  Tabla agencies no existe — saltando inserción de agencia')
    return false
  }
  
  console.log('\n🏢 Insertando agencia: Sarmiento Automotores...')
  
  const res = await fetch(`${SUPABASE_URL}/rest/v1/agencies`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation,resolution=ignore-duplicates' },
    body: JSON.stringify({
      id: AGENCY_ID,
      name: 'Sarmiento Automotores',
      slug: 'sarmiento-automotores'
    })
  })
  
  if (res.ok || res.status === 409) {
    console.log('  ✅ Agencia creada (o ya existía)')
    return true
  } else {
    const err = await res.text()
    console.log(`  ❌ Error: ${err}`)
    return false
  }
}

async function step4_createUser() {
  console.log(`\n👤 Creando usuario: ${USER_EMAIL}...`)
  
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: USER_EMAIL,
      password: USER_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: USER_NAME,
        role: 'owner',
        agency_id: AGENCY_ID
      }
    })
  })
  
  const data = await res.json()
  
  if (res.ok && data.id) {
    console.log(`  ✅ Usuario creado!`)
    console.log(`  📧 Email: ${USER_EMAIL}`)
    console.log(`  🔑 Password: ${USER_PASSWORD}`)
    console.log(`  🆔 UUID: ${data.id}`)
    return data.id
  } else {
    // Check if user already exists
    if (data.msg?.includes('already') || data.message?.includes('already')) {
      console.log(`  ⚠️  El usuario ya existe. Intentando obtener ID...`)
      const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(USER_EMAIL)}`, {
        headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
      })
      const listData = await listRes.json()
      const existing = listData.users?.[0]
      if (existing) {
        console.log(`  ✅ Usuario existente encontrado: ${existing.id}`)
        return existing.id
      }
    }
    console.log(`  ❌ Error creando usuario: ${JSON.stringify(data)}`)
    return null
  }
}

async function step5_insertUserProfile(userId, profilesOk) {
  if (!profilesOk) {
    console.log('\n⚠️  Tabla user_profiles no existe — saltando inserción de perfil')
    return false
  }
  if (!userId) {
    console.log('\n⚠️  Sin userId — saltando inserción de perfil')
    return false
  }
  
  console.log('\n👤 Insertando perfil de usuario...')
  
  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=minimal,resolution=merge-duplicates' },
    body: JSON.stringify({
      id: userId,
      agency_id: AGENCY_ID,
      full_name: USER_NAME,
      role: 'owner'
    })
  })
  
  if (res.ok) {
    console.log('  ✅ Perfil de usuario insertado')
    return true
  } else {
    const err = await res.text()
    console.log(`  ❌ Error: ${err}`)
    return false
  }
}

async function step6_updateExistingData(stockHasAgency, leadsHasAgency) {
  if (!stockHasAgency && !leadsHasAgency) {
    console.log('\n⚠️  Columnas agency_id no existen — saltando actualización de datos')
    return
  }
  
  if (stockHasAgency) {
    console.log('\n🚗 Asignando vehículos a Sarmiento Automotores...')
    const res = await fetch(`${SUPABASE_URL}/rest/v1/DB_STOCK?agency_id=is.null`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ agency_id: AGENCY_ID })
    })
    if (res.ok) console.log('  ✅ Vehículos actualizados')
    else console.log(`  ⚠️  Respuesta: ${res.status}`)
  }
  
  if (leadsHasAgency) {
    console.log('📋 Asignando leads a Sarmiento Automotores...')
    const res = await fetch(`${SUPABASE_URL}/rest/v1/DB_LEADS?agency_id=is.null`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ agency_id: AGENCY_ID })
    })
    if (res.ok) console.log('  ✅ Leads actualizados')
    else console.log(`  ⚠️  Respuesta: ${res.status}`)
  }
}

function printManualSQL(tables, columns) {
  const needsManual = !tables.agenciesOk || !tables.profilesOk || !tables.visibilityOk ||
                      !columns.stockHasAgency || !columns.leadsHasAgency

  if (!needsManual) {
    console.log('\n✅ No se necesita SQL manual!')
    return
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('📋 SQL PARA EJECUTAR MANUALMENTE EN SUPABASE')
  console.log('   https://supabase.com/dashboard/project/ycbvjnydxrhygtvusowr/sql')
  console.log('='.repeat(60))
  
  if (!tables.agenciesOk) {
    console.log(`
-- Tabla agencies
CREATE TABLE IF NOT EXISTS public.agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`)
  }
  
  if (!tables.profilesOk) {
    console.log(`
-- Tabla user_profiles  
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id),
  full_name TEXT,
  role TEXT DEFAULT 'seller' CHECK (role IN ('owner','seller','admin','superadmin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`)
  }
  
  if (!tables.visibilityOk) {
    console.log(`
-- Tabla agency_visibility
CREATE TABLE IF NOT EXISTS public.agency_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agency_id UUID REFERENCES public.agencies(id),
  to_agency_id UUID REFERENCES public.agencies(id),
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_agency_id, to_agency_id)
);`)
  }
  
  if (!columns.stockHasAgency) {
    console.log(`
ALTER TABLE public."DB_STOCK" ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id);`)
  }
  
  if (!columns.leadsHasAgency) {
    console.log(`
ALTER TABLE public."DB_LEADS" ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id);`)
  }
  
  console.log('='.repeat(60))
}

async function main() {
  console.log('🚀 AutoApp — Configuración Automática de Supabase')
  console.log(`📧 Email: ${USER_EMAIL}`)
  console.log(`🏢 Agencia: Sarmiento Automotores`)
  
  const tables = await step1_checkTables()
  const columns = await step2_checkColumns()
  await step3_insertAgency(tables.agenciesOk)
  const userId = await step4_createUser()
  await step5_insertUserProfile(userId, tables.profilesOk)
  await step6_updateExistingData(columns.stockHasAgency, columns.leadsHasAgency)
  printManualSQL(tables, columns)
  
  console.log('\n✨ RESUMEN FINAL')
  console.log('─'.repeat(40))
  console.log(`🌐 App: http://localhost:3000`)
  console.log(`📧 Login: ${USER_EMAIL}`)
  console.log(`🔑 Pass: ${USER_PASSWORD}`)
  console.log('─'.repeat(40))
}

main().catch(console.error)
