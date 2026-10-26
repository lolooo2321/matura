import { db } from './db'
import type { PlanAssignment, Settings, Shift, Subject } from './types'
import { SUBJECTS } from './types'
import { addDays, daysBetween, startOfWeekMonday, todayIso } from './utils'

export const WEEKLY_SLOTS: Record<Shift, number> = { jutarnja: 4, popodnevna: 3 }

export function otherShift(s: Shift): Shift {
  return s === 'jutarnja' ? 'popodnevna' : 'jutarnja'
}

export function getShiftForDate(dateIso: string, settings: Settings): Shift {
  const weekStart = startOfWeekMonday(dateIso)
  const firstWeekStart = startOfWeekMonday(settings.firstWeekMonday)
  const weeksElapsed = Math.floor(daysBetween(firstWeekStart, weekStart) / 7)
  const even = ((weeksElapsed % 2) + 2) % 2 === 0
  return even ? settings.firstWeekShift : otherShift(settings.firstWeekShift)
}

const WEEKDAY_SLOTS_4 = [0, 1, 2, 3] // Mon-Thu
const WEEKDAY_SLOTS_3 = [0, 2, 4] // Mon-Wed-Fri

export async function remainingBudget(settings: Settings): Promise<Record<Subject, number>> {
  const exams = await db.exams.toArray()
  const assignments = await db.planAssignments.toArray()
  const result: Record<Subject, number> = { matematika: 0, fizika: 0, hrvatski: 0 }
  for (const subject of SUBJECTS) {
    const solved = exams.filter(e => e.subject === subject && e.status === 'rijeseno').length
    const scheduled = assignments.filter(a => a.subject === subject && a.kind === 'matura').length
    const alreadySolved = settings.alreadySolved?.[subject] ?? 0
    result[subject] = Math.max(0, settings.examCounts[subject] - alreadySolved - Math.max(solved, scheduled))
  }
  return result
}

/** Appends plan assignments for weeks after the last existing one, until exam budgets are exhausted or planEndDate reached. */
export async function extendPlan(settings: Settings, weeksAhead = 10): Promise<void> {
  const overrides = await db.calendarOverrides.toArray()
  const overrideDates = new Set(overrides.map(o => o.date))
  const existing = await db.planAssignments.toArray()
  const lastDate = existing.reduce((max, a) => (a.date > max ? a.date : max), settings.planStartDate)

  let cursorWeekStart = startOfWeekMonday(existing.length ? addDays(lastDate, 1) : settings.planStartDate)
  const budget = await remainingBudget(settings)
  const toInsert: PlanAssignment[] = []

  for (let w = 0; w < weeksAhead; w++) {
    if (cursorWeekStart > settings.planEndDate) break
    if (SUBJECTS.every(s => budget[s] <= 0)) break
    const shift = getShiftForDate(cursorWeekStart, settings)
    const slotCount = WEEKLY_SLOTS[shift]
    const weekdaySlots = slotCount === 4 ? WEEKDAY_SLOTS_4 : WEEKDAY_SLOTS_3
    const coreSubjects: Subject[] = ['matematika', 'fizika', 'hrvatski']
    const weekPicks: Subject[] = [...coreSubjects]
    if (slotCount === 4) {
      const ranked = [...SUBJECTS].sort((a, b) => {
        const ra = settings.examCounts[a] ? budget[a] / settings.examCounts[a] : 0
        const rb = settings.examCounts[b] ? budget[b] / settings.examCounts[b] : 0
        return rb - ra
      })
      weekPicks.push(ranked[0])
    }

    for (let i = 0; i < weekPicks.length; i++) {
      const subject = weekPicks[i]
      if (budget[subject] <= 0) continue
      let date = addDays(cursorWeekStart, weekdaySlots[i] ?? weekdaySlots[weekdaySlots.length - 1])
      let attempts = 0
      while (overrideDates.has(date) && attempts < 7) {
        date = addDays(date, 1)
        attempts++
      }
      if (overrideDates.has(date)) continue
      toInsert.push({
        id: crypto.randomUUID(),
        date,
        subject,
        kind: 'matura',
        done: false,
        skipped: false,
        createdAt: new Date().toISOString(),
      })
      budget[subject]--
    }
    cursorWeekStart = addDays(cursorWeekStart, 7)
  }

  if (toInsert.length) await db.planAssignments.bulkAdd(toInsert)
}

/** Links scheduled plan assignments to actual imported exams, in chronological order per subject. */
export async function autoLinkExamsToPlan(): Promise<void> {
  const exams = await db.exams.toArray()
  const assignments = await db.planAssignments
    .filter(a => a.kind === 'matura' && !a.examId)
    .toArray()
  assignments.sort((a, b) => a.date.localeCompare(b.date))

  for (const subject of SUBJECTS) {
    const freeExams = exams
      .filter(e => e.subject === subject && !e.scheduledDate && e.status !== 'rijeseno')
      .sort((a, b) => a.schoolYear.localeCompare(b.schoolYear) || a.order - b.order)
    const subjectAssignments = assignments.filter(a => a.subject === subject)
    for (let i = 0; i < Math.min(freeExams.length, subjectAssignments.length); i++) {
      const exam = freeExams[i]
      const assignment = subjectAssignments[i]
      await db.exams.update(exam.id, { scheduledDate: assignment.date })
      await db.planAssignments.update(assignment.id, { examId: exam.id })
    }
  }
}

export interface ProgressSummary {
  expectedByToday: number
  doneByToday: number
  lag: number
  estimatedFinishDate: string
}

export async function computeProgressSummary(settings: Settings): Promise<ProgressSummary> {
  const today = todayIso()
  const assignments = await db.planAssignments.where('kind').equals('matura').toArray()
  const pastDue = assignments.filter(a => a.date <= today && !a.skipped)
  const expectedByToday = pastDue.length
  const doneByToday = pastDue.filter(a => a.done).length
  const lag = expectedByToday - doneByToday

  const exams = await db.exams.toArray()
  const totalPlanned = SUBJECTS.reduce((sum, s) => sum + settings.examCounts[s], 0)
  const totalSolved = SUBJECTS.reduce((sum, s) => {
    const solved = exams.filter(e => e.subject === s && e.status === 'rijeseno').length
    return sum + Math.min(settings.examCounts[s], solved + (settings.alreadySolved?.[s] ?? 0))
  }, 0)
  const remainingToSolve = Math.max(0, totalPlanned - totalSolved)
  const avgPerWeek = (WEEKLY_SLOTS.jutarnja + WEEKLY_SLOTS.popodnevna) / 2
  const weeksNeeded = remainingToSolve > 0 ? Math.ceil(remainingToSolve / avgPerWeek) : 0
  const estimatedFinishDate = addDays(today, weeksNeeded * 7)

  return { expectedByToday, doneByToday, lag, estimatedFinishDate }
}
