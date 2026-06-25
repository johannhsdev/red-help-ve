import { cn } from "../../lib/utils"

type BadgeVariant = "missing" | "found" | "center" | "default"

interface BadgeProps {
  variant?: BadgeVariant
  className?: string
  children: React.ReactNode
}

const variantClasses: Record<BadgeVariant, string> = {
  missing: "bg-[var(--status-missing)] text-white",
  found: "bg-[var(--status-found)] text-white",
  center: "bg-[var(--primary)] text-[var(--primary-foreground)]",
  default: "bg-[var(--secondary)] text-[var(--secondary-foreground)]",
}

export function Badge({ variant = "default", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-none",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
