import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name, agencyName } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Debes ingresar un correo electrónico válido.' }, { status: 400 })
    }

    if (!password || password.trim().length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()
    const displayName = (agencyName || name || cleanEmail.split('@')[0]).trim()

    const supabase = createAdminClient()

    // Crear usuario administrador independiente en Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password: password.trim(),
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        name: displayName,
        agency_name: displayName,
        is_independent: true,
      },
    })

    if (error) {
      console.error('[API Register] Error creating user:', error)
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        return NextResponse.json({ error: 'Este correo electrónico ya se encuentra registrado.' }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const newUserId = data.user.id

    // Inicializar registros de inventario e integraciones limpios en APP_ENVIOS
    try {
      await Promise.all([
        supabase.from('APP_ENVIOS').insert({
          ID: `CONFIG_AGENCY_STOCK_${newUserId}`,
          Patente: 'CONFIG',
          Vehiculo: 'STOCK_INDEX',
          Cliente_Nombre: newUserId,
          Fecha_Envio: new Date().toISOString(),
          Estado_Envio: 'ACTIVO',
          Observaciones: '[]',
        }),
        supabase.from('APP_ENVIOS').insert({
          ID: `CONFIG_INTEGRATIONS_${newUserId}`,
          Patente: 'CONFIG',
          Vehiculo: 'INTEGRATIONS',
          Cliente_Nombre: newUserId,
          Fecha_Envio: new Date().toISOString(),
          Estado_Envio: 'ACTIVO',
          Observaciones: '{}',
        })
      ])
    } catch (e) {
      console.warn('[API Register] Warning initializing config rows:', e)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: displayName,
        role: 'admin'
      }
    })
  } catch (err: any) {
    console.error('[API Register] Exception:', err)
    return NextResponse.json({ error: err.message || 'Error al registrar usuario' }, { status: 500 })
  }
}
