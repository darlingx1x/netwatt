import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import DeleteButton from '@/components/ui/delete-button'
import { Plus, Upload } from 'lucide-react'

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

const categories = [
  'access_switch',
  'distribution_switch',
  'core_switch',
  'router',
  'wifi_ap',
  'server',
  'ups',
  'firewall',
]

const emptyForm = {
  vendor: '',
  model: '',
  category: 'access_switch',
  ports_total: 24,
  poe_ports: 0,
  poe_budget_w: 0,
  p_idle_w: 45,
  p_max_w: 435,
  eee_supported: true,
  alr_supported: false,
  poe_scheduling: false,
  year_released: new Date().getFullYear(),
}

export default function AdminEquipmentPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [filter, setFilter] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['equipment-admin', filter],
    queryFn: async () =>
      (
        await api.get<{ items: Equipment[]; total: number }>('/equipment', {
          params: { q: filter || undefined, limit: 500 },
        })
      ).data,
  })

  const [form, setForm] = useState(emptyForm)

  const create = useMutation({
    mutationFn: async () => {
      await api.post('/equipment', form)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment-admin'] })
      qc.invalidateQueries({ queryKey: ['equipment'] })
      setForm(emptyForm)
    },
  })

  const del = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/equipment/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment-admin'] })
      qc.invalidateQueries({ queryKey: ['equipment'] })
    },
  })

  const fileRef = useRef<HTMLInputElement>(null)
  const [importReport, setImportReport] = useState<null | {
    created: number
    updated: number
    errors: unknown[]
    total: number
  }>(null)

  const importJson = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post('/equipment/import', fd)
      return data as { created: number; updated: number; errors: unknown[]; total: number }
    },
    onSuccess: (data) => {
      setImportReport(data)
      qc.invalidateQueries({ queryKey: ['equipment-admin'] })
      qc.invalidateQueries({ queryKey: ['equipment'] })
    },
  })

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('admin_eq.heading')}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            placeholder={t('admin_eq.search_placeholder')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-60"
          />
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importJson.mutate(f)
              e.target.value = ''
            }}
          />
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={importJson.isPending}
          >
            <Upload className="w-4 h-4 mr-1" />
            {t('admin_eq.import_json')}
          </Button>
          {data && <span className="text-sm text-muted-foreground">{t('admin_eq.models_count', { count: data.total })}</span>}
        </div>
      </div>

      {importReport && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="py-3 flex flex-wrap gap-4 text-sm">
            <span>{t('admin_eq.import_records', { count: importReport.total })}</span>
            <span>{t('admin_eq.import_created')} <strong>{importReport.created}</strong></span>
            <span>{t('admin_eq.import_updated')} <strong>{importReport.updated}</strong></span>
            <span className={importReport.errors.length ? 'text-destructive' : ''}>
              {t('admin_eq.import_errors')} <strong>{importReport.errors.length}</strong>
            </span>
            <button
              className="ml-auto text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setImportReport(null)}
            >
              {t('common.close')}
            </button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t('admin_eq.add_model')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <LabeledInput label={t('admin_eq.vendor')} value={form.vendor} onChange={(v) => setForm({ ...form, vendor: v })} />
            <LabeledInput label={t('admin_eq.model')} value={form.model} onChange={(v) => setForm({ ...form, model: v })} />
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t('admin_eq.category')}</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <LabeledNumber
              label={t('admin_eq.year_released')}
              value={form.year_released}
              onChange={(v) => setForm({ ...form, year_released: v })}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <LabeledNumber
              label={t('admin_eq.ports_total')}
              value={form.ports_total}
              onChange={(v) => setForm({ ...form, ports_total: v })}
            />
            <LabeledNumber
              label={t('admin_eq.poe_ports')}
              value={form.poe_ports}
              onChange={(v) => setForm({ ...form, poe_ports: v })}
            />
            <LabeledNumber
              label={t('admin_eq.poe_budget_w')}
              value={form.poe_budget_w}
              onChange={(v) => setForm({ ...form, poe_budget_w: v })}
            />
            <LabeledNumber
              label={t('admin_eq.p_idle_w')}
              value={form.p_idle_w}
              onChange={(v) => setForm({ ...form, p_idle_w: v })}
            />
            <LabeledNumber
              label={t('admin_eq.p_max_w')}
              value={form.p_max_w}
              onChange={(v) => setForm({ ...form, p_max_w: v })}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Checkbox
              label={t('admin_eq.eee')}
              value={form.eee_supported}
              onChange={(v) => setForm({ ...form, eee_supported: v })}
            />
            <Checkbox
              label={t('admin_eq.alr')}
              value={form.alr_supported}
              onChange={(v) => setForm({ ...form, alr_supported: v })}
            />
            <Checkbox
              label={t('admin_eq.poe_sched')}
              value={form.poe_scheduling}
              onChange={(v) => setForm({ ...form, poe_scheduling: v })}
            />
            <div className="flex-1" />
            <Button
              disabled={!form.vendor || !form.model || create.isPending}
              onClick={() => create.mutate()}
            >
              {t('admin_eq.add')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && <Spinner />}
      {data && (
        <div className="space-y-1">
          {data.items.map((e) => (
            <Card key={e.id}>
              <CardContent className="py-2 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[220px]">
                  <span className="font-medium">{e.vendor}</span>{' '}
                  <span className="text-muted-foreground">{e.model}</span>
                  <div className="text-xs text-muted-foreground">
                    {e.category} · {t('catalog.ports').toLowerCase()} {e.ports_total}
                    {e.poe_ports > 0 && ` (PoE ${e.poe_ports}, ${Math.round(Number(e.poe_budget_w))}W)`}
                    {e.year_released && ` · ${e.year_released}`}
                  </div>
                </div>
                <div className="text-sm font-mono">
                  {Math.round(Number(e.p_idle_w))}→{Math.round(Number(e.p_max_w))}W
                </div>
                <div className="flex gap-1">
                  {e.eee_supported && <Badge variant="secondary">EEE</Badge>}
                  {e.alr_supported && <Badge variant="secondary">ALR</Badge>}
                  {e.poe_scheduling && <Badge variant="secondary">PoE-sched</Badge>}
                </div>
                <DeleteButton
                  id={String(e.id)}
                  deleteText={t('common.delete')}
                  cancelText={t('common.cancel')}
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

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function LabeledNumber({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  )
}

function Checkbox({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4"
      />
      {label}
    </label>
  )
}
