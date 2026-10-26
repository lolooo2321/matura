import { db } from './db'
import { BADGES, type ActivityLogEntry, type CalendarOverride } from './types'
import { addDays, todayIso } from './utils'

export const XP_RULES = {
  examSolved: 50,
  taskReviewed: 5,
  taskMastered: 15,
  quizCompleted: 10,
  perfectQuiz: 20,
}

/** Logs an XP-earning activity and returns the entry's id, so it can be reversed later via revokeXp(). */
export async function logActivity(type: string, xp: number, meta?: string): Promise<string> {
  const id = crypto.randomUUID()
  await db.activityLog.add({ id, date: todayIso(), type, xp, meta })
  return id
}

/** Reverses a previously granted activity (e.g. when a user un-checks something they marked done). */
export async function revokeXp(activityId?: string): Promise<void> {
  if (activityId) await db.activityLog.delete(activityId)
}

export async function totalXp(): Promise<number> {
  const entries = await db.activityLog.toArray()
  return entries.reduce((sum, e) => sum + e.xp, 0)
}

export function levelFromXp(xp: number): { level: number; xpIntoLevel: number; xpForNextLevel: number } {
  let level = 1
  let threshold = 100
  let remaining = Math.max(0, xp)
  while (remaining >= threshold) {
    remaining -= threshold
    level++
    threshold = Math.round(threshold * 1.25)
  }
  return { level, xpIntoLevel: remaining, xpForNextLevel: threshold }
}

/** Counts consecutive days (ending today or yesterday) with logged activity; rest-day overrides don't break it. */
export function computeStreakSync(entries: ActivityLogEntry[], overrides: CalendarOverride[]): number {
  const activeDays = new Set(entries.map(e => e.date))
  const restDays = new Set(overrides.map(o => o.date))

  let streak = 0
  let cursor = todayIso()
  if (!activeDays.has(cursor) && !restDays.has(cursor)) {
    cursor = addDays(cursor, -1)
  }
  while (activeDays.has(cursor) || restDays.has(cursor)) {
    if (activeDays.has(cursor)) streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

export async function computeStreak(): Promise<number> {
  const [entries, overrides] = await Promise.all([db.activityLog.toArray(), db.calendarOverrides.toArray()])
  return computeStreakSync(entries, overrides)
}

export async function checkAndAwardBadges(): Promise<string[]> {
  const [exams, tasks, streak, earned] = await Promise.all([
    db.exams.toArray(),
    db.tasks.toArray(),
    computeStreak(),
    db.earnedBadges.toArray(),
  ])
  const stats = {
    solvedExams: exams.filter(e => e.status === 'rijeseno').length,
    streak,
    masteredHard: tasks.filter(t => t.status === 'znam_samostalno' && t.tags.includes('teško')).length,
  }
  const earnedCodes = new Set(earned.map(b => b.code))
  const newlyEarned: string[] = []
  for (const badge of BADGES) {
    if (!earnedCodes.has(badge.code) && badge.check(stats)) {
      await db.earnedBadges.add({ code: badge.code, earnedAt: new Date().toISOString() })
      newlyEarned.push(badge.code)
    }
  }
  return newlyEarned
}
