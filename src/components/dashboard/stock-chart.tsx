'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface BrandData { name: string; count: number }

const COLORS = ['#FACC15', '#FDE047', '#FF6B35', '#F59E0B', '#FDE047', '#EC4899', '#8B5CF6', '#FACC15']

export function StockByBrandChart({ data }: { data: BrandData[] }) {
  return (
    <div className="card p-5 h-full" style={{ minHeight: '240px' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold" style={{ color: '#E8EAED' }}>Stock por Marca</h3>
          <p className="text-xs mt-0.5" style={{ color: '#8B8FA8' }}>Vehículos disponibles</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-32" style={{ color: '#555870' }}>
          <p className="text-sm">Sin datos de stock</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: '#8B8FA8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#8B8FA8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: '#13161F',
                border: '1px solid #2A2F45',
                borderRadius: '8px',
                color: '#E8EAED',
                fontSize: '13px',
              }}
              cursor={{ fill: '#FACC1510' }}
              formatter={(value: any) => [value, 'Unidades']}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
