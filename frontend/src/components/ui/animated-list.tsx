import { useRef, type ReactNode } from 'react'
import { motion, useInView } from 'motion/react'

interface AnimatedItemProps {
  children: ReactNode
  delay?: number
}

export function AnimatedItem({ children, delay = 0 }: AnimatedItemProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.1, once: true })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ duration: 0.15, delay: Math.min(delay, 0.2) }}
    >
      {children}
    </motion.div>
  )
}
