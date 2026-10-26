import * as RTabs from '@radix-ui/react-tabs'
import type * as React from 'react'
import { cn } from '../../lib/utils'

export const Tabs = RTabs.Root

export function TabsList({ className, ...props }: React.ComponentProps<typeof RTabs.List>) {
  return (
    <RTabs.List
      className={cn('inline-flex gap-1 rounded-xl bg-[var(--bg-sunken)] p-1', className)}
      {...props}
    />
  )
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof RTabs.Trigger>) {
  return (
    <RTabs.Trigger
      className={cn(
        'rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] transition-colors data-[state=active]:bg-[var(--bg-elevated)] data-[state=active]:text-[var(--text)] data-[state=active]:shadow-[var(--shadow-sm)]',
        className,
      )}
      {...props}
    />
  )
}

export const TabsContent = RTabs.Content
