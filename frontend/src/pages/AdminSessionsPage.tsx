import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'

interface SessionItem {
  id: number
  user_id: number
  kind: string
  ip: string | null
  user_agent: string | null
  expires_at: string
  revoked_at: string | null
  created_at: string
}

export default function AdminSessionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => (await api.get<SessionItem[]>('/sessions')).data,
    refetchInterval: 3000,
  })

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Сессии auth_tokens</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Демонстрация подхода «токены в БД вместо JWT» — видно ротацию refresh, детект reuse, expires_at
        </p>
      </div>

      {isLoading && <Spinner />}

      {data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {data.length} токенов · {data.filter((s) => !s.revoked_at).length} активных ·{' '}
              {data.filter((s) => s.revoked_at).length} revoked
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">#</th>
                    <th className="text-left p-3">user</th>
                    <th className="text-left p-3">kind</th>
                    <th className="text-left p-3">IP</th>
                    <th className="text-left p-3">status</th>
                    <th className="text-left p-3">created</th>
                    <th className="text-left p-3">expires</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((s) => {
                    const now = Date.now()
                    const expiresAt = new Date(s.expires_at).getTime()
                    const expired = expiresAt < now
                    const active = !s.revoked_at && !expired
                    return (
                      <tr key={s.id} className="border-t border-border">
                        <td className="p-3 font-mono text-xs">{s.id}</td>
                        <td className="p-3">#{s.user_id}</td>
                        <td className="p-3">
                          <Badge variant={s.kind === 'access' ? 'secondary' : 'outline'}>{s.kind}</Badge>
                        </td>
                        <td className="p-3 font-mono text-xs">{s.ip ?? '—'}</td>
                        <td className="p-3">
                          {active && <Badge>active</Badge>}
                          {s.revoked_at && <Badge variant="destructive">revoked</Badge>}
                          {expired && !s.revoked_at && <Badge variant="outline">expired</Badge>}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {new Date(s.created_at).toLocaleString()}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {new Date(s.expires_at).toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
