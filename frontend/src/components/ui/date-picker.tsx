import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarIcon, X } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  lang?: string
}

export function DatePicker({ value, onChange, placeholder, className, disabled, lang = 'ru' }: DatePickerProps) {
  const { t } = useTranslation()
  const resolvedPlaceholder = placeholder ?? t('datepicker.placeholder')
  const [open, setOpen] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const calcDirection = useCallback(() => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    // Calendar is roughly 340px tall
    setOpenUp(spaceBelow < 350)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('touchstart', handleClickOutside)
      }
    }
  }, [open])

  const localeMap: Record<string, string> = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' }
  const formatted = value
    ? value.toLocaleDateString(localeMap[lang] ?? 'ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
    : null

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!open) calcDirection()
          setOpen(prev => !prev)
        }}
        className={cn(
          'w-full px-3.5 py-3 rounded-xl border border-input bg-background text-sm outline-none',
          'focus:ring-2 focus:ring-ring flex items-center justify-between',
          'disabled:pointer-events-none disabled:opacity-50',
          !value && 'text-muted-foreground',
          className,
        )}
      >
        <span>{formatted ?? resolvedPlaceholder}</span>
        <div className="flex items-center gap-1.5">
          {value && (
            <span
              role="button"
              onClick={e => {
                e.stopPropagation()
                onChange?.(undefined)
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        </div>
      </button>

      {open && (
        <div
          className={cn(
            'absolute z-50 left-0 rounded-xl border border-border bg-background shadow-lg p-3 animate-in fade-in-0 zoom-in-95',
            'max-h-[70vh] overflow-y-auto',
            openUp ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              onChange?.(date)
              setOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}
