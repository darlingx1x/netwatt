import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import InteractiveHoverButton from '@/components/ui/interactive-hover-button'
import { Plus, Minus, Check } from 'lucide-react'

interface Equipment {
  id: number
  vendor: string
  model: string
  category: string
  p_idle_w: string
  p_max_w: string
  eee_supported: boolean
  alr_supported: boolean
  poe_scheduling: boolean
}

interface SelectedItem {
  equipment: Equipment
  quantity: number
}

const presets = {
  office_8x5: { day_util: 0.35, peak_util: 0.7, night_util: 0.05, day_hours: 6, peak_hours: 2, night_hours: 16 },
  datacenter_24x7: { day_util: 0.5, peak_util: 0.85, night_util: 0.4, day_hours: 10, peak_hours: 4, night_hours: 10 },
  campus: { day_util: 0.4, peak_util: 0.75, night_util: 0.1, day_hours: 8, peak_hours: 3, night_hours: 13 },
  industrial: { day_util: 0.6, peak_util: 0.85, night_util: 0.3, day_hours: 16, peak_hours: 4, night_hours: 4 },
} as const

type PresetKey = keyof typeof presets

export default function WizardPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const [step, setStep] = useState(1)

  // Step 1
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [efGrid, setEfGrid] = useState(0.468)

  // Step 2
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [selected, setSelected] = useState<SelectedItem[]>([])
  const { data: catalog } = useQuery({
    queryKey: ['equipment', search, category],
    queryFn: async () =>
      (
        await api.get<{ items: Equipment[] }>('/equipment', {
          params: { q: search || undefined, category: category || undefined, limit: 200 },
        })
      ).data,
  })

  // Step 3
  const [preset, setPreset] = useState<PresetKey>('office_8x5')
  const traffic = presets[preset]
  const [tariff, setTariff] = useState({ day: 1050, peak: 1450, night: 450 })

  // Step 4
  const [policies, setPolicies] = useState({
    eee: { enabled: true, eta: 0.5 },
    alr: { enabled: true, drop: 0.4 },
    poe_sched: { enabled: true, off_hours: 12 },
    consolidation: { enabled: false, min_servers: 1, night_hours: 8 },
  })

  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success'>('idle')
  const [error, setError] = useState<string | null>(null)

  function toggle(eq: Equipment) {
    setSelected((prev) =>
      prev.some((s) => s.equipment.id === eq.id)
        ? prev.filter((s) => s.equipment.id !== eq.id)
        : [...prev, { equipment: eq, quantity: 1 }],
    )
  }
  function changeQty(id: number, delta: number) {
    setSelected((prev) =>
      prev
        .map((s) => (s.equipment.id === id ? { ...s, quantity: Math.max(0, s.quantity + delta) } : s))
        .filter((s) => s.quantity > 0),
    )
  }

  async function submit() {
    setSubmitStatus('loading')
    setError(null)
    try {
      const payload = {
        name,
        notes: notes || null,
        tariff: { ...tariff, currency: 'UZS' },
        traffic,
        policies,
        ef_grid: efGrid,
        items: selected.map((s) => ({ equipment_id: s.equipment.id, quantity: s.quantity })),
      }
      const { data: scenario } = await api.post<{ id: number }>('/scenarios', payload)
      await api.post(`/scenarios/${scenario.id}/calculate`)
      setSubmitStatus('success')
      setTimeout(() => nav(`/scenarios/${scenario.id}`), 400)
    } catch (e: any) {
      setSubmitStatus('idle')
      setError(e?.response?.data?.detail ?? 'error')
    }
  }

  const steps = [
    { n: 1, label: t('wizard.step_basic') },
    { n: 2, label: t('wizard.step_equipment') },
    { n: 3, label: t('wizard.step_traffic') },
    { n: 4, label: t('wizard.step_policies') },
  ]

  const canNext =
    (step === 1 && name.trim().length > 0) ||
    (step === 2 && selected.length > 0) ||
    step === 3 ||
    step === 4

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.n} className="flex-1 flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step > s.n
                  ? 'bg-primary text-primary-foreground'
                  : step === s.n
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {step > s.n ? <Check className="w-4 h-4" /> : s.n}
            </div>
            <div className={`text-sm ${step === s.n ? 'font-medium' : 'text-muted-foreground'}`}>
              {s.label}
            </div>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-border" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('wizard.step_basic')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{t('wizard.name')}</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('scenarios.name_placeholder')}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{t('wizard.notes')}</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{t('wizard.ef_grid')}</label>
              <Input
                type="number"
                step="0.001"
                value={efGrid}
                onChange={(e) => setEfGrid(Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('wizard.step_equipment')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder={t('common.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Все</option>
                <option value="access_switch">Access</option>
                <option value="distribution_switch">Distribution</option>
                <option value="core_switch">Core</option>
                <option value="router">Router</option>
                <option value="wifi_ap">Wi-Fi AP</option>
                <option value="server">Server</option>
                <option value="ups">UPS</option>
              </select>
            </div>

            {selected.length > 0 && (
              <>
                <div className="text-sm font-medium">Выбрано ({selected.length}):</div>
                <div className="space-y-1">
                  {selected.map((s) => (
                    <div
                      key={s.equipment.id}
                      className="flex items-center gap-2 p-2 rounded bg-accent/50"
                    >
                      <div className="flex-1 text-sm">
                        {s.equipment.vendor} {s.equipment.model}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => changeQty(s.equipment.id, -1)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <div className="w-10 text-center font-mono">{s.quantity}</div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => changeQty(s.equipment.id, 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Separator />
              </>
            )}

            <div className="max-h-[40vh] overflow-y-auto space-y-1">
              {catalog?.items
                .filter((e) => !selected.some((s) => s.equipment.id === e.id))
                .map((eq) => (
                  <div
                    key={eq.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                    onClick={() => toggle(eq)}
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {eq.vendor} {eq.model}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {eq.category} · {Math.round(Number(eq.p_idle_w))}→
                        {Math.round(Number(eq.p_max_w))}W
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {eq.eee_supported && <Badge variant="secondary">EEE</Badge>}
                      {eq.alr_supported && <Badge variant="secondary">ALR</Badge>}
                    </div>
                    <Plus className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('wizard.step_traffic')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{t('wizard.traffic_preset')}</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(Object.keys(presets) as PresetKey[]).map((k) => (
                  <Button
                    key={k}
                    variant={preset === k ? 'default' : 'outline'}
                    onClick={() => setPreset(k)}
                  >
                    {k}
                  </Button>
                ))}
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t('wizard.day_util')}</label>
                <Input value={traffic.day_util} disabled />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t('wizard.peak_util')}</label>
                <Input value={traffic.peak_util} disabled />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t('wizard.night_util')}</label>
                <Input value={traffic.night_util} disabled />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t('wizard.day_hours')}</label>
                <Input value={traffic.day_hours} disabled />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t('wizard.peak_hours')}</label>
                <Input value={traffic.peak_hours} disabled />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t('wizard.night_hours')}</label>
                <Input value={traffic.night_hours} disabled />
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t('wizard.tariff_day')}</label>
                <Input
                  type="number"
                  value={tariff.day}
                  onChange={(e) => setTariff({ ...tariff, day: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t('wizard.tariff_peak')}</label>
                <Input
                  type="number"
                  value={tariff.peak}
                  onChange={(e) => setTariff({ ...tariff, peak: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t('wizard.tariff_night')}</label>
                <Input
                  type="number"
                  value={tariff.night}
                  onChange={(e) => setTariff({ ...tariff, night: Number(e.target.value) })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('wizard.step_policies')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PolicyRow
              label={t('wizard.policy_eee')}
              enabled={policies.eee.enabled}
              onToggle={() =>
                setPolicies((p) => ({ ...p, eee: { ...p.eee, enabled: !p.eee.enabled } }))
              }
            >
              <div className="flex items-center gap-2">
                <label className="text-xs">{t('wizard.eee_eta')}:</label>
                <Input
                  type="number"
                  step="0.05"
                  min={0.2}
                  max={0.7}
                  value={policies.eee.eta}
                  onChange={(e) =>
                    setPolicies((p) => ({ ...p, eee: { ...p.eee, eta: Number(e.target.value) } }))
                  }
                  className="w-24"
                />
              </div>
            </PolicyRow>
            <PolicyRow
              label={t('wizard.policy_alr')}
              enabled={policies.alr.enabled}
              onToggle={() =>
                setPolicies((p) => ({ ...p, alr: { ...p.alr, enabled: !p.alr.enabled } }))
              }
            >
              <div className="flex items-center gap-2">
                <label className="text-xs">{t('wizard.alr_drop')}:</label>
                <Input
                  type="number"
                  step="0.05"
                  value={policies.alr.drop}
                  onChange={(e) =>
                    setPolicies((p) => ({ ...p, alr: { ...p.alr, drop: Number(e.target.value) } }))
                  }
                  className="w-24"
                />
              </div>
            </PolicyRow>
            <PolicyRow
              label={t('wizard.policy_poe_sched')}
              enabled={policies.poe_sched.enabled}
              onToggle={() =>
                setPolicies((p) => ({
                  ...p,
                  poe_sched: { ...p.poe_sched, enabled: !p.poe_sched.enabled },
                }))
              }
            >
              <div className="flex items-center gap-2">
                <label className="text-xs">{t('wizard.poe_off_hours')}:</label>
                <Input
                  type="number"
                  value={policies.poe_sched.off_hours}
                  onChange={(e) =>
                    setPolicies((p) => ({
                      ...p,
                      poe_sched: { ...p.poe_sched, off_hours: Number(e.target.value) },
                    }))
                  }
                  className="w-24"
                />
              </div>
            </PolicyRow>
            <PolicyRow
              label={t('wizard.policy_consolidation')}
              enabled={policies.consolidation.enabled}
              onToggle={() =>
                setPolicies((p) => ({
                  ...p,
                  consolidation: { ...p.consolidation, enabled: !p.consolidation.enabled },
                }))
              }
            >
              <div className="flex items-center gap-2">
                <label className="text-xs">{t('wizard.consolidation_min_servers')}:</label>
                <Input
                  type="number"
                  value={policies.consolidation.min_servers}
                  onChange={(e) =>
                    setPolicies((p) => ({
                      ...p,
                      consolidation: { ...p.consolidation, min_servers: Number(e.target.value) },
                    }))
                  }
                  className="w-20"
                />
              </div>
            </PolicyRow>
          </CardContent>
        </Card>
      )}

      {error && <div className="text-destructive text-sm">{error}</div>}

      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={step === 1} onClick={() => setStep(step - 1)}>
          {t('common.prev')}
        </Button>
        {step < 4 ? (
          <Button disabled={!canNext} onClick={() => setStep(step + 1)}>
            {t('common.next')}
          </Button>
        ) : (
          <InteractiveHoverButton
            text={t('wizard.submit')}
            loadingText={t('wizard.creating')}
            successText={t('wizard.created')}
            status={submitStatus}
            onClick={submit}
            className="h-11 min-w-[220px]"
          />
        )}
      </div>
    </div>
  )
}

function PolicyRow({
  label,
  enabled,
  onToggle,
  children,
}: {
  label: string
  enabled: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border">
      <label className="flex items-center gap-2 cursor-pointer flex-1">
        <input type="checkbox" checked={enabled} onChange={onToggle} className="w-4 h-4" />
        <span className="font-medium">{label}</span>
      </label>
      {enabled && children}
    </div>
  )
}
