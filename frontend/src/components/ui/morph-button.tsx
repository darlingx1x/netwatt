'use client'

import * as React from 'react'
import { motion, AnimatePresence, MotionConfig, type Transition } from 'motion/react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type MorphButtonProps = {
  text: string
  isLoading?: boolean
  icon?: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  size?: 'default' | 'sm' | 'lg'
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'>

const MorphButton = React.forwardRef<HTMLButtonElement, MorphButtonProps>(
  ({ text, isLoading = false, icon, variant = 'primary', size = 'default', className, onClick, ...props }, ref) => {
    const transition: Transition = {
      type: 'spring',
      stiffness: 150,
      damping: 25,
      mass: 1,
    }

    const variantStyles = {
      primary: 'bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-sm',
      secondary: 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground shadow-sm',
      ghost: 'bg-transparent text-foreground border-transparent hover:bg-accent hover:text-accent-foreground',
      destructive: 'bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90 shadow-sm',
    }

    const sizeStyles = {
      sm: 'h-9 text-xs',
      default: 'h-10 text-sm',
      lg: 'h-12 text-sm',
    }

    return (
      <MotionConfig transition={transition}>
        <motion.button
          ref={ref}
          layout
          className={cn(
            'relative flex items-center justify-center overflow-hidden rounded-xl border font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            isLoading ? 'px-0' : 'px-5',
            variantStyles[variant],
            sizeStyles[size],
            (props.disabled || isLoading) && 'opacity-50 cursor-not-allowed pointer-events-none',
            className,
          )}
          onClick={e => !isLoading && onClick?.(e)}
          whileTap={!isLoading ? { scale: 0.97 } : undefined}
          {...props}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {isLoading ? (
              <motion.div
                key="loader"
                className="flex items-center justify-center"
                style={{ width: '2.5rem' }}
                initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
              >
                <Loader2 className="h-4 w-4 animate-spin" />
              </motion.div>
            ) : (
              <motion.div
                key="content"
                className="flex items-center gap-2 whitespace-nowrap"
                initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
              >
                {icon && <motion.span layout>{icon}</motion.span>}
                <motion.span layout>{text}</motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </MotionConfig>
    )
  },
)

MorphButton.displayName = 'MorphButton'

export { MorphButton }
export type { MorphButtonProps }
