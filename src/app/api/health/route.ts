import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const startTime = Date.now()

export async function GET() {
  const checks: Record<string, { status: 'pass' | 'fail' | 'warn'; latencyMs?: number; message?: string }> = {}

  // 1. Chequeo de Base de Datos (Supabase)
  const dbStart = Date.now()
  try {
    let supabase: any
    try {
      supabase = createAdminClient()
    } catch {
      supabase = await createClient()
    }

    const { error } = await supabase.from('DB_STOCK').select('ID', { count: 'exact', head: true })
    const dbLatency = Date.now() - dbStart

    if (error) {
      checks.database = {
        status: 'warn',
        latencyMs: dbLatency,
        message: `DB reachable with notice: ${error.message}`,
      }
    } else {
      checks.database = {
        status: 'pass',
        latencyMs: dbLatency,
        message: 'PostgreSQL connection operational',
      }
    }
  } catch (err: any) {
    checks.database = {
      status: 'fail',
      latencyMs: Date.now() - dbStart,
      message: err?.message || 'Database connection error',
    }
  }

  // 2. Chequeo de Motor de Inteligencia Artificial (Gemini SDK)
  if (process.env.GEMINI_API_KEY) {
    checks.ai_engine = {
      status: 'pass',
      message: 'Google Gemini SDK key configured and active',
    }
  } else {
    checks.ai_engine = {
      status: 'warn',
      message: 'GEMINI_API_KEY missing - running on algorithmic fallback',
    }
  }

  // 3. Chequeo de Integración MercadoLibre VIS
  if (process.env.MERCADOLIBRE_CLIENT_ID && process.env.MERCADOLIBRE_CLIENT_SECRET) {
    checks.mercadolibre = {
      status: 'pass',
      message: 'MercadoLibre VIS credentials configured',
    }
  } else {
    checks.mercadolibre = {
      status: 'warn',
      message: 'MercadoLibre OAuth credentials incomplete',
    }
  }

  const isHealthy = Object.values(checks).every(c => c.status !== 'fail')
  const status = isHealthy ? 'healthy' : 'degraded'
  const statusCode = isHealthy ? 200 : 503

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0-production',
      checks,
    },
    { status: statusCode }
  )
}
