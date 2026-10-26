import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Library,
  Brain,
  Sparkles,
  ListChecks,
  BarChart3,
  Settings as SettingsIcon,
  Moon,
  Sun,
  Laptop,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useTheme } from '../../hooks/useTheme'
import { XpToastLayer } from '../XpToastLayer'
import { ProfileTile } from './ProfileTile'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/raspored', label: 'Moj raspored', icon: CalendarDays },
  { to: '/mature', label: 'Stare mature', icon: Library },
  { to: '/zadaci', label: 'Banka zadataka', icon: Brain },
  { to: '/tutor', label: 'AI tutor', icon: Sparkles },
  { to: '/kvizovi', label: 'Kvizovi', icon: ListChecks },
  { to: '/statistika', label: 'Statistika', icon: BarChart3 },
  { to: '/postavke', label: 'Postavke', icon: SettingsIcon },
]

const MOBILE_NAV = [NAV[0], NAV[1], NAV[3], NAV[5], NAV[7]]

function ThemeSwitcher() {
  const { mode, setTheme } = useTheme()
  const icons = { light: Sun, dark: Moon, system: Laptop } as const
  const order: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system']
  const Icon = icons[mode]
  return (
    <button
      onClick={() => setTheme(order[(order.indexOf(mode) + 1) % order.length])}
      className="pop-interactive flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--bg-sunken)] w-full"
      title="Promijeni temu"
    >
      <Icon size={18} />
      <span className="capitalize">{mode === 'light' ? 'Svijetla' : mode === 'dark' ? 'Tamna' : 'Sustav'}</span>
    </button>
  )
}

export function Shell() {
  return (
    <div className="min-h-screen flex">
      <XpToastLayer />
      <aside className="hidden md:flex w-64 flex-col border-r bg-[var(--bg-elevated)] px-3 py-4 sticky top-0 h-screen">
        <div className="px-3 py-2 mb-4">
          <div className="font-bold text-lg tracking-tight">Matura Master</div>
          <div className="text-xs text-[var(--text-muted)]">2027</div>
        </div>
        <nav className="flex-1 flex flex-col gap-1">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'pop-interactive flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium',
                  isActive
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text)]',
                )
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2">
          <ProfileTile />
          <ThemeSwitcher />
        </div>
      </aside>

      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[var(--bg-elevated)] border-t flex items-stretch">
        {MOBILE_NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'pop-interactive flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
                isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]',
              )
            }
          >
            <item.icon size={20} />
            {item.label.split(' ')[0]}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
