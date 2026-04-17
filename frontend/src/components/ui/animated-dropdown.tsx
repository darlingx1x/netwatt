'use client'

import React, { useState, useRef, type FC, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) handler()
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [ref, handler])
}

export interface DropdownItem {
  name: string
  value: string
  icon?: React.ReactNode
}

interface AnimatedDropdownProps {
  items: DropdownItem[]
  value?: string
  onSelect?: (item: DropdownItem) => void
  placeholder?: string
  className?: string
}

export default function AnimatedDropdown({
  items,
  value,
  onSelect,
  placeholder = 'Select...',
  className,
}: AnimatedDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selected = items.find(i => i.value === value)

  return (
    <OnClickOutside onClickOutside={() => setIsOpen(false)}>
      <div
        data-state={isOpen ? 'open' : 'closed'}
        className={cn('group relative inline-block', className)}
      >
        <Button
          variant="outline"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(!isOpen)}
          className="gap-1.5"
        >
          {selected?.icon}
          <span className="truncate">{selected?.name ?? placeholder}</span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <ChevronDown className="h-4 w-4 opacity-50" />
          </motion.div>
        </Button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              role="listbox"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={cn(
                'absolute top-[calc(100%+0.25rem)] left-0 z-50 w-fit min-w-full',
                'overflow-hidden rounded-xl',
                'bg-background border border-border',
                'shadow-lg'
              )}
            >
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: 0.03 } },
                }}
              >
                {items.map((item) => (
                  <motion.button
                    key={item.value}
                    type="button"
                    variants={{
                      hidden: { opacity: 0, x: -20 },
                      visible: { opacity: 1, x: 0 },
                    }}
                    onClick={() => { onSelect?.(item); setIsOpen(false) }}
                    className={cn(
                      'flex items-center gap-2 w-full px-3 py-2 text-sm text-left',
                      'border-b border-border last:border-b-0',
                      'hover:bg-accent transition-colors duration-150',
                      item.value === value && 'bg-accent/50 font-medium'
                    )}
                  >
                    {item.icon}
                    {item.name}
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </OnClickOutside>
  )
}

interface OnClickOutsideProps {
  children: ReactNode
  onClickOutside: () => void
}

const OnClickOutside: FC<OnClickOutsideProps> = ({ children, onClickOutside }) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  useClickOutside(wrapperRef, onClickOutside)
  return <div ref={wrapperRef}>{children}</div>
}
