import { forwardRef } from 'react'
import type { TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[120px] w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
})

Textarea.displayName = 'Textarea'
