import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// GET: Obtener lista de vendedores y usuarios de la agencia
export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.auth.admin.listUsers()

    if (error) {
      console.error('[API Vendedores] Error listing users:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const users = (data?.users || []).map(u => ({
      id: u.id,
      email: u.email,
      name: u.user_metadata?.name || u.email?.split('@')[0] || 'Vendedor',
      role: u.user_metadata?.role || (u.email?.includes('tomas.skarp') ? 'Administrador' : 'Vendedor'),
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at,
    }))

    return NextResponse.json({ success: true, users })
  } catch (err: any) {
    console.error('[API Vendedores] Exception:', err)
    return NextResponse.json({ error: err.message || 'Error al obtener usuarios' }, { status: 500 })
  }
}

// POST: Crear un nuevo vendedor con correo y contraseña
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Debes ingresar un correo electrónico válido.' }, { status: 400 })
    }

    if (!password || password.trim().length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanName = (name || cleanEmail.split('@')[0]).trim()

    const supabase = createAdminClient()

    // Crear usuario directamente confirmado en Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password: password.trim(),
      email_confirm: true, // Confirmado inmediatamente para que pueda iniciar sesión
      user_metadata: {
        role: 'vendedor',
        name: cleanName,
      },
    })

    if (error) {
      console.error('[API Vendedores] Error creating user:', error)
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        return NextResponse.json({ error: 'Este correo ya se encuentra registrado en el sistema.' }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: cleanName,
        role: 'vendedor',
        createdAt: data.user.created_at,
      },
    })
  } catch (err: any) {
    console.error('[API Vendedores] Exception in POST:', err)
    return NextResponse.json({ error: err.message || 'Error interno al crear vendedor' }, { status: 500 })
  }
}

// DELETE: Dar de baja el acceso a un vendedor
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID de vendedor requerido' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Obtener datos del usuario para evitar borrar al administrador principal
    const { data: userData, error: getUserErr } = await supabase.auth.admin.getUserById(id)
    if (getUserErr) {
      return NextResponse.json({ error: getUserErr.message }, { status: 400 })
    }

    if (userData.user.email === 'tomas.skarp@gmail.com') {
      return NextResponse.json({ error: 'No se puede eliminar la cuenta del administrador principal.' }, { status: 403 })
    }

    const { error: delErr } = await supabase.auth.admin.deleteUser(id)
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Vendedor eliminado con éxito' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al eliminar vendedor' }, { status: 500 })
  }
}

// PATCH: Cambiar o restablecer contraseña de un vendedor existente
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, newPassword } = body

    if (!id || !newPassword || newPassword.trim().length < 6) {
      return NextResponse.json({ error: 'ID y una nueva contraseña de al menos 6 caracteres son requeridos' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.auth.admin.updateUserById(id, {
      password: newPassword.trim(),
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Contraseña actualizada exitosamente' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al actualizar contraseña' }, { status: 500 })
  }
}
