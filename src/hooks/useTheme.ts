import { useEffect, useState } from 'react'
import { db } from '../lib/db'

export type ThemeMode = 'light' | 'dark' | 'system'

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  const dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  root.classList.toggle('dark', dark)
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>('system')

  useEffect(() => {
    db.settings.get(1).then(s => {
      if (s) {
        setMode(s.theme)
        applyTheme(s.theme)
      }
    })
  }, [])

  const setTheme = async (next: ThemeMode) => {
    setMode(next)
    applyTheme(next)
    await db.settings.update(1, { theme: next })
  }

  return { mode, setTheme }
}
