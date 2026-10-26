import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Check, ChevronLeft, ChevronRight, Move } from 'lucide-react'
import { db } from '../lib/db'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { NativeSelect } from '../components/ui/Input'
import { SUBJECT_LABEL, SUBJECT_COLOR_VAR, type OverrideType, type PlanAssignment } from '../lib/types'
import { addDays, cn, formatDateHr, startOfWeekMonday, todayIso, WEEKDAY_LABELS_HR } from '../lib/utils'
import { getShiftForDate } from '../lib/schedule'
import { logActivity, revokeXp, XP_RULES, checkAndAwardBadges } from '../lib/gamification'
import { confettiBurst, fireXpToast } from '../lib/celebrate'

const OVERRIDE_LABEL: Record<OverrideType, string> = {
  odmor: 'Godišnji odmor',
  praznik: 'Praznik',
  bez_ucenja: 'Dan bez učenja',
}

export function SchedulePage() {
  const settings = useLiveQuery(() => db.settings.get(1))
  const assignments = useLiveQuery(() => db.planAssignments.toArray(), [], [])
  const overrides = useLiveQuery(() => db.calendarOverrides.toArray(), [], [])
  const [weekOffset, setWeekOffset] = useState(0)
  const [justCompleted, setJustCompleted] = useState<string | null>(null)
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [activeDragItem, setActiveDragItem] = useState<PlanAssignment | null>(null)
  const inFlight = useRef<Set<string>>(new Set())

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  )

  const weekStart = useMemo(() => addDays(startOfWeekMonday(todayIso()), weekOffset * 7), [weekOffset])
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const today = todayIso()

  const overrideMap = useMemo(() => new Map((overrides ?? []).map(o => [o.date, o])), [overrides])

  const weekItems = useMemo(
    () => (assignments ?? []).filter(a => days.includes(a.date)),
    [assignments, days],
  )
  const weekTotal = weekItems.length
  const weekDone = weekItems.filter(a => a.done).length
  const weekPct = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0

  /**
   * Toggles a plan item's done state. Always re-reads the current truth from the DB (never
   * trusts the React prop, which can be stale under rapid clicks) and uses a synchronous ref
   * lock so overlapping clicks on the same item can't both pass the "what's the current state"
   * check — that double-processing is exactly what let XP be farmed by clicking fast.
   */
  async function toggleDone(itemId: string) {
    if (inFlight.current.has(itemId)) return
    inFlight.current.add(itemId)
    setPendingIds(prev => new Set(prev).add(itemId))

    try {
      const freshItem = await db.planAssignments.get(itemId)
      if (!freshItem) return
      const exam = freshItem.examId ? await db.exams.get(freshItem.examId) : undefined
      const wasDone = exam ? exam.status === 'rijeseno' : freshItem.done
      const done = !wasDone

      if (done) {
        const activityId = await logActivity('exam_solved', XP_RULES.examSolved, freshItem.examId)
        if (exam) {
          await db.exams.update(exam.id, { status: 'rijeseno', solvedDate: exam.solvedDate ?? todayIso(), xpActivityId: activityId })
          await db.planAssignments.update(freshItem.id, { done: true, skipped: false })
        } else {
          await db.planAssignments.update(freshItem.id, { done: true, skipped: false, xpActivityId: activityId })
        }
        setJustCompleted(freshItem.id)
        window.setTimeout(() => setJustCompleted(null), 500)
        confettiBurst('small')
        fireXpToast(XP_RULES.examSolved, SUBJECT_LABEL[freshItem.subject])
        const newBadges = await checkAndAwardBadges()
        if (newBadges.length) {
          window.setTimeout(() => confettiBurst('big'), 250)
        }
      } else {
        if (exam) {
          await revokeXp(exam.xpActivityId)
          await db.exams.update(exam.id, { status: 'nije_zaposeto', xpActivityId: undefined })
          await db.planAssignments.update(freshItem.id, { done: false, skipped: false })
        } else {
          await revokeXp(freshItem.xpActivityId)
          await db.planAssignments.update(freshItem.id, { done: false, skipped: false, xpActivityId: undefined })
        }
      }
    } finally {
      inFlight.current.delete(itemId)
      setPendingIds(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  async function markSkipped(id: string) {
    await db.planAssignments.update(id, { skipped: true, done: false })
  }

  async function toggleOverride(date: string, type: OverrideType | '') {
    if (!type) {
      await db.calendarOverrides.delete(date)
    } else {
      await db.calendarOverrides.put({ date, type })
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const item = weekItems.find(i => i.id === event.active.id)
    setActiveDragItem(item ?? null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragItem(null)
    const { active, over } = event
    if (!over) return
    const itemId = String(active.id)
    const newDate = String(over.id)
    const item = weekItems.find(i => i.id === itemId)
    if (!item || item.date === newDate) return
    await db.planAssignments.update(itemId, { date: newDate, movedFrom: item.date })
  }

  if (!settings) return null
  const shift = getShiftForDate(weekStart, settings)

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="p-4 md:p-10 max-w-[1600px] mx-auto space-y-8 animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Moj raspored</h1>
            <p className="text-base text-[var(--text-muted)] mt-1">Tjedan {weekDone}/{weekTotal || 0} gotov · {weekPct}%</p>
          </div>
          <Badge tone="accent" className="capitalize text-base px-4 py-1.5">{shift} smjena</Badge>
        </div>

        <div className="h-2.5 w-full rounded-full bg-[var(--bg-sunken)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-700 ease-out"
            style={{ width: `${weekPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" onClick={() => setWeekOffset(w => w - 1)}>
            <ChevronLeft size={18} /> <span className="hidden sm:inline">Prošli tjedan</span>
          </Button>
          <div className="flex flex-col items-center">
            <button
              onClick={() => setWeekOffset(0)}
              className="pop-interactive text-base font-semibold text-[var(--accent)] hover:underline"
            >
              {weekOffset === 0 ? 'Ovaj tjedan' : 'Vrati se na danas'}
            </button>
            <span className="text-sm text-[var(--text-muted)]">
              {formatDateHr(weekStart)} – {formatDateHr(addDays(weekStart, 6))}
            </span>
          </div>
          <Button variant="outline" onClick={() => setWeekOffset(w => w + 1)}>
            <span className="hidden sm:inline">Sljedeći tjedan</span> <ChevronRight size={18} />
          </Button>
        </div>

        <p className="text-xs text-[var(--text-faint)] -mt-5 flex items-center gap-1.5">
          <Move size={13} /> Povuci karticu bilo gdje da premjestiš maturu na drugi dan.
        </p>

        <div key={weekStart} className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 animate-fade-in">
          {days.map((date, i) => {
            const dayItems = weekItems.filter(a => a.date === date)
            const override = overrideMap.get(date)
            const isToday = date === today
            const dayDone = dayItems.length > 0 && dayItems.every(it => it.done || it.skipped)

            return (
              <DayColumn key={date} date={date} disabled={!!override}>
                <Card
                  className={cn(
                    'h-full flex flex-col transition-shadow',
                    isToday && 'ring-2 ring-[var(--accent)] shadow-[var(--shadow-md)]',
                  )}
                >
                  <CardContent className="p-4 flex flex-col gap-3 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            'flex h-11 w-11 flex-col items-center justify-center rounded-xl text-xs font-bold leading-none',
                            isToday ? 'bg-[var(--accent)] text-[var(--accent-contrast)]' : 'bg-[var(--bg-sunken)] text-[var(--text-muted)]',
                          )}
                        >
                          <span>{WEEKDAY_LABELS_HR[i]}</span>
                          <span className="text-sm">{date.slice(8, 10)}</span>
                        </div>
                        {isToday && <Badge tone="accent" className="text-sm">Danas</Badge>}
                      </div>
                      {dayDone && !override && <Check size={20} className="text-[var(--success)]" />}
                    </div>

                    {override && (
                      <div className="rounded-lg bg-[var(--warning-soft)] text-[var(--warning)] text-sm font-medium px-3 py-2 text-center">
                        {OVERRIDE_LABEL[override.type]}
                      </div>
                    )}

                    <div className="flex-1 flex flex-col gap-2.5 min-h-[72px]">
                      {!override && dayItems.length === 0 && (
                        <div className="flex-1 flex items-center justify-center text-sm text-[var(--text-faint)] border border-dashed rounded-xl py-6">
                          Slobodan dan
                        </div>
                      )}

                      {!override && dayItems.map(item => (
                        <DraggableAssignment
                          key={item.id}
                          item={item}
                          pending={pendingIds.has(item.id)}
                          justCompleted={justCompleted === item.id}
                          onToggleDone={() => toggleDone(item.id)}
                          onSkip={() => markSkipped(item.id)}
                        />
                      ))}
                    </div>

                    {(!override || dayItems.length === 0) && (
                      <NativeSelect
                        className="h-9 text-xs text-[var(--text-faint)] border-dashed"
                        value={override?.type ?? ''}
                        onChange={e => toggleOverride(date, e.target.value as OverrideType | '')}
                      >
                        <option value="">Običan dan</option>
                        <option value="odmor">Godišnji odmor</option>
                        <option value="praznik">Praznik</option>
                        <option value="bez_ucenja">Bez učenja</option>
                      </NativeSelect>
                    )}
                    {override && (
                      <button
                        onClick={() => toggleOverride(date, '')}
                        className="pop-interactive w-full text-xs text-[var(--text-faint)] hover:text-[var(--text-muted)]"
                      >
                        Poništi
                      </button>
                    )}
                  </CardContent>
                </Card>
              </DayColumn>
            )
          })}
        </div>
      </div>

      <DragOverlay>
        {activeDragItem && (
          <div
            className="rounded-xl border-2 border-[var(--accent)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-md)] cursor-grabbing"
            style={{ width: 220 }}
          >
            <span className="text-sm font-semibold" style={{ color: `var(${SUBJECT_COLOR_VAR[activeDragItem.subject]})` }}>
              {SUBJECT_LABEL[activeDragItem.subject]}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

function DayColumn({ date, disabled, children }: { date: string; disabled: boolean; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: date, disabled })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-2xl transition-all h-full',
        isOver && !disabled && 'ring-2 ring-[var(--accent)] scale-[1.02]',
      )}
    >
      {children}
    </div>
  )
}

function DraggableAssignment({
  item,
  pending,
  justCompleted,
  onToggleDone,
  onSkip,
}: {
  item: PlanAssignment
  pending: boolean
  justCompleted: boolean
  onToggleDone: () => void
  onSkip: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative rounded-xl border p-3 transition-colors cursor-grab touch-none active:cursor-grabbing select-none',
        item.done ? 'bg-[var(--success-soft)] border-transparent' : 'hover:border-[var(--accent)]',
        item.skipped && 'opacity-50',
        isDragging && 'opacity-30',
      )}
    >
      <div className="flex items-start gap-2.5">
        <button
          onClick={onToggleDone}
          disabled={pending}
          className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150 active:scale-90 disabled:opacity-60 disabled:cursor-wait',
            item.done
              ? 'bg-[var(--success)] border-[var(--success)] text-white'
              : 'border-[var(--border)] hover:border-[var(--accent)]',
            justCompleted && 'animate-check-pop',
          )}
          aria-label="Označi riješeno"
        >
          {item.done && <Check size={16} strokeWidth={3} />}
        </button>
        <span
          className={cn(
            'text-sm font-semibold flex-1 min-w-0 leading-tight pt-1',
            item.done && 'line-through text-[var(--text-muted)]',
          )}
          style={!item.done ? { color: `var(${SUBJECT_COLOR_VAR[item.subject]})` } : undefined}
        >
          {SUBJECT_LABEL[item.subject]}
        </span>
        {item.skipped && <Badge tone="neutral">preskočeno</Badge>}
      </div>
      <button
        onClick={onSkip}
        className="pop-interactive mt-1.5 text-[11px] text-[var(--text-faint)] hover:text-[var(--text-muted)] hover:underline underline-offset-2"
      >
        Preskoči
      </button>
    </div>
  )
}
