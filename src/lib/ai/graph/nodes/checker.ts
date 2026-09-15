// ─── Node 5: Independent Quality & Margin Checker ─────────────────────────────
// "An agent should never grade its own homework" — deterministic evaluation gate

import { AutoAppState, QualityValidation } from '../state'

export async function qualityCheckerNode(state: AutoAppState): Promise<Partial<AutoAppState>> {
  const v = state.draftVehicle
  const val = state.officialValuation
  const errors: string[] = []
  const warnings: string[] = []

  // 1. Integridad de Parámetros Obligatorios
  if (!v) {
    return {
      validation: {
        passed: false,
        errors: ['No existe vehículo en borrador para evaluar.'],
        warnings: [],
        checkerName: 'quality_checker',
        timestamp: Date.now()
      },
      requiresConfirmation: false
    }
  }

  if (!v.marca || v.marca.length < 2) errors.push('Marca vehicular no especificada o inválida.')
  if (!v.modelo || v.modelo.length < 2) errors.push('Modelo vehicular no especificado o inválido.')

  const currentYear = new Date().getFullYear()
  if (!v.anio || v.anio < 1990 || v.anio > currentYear + 1) {
    errors.push(`Año (${v.anio}) fuera del rango permitido (1990 - ${currentYear + 1}).`)
  }

  if (v.km < 0) {
    errors.push(`Kilometraje (${v.km}) no puede ser negativo.`)
  }

  if (!v.precio_venta || v.precio_venta <= 0) {
    errors.push('El precio de venta informado es cero o inválido.')
  }

  // 2. Control de Coherencia de Precios contra Catálogo InfoAuto
  if (val && v.precio_venta) {
    // Si el precio de venta es menor que el 65% del valor de tabla, alerta por desfasaje grave
    const minPlausible = val.tablePrice * 0.65
    const maxPlausible = val.tablePrice * 1.50

    if (v.precio_venta < minPlausible) {
      warnings.push(`⚠️ El precio publicado ($${v.precio_venta.toLocaleString('es-AR')}) es un 35%+ menor que la tabla InfoAuto ($${val.tablePrice.toLocaleString('es-AR')}). Revisá si falta algún cero.`)
    } else if (v.precio_venta > maxPlausible) {
      warnings.push(`⚠️ El precio publicado ($${v.precio_venta.toLocaleString('es-AR')}) supera ampliamente la tabla de referencia ($${val.tablePrice.toLocaleString('es-AR')}).`)
    }
  }

  // 3. Inspección de Fotos
  if (state.photoUrls.length === 0) {
    warnings.push('Sin fotografías adjuntas. La publicación saldrá sin foto de portada hasta que se carguen.')
  }

  const passed = errors.length === 0

  const validation: QualityValidation = {
    passed,
    errors,
    warnings,
    checkerName: 'quality_checker',
    timestamp: Date.now()
  }

  const formattedPrice = v.precio_venta ? `$${v.precio_venta.toLocaleString('es-AR')}` : 'Consultar'
  const confirmationPrompt = passed
    ? `¿Deseas confirmar el ingreso al Stock y publicar en MercadoLibre y redes por ${formattedPrice}? *(Respondé "Sí, publicar" o hacé clic en el botón)*`
    : undefined

  return {
    validation,
    requiresConfirmation: passed,
    confirmationPrompt
  }
}
