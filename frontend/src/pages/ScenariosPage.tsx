import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { Plus, FolderKanban } from 'lucide-react'

interface Scenario {
  id: number
  name: string
  status: 'draft' | 'calculating' | 'ready' | 'failed'
  created_at: string
  notes: string | null
  result: { savings_kwh: string } | null
}

const statusVariant: Record<Scenario['status'], 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  calculating: 'secondary',
  ready: 'default',
  failed: 'destructive',
}

export default function ScenariosPage() {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({
    queryKey: ['scenarios'],
    queryFn: async () => (await api.get<Scenario[]>('/scenarios')).data,
  })

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">{t('scenarios.heading')}</h1>
        <Link to="/scenarios/new">
          <Button>
            <Plus className="w-4 h-4 mr-1" />
            {t('scenarios.new')}
          </Button>
        </Link>
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
          {data.map((s) => (
            <Link key={s.id} to={`/scenarios/${s.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="truncate">{s.name}</CardTitle>
                    <Badge variant={statusVariant[s.status]}>{t(`scenarios.status_${s.status}`)}</Badge>
                  </div>
                  {s.notes && <CardDescription className="line-clamp-2">{s.notes}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {t('scenarios.created_at')}: {new Date(s.created_at).toLocaleDateString()}
                  </div>
                  {s.result && (
                    <div className="mt-2">
                      <span className="text-muted-foreground text-sm">{t('scenarios.savings_kwh')}: </span>
                      <span className="font-semibold">
                        {Math.round(Number(s.result.savings_kwh)).toLocaleString()}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
