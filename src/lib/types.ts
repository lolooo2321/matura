export type Subject = 'matematika' | 'fizika' | 'hrvatski'

export const SUBJECTS: Subject[] = ['matematika', 'fizika', 'hrvatski']

export const SUBJECT_LABEL: Record<Subject, string> = {
  matematika: 'Matematika A',
  fizika: 'Fizika',
  hrvatski: 'Hrvatski jezik',
}

export const SUBJECT_COLOR_VAR: Record<Subject, string> = {
  matematika: '--math',
  fizika: '--physics',
  hrvatski: '--croatian',
}

export type Season = 'ljetni' | 'jesenski'
export type ExamStatus = 'nije_zaposeto' | 'u_tijeku' | 'rijeseno'
export type MasteryStatus = 'ne_znam' | 'trebam_vjezbati' | 'skoro_znam' | 'znam_samostalno'
export type Shift = 'jutarnja' | 'popodnevna'
export type ErrorReason =
  | 'nisam_znao_formulu'
  | 'nisam_razumio_postupak'
  | 'pogreska_racunanje'
  | 'ne_znam_odakle_pocet'
  | 'pogresno_procitao'
  | 'nedostajalo_vrijeme'
  | 'ne_znam_gradivo'

export const ERROR_REASON_LABEL: Record<ErrorReason, string> = {
  nisam_znao_formulu: 'Nisam znao formulu',
  nisam_razumio_postupak: 'Nisam razumio postupak',
  pogreska_racunanje: 'Pogreška u računanju',
  ne_znam_odakle_pocet: 'Nisam znao odakle početi',
  pogresno_procitao: 'Pogrešno sam pročitao zadatak',
  nedostajalo_vrijeme: 'Nedostajalo mi je vremena',
  ne_znam_gradivo: 'Nisam znao gradivo',
}

export const MASTERY_LABEL: Record<MasteryStatus, string> = {
  ne_znam: 'Ne znam',
  trebam_vjezbati: 'Trebam vježbati',
  skoro_znam: 'Skoro znam',
  znam_samostalno: 'Znam samostalno',
}

export const TAGS = ['teško', 'važno', 'ponoviti', 'često griešim'] as const

export interface Exam {
  id: string
  subject: Subject
  schoolYear: string
  season: Season
  level?: string
  examPdfUrl?: string
  solutionPdfUrl?: string
  examBlobId?: string
  solutionBlobId?: string
  status: ExamStatus
  solvedDate?: string
  scoreAchieved?: number
  scoreMax?: number
  durationMinutes?: number
  notes?: string
  source: 'ncvvo' | 'rucno'
  scheduledDate?: string
  order: number
  createdAt: string
  /** id of the activityLog entry that granted XP for solving this exam, so it can be reversed. */
  xpActivityId?: string
}

export interface SrsState {
  interval: number
  dueDate: string
  repetitions: number
  lastResult: 'wrong' | 'hard' | 'good' | 'easy' | null
  learnedByHeart: boolean
}

export interface TaskItem {
  id: string
  subject: Subject
  topic: string
  subtopic?: string
  examId?: string
  examTaskNumber?: string
  imageBlobId?: string
  text?: string
  reasonCodes: ErrorReason[]
  myAttempt?: string
  correctSolution?: string
  explanation?: string
  status: MasteryStatus
  tags: string[]
  createdAt: string
  srs: SrsState
}

export interface PlanAssignment {
  id: string
  date: string
  subject: Subject
  kind: 'matura' | 'ponavljanje'
  examId?: string
  done: boolean
  skipped: boolean
  movedFrom?: string
  createdAt: string
  /** id of the activityLog entry that granted XP, used only when this assignment has no linked exam. */
  xpActivityId?: string
}

export type OverrideType = 'odmor' | 'praznik' | 'bez_ucenja'

export interface CalendarOverride {
  date: string
  type: OverrideType
  note?: string
}

export interface QuizAttempt {
  id: string
  date: string
  kind: 'pogreske' | 'ai_slicni' | 'brzi' | 'tematski' | 'slaba_podrucja' | 'simulacija'
  subject?: Subject
  topic?: string
  taskIds: string[]
  correctCount: number
  totalCount: number
  durationSeconds: number
  mistakeTaskIds: string[]
}

export interface ActivityLogEntry {
  id: string
  date: string
  type: string
  xp: number
  meta?: string
}

export interface EarnedBadge {
  code: string
  earnedAt: string
}

export interface Settings {
  id: 1
  onboardingDone: boolean
  firstWeekMonday: string
  firstWeekShift: Shift
  examCounts: Record<Subject, number>
  alreadySolved: Record<Subject, number>
  maturaDates: Partial<Record<Subject, string>>
  studyDaysPerSubject: Partial<Record<Subject, number[]>>
  dailyStudyMinutes: number
  theme: 'light' | 'dark' | 'system'
  planStartDate: string
  planEndDate: string
  anthropicApiKey?: string
}

export const DEFAULT_EXAM_COUNTS: Record<Subject, number> = {
  matematika: 36,
  fizika: 34,
  hrvatski: 36,
}

export const TOPICS: Record<Subject, string[]> = {
  matematika: [
    'Algebra',
    'Funkcije',
    'Jednadžbe i nejednadžbe',
    'Trigonometrija',
    'Geometrija',
    'Analitička geometrija',
    'Derivacije',
    'Vjerojatnost i statistika',
    'Ostala područja',
  ],
  fizika: [
    'Mehanika',
    'Termodinamika',
    'Elektricitet',
    'Magnetizam',
    'Titranje i valovi',
    'Optika',
    'Moderna fizika',
    'Ostala područja',
  ],
  hrvatski: [
    'Čitanje i razumijevanje',
    'Književnost',
    'Jezik i gramatika',
    'Sažetak',
    'Esej',
    'Ostala područja',
  ],
}

export const BADGES: { code: string; label: string; icon: string; check: (s: BadgeStats) => boolean }[] = [
  { code: 'prva_matura', label: 'Prva riješena matura', icon: '🎯', check: s => s.solvedExams >= 1 },
  { code: 'deset_matura', label: '10 riješenih matura', icon: '🔥', check: s => s.solvedExams >= 10 },
  { code: 'pedeset_matura', label: '50 riješenih matura', icon: '🏆', check: s => s.solvedExams >= 50 },
  { code: 'sto_matura', label: '100 riješenih matura', icon: '👑', check: s => s.solvedExams >= 100 },
  { code: 'tjedan_dana', label: '7 dana redovitog ponavljanja', icon: '📅', check: s => s.streak >= 7 },
  { code: 'dvadeset_teskih', label: '20 savladanih teških zadataka', icon: '🧠', check: s => s.masteredHard >= 20 },
]

export interface EssayEntry {
  id: string
  date: string
  essayType: string
  text: string
  feedback: string
}

export interface FormulaEntry {
  id: string
  subject: Subject
  name: string
  formula: string
  notes?: string
}

export interface BadgeStats {
  solvedExams: number
  streak: number
  masteredHard: number
}
