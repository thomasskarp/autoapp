'use client'

import { Vehicle } from '@/lib/supabase/types'
import { formatBodyType } from '@/lib/utils'
import { FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'

interface Props {
  vehicles: Vehicle[]
}

function normalizeBrand(b?: string | null): string {
  if (!b) return 'OTRAS'
  let clean = b.trim().toUpperCase().replace(/\.$/, '')
  if (clean === 'MERCEDES BENZ') clean = 'MERCEDES-BENZ'
  return clean
}

function sortByBrandAndModel(list: Vehicle[]): Vehicle[] {
  return [...list].sort((a, b) => {
    const brandA = normalizeBrand(a.Marca)
    const brandB = normalizeBrand(b.Marca)
    const brandCompare = brandA.localeCompare(brandB, 'es', { sensitivity: 'base' })
    if (brandCompare !== 0) return brandCompare

    const modelA = (a.Modelo || '').trim()
    const modelB = (b.Modelo || '').trim()
    const modelCompare = modelA.localeCompare(modelB, 'es', { sensitivity: 'base' })
    if (modelCompare !== 0) return modelCompare

    return (b.Año || 0) - (a.Año || 0)
  })
}

export function ExportExcelButton({ vehicles }: Props) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (!vehicles || vehicles.length === 0) {
      alert('No hay vehículos en el inventario para exportar.')
      return
    }

    setExporting(true)
    try {
      // Dynamic import to keep initial page bundle small and fast
      const XLSX = await import('xlsx')

      const headers = [
        'Categoría',
        'Marca',
        'Segmento',
        'Modelo',
        'Versión',
        'Año',
        'Kilometraje',
        'Precio Venta',
        'Observaciones'
      ]

      const mapVehicleToRow = (v: Vehicle) => {
        const isOkm = (v.Tipo_Vehiculo || '').toLowerCase() === '0km'
        const categoria = isOkm ? '0KM' : 'Usado'
        const marca = normalizeBrand(v.Marca)
        const segmento = formatBodyType(v.Tipo_Carroceria)
        const modelo = v.Modelo || ''
        const version = v.Version || ''
        const año = v.Año || ''

        let kmStr = '0 km'
        if (!isOkm && v.Km != null && v.Km > 0) {
          kmStr = `${new Intl.NumberFormat('es-AR').format(v.Km)} km`
        } else if (isOkm) {
          kmStr = '0 km'
        }

        let precioStr = 'Consultar'
        if (v.Precio_Venta && v.Precio_Venta > 0) {
          const formattedNum = new Intl.NumberFormat('es-AR').format(v.Precio_Venta)
          precioStr = `ARS ${formattedNum}`
        }

        let obs = (v.Descripcion || '').trim()
        if (!obs && v.Precio_entrega && v.Precio_entrega > 0) {
          obs = `Entrega $${new Intl.NumberFormat('es-AR').format(v.Precio_entrega)}`
        }

        return [categoria, marca, segmento, modelo, version, año, kmStr, precioStr, obs]
      }

      const usadosSorted = sortByBrandAndModel(
        vehicles.filter(v => (v.Tipo_Vehiculo || 'Usado').toLowerCase() !== '0km')
      )
      const okmSorted = sortByBrandAndModel(
        vehicles.filter(v => (v.Tipo_Vehiculo || '').toLowerCase() === '0km')
      )
      const todosSorted = sortByBrandAndModel(vehicles)

      const usadosRows = usadosSorted.map(mapVehicleToRow)
      const okmRows = okmSorted.map(mapVehicleToRow)
      const todosRows = todosSorted.map(mapVehicleToRow)

      const wb = XLSX.utils.book_new()
      const wsUsados = XLSX.utils.aoa_to_sheet([headers, ...usadosRows])
      const wsOkm = XLSX.utils.aoa_to_sheet([headers, ...okmRows])
      const wsCompleto = XLSX.utils.aoa_to_sheet([headers, ...todosRows])

      const colWidths = [
        { wch: 14 },
        { wch: 18 },
        { wch: 16 },
        { wch: 24 },
        { wch: 22 },
        { wch: 10 },
        { wch: 18 },
        { wch: 20 },
        { wch: 45 }
      ]

      wsUsados['!cols'] = colWidths
      wsOkm['!cols'] = colWidths
      wsCompleto['!cols'] = colWidths

      XLSX.utils.book_append_sheet(wb, wsUsados, 'Stock Usados')
      XLSX.utils.book_append_sheet(wb, wsOkm, 'Stock 0KM')
      XLSX.utils.book_append_sheet(wb, wsCompleto, 'Inventario Completo')

      const dateStr = new Date().toISOString().split('T')[0]
      XLSX.writeFile(wb, `Stock_Vehiculos_AutoApp_${dateStr}.xlsx`)
    } catch (err) {
      console.error('Error generating Excel file:', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      title="Descargar inventario en formato Excel nativo (.xlsx)"
      className="px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all hover:bg-[#FACC1525]"
      style={{
        background: '#FACC1515',
        color: '#FACC15',
        border: '1px solid #FACC1540',
        cursor: exporting ? 'wait' : 'pointer'
      }}>
      <FileSpreadsheet size={15} />
      <span>{exporting ? 'Generando Excel...' : 'Descargar Excel'}</span>
    </button>
  )
}
