import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PerDevice {
  vendor: string
  model: string
  quantity: number
  e_base_kwh: number
  e_optimized_kwh: number
  delta_total_kwh: number
}

interface Node {
  id: string
  label: string
  x: number
  y: number
  radius: number
  category: 'core' | 'dist' | 'access' | 'server' | 'ap' | 'router' | 'other'
  qty: number
  savingRatio: number
}

function categorize(vendor: string, model: string): Node['category'] {
  const s = `${vendor} ${model}`.toLowerCase()
  if (s.includes('9500') || s.includes('qfx5120') || s.includes('8360') || s.includes('s12700')) return 'core'
  if (s.includes('9300') || s.includes('ex4300') || s.includes('5406') || s.includes('6300') || s.includes('n3248') || s.includes('s5720') || s.includes('s6720') || s.includes('ccr2216') || s.includes('ex4400')) return 'dist'
  if (s.includes('asr') || s.includes('isr') || s.includes('mx104') || s.includes('mx204') || s.includes('ccr10') || s.includes('ccr20') || s.includes('msr') || s.includes('ar6')) return 'router'
  if (s.includes('r650') || s.includes('dl380') || s.includes('sr650') || s.includes('ucs c220')) return 'server'
  if (s.includes('ap-5') || s.includes('mr46') || s.includes('9130') || s.includes('cap ac') || s.includes('eap670') || s.includes('u6-lr')) return 'ap'
  if (
    s.includes('9200') || s.includes('1300') || s.includes('6100') || s.includes('2930') ||
    s.includes('crs326') || s.includes('crs328') || s.includes('css') ||
    s.includes('omada') || s.includes('usw') || s.includes('n1524') || s.includes('s5735')
  )
    return 'access'
  return 'other'
}

const COLORS: Record<Node['category'], string> = {
  core: '#1e3a8a',
  dist: '#2563eb',
  access: '#06b6d4',
  server: '#7c3aed',
  router: '#dc2626',
  ap: '#059669',
  other: '#64748b',
}

