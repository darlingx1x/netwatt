import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TrafficShape {
  day_util: number
  peak_util: number
  night_util: number
  day_hours: number
  peak_hours: number
  night_hours: number
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

export function ConsumptionHeatmap({
  traffic,
  avgKwhPerHour,
}: {
  traffic: TrafficShape
  avgKwhPerHour: number
}) {
  const { t } = useTranslation()
  const DAYS = [
    t('weekday.mon'),
    t('weekday.tue'),
    t('weekday.wed'),
    t('weekday.thu'),
    t('weekday.fri'),
    t('weekday.sat'),
    t('weekday.sun'),
  ]
  const cells = useMemo(() => {
    const grid: { day: number; hour: number; value: number }[] = []
    for (let d = 0; d < 7; d++) {
      const isWeekend = d >= 5
      for (const h of HOURS) {
        let util = traffic.night_util
        if (h >= 8 && h < 18) util = traffic.day_util
        if (h >= 10 && h < 14) util = traffic.peak_util
        if (isWeekend) util *= 0.55
        grid.push({ day: d, hour: h, value: util * avgKwhPerHour })
      }
    }
    return grid
  }, [traffic, avgKwhPerHour])

  const max = Math.max(1e-6, ...cells.map((c) => c.value))

  const color = (v: number) => {
    const r = Math.max(0, Math.min(1, v / max))
    // Light → medium → dark blue (no rainbow, looks professional)
    const l = 95 - r * 55
    return `hsl(215, 75%, ${l}%)`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('result.heatmap')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <div className="flex flex-col justify-between py-1.5 pr-1 text-[10px] text-muted-foreground shrink-0">
            {DAYS.map((d) => (
              <div key={d} className="h-5 flex items-center">{d}</div>
            ))}
          </div>
          <div className="flex-1 overflow-x-auto">
            <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(24, minmax(14px, 1fr))' }}>
              {cells.map((c, i) => (
                <div
                  key={i}
                  className="h-5 rounded-sm"
                  style={{ background: color(c.value) }}
                  title={`${DAYS[c.day]} ${String(c.hour).padStart(2, '0')}:00 · ${c.value.toFixed(2)} ${t('common.kwh')}`}
                />
              ))}
            </div>
            <div className="grid text-[10px] text-muted-foreground mt-1" style={{ gridTemplateColumns: 'repeat(24, minmax(14px, 1fr))' }}>
              {HOURS.map((h) => (
                <div key={h} className="text-center">{h % 6 === 0 ? h : ''}</div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{t('common.less')}</span>
          <div className="flex gap-0.5">
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((v) => (
              <span
                key={v}
                className="w-5 h-3 rounded-sm"
                style={{ background: color(v * max) }}
              />
            ))}
          </div>
          <span>{t('common.more')}</span>
          <span className="ml-auto">
            {t('result.heatmap_peak')} <span className="font-mono text-foreground">{max.toFixed(2)}</span> {t('common.kwh_per_hour')}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
