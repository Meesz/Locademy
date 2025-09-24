import { cn } from "../../lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";

export type ButtonSize = "sm" | "md" | "lg";

export const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-sky-500 text-white hover:bg-sky-400 focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:bg-slate-700",
  secondary:
    "bg-slate-800 text-slate-100 hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-slate-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:bg-slate-800/70",
  ghost:
    "bg-transparent text-slate-100 hover:bg-slate-800/80 disabled:text-slate-500",
  outline:
    "border border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
};

export const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 rounded-md px-3 text-sm",
  md: "h-10 rounded-md px-4 text-sm",
  lg: "h-11 rounded-lg px-6 text-base",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(
    "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
    variantClasses[variant],
    sizeClasses[size],
    className
  );
}
