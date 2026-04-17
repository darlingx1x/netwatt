import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, FolderKanban, BookOpen } from 'lucide-react'

export default function DashboardPage() {
  const { t } = useTranslation()
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{t('dashboard.heading')}</h1>
        <p className="text-muted-foreground">{t('dashboard.hint')}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5" />
              {t('nav.scenarios')}
            </CardTitle>
            <CardDescription>{t('dashboard.hint')}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Link to="/scenarios/new">
              <Button>
                <Plus className="w-4 h-4 mr-1" />
                {t('dashboard.create_scenario')}
              </Button>
            </Link>
            <Link to="/scenarios">
              <Button variant="outline">{t('nav.scenarios')}</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              {t('nav.catalog')}
            </CardTitle>
            <CardDescription>50+ моделей оборудования</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/catalog">
              <Button variant="outline">{t('nav.catalog')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
