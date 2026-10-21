import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAccountContext } from '@/lib/services/account-context'
import { registerVehicleToAgency } from '@/lib/services/agency-vehicles'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { vehicleId } = body

    if (!vehicleId) {
      return NextResponse.json({ error: 'vehicleId es requerido' }, { status: 400 })
    }

    const supabase = await createClient()
    const context = await getAccountContext(supabase)

    if (!context.isOkmAccount && context.agencyId) {
      await registerVehicleToAgency(supabase, context.agencyId, String(vehicleId))
    }

    return NextResponse.json({ success: true, vehicleId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
