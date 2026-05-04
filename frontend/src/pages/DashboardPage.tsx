import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { useAuth } from '@/store/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import {
  Plus,
  FolderKanban,
  BookOpen,
  Zap,
  Leaf,
  DollarSign,
  Activity,
  GitCompare,
  TrendingUp,
  Info,
} from 'lucide-react'

interface Scenario {
  id: number
  name: string
  status: 'draft' | 'calculating' | 'ready' | 'failed'
  created_at: string
  result: {
    savings_kwh: string
    savings_money: string
    co2_saved_kg: string
  } | null
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const user = useAuth((s) => s.user)

  const { data: scenarios, isLoading } = useQuery({
    queryKey: ['scenarios'],
    queryFn: async () => (await api.get<Scenario[]>('/scenarios')).data,
  })

  const ready = scenarios?.filter((s) => s.status === 'ready' && s.result) ?? []
  const totalKwh = Math.round(ready.reduce((a, s) => a + Number(s.result?.savings_kwh ?? 0), 0))
  const totalMoney = Math.round(ready.reduce((a, s) => a + Number(s.result?.savings_money ?? 0), 0))
  const totalCo2 = Math.round(ready.reduce((a, s) => a + Number(s.result?.co2_saved_kg ?? 0), 0))
  const cumFiveYears = totalMoney * 5

  const recent = (scenarios ?? []).slice(0, 5)

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Hero — плоская карточка с акцентной полосой слева */}
      <div className="relative rounded-xl border border-border bg-card overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-foreground" aria-hidden />
        <div className="p-6 md:p-8 grid md:grid-cols-[1fr_auto] gap-6 items-end">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <span>{t('dashboard.heading')}, {user?.full_name?.split(' ')[0]}</span>
              <span>·</span>
              <span>{t('dashboard.horizon_5y')}</span>
            </div>
            <div className="mt-3 flex items-baseline gap-3 flex-wrap">
              <div className="tabular-nums leading-none">
                <AnimatedCounter value={cumFiveYears} fontSize={64} />
              </div>
              <div className="text-lg text-muted-foreground">{t('common.uzs')}</div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{t('dashboard.calculated_count', { count: ready.length })}</Badge>
              <span>·</span>
              <span>{t('dashboard.ef_grid_note')}</span>
              <span className="text-xs">{t('dashboard.ef_grid_source')}</span>
            </div>
            <div className="mt-5 flex gap-2 flex-wrap">
              <Link to="/scenarios/new">
                <Button>
                  <Plus className="w-4 h-4 mr-1" />
                  {t('dashboard.create_scenario')}
                </Button>
              </Link>
              {ready.length >= 2 && (
                <Link
                  to={`/scenarios/compare?ids=${ready
                    .slice(0, 3)
                    .map((s) => s.id)
                    .join(',')}`}
                >
                  <Button variant="outline">
                    <GitCompare className="w-4 h-4 mr-1" />
                    {t('dashboard.compare_top3')}
                  </Button>
                </Link>
              )}
              <Link to="/methodology">
                <Button variant="outline">
                  <Info className="w-4 h-4 mr-1" />
                  {t('nav.methodology')}
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-1 gap-3 md:min-w-[180px] md:pl-6 md:border-l md:border-border">
            <HeroMetric label={t('dashboard.per_year')} value={totalMoney} unit={t('common.uzs')} />
            <HeroMetric label={t('dashboard.energy')} value={totalKwh} unit={t('common.kwh')} />
            <HeroMetric label="CO₂" value={totalCo2} unit={t('common.kg')} />
          </div>
        </div>
      </div>

      {isLoading && <Spinner />}

      {!isLoading && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              icon={<Activity className="w-5 h-5 text-blue-600" />}
              label={t('dashboard.scenarios_count')}
              value={scenarios?.length ?? 0}
              subline={t('dashboard.calculated_count', { count: ready.length })}
            />
            <StatCard
              icon={<Zap className="w-5 h-5 text-amber-500" />}
              label={t('dashboard.savings_energy_per_year')}
              value={totalKwh}
              unit={t('common.kwh')}
            />
            <StatCard
              icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
              label={t('dashboard.savings_money_per_year')}
              value={totalMoney}
              unit={t('common.uzs')}
            />
            <StatCard
              icon={<Leaf className="w-5 h-5 text-green-600" />}
              label={t('dashboard.savings_co2_per_year')}
              value={totalCo2}
              unit={t('common.kg')}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FolderKanban className="w-4 h-4" />
                  {t('nav.scenarios')}
                </CardTitle>
                <CardDescription>{t('dashboard.scenarios_card_desc')}</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Link to="/scenarios/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-1" />
                    {t('dashboard.create_scenario')}
                  </Button>
                </Link>
                <Link to="/scenarios">
                  <Button variant="outline">{t('nav.scenarios')}</Button>
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="w-4 h-4" />
                  {t('nav.catalog')}
                </CardTitle>
                <CardDescription>{t('dashboard.catalog_card_desc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/catalog">
                  <Button variant="outline">{t('common.open')}</Button>
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="w-4 h-4" />
                  {t('dashboard.golden_card')}
                </CardTitle>
                <CardDescription>{t('dashboard.golden_card_desc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {ready.length > 0 ? (
                  <Link to={`/scenarios/${ready[0].id}`}>
                    <Button variant="outline">{t('common.open')}</Button>
                  </Link>
                ) : (
                  <Link to="/scenarios/new">
                    <Button variant="outline">{t('common.create')}</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>

          {recent.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('dashboard.recent_scenarios')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {recent.map((s) => (
                    <Link
                      key={s.id}
                      to={`/scenarios/${s.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{s.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      {s.result && (
                        <div className="text-sm font-mono">
                          {Math.round(Number(s.result.savings_kwh)).toLocaleString()} {t('common.kwh')}
                        </div>
                      )}
                      <Badge variant={s.status === 'ready' ? 'default' : 'outline'}>
                        {t(`scenarios.status_${s.status}`)}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  unit,
  subline,
}: {
  icon: React.ReactNode
  label: string
  value: number
  unit?: string
  subline?: string
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <AnimatedCounter value={value} fontSize={28} />
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        </div>
        {subline && <div className="text-xs text-muted-foreground mt-1">{subline}</div>}
      </CardContent>
    </Card>
  )
}

function HeroMetric({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-mono font-semibold tabular-nums text-base">
        {value.toLocaleString()}
      </div>
      <div className="text-[10px] text-muted-foreground">{unit}</div>
    </div>
  )
}
