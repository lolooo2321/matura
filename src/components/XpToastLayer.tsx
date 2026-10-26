import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import type { XpToastDetail } from '../lib/celebrate'

interface Toast extends XpToastDetail {
  id: number
}

let nextId = 1

export function XpToastLayer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    function onXp(e: Event) {
      const detail = (e as CustomEvent<XpToastDetail>).detail
      const id = nextId++
      setToasts(prev => [...prev, { ...detail, id }])
      window.setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 1800)
    }
    window.addEventListener('xp-toast', onXp)
    return () => window.removeEventListener('xp-toast', onXp)
  }, [])

  if (!toasts.length) return null

  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col items-end gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="animate-xp-toast flex items-center gap-2 rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] px-4 py-2 text-sm font-semibold shadow-[var(--shadow-md)]"
        >
          <Sparkles size={16} />
          <span>+{t.xp} XP</span>
          <span className="font-normal opacity-90">{t.label}</span>
        </div>
      ))}
    </div>
  )
}
