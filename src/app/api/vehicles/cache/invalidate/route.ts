import { NextResponse } from 'next/server'
import { invalidateVehiclesCache } from '@/lib/services/vehicles-service'

export async function POST() {
  try {
    invalidateVehiclesCache()
    return NextResponse.json({ success: true, message: 'Vehicles cache invalidated' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
