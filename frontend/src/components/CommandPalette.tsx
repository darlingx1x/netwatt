import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { useAuth } from '@/store/auth'
import { useUi, Lang, Theme } from '@/store/ui'
import {
  Search,
  Plus,
  FolderKanban,
  BookOpen,
  Users,
  Server,
  ScrollText,
  KeyRound,
  Info,
  FunctionSquare,
  Moon,
  Sun,
  Languages,
  LogOut,
  FileText,
  FileSpreadsheet,
} from 'lucide-react'

interface Command {
  id: string
  label: string
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  run: () => void
  keywords?: string
  group: string
}

interface ScenarioLite {
  id: number
  name: string
  status: string
}
interface EquipmentLite {
  id: number
  vendor: string
  model: string
  category: string
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const nav = useNavigate()
  const { user, logout, accessToken } = useAuth()
  const { lang, setLang, theme, setTheme } = useUi()
  const isAdmin = user?.role === 'admin'

  const { data: scenarios } = useQuery({
    queryKey: ['scenarios'],
    queryFn: async () => (await api.get<ScenarioLite[]>('/scenarios')).data,
    enabled: open,
  })
  const { data: equipment } = useQuery({
    queryKey: ['equipment-cmd', query],
    queryFn: async () =>
      (
        await api.get<{ items: EquipmentLite[] }>('/equipment', {
          params: { q: query || undefined, limit: 12 },
        })
      ).data,
    enabled: open && query.length > 0,
  })

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
        setQuery('')
        setCursor(0)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const commands = useMemo<Command[]>(() => {
    const cmds: Command[] = [
      {
        id: 'new',
        label: 'Новый сценарий',
        hint: 'открыть wizard',
        icon: Plus,
        run: () => nav('/scenarios/new'),
        group: 'Действия',
      },
      {
        id: 'scenarios',
        label: 'Сценарии',
        icon: FolderKanban,
        run: () => nav('/scenarios'),
        group: 'Навигация',
      },
      {
        id: 'catalog',
        label: 'Каталог оборудования',
        icon: BookOpen,
        run: () => nav('/catalog'),
        group: 'Навигация',
      },
      {
        id: 'methodology',
        label: 'Методология',
        icon: FunctionSquare,
        run: () => nav('/methodology'),
        group: 'Навигация',
      },
      {
        id: 'about',
        label: 'О системе',
        icon: Info,
        run: () => nav('/about'),
        group: 'Навигация',
      },
      {
        id: 'theme',
        label: theme === 'dark' ? 'Светлая тема' : 'Тёмная тема',
        icon: theme === 'dark' ? Sun : Moon,
        run: () => setTheme(theme === 'dark' ? ('light' as Theme) : ('dark' as Theme)),
        group: 'Настройки',
      },
      {
        id: 'lang-ru',
        label: 'Русский',
        hint: lang === 'ru' ? 'текущий' : '',
        icon: Languages,
        run: () => setLang('ru' as Lang),
        group: 'Язык',
      },
      {
        id: 'lang-uz',
        label: 'O‘zbekcha',
        hint: lang === 'uz' ? 'текущий' : '',
        icon: Languages,
        run: () => setLang('uz' as Lang),
        group: 'Язык',
      },
      {
        id: 'lang-en',
        label: 'English',
        hint: lang === 'en' ? 'текущий' : '',
        icon: Languages,
        run: () => setLang('en' as Lang),
        group: 'Язык',
      },
      {
        id: 'logout',
        label: 'Выйти',
        icon: LogOut,
        run: () => {
          logout()
          nav('/login')
        },
        group: 'Настройки',
      },
    ]
    if (isAdmin) {
      cmds.push(
        { id: 'users', label: 'Пользователи', icon: Users, run: () => nav('/admin/users'), group: 'Админка' },
        { id: 'eq', label: 'Оборудование (админ)', icon: Server, run: () => nav('/admin/equipment'), group: 'Админка' },
        { id: 'audit', label: 'Журнал аудита', icon: ScrollText, run: () => nav('/admin/audit'), group: 'Админка' },
        { id: 'sessions', label: 'Сессии auth_tokens', icon: KeyRound, run: () => nav('/admin/sessions'), group: 'Админка' },
      )
    }
    for (const s of scenarios ?? []) {
      cmds.push({
        id: `scenario-${s.id}`,
        label: s.name,
        hint: `#${s.id} · ${s.status}`,
        icon: FolderKanban,
        run: () => nav(`/scenarios/${s.id}`),
        keywords: `scenario ${s.status} #${s.id}`,
        group: 'Сценарии',
      })
      if (s.status === 'ready') {
        cmds.push({
          id: `pdf-${s.id}`,
          label: `PDF: ${s.name}`,
          icon: FileText,
          run: () => downloadReport(s.id, 'pdf', accessToken),
          keywords: `pdf export ${s.id}`,
          group: 'Экспорт',
        })
        cmds.push({
          id: `xlsx-${s.id}`,
          label: `XLSX: ${s.name}`,
          icon: FileSpreadsheet,
          run: () => downloadReport(s.id, 'xlsx', accessToken),
          keywords: `xlsx export ${s.id}`,
          group: 'Экспорт',
        })
      }
    }
    for (const eq of equipment?.items ?? []) {
      cmds.push({
        id: `eq-${eq.id}`,
        label: `${eq.vendor} ${eq.model}`,
        hint: eq.category,
        icon: Server,
        run: () => nav(`/catalog?highlight=${eq.id}`),
        keywords: `equipment ${eq.vendor} ${eq.model} ${eq.category}`,
        group: 'Оборудование',
      })
    }
    return cmds
  }, [scenarios, equipment, theme, lang, isAdmin, accessToken, nav, setLang, setTheme, logout])

