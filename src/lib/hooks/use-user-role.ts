'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export type UserRole = 'admin' | 'vendedor'

interface UseUserRoleReturn {
  role: UserRole
  isAdmin: boolean
  isVendedor: boolean
  loading: boolean
  user: User | null
  email: string
}

let cachedRole: UserRole | null = null
let cachedUser: User | null = null

export function useUserRole(): UseUserRoleReturn {
  const [role, setRole] = useState<UserRole>(cachedRole || 'vendedor')
  const [user, setUser] = useState<User | null>(cachedUser)
  const [loading, setLoading] = useState<boolean>(!cachedRole)

  useEffect(() => {
    let isMounted = true

    async function checkRole() {
      try {
        const supabase = createClient()
        const { data: { user: currentUser } } = await supabase.auth.getUser()

        if (!isMounted) return

        if (currentUser) {
          setUser(currentUser)
          cachedUser = currentUser

          const rawRole = currentUser.user_metadata?.role?.toLowerCase()
          const email = currentUser.email?.toLowerCase() || ''
          const isAdmin =
            email === 'okmmotorschaco@gmail.com' ||
            email === 'tomas.skarp@gmail.com' ||
            rawRole === 'admin' ||
            rawRole === 'administrador' ||
            rawRole === 'owner' ||
            rawRole === 'superadmin'

          const resolvedRole: UserRole = isAdmin ? 'admin' : 'vendedor'
          setRole(resolvedRole)
          cachedRole = resolvedRole
        } else {
          setRole('vendedor')
          cachedRole = 'vendedor'
        }
      } catch (e) {
        console.warn('[useUserRole] Error resolviendo rol:', e)
        if (isMounted) setRole('vendedor')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    if (!cachedRole) {
      checkRole()
    } else {
      setLoading(false)
    }

    return () => {
      isMounted = false
    }
  }, [])

  return {
    role,
    isAdmin: role === 'admin',
    isVendedor: role === 'vendedor',
    loading,
    user,
    email: user?.email || ''
  }
}
