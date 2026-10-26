import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db'
import { Progress } from '../ui/Progress'
import { levelFromXp, computeStreakSync } from '../../lib/gamification'

export function ProfileTile() {
  const activity = useLiveQuery(() => db.activityLog.toArray(), [], [])
  const overrides = useLiveQuery(() => db.calendarOverrides.toArray(), [], [])

  const xp = (activity ?? []).reduce((sum, e) => sum + e.xp, 0)
  const { level, xpIntoLevel, xpForNextLevel } = levelFromXp(xp)
  const streak = computeStreakSync(activity ?? [], overrides ?? [])
  const pct = xpForNextLevel > 0 ? Math.round((xpIntoLevel / xpForNextLevel) * 100) : 0

  return (
    <Link
      to="/"
      className="pop-interactive group block rounded-xl border p-3 hover:bg-[var(--bg-sunken)] hover:border-[var(--accent)]"
      title="Tvoj napredak"
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] text-sm font-bold">
          {level}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-tight truncate">Level {level}</div>
          <div className="text-[11px] text-[var(--text-muted)] leading-tight">{xpIntoLevel} / {xpForNextLevel} XP</div>
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold text-[var(--warning)] shrink-0">
          <span className={streak > 0 ? 'inline-block animate-streak' : undefined}>🔥</span>
          {streak}
        </div>
      </div>
      <Progress value={pct} />
    </Link>
  )
}
