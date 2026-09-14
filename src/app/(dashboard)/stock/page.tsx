import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { StockTable } from '@/components/stock/stock-table'
import { ExportExcelButton } from '@/components/stock/export-excel-button'
import { Vehicle } from '@/lib/supabase/types'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function StockPage() {
  const supabase = await createClient()

  // Fetch Usados, 0KM, and secondary photo tables in parallel
  const [usadosRes, okmRes, fotosRes, fotosOkmRes] = await Promise.all([
    supabase.from('DB_STOCK').select('*').order('createdAt', { ascending: false }),
    supabase.from('DB_STOCK_OKM').select('*').order('createdAt', { ascending: false }),
    supabase.from('DB_FOTOS').select('ID_AUTO, FOTO_ARCHIVO'),
    supabase.from('DB_FOTOS_OKM').select('ID_AUTO, FOTO_ARCHIVO'),
  ])

  const photoMap: Record<string, string[]> = {}
  ;(fotosRes.data ?? []).forEach((f: any) => {
    if (f.ID_AUTO && f.FOTO_ARCHIVO) {
      if (!photoMap[f.ID_AUTO]) photoMap[f.ID_AUTO] = []
      if (!photoMap[f.ID_AUTO].includes(f.FOTO_ARCHIVO)) photoMap[f.ID_AUTO].push(f.FOTO_ARCHIVO)
    }
  })
  ;(fotosOkmRes.data ?? []).forEach((f: any) => {
    if (f.ID_AUTO && f.FOTO_ARCHIVO) {
      if (!photoMap[f.ID_AUTO]) photoMap[f.ID_AUTO] = []
      if (!photoMap[f.ID_AUTO].includes(f.FOTO_ARCHIVO)) photoMap[f.ID_AUTO].push(f.FOTO_ARCHIVO)
    }
  })

  const mergeVehiclePhotos = (v: any, isOkm: boolean): Vehicle => {
    const carId = v.ID
    const dbFotos = photoMap[carId] || []
    const rawPortada = v.FOTO_PORTADA?.trim() || ''
    
    // Parse existing FOTOS_EXTRA
    const existingExtra: string[] = []
    if (v.FOTOS_EXTRA) {
      if (typeof v.FOTOS_EXTRA === 'string' && v.FOTOS_EXTRA.trim()) {
        const str = v.FOTOS_EXTRA.trim()
        if (str.startsWith('[') && str.endsWith(']')) {
          try {
            const parsed = JSON.parse(str)
            if (Array.isArray(parsed)) {
              parsed.forEach((u: string) => { if (typeof u === 'string' && u.trim()) existingExtra.push(u.trim()) })
            }
          } catch (e) {}
        }
        if (existingExtra.length === 0) {
          str.split(/[,;\n\r]+/).forEach((u: string) => { if (u.trim()) existingExtra.push(u.trim()) })
        }
      }
    }

    // Merge portada + extra + DB_FOTOS deduplicated
    const mergedList: string[] = []
    if (rawPortada) mergedList.push(rawPortada)
    existingExtra.forEach(u => { if (!mergedList.includes(u)) mergedList.push(u) })
    dbFotos.forEach(u => { if (!mergedList.includes(u)) mergedList.push(u) })

    const portada = mergedList.length > 0 ? mergedList[0] : null
    const extraList = mergedList.length > 1 ? mergedList.slice(1) : []

    return {
      ...v,
      FOTO_PORTADA: portada,
      FOTOS_EXTRA: extraList.length > 0 ? JSON.stringify(extraList) : null,
      Tipo_Vehiculo: isOkm ? '0km' : 'Usado',
      is_okm_table: isOkm,
      Km: isOkm ? (v.Km ?? 0) : v.Km,
    }
  }

  const usados: Vehicle[] = (usadosRes.data ?? []).map(v => mergeVehiclePhotos(v, false))
  const okm: Vehicle[] = (okmRes.data ?? []).map(v => mergeVehiclePhotos(v, true))

  const allVehicles = [...usados, ...okm]

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Header
        title="Stock"
        actions={
          <div className="flex items-center gap-2">
            <ExportExcelButton vehicles={allVehicles} />
            <Link href="/stock/nuevo" className="btn-primary">
              <Plus size={16} /> Nuevo Vehículo
            </Link>
          </div>
        }
      />
      <div className="p-6 animate-in">
        <StockTable vehicles={allVehicles} />
      </div>
    </div>
  )
}
