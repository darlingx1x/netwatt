import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import InteractiveHoverButton from '@/components/ui/interactive-hover-button'

export default function LoginPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const login = useAuth((s) => s.login)
  const [email, setEmail] = useState('admin@tuit.uz')
  const [password, setPassword] = useState('admin1234')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setError(null)
    try {
      await login(email, password)
      setStatus('success')
      setTimeout(() => nav('/'), 400)
    } catch {
      setStatus('idle')
      setError(t('login.invalid'))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{t('login.heading')}</CardTitle>
          <CardDescription>{t('app.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                {t('common.email')}
              </label>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                {t('common.password')}
              </label>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <InteractiveHoverButton
              text={t('login.submit')}
              loadingText={t('common.loading')}
              successText={t('common.done')}
              status={status}
              onClick={() => {}}
              className="w-full h-12"
            />
            <p className="text-xs text-muted-foreground text-center">{t('login.demo_hint')}</p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
