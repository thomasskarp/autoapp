import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// Helper para verificar si el usuario que llama tiene rol de administrador en la base de datos
async function checkIsAdmin(req: NextRequest): Promise<{ isAdmin: boolean; error?: string }> {
  try {
    const userClient = await createClient()
    let { data: { user } } = await userClient.auth.getUser()

    const adminClient = createAdminClient()

    if (!user) {
      const authHeader = req.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1]
        const { data: tokenData } = await adminClient.auth.getUser(token)
        user = tokenData?.user || null
      }
    }

    if (!user) {
      return { isAdmin: false, error: 'No autenticado' }
    }

    // Consultar rol verificado directamente desde la base de datos (inmune a manipulación en cliente)
    const { data: profile } = await adminClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const dbRole = profile?.role?.toLowerCase()
    const rawRole = user.user_metadata?.role?.toLowerCase()
    const isAdmin = user.email === 'okmmotorschaco@gmail.com' || user.email === 'tomas.skarp@gmail.com' || 
                    dbRole === 'admin' || dbRole === 'owner' || dbRole === 'superadmin' ||
                    (!profile && (rawRole === 'admin' || rawRole === 'administrador'))

    if (!isAdmin) {
      return { isAdmin: false, error: 'Acceso no autorizado. Se requiere rol de Administrador.' }
    }

    return { isAdmin: true }
  } catch (err: any) {
    return { isAdmin: false, error: err.message || 'Error de verificación de permisos' }
  }
}

// GET: Obtener lista de vendedores y usuarios de la agencia (Solo Admin)
export async function GET(req: NextRequest) {
  try {
    const auth = await checkIsAdmin(req)
    if (!auth.isAdmin) {
      return NextResponse.json({ error: auth.error }, { status: 403 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase.auth.admin.listUsers()

    if (error) {
      console.error('[API Vendedores] Error listing users:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const users = (data?.users || []).map(u => {
      const rawRole = u.user_metadata?.role?.toLowerCase()
      const isAdmin = u.email === 'okmmotorschaco@gmail.com' || u.email === 'tomas.skarp@gmail.com' || rawRole === 'admin' || rawRole === 'administrador'
      return {
        id: u.id,
        email: u.email,
        name: u.user_metadata?.name || u.email?.split('@')[0] || 'Vendedor',
        role: isAdmin ? 'admin' : 'vendedor',
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at,
      }
    })

    return NextResponse.json({ success: true, users })
  } catch (err: any) {
    console.error('[API Vendedores] Exception:', err)
    return NextResponse.json({ error: err.message || 'Error al obtener usuarios' }, { status: 500 })
  }
}

// POST: Crear un nuevo vendedor o admin (Solo Admin)
export async function POST(req: NextRequest) {
  try {
    const auth = await checkIsAdmin(req)
    if (!auth.isAdmin) {
      return NextResponse.json({ error: auth.error }, { status: 403 })
    }

    const body = await req.json()
    const { email, password, name, role } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Debes ingresar un correo electrónico válido.' }, { status: 400 })
    }

    if (!password || password.trim().length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanName = (name || cleanEmail.split('@')[0]).trim()
    const assignedRole = role === 'admin' ? 'admin' : 'vendedor'

    const supabase = createAdminClient()

    // Crear usuario directamente confirmado en Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password: password.trim(),
      email_confirm: true,
      user_metadata: {
        role: assignedRole,
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
        role: assignedRole,
        createdAt: data.user.created_at,
      },
    })
  } catch (err: any) {
    console.error('[API Vendedores] Exception in POST:', err)
    return NextResponse.json({ error: err.message || 'Error interno al crear usuario' }, { status: 500 })
  }
}

// DELETE: Dar de baja el acceso a un vendedor (Solo Admin)
export async function DELETE(req: NextRequest) {
  try {
    const auth = await checkIsAdmin(req)
    if (!auth.isAdmin) {
      return NextResponse.json({ error: auth.error }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Obtener datos del usuario para evitar borrar al administrador principal
    const { data: userData, error: getUserErr } = await supabase.auth.admin.getUserById(id)
    if (getUserErr) {
      return NextResponse.json({ error: getUserErr.message }, { status: 400 })
    }

    if (userData.user.email === 'tomas.skarp@gmail.com' || userData.user.email === 'okmmotorschaco@gmail.com') {
      return NextResponse.json({ error: 'No se puede eliminar la cuenta del administrador principal.' }, { status: 403 })
    }

    const { error: delErr } = await supabase.auth.admin.deleteUser(id)
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Usuario eliminado con éxito' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al eliminar usuario' }, { status: 500 })
  }
}

// PATCH: Cambiar contraseña o rol de un usuario existente (Solo Admin)
export async function PATCH(req: NextRequest) {
  try {
    const auth = await checkIsAdmin(req)
    if (!auth.isAdmin) {
      return NextResponse.json({ error: auth.error }, { status: 403 })
    }

    const body = await req.json()
    const { id, newPassword, role } = body

    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 })
    }

    if (!newPassword && !role) {
      return NextResponse.json({ error: 'Debes proporcionar una nueva contraseña o un nuevo rol.' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: userData, error: getUserErr } = await supabase.auth.admin.getUserById(id)

    if (getUserErr || !userData?.user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const updates: any = {}

    if (role) {
      if ((userData.user.email === 'tomas.skarp@gmail.com' || userData.user.email === 'okmmotorschaco@gmail.com') && role !== 'admin') {
        return NextResponse.json({ error: 'No se puede cambiar el rol del administrador principal.' }, { status: 403 })
      }
      const existingMeta = userData.user.user_metadata || {}
      updates.user_metadata = {
        ...existingMeta,
        role: role === 'admin' ? 'admin' : 'vendedor',
      }
    }

    if (newPassword) {
      if (newPassword.trim().length < 6) {
        return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' }, { status: 400 })
      }
      updates.password = newPassword.trim()
    }

    const { error: updateErr } = await supabase.auth.admin.updateUserById(id, updates)
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Usuario actualizado exitosamente' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al actualizar usuario' }, { status: 500 })
  }
}
