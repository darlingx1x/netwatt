import { useState } from 'react'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap } from 'lucide-react'

export function BeforeAfterToggle({
  baseKwh,
  optKwh,
  baseMoney,
  optMoney,
}: {
  baseKwh: number
  optKwh: number
  baseMoney: number
  optMoney: number
}) {
  const [mode, setMode] = useState<'before' | 'after'>('after')
  const kwh = mode === 'before' ? baseKwh : optKwh
  const money = mode === 'before' ? baseMoney : optMoney

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          С политиками или без?
        </CardTitle>
        <div className="inline-flex rounded-md border border-border p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode('before')}
            className={`px-3 py-1 rounded-sm transition ${
              mode === 'before'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            До
          </button>
          <button
            type="button"
            onClick={() => setMode('after')}
            className={`px-3 py-1 rounded-sm transition ${
              mode === 'after'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            После
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Потребление / год</div>
            <div className="mt-2 flex items-baseline gap-2">
              <AnimatedCounter value={Math.round(kwh)} fontSize={40} />
              <span className="text-sm text-muted-foreground">кВт·ч</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Стоимость / год</div>
            <div className="mt-2 flex items-baseline gap-2">
              <AnimatedCounter value={Math.round(money)} fontSize={40} />
              <span className="text-sm text-muted-foreground">сум</span>
            </div>
          </div>
        </div>
        <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground transition-all duration-500 ease-out"
            style={{
              width: `${Math.min(100, (kwh / Math.max(baseKwh, 1)) * 100)}%`,
            }}
          />
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          {mode === 'after'
            ? `Экономия ${(((baseKwh - optKwh) / Math.max(baseKwh, 1)) * 100).toFixed(1)}% благодаря активным политикам`
            : `Базовый сценарий без оптимизации — 100%`}
        </div>
      </CardContent>
    </Card>
  )
}