  const filtered = useMemo(() => {
    if (!query) return commands
    const q = query.toLowerCase()
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.hint?.toLowerCase().includes(q) ||
        c.keywords?.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q),
    )
  }, [commands, query])

  const grouped = useMemo(() => {
    const map = new Map<string, Command[]>()
    for (const c of filtered) {
      if (!map.has(c.group)) map.set(c.group, [])
      map.get(c.group)!.push(c)
    }
    return Array.from(map.entries())
  }, [filtered])

  useEffect(() => {
    setCursor(0)
  }, [query])

  if (!open) return null

  const flat = filtered

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(flat.length - 1, c + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(0, c - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      flat[cursor]?.run()
      setOpen(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-xl bg-popover text-popover-foreground border border-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Команды, сценарии, оборудование…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">ESC</kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto py-1">
          {grouped.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Ничего не найдено
            </div>
          )}
          {grouped.map(([group, items]) => (
            <div key={group}>
              <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                {group}
              </div>
              {items.map((c) => {
                const idx = flat.indexOf(c)
                const active = idx === cursor
                const Icon = c.icon
                return (
                  <button
                    key={c.id}
                    type="button"
                    onMouseEnter={() => setCursor(idx)}
                    onClick={() => {
                      c.run()
                      setOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left ${
                      active ? 'bg-accent' : ''
                    }`}
                  >
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{c.label}</span>
                    {c.hint && (
                      <span className="text-xs text-muted-foreground truncate">{c.hint}</span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        <div className="border-t border-border px-3 py-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>
            <kbd className="px-1 py-0.5 rounded bg-muted font-mono">↑</kbd>
            <kbd className="px-1 py-0.5 rounded bg-muted font-mono ml-1">↓</kbd> навигация
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-muted font-mono">↵</kbd> выбрать
          </span>
          <span className="ml-auto">
            <kbd className="px-1 py-0.5 rounded bg-muted font-mono">⌘K</kbd> открыть
          </span>
        </div>
      </div>
    </div>
  )
}

async function downloadReport(id: number, format: 'pdf' | 'xlsx', token: string | null) {
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
  const resp = await fetch(`/api/scenarios/${id}/report.${format}`, { headers })
  const blob = await resp.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `scenario_${id}.${format}`
  a.click()
  URL.revokeObjectURL(a.href)
}
