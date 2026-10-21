import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getAccountContext, OKM_PRIMARY_EMAILS } from '@/lib/services/account-context'

// Helper para verificar si el usuario que llama tiene rol de administrador
async function checkIsAdmin(req: NextRequest) {
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
      return { isAdmin: false, error: 'No autenticado', user: null, context: null }
    }

    const context = await getAccountContext(userClient)
    const isAdmin = context.role === 'admin' || context.role === 'owner'

    if (!isAdmin) {
      return { isAdmin: false, error: 'Acceso no autorizado. Se requiere rol de Administrador.', user, context }
    }

    return { isAdmin: true, user, context }
  } catch (err: any) {
    return { isAdmin: false, error: err.message || 'Error de verificación de permisos', user: null, context: null }
  }
}

// GET: Obtener lista de vendedores del equipo del Administrador actual
export async function GET(req: NextRequest) {
  try {
    const auth = await checkIsAdmin(req)
    if (!auth.isAdmin || !auth.user || !auth.context) {
      return NextResponse.json({ error: auth.error }, { status: 403 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase.auth.admin.listUsers()

    if (error) {
      console.error('[API Vendedores] Error listing users:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const currentEmail = auth.user.email?.toLowerCase().trim() || ''
    const currentId = auth.user.id
    const isOkm = auth.context.isOkmAccount

    // Filtrar solo usuarios que pertenecen a este administrador
    const agencyUsers = (data?.users || []).filter(u => {
      const uEmail = u.email?.toLowerCase().trim() || ''
      const uAdminEmail = u.user_metadata?.admin_email?.toLowerCase()?.trim()
      const uAdminId = u.user_metadata?.admin_id

      if (isOkm) {
        return OKM_PRIMARY_EMAILS.includes(uEmail) || uAdminEmail === 'okmmotorschaco@gmail.com' || uAdminEmail === 'tomas.skarp@gmail.com'
      }

      // Si es un admin independiente:
      return u.id === currentId || uAdminId === currentId || uAdminEmail === currentEmail
    })

    const users = agencyUsers.map(u => {
      const rawRole = u.user_metadata?.role?.toLowerCase()
      const isAdminUser = u.email === 'okmmotorschaco@gmail.com' ||
                          u.email === 'tomas.skarp@gmail.com' ||
                          u.id === currentId ||
                          rawRole === 'admin' ||
                          rawRole === 'owner' ||
                          rawRole === 'administrador'
      return {
        id: u.id,
        email: u.email,
        name: u.user_metadata?.name || u.email?.split('@')[0] || 'Vendedor',
        role: isAdminUser ? 'admin' : 'vendedor',
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

// POST: Crear un nuevo vendedor o admin asociado a este Administrador
export async function POST(req: NextRequest) {
  try {
    const auth = await checkIsAdmin(req)
    if (!auth.isAdmin || !auth.user || !auth.context) {
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

    // Crear usuario en Supabase Auth vinculándolo a la agencia/admin que lo dio de alta
    const { data, error } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password: password.trim(),
      email_confirm: true,
      user_metadata: {
        role: assignedRole,
        name: cleanName,
        admin_id: auth.user.id,
        admin_email: auth.user.email?.toLowerCase().trim(),
        agency_id: auth.context.agencyId,
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

// DELETE: Dar de baja el acceso a un vendedor (Solo Admin de esa agencia)
export async function DELETE(req: NextRequest) {
  try {
    const auth = await checkIsAdmin(req)
    if (!auth.isAdmin || !auth.user || !auth.context) {
      return NextResponse.json({ error: auth.error }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 })
    }

    if (id === auth.user.id) {
      return NextResponse.json({ error: 'No podés eliminar tu propia cuenta de administrador.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verificar que el usuario a eliminar realmente pertenezca a esta agencia
    const { data: targetUser, error: getErr } = await supabase.auth.admin.getUserById(id)
    if (getErr || !targetUser?.user) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })
    }

    const tAdminId = targetUser.user.user_metadata?.admin_id
    const tAdminEmail = targetUser.user.user_metadata?.admin_email?.toLowerCase()?.trim()
    const isAuthorized = auth.context.isOkmAccount || tAdminId === auth.user.id || tAdminEmail === auth.user.email?.toLowerCase().trim()

    if (!isAuthorized) {
      return NextResponse.json({ error: 'No tenés permisos para eliminar usuarios de otra agencia.' }, { status: 403 })
    }

    const { error } = await supabase.auth.admin.deleteUser(id)

    if (error) {
      console.error('[API Vendedores] Error deleting user:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id })
  } catch (err: any) {
    console.error('[API Vendedores] Exception in DELETE:', err)
    return NextResponse.json({ error: err.message || 'Error al eliminar usuario' }, { status: 500 })
  }
}
