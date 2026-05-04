import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Zap, Leaf, ShieldCheck, Scale, BookOpen } from 'lucide-react'

export default function AboutPage() {
  const { t } = useTranslation()
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{t('about.heading')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('about.subtitle')}
        </p>
        <p className="text-sm text-muted-foreground">{t('about.author')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="w-5 h-5" />
            {t('about.card_law')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <Law
            code="ЗРУ-628"
            title={t('about.law_628_title')}
            year="2019"
            text={t('about.law_628_text')}
          />
          <Separator />
          <Law
            code="УП-158"
            title={t('about.law_158_title')}
            year="2019-08-27"
            text={t('about.law_158_text')}
          />
          <Separator />
          <Law
            code="ПП-4422"
            title={t('about.law_4422_title')}
            year="2019"
            text={t('about.law_4422_text')}
          />
          <Separator />
          <Law
            code="ЗРУ-547"
            title={t('about.law_547_title')}
            year="2019-07-02"
            text={t('about.law_547_text')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Leaf className="w-5 h-5 text-green-600" />
            {t('about.card_eco')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono">
              {t('about.ef_grid_badge')}
            </Badge>
            <span className="text-muted-foreground">
              {t('about.ef_grid_source')}
            </span>
          </div>
          <p>{t('about.eco_text')}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-5 h-5 text-amber-500" />
            {t('about.card_policies')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <Policy name="IEEE 802.3az (EEE)" desc={t('about.policy_eee_desc')} />
          <Policy name="Adaptive Link Rate (ALR)" desc={t('about.policy_alr_desc')} />
          <Policy name="PoE Scheduling" desc={t('about.policy_poe_desc')} />
          <Policy name="Server Consolidation" desc={t('about.policy_consol_desc')} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="w-5 h-5" />
            {t('about.card_security')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div>
            <Badge variant="outline">Auth</Badge> {t('about.sec_auth_text')}
          </div>
          <div>
            <Badge variant="outline">Hash</Badge> {t('about.sec_hash_text')}
          </div>
          <div>
            <Badge variant="outline">Rate-limit</Badge> {t('about.sec_rl_text')}
          </div>
          <div>
            <Badge variant="outline">Audit</Badge> {t('about.sec_audit_text')}
          </div>
          <div>
            <Badge variant="outline">Calc</Badge> {t('about.sec_calc_text')}
          </div>
          <div>
            <Badge variant="outline">Queue</Badge> {t('about.sec_queue_text')}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="w-5 h-5" />
            {t('about.card_stack')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm grid grid-cols-2 gap-2">
          <div><Badge variant="outline">Backend</Badge> FastAPI 0.115 · SQLAlchemy 2 · asyncpg · Alembic · PostgreSQL 16</div>
          <div><Badge variant="outline">Queue</Badge> NATS JetStream 2.10</div>
          <div><Badge variant="outline">Frontend</Badge> React 19 · TypeScript · Vite · Tailwind 4 · UI-KIT</div>
          <div><Badge variant="outline">Charts</Badge> Recharts 2</div>
          <div><Badge variant="outline">Reports</Badge> WeasyPrint (PDF) · openpyxl (XLSX)</div>
          <div><Badge variant="outline">Tests</Badge> pytest 9 · hypothesis · 49 passing</div>
        </CardContent>
      </Card>
    </div>
  )
}

function Law({ code, title, year, text }: { code: string; title: string; year: string; text: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Badge>{code}</Badge>
        <span className="font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">· {year}</span>
      </div>
      <p className="text-muted-foreground">{text}</p>
    </div>
  )
}

function Policy({ name, desc }: { name: string; desc: string }) {
  return (
    <div>
      <div className="font-medium">{name}</div>
      <p className="text-muted-foreground text-xs">{desc}</p>
    </div>
  )
}
