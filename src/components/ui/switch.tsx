import { forwardRef, useCallback } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export interface SwitchProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked = false, disabled, onCheckedChange, onClick, ...props }, ref) => {
    const handleClick = useCallback<NonNullable<typeof onClick>>(
      (event) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        if (disabled) return
        onCheckedChange?.(!checked)
      },
      [checked, disabled, onCheckedChange, onClick],
    )

    return (
      <button
        ref={ref}
        role="switch"
        aria-checked={checked}
        data-state={checked ? 'checked' : 'unchecked'}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full border border-slate-700 transition-colors',
          checked ? 'bg-sky-500' : 'bg-slate-800',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        disabled={disabled}
        onClick={handleClick}
        {...props}
      >
        <span
          className={cn(
            'pointer-events-none absolute left-1 inline-flex h-4 w-4 transform items-center justify-center rounded-full bg-white transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
    )
  },
)

Switch.displayName = 'Switch'
