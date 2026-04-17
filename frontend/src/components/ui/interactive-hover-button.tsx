'use client'

import React from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type ButtonStatus = 'idle' | 'loading' | 'success'

interface InteractiveHoverButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  text?: string
  loadingText?: string
  successText?: string
  status?: ButtonStatus
  onClick?: () => void
  className?: string
}

export default function InteractiveHoverButton({
  text = 'Button',
  loadingText = 'Processing...',
  successText = 'Complete!',
  status = 'idle',
  onClick,
  className,
  disabled,
  ...props
}: InteractiveHoverButtonProps) {
  const isIdle = status === 'idle'

  return (
    <motion.button
      className={cn(
        'group bg-background relative flex min-w-40 items-center justify-center overflow-hidden rounded-full border p-2 px-6 font-semibold',
        status === 'loading' && 'pointer-events-none',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
      onClick={isIdle ? onClick : undefined}
      disabled={disabled || !isIdle}
      layout
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      {...(props as Record<string, unknown>)}
    >
      <AnimatePresence mode='popLayout' initial={false}>
        <motion.div
          key='idle'
          className='flex items-center gap-2'
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <div
            className={cn(
              'bg-primary h-2 w-2 rounded-full transition-all duration-500 group-hover:scale-[40]',
              !isIdle && 'scale-[40]'
            )}
          />
          <span
            className={cn(
              'inline-block transition-all duration-500 group-hover:translate-x-20 group-hover:opacity-0',
              !isIdle && 'translate-x-20 opacity-0'
            )}
          >
            {text}
          </span>
          <div
            className={cn(
              'text-primary-foreground absolute top-0 left-0 z-10 flex h-full w-full -translate-x-16 items-center justify-center gap-2 opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100',
              !isIdle && 'translate-x-0 opacity-100'
            )}
          >
            {status === 'idle' ? (
              <>
                <span>{text}</span>
                <ArrowRight className='h-4 w-4' />
              </>
            ) : status === 'loading' ? (
              <>
                <div className='border-primary border-t-background h-4 w-4 animate-spin rounded-full border-2' />
                <span className='text-background'>{loadingText}</span>
              </>
            ) : (
              <>
                <Check className='h-4 w-4' />
                <span>{successText}</span>
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.button>
  )
}
