import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

import type { ButtonVariant, ButtonSize } from "./button-classes";
import { buttonClasses } from "./button-classes";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={buttonClasses({ variant, size, className })}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span
            className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            aria-hidden
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