export function NetworkTopology({ perDevice }: { perDevice: PerDevice[] }) {
  const { t } = useTranslation()
  const LABELS: Record<Node['category'], string> = {
    core: t('topology.core'),
    dist: t('topology.dist'),
    access: t('topology.access'),
    server: t('topology.server'),
    router: t('topology.router'),
    ap: t('topology.ap'),
    other: t('topology.other'),
  }
  const { nodes, links, totals } = useMemo(() => {
    const grouped = new Map<Node['category'], { qty: number; baseTotal: number; optTotal: number; label: string }>()
    for (const d of perDevice) {
      const cat = categorize(d.vendor, d.model)
      const prev = grouped.get(cat) ?? { qty: 0, baseTotal: 0, optTotal: 0, label: LABELS[cat] }
      prev.qty += d.quantity
      prev.baseTotal += d.e_base_kwh * d.quantity
      prev.optTotal += d.e_optimized_kwh * d.quantity
      grouped.set(cat, prev)
    }
    const entries = Array.from(grouped.entries()).sort(
      ([a], [b]) => ['core', 'dist', 'access', 'router', 'server', 'ap', 'other'].indexOf(a)
        - ['core', 'dist', 'access', 'router', 'server', 'ap', 'other'].indexOf(b),
    )
    const width = 640
    const height = 380
    const nodes: Node[] = entries.map(([cat, info], _i, all) => {
      // Tier-based layout: core on top, servers right, dist middle, access bottom
      const tiers: Partial<Record<Node['category'], [number, number]>> = {
        core: [width / 2, 60],
        router: [width / 2 - 140, 150],
        dist: [width / 2, 170],
        server: [width - 100, 170],
        access: [width / 2, 290],
        ap: [100, 290],
        other: [width - 100, 290],
      }
      const tier = tiers[cat]
      const savingRatio = info.baseTotal > 0 ? (info.baseTotal - info.optTotal) / info.baseTotal : 0
      const qty = info.qty
      const radius = Math.max(22, Math.min(44, 18 + Math.log2(qty + 1) * 6))
      const [tx, ty] = tier ?? [width / 2, height / 2]
      // If tier slot used by multiple, offset
      const sameSlot = all.filter(([c]) => tiers[c as Node['category']]?.[0] === tiers[cat]?.[0] && tiers[c as Node['category']]?.[1] === tiers[cat]?.[1])
      const offsetIdx = sameSlot.findIndex(([c]) => c === cat)
      return {
        id: cat,
        label: info.label,
        x: tx + (offsetIdx * 40),
        y: ty,
        radius,
        category: cat,
        qty,
        savingRatio,
      }
    })
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const parentOf: Partial<Record<Node['category'], Node['category']>> = {
      dist: 'core',
      access: 'dist',
      server: 'core',
      router: 'core',
      ap: 'access',
      other: 'access',
    }
    const links: Array<{ from: Node; to: Node; saving: number }> = []
    for (const n of nodes) {
      const parent = parentOf[n.category]
      if (parent && byId.has(parent)) {
        links.push({ from: byId.get(parent)!, to: n, saving: n.savingRatio })
      }
    }
    const totals = {
      baseTotal: entries.reduce((a, [, e]) => a + e.baseTotal, 0),
      optTotal: entries.reduce((a, [, e]) => a + e.optTotal, 0),
    }
    return { nodes, links, totals, width, height }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perDevice, t])

  if (nodes.length === 0) return null

  const savingPct = totals.baseTotal > 0 ? ((totals.baseTotal - totals.optTotal) / totals.baseTotal) * 100 : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('result.topology')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
          <span>
            E_base <span className="font-mono text-foreground">{Math.round(totals.baseTotal).toLocaleString()}</span> {t('common.kwh')}
          </span>
          <span>→</span>
          <span>
            E_opt <span className="font-mono text-foreground">{Math.round(totals.optTotal).toLocaleString()}</span> {t('common.kwh')}
          </span>
          <span className="ml-auto font-mono text-emerald-600">−{savingPct.toFixed(1)}%</span>
        </div>
        <svg viewBox="0 0 640 380" className="w-full h-auto" role="img" aria-label="Network topology">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
            </marker>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {links.map((l, i) => {
            const dashLen = 6
            return (
              <g key={i}>
                <line
                  x1={l.from.x}
                  y1={l.from.y}
                  x2={l.to.x}
                  y2={l.to.y}
                  stroke="var(--border)"
                  strokeWidth="2"
                />
                <line
                  x1={l.from.x}
                  y1={l.from.y}
                  x2={l.to.x}
                  y2={l.to.y}
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray={`${dashLen} ${dashLen}`}
                  strokeLinecap="round"
                  opacity={Math.max(0.2, l.saving)}
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to={-dashLen * 2}
                    dur="1.2s"
                    repeatCount="indefinite"
                  />
                </line>
              </g>
            )
          })}

          {nodes.map((n) => (
            <g key={n.id} transform={`translate(${n.x},${n.y})`}>
              <circle
                r={n.radius}
                fill={COLORS[n.category]}
                opacity="0.15"
                filter="url(#glow)"
              />
              <circle r={n.radius} fill={COLORS[n.category]} />
              <text
                textAnchor="middle"
                dy="0.1em"
                fill="white"
                fontSize="11"
                fontWeight="600"
              >
                {n.qty}
              </text>
              <text
                textAnchor="middle"
                y={n.radius + 14}
                fontSize="11"
                fill="currentColor"
                className="fill-foreground"
              >
                {n.label}
              </text>
              <text
                textAnchor="middle"
                y={n.radius + 28}
                fontSize="10"
                className="fill-muted-foreground"
              >
                −{(n.savingRatio * 100).toFixed(0)}%
              </text>
            </g>
          ))}
        </svg>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {nodes.map((n) => (
            <div key={n.id} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-sm"
                style={{ background: COLORS[n.category] }}
              />
              <span>{n.label}</span>
              <span className="text-muted-foreground">×{n.qty}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="w-3 h-1 border-t-2 border-dashed border-emerald-500" />
            <span className="text-muted-foreground">{t('result.saving_flow')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
