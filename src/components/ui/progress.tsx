import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number
}

export function Progress({ value = 0, className, ...props }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-slate-800', className)} {...props}>
      <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${clamped}%` }} />
    </div>
  )
}
