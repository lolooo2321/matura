import Dexie, { type EntityTable } from 'dexie'
import type {
  Exam,
  TaskItem,
  PlanAssignment,
  CalendarOverride,
  QuizAttempt,
  ActivityLogEntry,
  EarnedBadge,
  Settings,
  EssayEntry,
  FormulaEntry,
} from './types'

export interface BlobRecord {
  id: string
  blob: Blob
  name: string
  createdAt: string
}

class MaturaDB extends Dexie {
  exams!: EntityTable<Exam, 'id'>
  tasks!: EntityTable<TaskItem, 'id'>
  planAssignments!: EntityTable<PlanAssignment, 'id'>
  calendarOverrides!: EntityTable<CalendarOverride, 'date'>
  quizAttempts!: EntityTable<QuizAttempt, 'id'>
  activityLog!: EntityTable<ActivityLogEntry, 'id'>
  earnedBadges!: EntityTable<EarnedBadge, 'code'>
  settings!: EntityTable<Settings, 'id'>
  blobs!: EntityTable<BlobRecord, 'id'>
  essays!: EntityTable<EssayEntry, 'id'>
  formulas!: EntityTable<FormulaEntry, 'id'>

  constructor() {
    super('matura-master-2027')
    this.version(1).stores({
      exams: 'id, subject, status, season, schoolYear, scheduledDate',
      tasks: 'id, subject, topic, status, *tags, [subject+status], srs.dueDate',
      planAssignments: 'id, date, subject, kind, done',
      calendarOverrides: 'date',
      quizAttempts: 'id, date, kind, subject',
      activityLog: 'id, date, type',
      earnedBadges: 'code',
      settings: 'id',
      blobs: 'id',
      essays: 'id, date',
      formulas: 'id, subject',
    })
  }
}

export const db = new MaturaDB()

export async function getSettings(): Promise<Settings | undefined> {
  return db.settings.get(1)
}

export async function saveBlob(file: File | Blob, name: string): Promise<string> {
  const id = crypto.randomUUID()
  await db.blobs.put({ id, blob: file, name, createdAt: new Date().toISOString() })
  return id
}

export async function getBlobUrl(id?: string): Promise<string | undefined> {
  if (!id) return undefined
  const rec = await db.blobs.get(id)
  if (!rec) return undefined
  return URL.createObjectURL(rec.blob)
}

export async function exportAllData(): Promise<string> {
  const data: Record<string, unknown> = {}
  for (const table of db.tables) {
    data[table.name] = await table.toArray()
  }
  return JSON.stringify({ exportedAt: new Date().toISOString(), version: 1, data }, null, 2)
}

export interface ExamImportRow {
  subject: Exam['subject']
  schoolYear: string
  season: Exam['season']
  level?: string
  examPdfUrl: string
  solutionPdfUrl?: string
  notes?: string
}

/** Bulk-imports exams from a JSON array (e.g. a real NCVVO archive export). Skips rows that already exist (same subject+schoolYear+season+examPdfUrl). */
export async function importExamsFromJson(json: string): Promise<{ added: number; skipped: number }> {
  const rows = JSON.parse(json) as ExamImportRow[]
  if (!Array.isArray(rows)) throw new Error('Očekivan je JSON popis (array) ispita.')

  const existing = await db.exams.toArray()
  const existingKey = (e: { subject: string; schoolYear: string; season: string; examPdfUrl?: string }) =>
    `${e.subject}::${e.schoolYear}::${e.season}::${e.examPdfUrl ?? ''}`
  const existingKeys = new Set(existing.map(existingKey))

  let added = 0
  let skipped = 0
  const countsBySubject: Record<string, number> = {}
  for (const e of existing) countsBySubject[e.subject] = (countsBySubject[e.subject] ?? 0) + 1

  const toInsert: Exam[] = []
  for (const row of rows) {
    const key = existingKey(row)
    if (existingKeys.has(key)) {
      skipped++
      continue
    }
    existingKeys.add(key)
    const order = countsBySubject[row.subject] ?? 0
    countsBySubject[row.subject] = order + 1
    toInsert.push({
      id: crypto.randomUUID(),
      subject: row.subject,
      schoolYear: row.schoolYear,
      season: row.season,
      level: row.level,
      examPdfUrl: row.examPdfUrl,
      solutionPdfUrl: row.solutionPdfUrl,
      notes: row.notes,
      status: 'nije_zaposeto',
      source: 'ncvvo',
      order,
      createdAt: new Date().toISOString(),
    })
    added++
  }
  if (toInsert.length) await db.exams.bulkAdd(toInsert)
  return { added, skipped }
}

export async function importAllData(json: string): Promise<void> {
  const parsed = JSON.parse(json) as { data: Record<string, unknown[]> }
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      const rows = parsed.data[table.name]
      if (Array.isArray(rows) && rows.length) {
        await table.bulkPut(rows as never[])
      }
    }
  })
}
