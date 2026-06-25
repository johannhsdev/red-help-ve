import { cn } from "../../lib/utils"
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export function Input({ error, className, ...props }: InputProps) {
  return (
    <input
      className={cn("input_rhve__fom", error && "input_error", className)}
      {...props}
    />
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea className={cn("textarea_rhve", className)} {...props} />
  )
}

export function Label({
  className,
  children,
  htmlFor,
}: {
  className?: string
  children: React.ReactNode
  htmlFor?: string
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("text-sm font-medium text-[var(--secondary-foreground)]", className)}
    >
      {children}
    </label>
  )
}
