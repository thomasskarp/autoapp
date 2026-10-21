import { SupabaseClient } from '@supabase/supabase-js'

export const OKM_AGENCY_ID = 'okm_motors'
export const OKM_PRIMARY_EMAILS = [
  'okmmotorschaco@gmail.com',
  'tomas.skarp@gmail.com',
  'juanpablonu07@gmail.com',
  'tomas.skarp@homail.com',
]

export interface UserAccountContext {
  userId: string
  email: string
  name: string
  role: 'admin' | 'vendedor' | 'owner'
  agencyId: string
  isOkmAccount: boolean
  isIndependentAdmin: boolean
  adminEmail?: string
  adminId?: string
}

/**
 * Determina el contexto de cuenta, agencia y jerarquía del usuario actual
 */
export async function getAccountContext(supabase: SupabaseClient): Promise<UserAccountContext> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !user.email) {
    return {
      userId: 'anonymous',
      email: '',
      name: 'Invitado',
      role: 'vendedor',
      agencyId: 'anonymous',
      isOkmAccount: false,
      isIndependentAdmin: false,
    }
  }

  const email = user.email.toLowerCase().trim()
  const metadata = user.user_metadata || {}
  const rawRole = (metadata.role || 'vendedor').toLowerCase()
  const adminEmail = metadata.admin_email?.toLowerCase()?.trim()
  const adminId = metadata.admin_id

  // Determinar si pertenece a la cuenta original OKM Motors
  const isOkmEmail = OKM_PRIMARY_EMAILS.includes(email)
  const isOkmSeller = adminEmail === 'okmmotorschaco@gmail.com' || adminEmail === 'tomas.skarp@gmail.com'
  const isOkmAccount = isOkmEmail || isOkmSeller

  let agencyId = OKM_AGENCY_ID
  let role: 'admin' | 'vendedor' | 'owner' = 'vendedor'

  if (isOkmAccount) {
    agencyId = OKM_AGENCY_ID
    if (email === 'okmmotorschaco@gmail.com' || email === 'tomas.skarp@gmail.com' || rawRole === 'admin' || rawRole === 'owner') {
      role = (email === 'tomas.skarp@gmail.com' || rawRole === 'owner') ? 'owner' : 'admin'
    } else {
      role = 'vendedor'
    }
    return {
      userId: user.id,
      email,
      name: metadata.name || metadata.full_name || email.split('@')[0],
      role,
      agencyId,
      isOkmAccount: true,
      isIndependentAdmin: false,
      adminEmail: isOkmSeller ? (adminEmail || 'okmmotorschaco@gmail.com') : undefined,
      adminId,
    }
  }

  // Usuario fuera de OKM:
  // Si fue creado por un admin (es vendedor):
  if (adminId || adminEmail) {
    agencyId = adminId || adminEmail || user.id
    role = 'vendedor'
    return {
      userId: user.id,
      email,
      name: metadata.name || email.split('@')[0],
      role,
      agencyId,
      isOkmAccount: false,
      isIndependentAdmin: false,
      adminEmail,
      adminId,
    }
  }

  // Si no tiene admin asociado, es un nuevo Administrador Independiente
  agencyId = user.id
  role = 'admin'
  return {
    userId: user.id,
    email,
    name: metadata.name || email.split('@')[0],
    role: 'admin',
    agencyId,
    isOkmAccount: false,
    isIndependentAdmin: true,
  }
}
