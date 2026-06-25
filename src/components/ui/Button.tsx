import { cn } from "../../lib/utils"
import type { ButtonHTMLAttributes } from "react"

type ButtonVariant = "primary" | "secondary" | "tertiary" | "danger" | "ghost"
type ButtonSize = "sm" | "md" | "lg" | "icon"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClass: Record<ButtonVariant, string> = {
  primary: "primary_button",
  secondary: "secondary_button",
  tertiary: "tertiary_button",
  danger: "delete_button",
  ghost:
    "inline-flex items-center justify-center gap-2 bg-transparent border-none text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--foreground)] transition-colors rounded-[var(--radius)]",
}

const sizeClass: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
  icon: "p-2 min-h-[44px] min-w-[44px]",
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(variantClass[variant], sizeClass[size], className)}
      {...props}
    >
      {children}
    </button>
  )
}
