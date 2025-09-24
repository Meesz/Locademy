import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type="range"
      className={cn(
        'h-2 w-full appearance-none rounded-full bg-slate-700 accent-sky-500',
        '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-500',
        '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-sky-500',
        className,
      )}
      {...props}
    />
  )
})

Slider.displayName = 'Slider'
