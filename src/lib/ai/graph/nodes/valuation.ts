// ─── Node 3: Market Valuation Matcher ─────────────────────────────────────────
import { AutoAppState, OfficialValuationResult } from '../state'

export async function valuationNode(state: AutoAppState): Promise<Partial<AutoAppState>> {
  const v = state.draftVehicle
  if (!v) return {}

  const marca = v.marca
  const modelo = v.modelo
  const anio = v.anio

  let matchedResult: OfficialValuationResult | undefined

  try {
    // 1. Invocar el motor de cotizaciones InfoAuto interno
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const queryParams = new URLSearchParams({
      marca: marca || '',
      modelo: modelo || '',
      anio: String(anio || '')
    })

    const res = await fetch(`${apiUrl}/api/infoauto/versions?${queryParams.toString()}`)
    if (res.ok) {
      const data = await res.json()
      const firstMatch = data?.versions?.[0]
      if (firstMatch && firstMatch.precio > 0) {
        const tablePrice = Number(firstMatch.precio)
        // Margen estándar comercial concesionaria (18% de toma por debajo de tabla)
        const suggestedPurchase = Math.round(tablePrice * 0.82)
        const suggestedSale = v.precio_venta || Math.round(tablePrice * 1.05)
        const marginPercent = Math.round(((suggestedSale - suggestedPurchase) / suggestedSale) * 100)

        matchedResult = {
          tablePrice,
          suggestedPurchasePrice: suggestedPurchase,
          suggestedSalePrice: suggestedSale,
          marginPercent,
          liquidity: 'ALTA',
          matchedModel: firstMatch.modelo || modelo,
          matchedVersion: firstMatch.version || v.version || '',
          source: data.source === 'postgres' ? 'POSTGRES_PG_TRGM' : 'IN_MEMORY_MAP'
        }
      }
    }
  } catch (err) {
    console.warn('[Valuation Node] Error consultando motor InfoAuto:', err)
  }

  // Fallback heurístico si no hay match directo en base
  if (!matchedResult) {
    const estimatedTable = v.precio_venta ? Math.round(v.precio_venta * 0.95) : 15000000
    matchedResult = {
      tablePrice: estimatedTable,
      suggestedPurchasePrice: Math.round(estimatedTable * 0.80),
      suggestedSalePrice: v.precio_venta || estimatedTable,
      marginPercent: 20,
      liquidity: 'MEDIA',
      matchedModel: modelo,
      matchedVersion: v.version || '',
      source: 'AI_HEURISTIC'
    }
  }

  return {
    officialValuation: matchedResult
  }
}
