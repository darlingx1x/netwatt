import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueries } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react'

interface Scenario {
  id: number
  name: string
  status: string
  tariff: { day: number; peak: number; night: number }
  traffic: Record<string, number>
  result: {
    e_base_kwh: string
    e_optimized_kwh: string
    savings_kwh: string
    savings_money: string
    co2_saved_kg: string
    breakdown: { eee: number; alr: number; poe: number; consolidation: number }
  } | null
}

export default function CompareScenariosPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const ids = (params.get('ids') ?? '').split(',').map(Number).filter(Boolean)

  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['scenario', id],
      queryFn: async () => (await api.get<Scenario>(`/scenarios/${id}`)).data,
    })),
  })

  if (queries.some((q) => q.isLoading)) return <Spinner />
  const scenarios = queries.map((q) => q.data).filter((s): s is Scenario => Boolean(s))

  if (scenarios.length < 2) {
    return (
      <div className="text-muted-foreground">
        {t('scenarios.compare_min_two')} {t('scenarios.compare_url_format', { format: '' })}
        <code>/scenarios/compare?ids=1,2</code>
      </div>
    )
  }

  const delta = (key: keyof NonNullable<Scenario['result']>) => {
    if (!scenarios[0].result || !scenarios[1].result) return 0
    const a = Number(scenarios[0].result[key])
    const b = Number(scenarios[1].result[key])
    if (a === 0) return 0
    return ((b - a) / a) * 100
  }

  const breakdownData = [
    { name: 'EEE', ...Object.fromEntries(scenarios.map((s, i) => [`s${i}`, s.result?.breakdown.eee ?? 0])) },
    { name: 'ALR', ...Object.fromEntries(scenarios.map((s, i) => [`s${i}`, s.result?.breakdown.alr ?? 0])) },
    { name: 'PoE', ...Object.fromEntries(scenarios.map((s, i) => [`s${i}`, s.result?.breakdown.poe ?? 0])) },
    {
      name: 'Consol',
      ...Object.fromEntries(scenarios.map((s, i) => [`s${i}`, s.result?.breakdown.consolidation ?? 0])),
    },
  ]

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-3xl font-semibold tracking-tight">{t('scenarios.compare_heading')}</h1>

      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${scenarios.length}, 1fr)` }}>
        {scenarios.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="text-base">
                <Link to={`/scenarios/${s.id}`} className="hover:underline">
                  {s.name}
                </Link>
              </CardTitle>
              <Badge variant="outline">#{s.id}</Badge>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {s.result ? (
                <>
                  <Row label="E_base" value={Math.round(Number(s.result.e_base_kwh)).toLocaleString()} unit={t('common.kwh')} />
                  <Row
                    label="E_opt"
                    value={Math.round(Number(s.result.e_optimized_kwh)).toLocaleString()}
                    unit={t('common.kwh')}
                  />
                  <Row
                    label={t('scenarios.savings_label')}
                    value={Math.round(Number(s.result.savings_kwh)).toLocaleString()}
                    unit={t('common.kwh')}
                    emph
                  />
                  <Row
                    label={t('scenarios.in_money')}
                    value={Math.round(Number(s.result.savings_money)).toLocaleString()}
                    unit={t('common.uzs')}
                    emph
                  />
                  <Row
                    label="CO₂"
                    value={Math.round(Number(s.result.co2_saved_kg)).toLocaleString()}
                    unit={t('common.kg')}
                    emph
                  />
                </>
              ) : (
                <div className="text-muted-foreground">{t('scenarios.result_not_calculated')}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {scenarios.length === 2 && scenarios[0].result && scenarios[1].result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {scenarios[0].name}
              <ArrowRight className="w-4 h-4" />
              {scenarios[1].name}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <DeltaCard label={t('scenarios.delta_savings_kwh')} pct={delta('savings_kwh')} />
            <DeltaCard label={t('scenarios.delta_savings_money')} pct={delta('savings_money')} />
            <DeltaCard label={t('scenarios.delta_co2')} pct={delta('co2_saved_kg')} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('scenarios.by_policies')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={breakdownData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {scenarios.map((s, i) => (
                <Bar
                  key={s.id}
                  dataKey={`s${i}`}
                  name={s.name}
                  fill={['#1e3a8a', '#059669', '#dc2626', '#d97706'][i % 4]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value, unit, emph }: { label: string; value: string; unit: string; emph?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={emph ? 'font-semibold' : 'font-mono'}>
        {value} <span className="text-muted-foreground">{unit}</span>
      </span>
    </div>
  )
}

function DeltaCard({ label, pct }: { label: string; pct: number }) {
  const positive = pct > 0
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold flex items-center gap-1 mt-1 ${positive ? 'text-green-600' : 'text-red-600'}`}>
        {positive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
        {pct > 0 ? '+' : ''}
        {pct.toFixed(1)}%
      </div>
    </div>
  )
}
