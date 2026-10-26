import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantClass: Record<Variant, string> = {
  primary: 'bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 shadow-[0_1px_0_0_rgba(0,0,0,0.08)] active:shadow-none',
  secondary: 'bg-[var(--bg-sunken)] text-[var(--text)] hover:bg-[var(--border)]',
  ghost: 'bg-transparent text-[var(--text)] hover:bg-[var(--bg-sunken)]',
  danger: 'bg-[var(--danger)] text-white hover:opacity-90',
  outline: 'bg-transparent border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-sunken)]',
}

const sizeClass: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm rounded-lg',
  md: 'h-10 px-4 text-sm rounded-xl',
  lg: 'h-12 px-6 text-base rounded-xl',
  icon: 'h-10 w-10 rounded-xl',
}

export function Button({ className, variant = 'primary', size = 'md', ...props }: Props) {
  return (
    <button
      className={cn(
        'pop-interactive inline-flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100 whitespace-nowrap',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    />
  )
}
