import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

export default function MethodologyPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Методология расчёта</h1>
        <p className="text-muted-foreground">
          Формулы 2.1–2.12 из ВКР · реализованы в <code>backend/src/netwatt/calc/formulas.py</code>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Базовое потребление устройства</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Formula
            id="2.1"
            label="Мгновенная мощность при нагрузке u"
            expr={'P(u) = P_idle + (P_max − P_idle) · u'}
            notes="Линейная модель. u ∈ [0, 1]. Типично P_idle ≈ 0.3·P_max для Ethernet-коммутаторов."
          />
          <Formula
            id="2.2"
            label="Годовое потребление"
            expr={'E_base = 8760 · P(ū) / 1000   [кВт·ч/год]'}
            notes="ū — средневзвешенная загрузка по профилю трафика (день/пик/ночь)."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Политики энергосбережения (Δ-формулы)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Formula
            id="2.3"
            label="IEEE 802.3az Energy-Efficient Ethernet"
            expr={'ΔE_EEE = N · (ΔP/N) · (1 − ū) · η · 8760 / 1000'}
            notes="N — число портов; η ∈ [0.2, 0.7] — коэффициент эффективности EEE; (1−ū) — доля простоя."
          />
          <Formula
            id="2.4"
            label="Adaptive Link Rate (снижение скорости)"
            expr={'ΔE_ALR = (P_max − P_idle) · drop · h_low · 365 / 1000'}
            notes="h_low — часы низкой нагрузки в сутках; drop ∈ [0.3, 0.5] — падение энергии при снижении скорости."
          />
          <Formula
            id="2.5"
            label="PoE Scheduling"
            expr={'ΔE_PoE = PoE_budget · h_off · 365 / 1000'}
            notes="h_off — часы отключения PoE в сутках (до 14ч). Экономия = полный PoE-бюджет × время."
          />
          <Formula
            id="2.6"
            label="Server Consolidation"
            expr={'ΔE_consol = (N_total − N_min) · P_idle_server · h_night · 365 / 1000'}
            notes="Выключение избыточных серверов в непиковые часы после миграции нагрузки."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Агрегация и экономические показатели</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Formula
            id="2.7"
            label="Оптимизированное потребление"
            expr={'E_opt = E_base − (ΔE_EEE + ΔE_ALR + ΔE_PoE + ΔE_consol)'}
            notes="Инвариант: E_opt ≤ E_base (проверяется hypothesis property-based тестом)."
          />
          <Formula
            id="2.8"
            label="Годовая стоимость по трёхставочному тарифу РУз"
            expr={'C_year = E_day · T_day + E_peak · T_peak + E_night · T_night'}
            notes="Тарифы T — сум/кВт·ч. Бизнес 2025: 1050/1450/450. Бюджет 2025: 600/900/300."
          />
          <Formula
            id="2.9"
            label="Окупаемость (простая)"
            expr={'T_payback = CAPEX / (C_base − C_opt)   [лет]'}
            notes="Если экономия ≤ 0, окупаемость не определена."
          />
          <Formula
            id="2.10"
            label="Чистая приведённая стоимость"
            expr={'NPV = Σ(t=1..N) CF_t / (1+r)^t − CAPEX'}
            notes="r — ставка дисконтирования (обычно 12%). Положительный NPV означает целесообразность инвестиций."
          />
          <Formula
            id="2.11"
            label="Снижение выбросов CO₂"
            expr={'CO₂_saved = ΔE · EF_grid'}
            notes="EF_grid = 0.468 кг CO₂/кВт·ч (МЭ РУз 2024). Для РФ — 0.38, для ЕС — 0.25."
          />
          <Formula
            id="2.12"
            label="Средневзвешенная загрузка"
            expr={'ū = (u_day · h_day + u_peak · h_peak + u_night · h_night) / (h_day + h_peak + h_night)'}
            notes="Используется в формулах 2.1 и 2.3. Часы должны суммироваться в 24."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Валидация модели</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <Badge>Golden test</Badge>
            <div>
              Эталонный сценарий «6 × Cisco Catalyst 9200L + 2 × Dell R650» сверяется с ручным расчётом по калькулятору
              из ВКР. Расхождение &lt; 0.5% (допуск установлен в{' '}
              <code>tests/test_calc.py::test_golden_corp_network_120_ports</code>).
            </div>
          </div>
          <Separator />
          <div className="flex items-start gap-2">
            <Badge>Property-based</Badge>
            <div>
              Hypothesis генерирует случайные профили трафика и проверяет инвариант E_opt ≤ E_base для любых комбинаций
              политик. Отрицательных экономий — нет.
            </div>
          </div>
          <Separator />
          <div className="flex items-start gap-2">
            <Badge>Данные</Badge>
            <div>
              Параметры 50 моделей взяты из datasheet вендоров и отчётов Tolly Group. Где явные данные отсутствуют —
              применяется аппроксимация P_idle ≈ 0.35 · P_max (типичное соотношение для Ethernet-коммутаторов).
            </div>
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
