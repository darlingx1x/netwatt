import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'

interface Equipment {
  id: number
  vendor: string
  model: string
  category: string
  ports_total: number
  poe_ports: number
  poe_budget_w: string
  p_idle_w: string
  p_max_w: string
  eee_supported: boolean
  alr_supported: boolean
  poe_scheduling: boolean
  year_released: number | null
}

interface ListResp {
  items: Equipment[]
  total: number
}

const categoryLabel: Record<string, string> = {
  access_switch: 'Access',
  distribution_switch: 'Distribution',
  core_switch: 'Core',
  router: 'Router',
  wifi_ap: 'Wi-Fi AP',
  server: 'Server',
  ups: 'UPS',
  firewall: 'Firewall',
}

export default function CatalogPage() {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState<string>('')
  const { data, isLoading } = useQuery({
    queryKey: ['equipment', q, category],
    queryFn: async () =>
      (
        await api.get<ListResp>('/equipment', {
          params: { q: q || undefined, category: category || undefined, limit: 500 },
        })
      ).data,
  })

  return (
    <div className="space-y-4 max-w-6xl">
      <h1 className="text-3xl font-semibold tracking-tight">{t('catalog.heading')}</h1>
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder={t('catalog.filter_q')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">{t('catalog.filter_category')}</option>
          {Object.entries(categoryLabel).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        {data && <span className="text-sm text-muted-foreground">{data.total}</span>}
      </div>

      {isLoading && <Spinner />}

      <div className="grid gap-2">
        {data?.items.map((e) => (
          <Card key={e.id}>
            <CardContent className="py-3 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <div className="font-medium">
                  {e.vendor} <span className="text-muted-foreground">{e.model}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {categoryLabel[e.category] ?? e.category}
                  {e.year_released ? ` · ${e.year_released}` : ''}
                </div>
              </div>
              <div className="text-sm">
                {t('catalog.ports')}: {e.ports_total}
                {e.poe_ports > 0 && ` (PoE ${e.poe_ports})`}
              </div>
              <div className="text-sm font-mono">
                {Math.round(Number(e.p_idle_w))}→{Math.round(Number(e.p_max_w))}W
              </div>
              <div className="flex gap-1">
                {e.eee_supported && <Badge variant="secondary">EEE</Badge>}
                {e.alr_supported && <Badge variant="secondary">ALR</Badge>}
                {e.poe_scheduling && <Badge variant="secondary">PoE‑sched</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
