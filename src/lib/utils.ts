import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// All date math here is done in UTC (both parsing and serializing) so that
// YYYY-MM-DD strings never drift by a day due to the local timezone offset.

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function parseUtc(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function addDays(iso: string, days: number): string {
  const d = parseUtc(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return isoDate(d)
}

export function startOfWeekMonday(iso: string): string {
  const d = parseUtc(iso)
  const dow = d.getUTCDay()
  const diff = dow === 0 ? -6 : 1 - dow
  d.setUTCDate(d.getUTCDate() + diff)
  return isoDate(d)
}

export function daysBetween(a: string, b: string): number {
  const da = parseUtc(a).getTime()
  const db_ = parseUtc(b).getTime()
  return Math.round((db_ - da) / 86400000)
}

export function formatDateHr(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('hr-HR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatDateShortHr(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('hr-HR', { day: 'numeric', month: 'short' })
}

export const WEEKDAY_LABELS_HR = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned']

/** Returns today's date as YYYY-MM-DD in the user's local timezone (not UTC). */
export function todayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
