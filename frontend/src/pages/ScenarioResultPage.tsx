import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { api } from '@/api/client'
import { useAuth } from '@/store/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { Zap, DollarSign, Leaf, FileSpreadsheet, FileText } from 'lucide-react'
import {
  DeviceCategoryPie,
  DeviceHealthBars,
  PolicyDistributionPie,
  RoiProjectionChart,
  SensitivityPanel,
} from '@/components/ResultEnhancements'

interface Result {
  e_base_kwh: string
  e_optimized_kwh: string
  savings_kwh: string
  savings_money: string
  co2_saved_kg: string
  payback_years: string | null
  npv: string | null
  breakdown: { eee: number; alr: number; poe: number; consolidation: number }
  per_device: Array<{
    vendor: string
    model: string
    quantity: number
    e_base_kwh: number
    e_optimized_kwh: number
    delta_total_kwh: number
  }>
}

interface Scenario {
  id: number
  name: string
  status: 'draft' | 'calculating' | 'ready' | 'failed'
  tariff: { day: number; peak: number; night: number }
  traffic: { day_util: number; peak_util: number; night_util: number; day_hours: number; peak_hours: number; night_hours: number }
  result: Result | null
}

export default function ScenarioResultPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { accessToken } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['scenario', id],
    queryFn: async () => (await api.get<Scenario>(`/scenarios/${id}`)).data,
    refetchInterval: (q) => {
      const s = q.state.data?.status
      return s === 'calculating' || s === 'draft' ? 1000 : false
    },
  })

  if (isLoading || !data) return <Spinner />

  if (data.status === 'calculating' || data.status === 'draft') {
    return (
      <div className="space-y-4 max-w-2xl mx-auto text-center py-12">
        <Spinner size="lg" />
        <div className="text-muted-foreground">{t('result.calculating')}</div>
        <Button
          variant="outline"
          onClick={async () => {
            await api.post(`/scenarios/${id}/calculate`)
            qc.invalidateQueries({ queryKey: ['scenario', id] })
          }}
        >
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  if (data.status === 'failed' || !data.result) {
    return (
      <div className="text-destructive">Error / no result</div>
    )
  }

  const r = data.result
  const savingsKwh = Number(r.savings_kwh)
  const savingsMoney = Number(r.savings_money)
  const co2 = Number(r.co2_saved_kg)

  const breakdownData = [
    { name: 'EEE', value: r.breakdown.eee },
    { name: 'ALR', value: r.breakdown.alr },
    { name: 'PoE sched', value: r.breakdown.poe },
    { name: 'Consolidation', value: r.breakdown.consolidation },
  ]

  // Daily profile — 24h sketch of before/after
  const tp = data.traffic
  const dailyData = Array.from({ length: 24 }, (_, h) => {
    let util = tp.night_util
    if (h >= 8 && h < 18) util = tp.day_util
    if (h >= 10 && h < 14) util = tp.peak_util
    const base = Number(r.e_base_kwh) / 365 / 24 * (util / (tp.day_util || 0.3))
    const opt = base * (Number(r.e_optimized_kwh) / Number(r.e_base_kwh))
    return { hour: `${h}:00`, base: Math.max(0, base), opt: Math.max(0, opt) }
  })

  async function downloadReport(format: 'pdf' | 'xlsx') {
    const url = `/api/scenarios/${id}/report.${format}`
    const headers: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
    const resp = await fetch(url, { headers })
    const blob = await resp.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `scenario_${id}.${format}`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{data.name}</h1>
          <Badge variant="default" className="mt-1">{t(`scenarios.status_${data.status}`)}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => downloadReport('pdf')}>
            <FileText className="w-4 h-4 mr-1" />
            {t('result.export_pdf')}
          </Button>
          <Button variant="outline" onClick={() => downloadReport('xlsx')}>
            <FileSpreadsheet className="w-4 h-4 mr-1" />
            {t('result.export_xlsx')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          icon={<Zap className="w-5 h-5" />}
          label={t('result.kpi_savings_kwh')}
          value={Math.round(savingsKwh)}
          unit="кВт·ч/год"
        />
        <KpiCard
          icon={<DollarSign className="w-5 h-5" />}
          label={t('result.kpi_savings_money')}
          value={Math.round(savingsMoney)}
          unit="сум/год"
        />
        <KpiCard
          icon={<Leaf className="w-5 h-5 text-green-600" />}
          label={t('result.kpi_co2')}
          value={Math.round(co2)}
          unit="кг/год"
        />
      </div>

      {r.payback_years && (
        <Card>
          <CardContent className="py-4 flex flex-wrap gap-6">
            <div>
              <div className="text-xs text-muted-foreground">{t('result.payback')}</div>
              <div className="text-lg font-semibold">
                {Number(r.payback_years).toFixed(1)} {t('result.payback_years')}
              </div>
            </div>
            {r.npv && (
              <div>
                <div className="text-xs text-muted-foreground">{t('result.npv')}</div>
                <div className="text-lg font-semibold">
                  {Math.round(Number(r.npv)).toLocaleString()} сум
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('result.daily_profile')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="base" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.6} />
                <Area type="monotone" dataKey="opt" stroke="#1e3a8a" fill="#3b82f6" fillOpacity={0.7} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('result.policy_stack')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={breakdownData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#1e3a8a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <RoiProjectionChart
        savingsYear={savingsMoney}
        investment={Number((r as unknown as { investment?: number }).investment ?? 0)}
        years={5}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <PolicyDistributionPie breakdown={r.breakdown} />
        <DeviceCategoryPie perDevice={r.per_device} />
      </div>

      <SensitivityPanel baseSavingsKwh={savingsKwh} baseTariffUzs={savingsMoney} />

      <DeviceHealthBars perDevice={r.per_device} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('result.per_device')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3">Vendor / Model</th>
                  <th className="text-right p-3">Qty</th>
                  <th className="text-right p-3">E_base</th>
                  <th className="text-right p-3">E_opt</th>
                  <th className="text-right p-3">ΔE</th>
                </tr>
              </thead>
              <tbody>
                {r.per_device.map((d, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="p-3">
                      {d.vendor} <span className="text-muted-foreground">{d.model}</span>
                    </td>
                    <td className="p-3 text-right">{d.quantity}</td>
                    <td className="p-3 text-right font-mono">
                      {Math.round(d.e_base_kwh).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {Math.round(d.e_optimized_kwh).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-green-600">
                      −{Math.round(d.delta_total_kwh).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode
  label: string
  value: number
  unit: string
}) {
  const [v, setV] = useState(0)
  useEffect(() => {
    setV(value)
  }, [value])
  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          {icon}
          {label}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <AnimatedCounter value={v} fontSize={32} />
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
      </CardContent>
    </Card>
  )
}
