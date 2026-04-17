import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'

interface AuditLogItem {
  id: number
  user_id: number | null
  action: string
  entity: string
  entity_id: number | null
  meta: Record<string, unknown> | null
  created_at: string
}

const methodColor: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  POST: 'default',
  PATCH: 'secondary',
  PUT: 'secondary',
  DELETE: 'destructive',
}

export default function AdminAuditPage() {
  const [entity, setEntity] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['audit', entity],
    queryFn: async () =>
      (await api.get<AuditLogItem[]>('/audit', { params: { entity: entity || undefined, limit: 300 } })).data,
    refetchInterval: 5000,
  })

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-3xl font-semibold tracking-tight">Журнал аудита</h1>
        <Input
          placeholder="Фильтр по сущности (scenarios, equipment, users...)"
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          className="w-80"
        />
      </div>

      {isLoading && <Spinner />}

      {data && data.length === 0 && (
        <div className="text-muted-foreground">Событий нет. Сделай POST/PATCH/DELETE — запись появится.</div>
      )}

      {data && data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{data.length} последних записей (auto-refresh 5s)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border max-h-[70vh] overflow-y-auto">
              {data.map((e) => (
                <div key={e.id} className="px-4 py-3 flex flex-wrap items-center gap-3 text-sm">
                  <Badge variant={methodColor[e.action] ?? 'outline'}>{e.action}</Badge>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded">{e.entity}</code>
                  {e.entity_id && <span className="text-muted-foreground">#{e.entity_id}</span>}
                  {e.meta && (
                    <span className="text-xs text-muted-foreground truncate">
                      {JSON.stringify(e.meta)}
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                    {e.user_id && <span>user #{e.user_id}</span>}
                    <span>{new Date(e.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
