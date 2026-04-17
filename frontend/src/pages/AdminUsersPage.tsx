import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { useAuth } from '@/store/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Plus, UserX } from 'lucide-react'

interface User {
  id: number
  email: string
  full_name: string
  role: 'admin' | 'engineer'
  lang: string
  is_active: boolean
}

export default function AdminUsersPage() {
  const me = useAuth((s) => s.user)
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get<User[]>('/users')).data,
  })

  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'engineer' | 'admin'>('engineer')

  const create = useMutation({
    mutationFn: async () => {
      await api.post('/auth/register', {
        email: newEmail,
        full_name: newName,
        password: newPassword,
        role: newRole,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setNewEmail('')
      setNewName('')
      setNewPassword('')
    },
  })

  const toggleActive = useMutation({
    mutationFn: async (u: User) => {
      await api.patch(`/users/${u.id}`, { is_active: !u.is_active })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-3xl font-semibold tracking-tight">Users</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New user
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Input
            placeholder="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <Input
            placeholder="full name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Input
            type="password"
            placeholder="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as 'admin' | 'engineer')}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="engineer">engineer</option>
            <option value="admin">admin</option>
          </select>
          <Button
            disabled={!newEmail || !newName || !newPassword || create.isPending}
            onClick={() => create.mutate()}
          >
            Add
          </Button>
        </CardContent>
      </Card>

      {isLoading && <Spinner />}
      {data && (
        <div className="space-y-2">
          {data.map((u) => (
            <Card key={u.id}>
              <CardContent className="py-3 flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-medium">{u.full_name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </div>
                <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>{u.role}</Badge>
                {u.is_active ? (
                  <Badge variant="outline">active</Badge>
                ) : (
                  <Badge variant="destructive">inactive</Badge>
                )}
                {u.id !== me?.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive.mutate(u)}
                  >
                    <UserX className="w-4 h-4 mr-1" />
                    {u.is_active ? 'deactivate' : 'activate'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
