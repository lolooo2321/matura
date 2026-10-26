import { useEffect, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { db } from '../lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Progress } from '../components/ui/Progress'
import { Badge } from '../components/ui/Badge'
import { Heatmap } from '../components/charts/Heatmap'
import { SUBJECTS, SUBJECT_LABEL, SUBJECT_COLOR_VAR, BADGES } from '../lib/types'
import { subjectProgress, totalStudyMinutes, strongestWeakest, heatmapData, nearestMaturaCountdown } from '../lib/stats'
import { computeProgressSummary, extendPlan, autoLinkExamsToPlan, getShiftForDate } from '../lib/schedule'
import { computeStreak, levelFromXp, totalXp } from '../lib/gamification'
import { addDays, formatDateHr, formatDateShortHr, todayIso } from '../lib/utils'
import { useAsync } from '../hooks/useAsync'

export function Dashboard() {
  const settings = useLiveQuery(() => db.settings.get(1))
  const exams = useLiveQuery(() => db.exams.toArray(), [], [])
  const tasks = useLiveQuery(() => db.tasks.toArray(), [], [])
  const assignments = useLiveQuery(() => db.planAssignments.toArray(), [], [])
  const quizAttempts = useLiveQuery(() => db.quizAttempts.toArray(), [], [])
  const activityLog = useLiveQuery(() => db.activityLog.toArray(), [], [])

  useEffect(() => {
    if (!settings) return
    extendPlan(settings).then(() => autoLinkExamsToPlan())
  }, [settings])

  const progress = useAsync(() => (settings ? computeProgressSummary(settings) : Promise.resolve(undefined)), [settings])
  const streak = useAsync(() => computeStreak(), [activityLog])
  const xp = useAsync(() => totalXp(), [activityLog])

  const today = todayIso()
  const todayItems = useMemo(() => (assignments ?? []).filter(a => a.date === today), [assignments, today])
  const next7 = useMemo(() => {
    if (!assignments) return []
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i)
      return { date, items: assignments.filter(a => a.date === date) }
    })
  }, [assignments, today])

  const currentShift = settings ? getShiftForDate(today, settings) : undefined
  const totalSolved = (exams ?? []).filter(e => e.status === 'rijeseno').length
  const totalPlanned = settings ? SUBJECTS.reduce((s, subj) => s + settings.examCounts[subj], 0) : 0
  const totalMinutes = totalStudyMinutes(exams ?? [], quizAttempts ?? [])
  const { strongest, weakest } = strongestWeakest(tasks ?? [])
  const correctedLater = (tasks ?? []).filter(t => t.status === 'skoro_znam' || t.status === 'znam_samostalno').length
  const maturaCountdown = settings ? nearestMaturaCountdown(settings.maturaDates) : undefined
  const heat = heatmapData(activityLog ?? [], 98)

  const monthlyChart = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of exams ?? []) {
      if (e.status === 'rijeseno' && e.solvedDate) {
        const key = e.solvedDate.slice(0, 7)
        map.set(key, (map.get(key) ?? 0) + 1)
      }
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, count]) => ({ month, count }))
  }, [exams])

  const levelInfo = levelFromXp(xp.value ?? 0)
  const earnedBadges = useLiveQuery(() => db.earnedBadges.toArray(), [], [])

  if (!settings) return null

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bok! Evo tvog napretka 👋</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Trenutačna smjena: <span className="font-medium capitalize text-[var(--text)]">{currentShift}</span> · {formatDateHr(today)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="accent">Level {levelInfo.level}</Badge>
          <Badge tone="warning">
            <span className={(streak.value ?? 0) > 0 ? 'inline-block animate-streak' : undefined}>🔥</span> {streak.value ?? 0} dana
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Riješeno matura" value={`${totalSolved} / ${totalPlanned}`} />
        <StatTile label="Preostalo" value={`${Math.max(0, totalPlanned - totalSolved)}`} />
        <StatTile label="Sati učenja" value={`${(totalMinutes / 60).toFixed(1)} h`} />
        <StatTile
          label={maturaCountdown ? `Dani do mature iz ${SUBJECT_LABEL[maturaCountdown.subject]}` : 'Dani do mature'}
          value={maturaCountdown ? `${maturaCountdown.days}` : '—'}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {SUBJECTS.map(s => {
          const p = subjectProgress(exams ?? [], settings, s)
          return (
            <Card key={s}>
              <CardHeader>
                <CardTitle>{SUBJECT_LABEL[s]}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-2xl font-bold">{p.pct}%</span>
                  <span className="text-xs text-[var(--text-muted)]">{p.solved} / {p.total}</span>
                </div>
                <Progress value={p.pct} color={`var(${SUBJECT_COLOR_VAR[s]})`} />
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Današnji zadatak</CardTitle>
          </CardHeader>
          <CardContent>
            {todayItems.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">Nema planiranih matura za danas. Slobodan dan ili dan ponavljanja.</p>
            ) : (
              <ul className="space-y-2">
                {todayItems.map(item => (
                  <li key={item.id} className="flex items-center justify-between rounded-xl border p-3">
                    <span className="font-medium">{SUBJECT_LABEL[item.subject]}</span>
                    <Badge tone={item.done ? 'success' : 'neutral'}>{item.done ? 'Riješeno' : 'Na čekanju'}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status plana</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {progress.value && (
              <>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Napredak</span>
                  {progress.value.lag > 0 ? (
                    <Badge tone="warning">Kasniš {progress.value.lag}</Badge>
                  ) : progress.value.lag < 0 ? (
                    <Badge tone="success">Ispred {Math.abs(progress.value.lag)}</Badge>
                  ) : (
                    <Badge tone="success">Točno po planu</Badge>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Procijenjen završetak</span>
                  <span className="font-medium">{formatDateHr(progress.value.estimatedFinishDate)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sljedećih 7 dana</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 text-center">
            {next7.map(({ date, items }) => (
              <div key={date} className="rounded-xl border p-2">
                <div className="text-xs text-[var(--text-muted)]">{formatDateShortHr(date)}</div>
                <div className="mt-1 flex flex-col gap-1">
                  {items.length === 0 && <span className="text-xs text-[var(--text-faint)]">—</span>}
                  {items.map(i => (
                    <span
                      key={i.id}
                      className="text-[10px] rounded-full px-1.5 py-0.5"
                      style={{ background: `color-mix(in srgb, var(${SUBJECT_COLOR_VAR[i.subject]}) 20%, transparent)` }}
                    >
                      {SUBJECT_LABEL[i.subject].split(' ')[0]}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Aktivnost (zadnja 14 tjedana)</CardTitle>
          </CardHeader>
          <CardContent>
            <Heatmap data={heat} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Riješene mature po mjesecu</CardTitle>
          </CardHeader>
          <CardContent className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Bar dataKey="count" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Pogreške i ispravci</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Zadataka u banci pogrešaka</span><span className="font-medium">{(tasks ?? []).length}</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Naknadno ispravljeno</span><span className="font-medium">{correctedLater}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Najjače / najslabije gradivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Najjače</span><span className="font-medium">{strongest ? strongest.topic : '—'}</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Najslabije</span><span className="font-medium">{weakest ? weakest.topic : '—'}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bedževi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {BADGES.map(b => {
                const earned = (earnedBadges ?? []).some(e => e.code === b.code)
                return (
                  <span key={b.code} title={b.label} className={`text-xl ${earned ? '' : 'opacity-20 grayscale'}`}>
                    {b.icon}
                  </span>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-[var(--text-muted)] mb-1">{label}</div>
        <div className="text-xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}
