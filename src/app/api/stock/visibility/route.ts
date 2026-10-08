import { NextRequest, NextResponse } from 'next/server'
import { getStoredVisibility, saveStoredVisibility, VisibilityData } from '@/lib/services/visibility-service'

// GET: Obtener marcas y vehículos ocultos
export async function GET() {
  const visibility = await getStoredVisibility()
  return NextResponse.json({
    success: true,
    hiddenBrands: visibility.hiddenBrands,
    hiddenVehicles: visibility.hiddenVehicles
  })
}

// POST: Alternar visibilidad (Solo Administrador)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, id, brand, hiddenBrands: newBrands, hiddenVehicles: newVehicles } = body

    const current = await getStoredVisibility()
    let updatedBrands = [...current.hiddenBrands]
    let updatedVehicles = [...current.hiddenVehicles]

    if (action === 'toggle_brand' && brand) {
      const normBrand = brand.trim().toUpperCase()
      if (updatedBrands.includes(normBrand)) {
        updatedBrands = updatedBrands.filter(b => b !== normBrand)
      } else {
        updatedBrands.push(normBrand)
      }
    } else if (action === 'toggle_vehicle' && id) {
      const strId = String(id)
      if (updatedVehicles.includes(strId)) {
        updatedVehicles = updatedVehicles.filter(v => v !== strId)
      } else {
        updatedVehicles.push(strId)
      }
    } else if (Array.isArray(newBrands) || Array.isArray(newVehicles)) {
      if (Array.isArray(newBrands)) {
        updatedBrands = newBrands.map((b: string) => b.trim().toUpperCase())
      }
      if (Array.isArray(newVehicles)) {
        updatedVehicles = newVehicles.map((v: any) => String(v))
      }
    }

    const payload: VisibilityData = {
      hiddenBrands: updatedBrands,
      hiddenVehicles: updatedVehicles
    }

    await saveStoredVisibility(payload)

    return NextResponse.json({
      success: true,
      hiddenBrands: payload.hiddenBrands,
      hiddenVehicles: payload.hiddenVehicles
    })
  } catch (err: any) {
    console.error('[API Visibility] POST Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
