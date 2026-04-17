import { ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/auth'
import { useUi, Lang, Theme } from '@/store/ui'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, FolderKanban, BookOpen, Users, Server, LogOut, Moon, Sun } from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/scenarios', icon: FolderKanban, labelKey: 'nav.scenarios' },
  { to: '/catalog', icon: BookOpen, labelKey: 'nav.catalog' },
] as const

const adminItems = [
  { to: '/admin/users', icon: Users, labelKey: 'nav.admin_users' },
  { to: '/admin/equipment', icon: Server, labelKey: 'nav.admin_equipment' },
] as const

export default function Layout(): ReactNode {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { user, logout } = useAuth()
  const { lang, setLang, theme, setTheme } = useUi()
  const isAdmin = user?.role === 'admin'

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <div className="text-xl font-semibold tracking-tight">{t('app.title')}</div>
          <div className="text-xs text-muted-foreground">{t('app.subtitle')}</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {t(item.labelKey)}
            </NavLink>
          ))}
          {isAdmin && (
            <>
              <div className="pt-4 pb-1 px-3 text-xs font-semibold uppercase text-muted-foreground">
                Admin
              </div>
              {adminItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {t(item.labelKey)}
                </NavLink>
              ))}
            </>
          )}
        </nav>
        <div className="p-3 border-t border-border flex items-center gap-2">
          <Avatar>
            <AvatarFallback>{user?.full_name?.charAt(0) ?? '?'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-medium truncate">{user?.full_name}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              logout()
              nav('/login')
            }}
            aria-label={t('nav.logout')}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card/50">
          <div className="md:hidden font-semibold">{t('app.title')}</div>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="ru">RU</option>
              <option value="uz">UZ</option>
              <option value="en">EN</option>
            </select>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? ('light' as Theme) : ('dark' as Theme))}
              aria-label="toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
