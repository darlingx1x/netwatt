import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import DeleteButton from '@/components/ui/delete-button'

interface Equipment {
  id: number
  vendor: string
  model: string
  category: string
  ports_total: number
  p_idle_w: string
  p_max_w: string
}

export default function AdminEquipmentPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['equipment-admin'],
    queryFn: async () =>
      (await api.get<{ items: Equipment[] }>('/equipment', { params: { limit: 500 } })).data,
  })

  const [form, setForm] = useState({
    vendor: '',
    model: '',
    category: 'access_switch',
    ports_total: 24,
    p_idle_w: 45,
    p_max_w: 435,
  })

  const create = useMutation({
    mutationFn: async () => {
      await api.post('/equipment', form)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment-admin'] })
      qc.invalidateQueries({ queryKey: ['equipment'] })
      setForm({ ...form, vendor: '', model: '' })
    },
  })

  const del = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/equipment/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipment-admin'] }),
  })

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-3xl font-semibold tracking-tight">Equipment</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New equipment</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Input
            placeholder="vendor"
            value={form.vendor}
            onChange={(e) => setForm({ ...form, vendor: e.target.value })}
          />
          <Input
            placeholder="model"
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="access_switch">access</option>
            <option value="distribution_switch">distribution</option>
            <option value="core_switch">core</option>
            <option value="router">router</option>
            <option value="wifi_ap">wifi</option>
            <option value="server">server</option>
            <option value="ups">ups</option>
          </select>
          <Input
            type="number"
            placeholder="P_idle"
            value={form.p_idle_w}
            onChange={(e) => setForm({ ...form, p_idle_w: Number(e.target.value) })}
          />
          <Input
            type="number"
            placeholder="P_max"
            value={form.p_max_w}
            onChange={(e) => setForm({ ...form, p_max_w: Number(e.target.value) })}
          />
          <Button disabled={!form.vendor || !form.model || create.isPending} onClick={() => create.mutate()}>
            Add
          </Button>
        </CardContent>
      </Card>

      {isLoading && <Spinner />}
      {data && (
        <div className="space-y-1">
          {data.items.map((e) => (
            <Card key={e.id}>
              <CardContent className="py-2 flex items-center gap-3">
                <div className="flex-1">
                  <span className="font-medium">{e.vendor}</span>{' '}
                  <span className="text-muted-foreground">{e.model}</span>
                </div>
                <div className="text-sm text-muted-foreground">{e.category}</div>
                <div className="text-sm font-mono">
                  {Math.round(Number(e.p_idle_w))}→{Math.round(Number(e.p_max_w))}W
                </div>
                <DeleteButton
                  id={String(e.id)}
                  deleteText="Удалить"
                  cancelText="Отмена"
                  onDelete={() => del.mutate(e.id)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
