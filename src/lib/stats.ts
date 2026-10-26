import type { Exam, TaskItem, Settings, Subject, QuizAttempt, ActivityLogEntry } from './types'
import { SUBJECTS } from './types'
import { addDays, daysBetween, todayIso } from './utils'

export function subjectProgress(exams: Exam[], settings: Settings, subject: Subject) {
  const solved = exams.filter(e => e.subject === subject && e.status === 'rijeseno').length
  const total = settings.examCounts[subject]
  const pct = total > 0 ? Math.min(100, Math.round((solved / total) * 100)) : 0
  return { solved, total, pct }
}

export function totalStudyMinutes(exams: Exam[], quizAttempts: QuizAttempt[]): number {
  const examMinutes = exams.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0)
  const quizMinutes = quizAttempts.reduce((sum, q) => sum + q.durationSeconds / 60, 0)
  return Math.round(examMinutes + quizMinutes)
}

const MASTERY_SCORE: Record<string, number> = {
  ne_znam: 0,
  trebam_vjezbati: 0.33,
  skoro_znam: 0.66,
  znam_samostalno: 1,
}

export interface TopicStat {
  subject: Subject
  topic: string
  count: number
  score: number
}

export function topicBreakdown(tasks: TaskItem[]): TopicStat[] {
  const map = new Map<string, { subject: Subject; topic: string; count: number; sum: number }>()
  for (const t of tasks) {
    const key = `${t.subject}::${t.topic}`
    const entry = map.get(key) ?? { subject: t.subject, topic: t.topic, count: 0, sum: 0 }
    entry.count++
    entry.sum += MASTERY_SCORE[t.status] ?? 0
    map.set(key, entry)
  }
  return [...map.values()].map(e => ({ subject: e.subject, topic: e.topic, count: e.count, score: e.sum / e.count }))
}

export function strongestWeakest(tasks: TaskItem[]): { strongest?: TopicStat; weakest?: TopicStat } {
  const breakdown = topicBreakdown(tasks).filter(t => t.count >= 2)
  if (!breakdown.length) return {}
  const sorted = [...breakdown].sort((a, b) => b.score - a.score)
  return { strongest: sorted[0], weakest: sorted[sorted.length - 1] }
}

export function heatmapData(entries: ActivityLogEntry[], days: number): { date: string; count: number }[] {
  const map = new Map<string, number>()
  for (const e of entries) {
    map.set(e.date, (map.get(e.date) ?? 0) + 1)
  }
  const out: { date: string; count: number }[] = []
  const today = todayIso()
  for (let i = days - 1; i >= 0; i--) {
    const iso = addDays(today, -i)
    out.push({ date: iso, count: map.get(iso) ?? 0 })
  }
  return out
}

export function nearestMaturaCountdown(maturaDates: Partial<Record<Subject, string>>): { subject: Subject; date: string; days: number } | undefined {
  const today = todayIso()
  const candidates = SUBJECTS.map(s => ({ subject: s, date: maturaDates[s] }))
    .filter((c): c is { subject: Subject; date: string } => !!c.date && c.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (!candidates.length) return undefined
  return { ...candidates[0], days: daysBetween(today, candidates[0].date) }
}
