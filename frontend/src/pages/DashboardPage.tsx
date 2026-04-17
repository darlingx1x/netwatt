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
import { Plus, FolderKanban, BookOpen, Zap, Leaf, DollarSign, Activity } from 'lucide-react'

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

  const recent = (scenarios ?? []).slice(0, 5)

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {t('dashboard.heading')}, {user?.full_name?.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground">{t('dashboard.hint')}</p>
      </div>

      {isLoading && <Spinner />}

      {!isLoading && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              icon={<Activity className="w-5 h-5 text-blue-600" />}
              label="Сценариев"
              value={scenarios?.length ?? 0}
              subline={`${ready.length} готовы`}
            />
            <StatCard
              icon={<Zap className="w-5 h-5 text-amber-500" />}
              label="Экономия энергии"
              value={totalKwh}
              unit="кВт·ч/год"
            />
            <StatCard
              icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
              label="Экономия средств"
              value={totalMoney}
              unit="сум/год"
            />
            <StatCard
              icon={<Leaf className="w-5 h-5 text-green-600" />}
              label="Снижение CO₂"
              value={totalCo2}
              unit="кг/год"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FolderKanban className="w-4 h-4" />
                  {t('nav.scenarios')}
                </CardTitle>
                <CardDescription>{t('dashboard.hint')}</CardDescription>
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
                <CardDescription>50 моделей оборудования</CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/catalog">
                  <Button variant="outline">{t('nav.catalog')}</Button>
                </Link>
              </CardContent>
            </Card>
            {ready.length >= 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="w-4 h-4" />
                    Сравнить
                  </CardTitle>
                  <CardDescription>Два лучших по экономии</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    to={`/scenarios/compare?ids=${ready
                      .slice(0, 2)
                      .map((s) => s.id)
                      .join(',')}`}
                  >
                    <Button variant="outline">Сравнить</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>

          {recent.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Недавние сценарии</CardTitle>
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
                          {Math.round(Number(s.result.savings_kwh)).toLocaleString()} кВт·ч
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
