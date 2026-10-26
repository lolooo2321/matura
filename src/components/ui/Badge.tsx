import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent'

const toneClass: Record<Tone, string> = {
  neutral: 'bg-[var(--bg-sunken)] text-[var(--text-muted)]',
  success: 'bg-[var(--success-soft)] text-[var(--success)]',
  warning: 'bg-[var(--warning-soft)] text-[var(--warning)]',
  danger: 'bg-[var(--danger-soft)] text-[var(--danger)]',
  accent: 'bg-[var(--accent-soft)] text-[var(--accent)]',
}

export function Badge({ className, tone = 'neutral', ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', toneClass[tone], className)}
      {...props}
    />
  )
}
