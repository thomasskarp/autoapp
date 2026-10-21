import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { VehicleForm } from '@/components/stock/vehicle-form'
import { getAccountContext } from '@/lib/services/account-context'
import { getAgencyVehicleIds, getAllIndependentVehicleIds } from '@/lib/services/agency-vehicles'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditVehiclePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const context = await getAccountContext(supabase)

  // Validar permisos de acceso según agencia
  if (!context.isOkmAccount) {
    const agencyIds = await getAgencyVehicleIds(supabase, context.agencyId)
    if (!agencyIds.includes(String(id))) {
      notFound()
    }
  } else {
    // Si es OKM, no permitir editar autos de agencias independientes
    const foreignIds = await getAllIndependentVehicleIds(supabase)
    if (foreignIds.includes(String(id))) {
      notFound()
    }
  }

  let { data: vehicle } = await supabase
    .from('DB_STOCK')
    .select('*')
    .eq('ID', id)
    .maybeSingle()

  if (!vehicle) {
    const { data: okmVehicle } = await supabase
      .from('DB_STOCK_OKM')
      .select('*')
      .eq('ID', id)
      .maybeSingle()
    vehicle = okmVehicle
  }

  if (!vehicle) {
    notFound()
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Header
        title={`Editar ${vehicle.Marca || ''} ${vehicle.Modelo || ''}`}
        subtitle={vehicle.Patente ? `Patente ${vehicle.Patente}` : 'Unidad 0KM'}
      />
      <div className="p-6 animate-in">
        <VehicleForm initialData={vehicle} isEditing />
      </div>
    </div>
  )
}
