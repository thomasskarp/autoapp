import { Header } from '@/components/layout/header'
import { VehicleForm } from '@/components/stock/vehicle-form'

export default function NewVehiclePage() {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Header
        title="Nuevo Vehículo"
        subtitle="Cargá una nueva unidad en tu stock"
      />
      <div className="p-6 animate-in">
        <VehicleForm />
      </div>
    </div>
  )
}
