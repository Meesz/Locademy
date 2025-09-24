import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
})

Input.displayName = 'Input'
