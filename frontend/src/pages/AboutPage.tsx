import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Zap, Leaf, ShieldCheck, Scale, BookOpen } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">О системе NetWatt</h1>
        <p className="text-muted-foreground mt-1">
          ВКР «Разработка программного обеспечения для оптимизации энергопотребления сетевой инфраструктуры»
        </p>
        <p className="text-sm text-muted-foreground">Шарипов Жавохир · ТУИТ · 2026</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="w-5 h-5" />
            Правовая база Республики Узбекистан
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <Law
            code="ЗРУ-628"
            title="Об использовании возобновляемых источников энергии"
            year="2019"
            text="Определяет правовые основы использования ВИЭ, стимулирует энергоэффективность в сетевой инфраструктуре."
          />
          <Separator />
          <Law
            code="УП-158"
            title="Об ускоренном развитии экспортоориентированной электроэнергетики"
            year="2019-08-27"
            text="Указ Президента об ускоренном развитии экспортоориентированной электроэнергетики и улучшении энергоэффективности."
          />
          <Separator />
          <Law
            code="ПП-4422"
            title="О мерах по повышению энергоэффективности"
            year="2019"
            text="Постановление правительства о внедрении стандартов энергоэффективности в технической инфраструктуре."
          />
          <Separator />
          <Law
            code="ЗРУ-547"
            title="О персональных данных"
            year="2019-07-02"
            text="Хранение персональных данных в системе ограничено email и ФИО; все действия пишутся в audit_log."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Leaf className="w-5 h-5 text-green-600" />
            Экологический эффект
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono">
              EF_grid = 0.468 кг CO₂ / кВт·ч
            </Badge>
            <span className="text-muted-foreground">
              (Министерство энергетики РУз, 2024)
            </span>
          </div>
          <p>
            Коэффициент эмиссии сети Узбекистана используется во всех расчётах снижения CO₂. Сохранённая энергия
            умножается на EF_grid — это даёт эквивалент выбросов, которых удалось избежать.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-5 h-5 text-amber-500" />
            Политики оптимизации
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <Policy name="IEEE 802.3az (EEE)" desc="Energy-Efficient Ethernet — снижение энергии портов во время простоя. η_EEE ∈ [0.2, 0.7]." />
          <Policy name="Adaptive Link Rate (ALR)" desc="Снижение скорости линка при низкой нагрузке. Типичное падение мощности 30–40%." />
          <Policy name="PoE Scheduling" desc="Отключение PoE по расписанию в ночные часы (до 14 часов/сутки)." />
          <Policy name="Server Consolidation" desc="Миграция ВМ на минимальное число серверов, выключение избыточных в ночные часы." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="w-5 h-5" />
            Архитектура и безопасность
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div>
            <Badge variant="outline">Auth</Badge> Access + Refresh токены в PostgreSQL (без JWT). Ротация refresh с
            детектом reuse — компрометация одного токена автоматически revoke'ает всю сессию.
          </div>
          <div>
            <Badge variant="outline">Hash</Badge> argon2id (time_cost=2, memory_cost=64MB) для паролей.
          </div>
          <div>
            <Badge variant="outline">Rate-limit</Badge> /api/auth/login — 10 попыток/мин/IP.
          </div>
          <div>
            <Badge variant="outline">Audit</Badge> Все POST/PATCH/DELETE пишутся в audit_log (просмотр:
            /admin/audit).
          </div>
          <div>
            <Badge variant="outline">Calc</Badge> Чистые функции, golden-тест с Tolly Group, расхождение &lt; 0.5%.
          </div>
          <div>
            <Badge variant="outline">Queue</Badge> NATS JetStream для расчётных задач (stream SCENARIO_CALC). Inline
            fallback если NATS недоступен.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="w-5 h-5" />
            Стек
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
