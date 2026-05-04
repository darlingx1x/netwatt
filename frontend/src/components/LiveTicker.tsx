import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp } from 'lucide-react'

export function LiveTicker({ annualUzs }: { annualUzs: number }) {
  const { t } = useTranslation()
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (annualUzs <= 0) {
      setVal(0)
      return
    }
    const perSecond = annualUzs / (365 * 24 * 60 * 60)
    const start = performance.now()
    let rafId = 0
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000
      setVal(perSecond * elapsed)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [annualUzs])

  if (annualUzs <= 0) return null

  return (
    <div
      className="hidden md:flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-border bg-card text-xs font-mono tabular-nums"
      title={t('ticker.title')}
    >
      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
      <span className="text-muted-foreground">+</span>
      <span className="text-foreground">{val.toFixed(2)}</span>
      <span className="text-muted-foreground">{t('common.uzs')}</span>
    </div>
  )
}
