import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Sliders } from 'lucide-react'

interface Breakdown {
  eee: number
  alr: number
  poe: number
  consolidation: number
}

interface PerDevice {
  vendor: string
  model: string
  quantity: number
  e_base_kwh: number
  e_optimized_kwh: number
  delta_total_kwh: number
  delta_by_policy?: Record<string, number>
}

const CATEGORY_COLORS = [
  '#1e3a8a', '#059669', '#dc2626', '#d97706',
  '#7c3aed', '#0891b2', '#be185d', '#4d7c0f',
]

export function RoiProjectionChart({
  savingsYear,
  investment = 0,
  discount = 0.12,
  years = 5,
}: {
  savingsYear: number
  investment?: number
  discount?: number
  years?: number
}) {
  const { t } = useTranslation()
  const data = useMemo(() => {
    const rows: Array<{ year: string; cum: number; savings: number; discounted: number }> = []
    let cum = -investment
    for (let y = 1; y <= years; y++) {
      cum += savingsYear
      const discounted = savingsYear / Math.pow(1 + discount, y)
      rows.push({
        year: `Y${y}`,
        cum,
        savings: savingsYear * y,
        discounted: rows.length
          ? rows[rows.length - 1].discounted + discounted
          : discounted,
      })
    }
    return rows
  }, [savingsYear, investment, discount, years])

  const cumTotal = data[data.length - 1]?.cum ?? 0
  const payback =
    investment > 0 && savingsYear > 0
      ? (investment / savingsYear).toFixed(1)
      : '<1'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          {t('result.cumulative_savings', { years })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">{t('result.total_sum')}</div>
            <div className="text-2xl font-bold text-emerald-600">
              {Math.round(cumTotal).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">{t('common.uzs')}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">{t('result.payback')}</div>
            <div className="text-2xl font-bold">
              {payback} <span className="text-sm text-muted-foreground">{t('result.payback_years')}</span>
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">NPV (r={(discount * 100).toFixed(0)}%)</div>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round((data[data.length - 1]?.discounted ?? 0) - investment).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">{t('common.uzs')}</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} />
            <Tooltip formatter={(v: number) => `${Math.round(v).toLocaleString()} ${t('common.uzs')}`} />
            <Legend />
            <Area
              type="monotone"
              dataKey="cum"
              name={t('result.cumulative_savings', { years })}
              stroke="#059669"
              fill="#10b981"
              fillOpacity={0.3}
            />
            <Area
              type="monotone"
              dataKey="discounted"
              name={`${t('result.npv')} (NPV)`}
              stroke="#2563eb"
              fill="#3b82f6"
              fillOpacity={0.15}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function PolicyDistributionPie({ breakdown }: { breakdown: Breakdown }) {
  const { t } = useTranslation()
  const data = [
    { name: 'EEE', value: breakdown.eee, color: '#1e3a8a' },
    { name: 'ALR', value: breakdown.alr, color: '#059669' },
    { name: 'PoE Sched', value: breakdown.poe, color: '#d97706' },
    { name: 'Consolidation', value: breakdown.consolidation, color: '#7c3aed' },
  ].filter((d) => d.value > 0)

  const total = data.reduce((a, b) => a + b.value, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('result.policy_share')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={85}
              innerRadius={45}
              dataKey="value"
              label={({ name, value }) =>
                total > 0 ? `${name} ${((value / total) * 100).toFixed(0)}%` : name
              }
              labelLine={false}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => `${Math.round(v).toLocaleString()} ${t('common.kwh')}`} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function DeviceCategoryPie({ perDevice }: { perDevice: PerDevice[] }) {
  const { t } = useTranslation()
  const categoryMap = new Map<string, number>()
  for (const d of perDevice) {
    const prev = categoryMap.get(d.vendor) ?? 0
    categoryMap.set(d.vendor, prev + d.e_base_kwh)
  }
  const data = Array.from(categoryMap.entries())
    .map(([name, value], i) => ({ name, value, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))
    .sort((a, b) => b.value - a.value)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('result.vendor_share')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={85}
              dataKey="value"
              label={({ name, percent }) =>
                percent && percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
              }
              labelLine={false}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => `${Math.round(v).toLocaleString()} ${t('common.kwh_per_year')}`} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function SensitivityPanel({
  baseSavingsKwh,
  baseTariffUzs,
  initialEta = 0.5,
  initialAlrDrop = 0.4,
  initialPoeOffHours = 12,
}: {
  baseSavingsKwh: number
  baseTariffUzs: number
  initialEta?: number
  initialAlrDrop?: number
  initialPoeOffHours?: number
}) {
  const { t } = useTranslation()
  const [eta, setEta] = useState(initialEta)
  const [alrDrop, setAlrDrop] = useState(initialAlrDrop)
  const [poeHours, setPoeHours] = useState(initialPoeOffHours)

  // Simple linear scaling — shows dependency shape, not exact recalc
  const etaFactor = eta / initialEta
  const alrFactor = alrDrop / initialAlrDrop
  const poeFactor = poeHours / initialPoeOffHours

  // Weight each contribution equally; in reality engine handles it, but this gives instant UX feedback
  const projectedKwh = Math.round(
    baseSavingsKwh * (0.4 * etaFactor + 0.3 * alrFactor + 0.3 * poeFactor),
  )
  const projectedUzs = Math.round(projectedKwh * (baseTariffUzs / Math.max(1, baseSavingsKwh)))

  const line = Array.from({ length: 21 }, (_, i) => {
    const x = i / 20
    return {
      eta: x,
      kwh: Math.round(baseSavingsKwh * (0.4 * (x / initialEta) + 0.3 * alrFactor + 0.3 * poeFactor)),
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sliders className="w-5 h-5 text-blue-600" />
          {t('result.what_if')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <Slider
            label={t('result.what_if_eta_label')}
            value={eta}
            onChange={setEta}
            min={0.1}
            max={0.8}
            step={0.05}
            format={(v) => v.toFixed(2)}
          />
          <Slider
            label={t('result.what_if_alr_label')}
            value={alrDrop}
            onChange={setAlrDrop}
            min={0.1}
            max={0.7}
            step={0.05}
            format={(v) => v.toFixed(2)}
          />
          <Slider
            label={t('result.what_if_poe_label')}
            value={poeHours}
            onChange={setPoeHours}
            min={0}
            max={20}
            step={1}
            format={(v) => `${v} ${t('common.hour_short')}`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <div>
            <div className="text-xs text-muted-foreground">{t('result.what_if_projected')}</div>
            <div className="text-2xl font-bold text-emerald-600">
              {projectedKwh.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{t('common.kwh_per_year')}</span>
            </div>
            <Badge variant={projectedKwh > baseSavingsKwh ? 'default' : 'secondary'}>
              {projectedKwh > baseSavingsKwh ? '+' : ''}
              {(((projectedKwh - baseSavingsKwh) / Math.max(1, baseSavingsKwh)) * 100).toFixed(1)}% {t('result.what_if_vs_base')}
            </Badge>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t('result.what_if_in_money')}</div>
            <div className="text-2xl font-bold">
              {projectedUzs.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{t('common.uzs_per_year')}</span>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={line}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="eta" tick={{ fontSize: 10 }} label={{ value: 'η_EEE', position: 'bottom', fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => `${Math.round(v).toLocaleString()} ${t('common.kwh')}`} />
            <Line type="monotone" dataKey="kwh" stroke="#1e3a8a" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground">
          {t('result.what_if_disclaimer')}
        </p>
      </CardContent>
    </Card>
  )
}

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  format: (v: number) => string
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  )
}

export function DeviceHealthBars({ perDevice }: { perDevice: PerDevice[] }) {
  const { t } = useTranslation()
  const data = perDevice
    .map((d) => ({
      name: `${d.vendor} ${d.model}`.slice(0, 25),
      base: d.e_base_kwh * d.quantity,
      opt: d.e_optimized_kwh * d.quantity,
      saving: d.delta_total_kwh * d.quantity,
    }))
    .slice(0, 12)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('result.device_health')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
          <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
            <Tooltip formatter={(v: number) => `${Math.round(v).toLocaleString()} ${t('common.kwh')}`} />
            <Legend />
            <Bar dataKey="opt" stackId="a" fill="#1e3a8a" name={t('result.after_opt')} />
            <Bar dataKey="saving" stackId="a" fill="#10b981" name={t('result.saving')} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
