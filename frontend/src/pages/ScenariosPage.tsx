import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { Plus, FolderKanban, GitCompare, Check } from 'lucide-react'

interface Scenario {
  id: number
  name: string
  status: 'draft' | 'calculating' | 'ready' | 'failed'
  created_at: string
  notes: string | null
  owner_id: number
  result: { savings_kwh: string; savings_money: string } | null
}

const statusVariant: Record<Scenario['status'], 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  calculating: 'secondary',
  ready: 'default',
  failed: 'destructive',
}

export default function ScenariosPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['scenarios'],
    queryFn: async () => (await api.get<Scenario[]>('/scenarios')).data,
  })
  const [selected, setSelected] = useState<Set<number>>(new Set())

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-3xl font-semibold tracking-tight">{t('scenarios.heading')}</h1>
        <div className="flex gap-2">
          {selected.size >= 2 && (
            <Button
              variant="outline"
              onClick={() =>
                nav(`/scenarios/compare?ids=${Array.from(selected).slice(0, 4).join(',')}`)
              }
            >
              <GitCompare className="w-4 h-4 mr-1" />
              Сравнить ({selected.size})
            </Button>
          )}
          <Link to="/scenarios/new">
            <Button>
              <Plus className="w-4 h-4 mr-1" />
              {t('scenarios.new')}
            </Button>
          </Link>
        </div>
      </div>

      {isLoading && <Spinner />}

      {!isLoading && data && data.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderKanban className="w-6 h-6" />
            </EmptyMedia>
            <EmptyTitle>{t('scenarios.empty_title')}</EmptyTitle>
            <EmptyDescription>{t('scenarios.empty_description')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((s) => {
            const canSelect = s.status === 'ready'
            const isSelected = selected.has(s.id)
            return (
              <Card
                key={s.id}
                className={`relative transition ${isSelected ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
              >
                <Link to={`/scenarios/${s.id}`} className="block">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="truncate">{s.name}</CardTitle>
                      {canSelect ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggle(s.id)
                          }}
                          className={`shrink-0 inline-flex items-center gap-1 h-6 px-2 rounded-md text-xs font-medium border transition ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-foreground border-border hover:border-primary'
                          }`}
                          aria-pressed={isSelected}
                          title={isSelected ? 'Убрать из сравнения' : 'Выбрать для сравнения'}
                        >
                          {isSelected ? <Check className="w-3 h-3" /> : null}
                          {t(`scenarios.status_${s.status}`)}
                        </button>
                      ) : (
                        <Badge variant={statusVariant[s.status]} className="shrink-0">
                          {t(`scenarios.status_${s.status}`)}
                        </Badge>
                      )}
                    </div>
                    {s.notes && (
                      <CardDescription className="line-clamp-2">{s.notes}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      {t('scenarios.created_at')}: {new Date(s.created_at).toLocaleDateString()}
                    </div>
                    {s.result && (
                      <div className="mt-2 flex gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground">кВт·ч/год</div>
                          <div className="font-semibold">
                            {Math.round(Number(s.result.savings_kwh)).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">сум/год</div>
                          <div className="font-semibold">
                            {Math.round(Number(s.result.savings_money)).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Link>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
