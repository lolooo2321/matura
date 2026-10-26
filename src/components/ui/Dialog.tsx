import * as RDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function Dialog({
  open,
  onOpenChange,
  title,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 bg-black/50 z-40 animate-fade-in" />
        <RDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-md)] animate-fade-in',
            className,
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <RDialog.Title className="text-lg font-semibold">{title}</RDialog.Title>
            <RDialog.Close className="rounded-lg p-1 hover:bg-[var(--bg-sunken)]">
              <X size={18} />
            </RDialog.Close>
          </div>
          {children}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  )
}
