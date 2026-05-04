import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

export default function MethodologyPage() {
  const { t } = useTranslation()
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{t('methodology.heading')}</h1>
        <p className="text-muted-foreground">
          {t('methodology.subtitle_prefix')} <code>backend/src/netwatt/calc/formulas.py</code>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('methodology.card_base')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Formula
            id="2.1"
            label={t('methodology.f21_label')}
            expr={'P(u) = P_idle + (P_max − P_idle) · u'}
            notes={t('methodology.f21_notes')}
          />
          <Formula
            id="2.2"
            label={t('methodology.f22_label')}
            expr={'E_base = 8760 · P(ū) / 1000   [' + t('common.kwh_per_year') + ']'}
            notes={t('methodology.f22_notes')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('methodology.card_policies')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Formula
            id="2.3"
            label={t('methodology.f23_label')}
            expr={'ΔE_EEE = N · (ΔP/N) · (1 − ū) · η · 8760 / 1000'}
            notes={t('methodology.f23_notes')}
          />
          <Formula
            id="2.4"
            label={t('methodology.f24_label')}
            expr={'ΔE_ALR = (P_max − P_idle) · drop · h_low · 365 / 1000'}
            notes={t('methodology.f24_notes')}
          />
          <Formula
            id="2.5"
            label={t('methodology.f25_label')}
            expr={'ΔE_PoE = PoE_budget · h_off · 365 / 1000'}
            notes={t('methodology.f25_notes')}
          />
          <Formula
            id="2.6"
            label={t('methodology.f26_label')}
            expr={'ΔE_consol = (N_total − N_min) · P_idle_server · h_night · 365 / 1000'}
            notes={t('methodology.f26_notes')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('methodology.card_aggregate')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Formula
            id="2.7"
            label={t('methodology.f27_label')}
            expr={'E_opt = E_base − (ΔE_EEE + ΔE_ALR + ΔE_PoE + ΔE_consol)'}
            notes={t('methodology.f27_notes')}
          />
          <Formula
            id="2.8"
            label={t('methodology.f28_label')}
            expr={'C_year = E_day · T_day + E_peak · T_peak + E_night · T_night'}
            notes={t('methodology.f28_notes')}
          />
          <Formula
            id="2.9"
            label={t('methodology.f29_label')}
            expr={'T_payback = CAPEX / (C_base − C_opt)   [' + t('result.payback_years') + ']'}
            notes={t('methodology.f29_notes')}
          />
          <Formula
            id="2.10"
            label={t('methodology.f210_label')}
            expr={'NPV = Σ(t=1..N) CF_t / (1+r)^t − CAPEX'}
            notes={t('methodology.f210_notes')}
          />
          <Formula
            id="2.11"
            label={t('methodology.f211_label')}
            expr={'CO₂_saved = ΔE · EF_grid'}
            notes={t('methodology.f211_notes')}
          />
          <Formula
            id="2.12"
            label={t('methodology.f212_label')}
            expr={'ū = (u_day · h_day + u_peak · h_peak + u_night · h_night) / (h_day + h_peak + h_night)'}
            notes={t('methodology.f212_notes')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('methodology.card_validation')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <Badge>{t('methodology.valid_golden_badge')}</Badge>
            <div>
              {t('methodology.valid_golden_text')}{' '}
              <code>tests/test_calc.py::test_golden_corp_network_120_ports</code>).
            </div>
          </div>
          <Separator />
          <div className="flex items-start gap-2">
            <Badge>{t('methodology.valid_property_badge')}</Badge>
            <div>{t('methodology.valid_property_text')}</div>
          </div>
          <Separator />
          <div className="flex items-start gap-2">
            <Badge>{t('methodology.valid_data_badge')}</Badge>
            <div>{t('methodology.valid_data_text')}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Formula({
  id,
  label,
  expr,
  notes,
}: {
  id: string
  label: string
  expr: string
  notes: string
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Badge variant="outline" className="font-mono">
          {id}
        </Badge>
        <span className="font-medium">{label}</span>
      </div>
      <pre className="bg-muted/60 border border-border rounded-md px-3 py-2 font-mono text-sm overflow-x-auto whitespace-pre-wrap">
        {expr}
      </pre>
      <p className="text-xs text-muted-foreground mt-1">{notes}</p>
    </div>
  )
}
