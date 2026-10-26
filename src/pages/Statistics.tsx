import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts'
import { db } from '../lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { SUBJECTS, SUBJECT_LABEL, SUBJECT_COLOR_VAR, TOPICS, type Subject, type Exam, type TaskItem } from '../lib/types'
import { topicBreakdown } from '../lib/stats'

export function Statistics() {
  const exams = useLiveQuery(() => db.exams.toArray(), [], [])
  const tasks = useLiveQuery(() => db.tasks.toArray(), [], [])

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Statistika</h1>
      <Tabs defaultValue="matematika">
        <TabsList>
          {SUBJECTS.map(s => <TabsTrigger key={s} value={s}>{SUBJECT_LABEL[s]}</TabsTrigger>)}
        </TabsList>
        {SUBJECTS.map(s => (
          <TabsContent key={s} value={s} className="mt-4">
            <SubjectStats subject={s} exams={exams ?? []} tasks={tasks ?? []} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function SubjectStats({ subject, exams, tasks }: { subject: Subject; exams: Exam[]; tasks: TaskItem[] }) {
  const subjectExams = useMemo(
    () => exams.filter(e => e.subject === subject).sort((a, b) => (a.solvedDate ?? '').localeCompare(b.solvedDate ?? '')),
    [exams, subject],
  )
  const scoreTrend = subjectExams
    .filter(e => e.status === 'rijeseno' && e.scoreMax)
    .map(e => ({
      date: e.solvedDate,
      pct: Math.round(((e.scoreAchieved ?? 0) / (e.scoreMax ?? 1)) * 100),
    }))

  const subjectTasks = useMemo(() => tasks.filter(t => t.subject === subject), [tasks, subject])
  const breakdown = topicBreakdown(subjectTasks)
  const allTopics = TOPICS[subject].map(topic => {
    const found = breakdown.find(b => b.topic === topic)
    return { topic, count: found?.count ?? 0, score: Math.round((found?.score ?? 0) * 100) }
  })

  const practiced = allTopics.filter(t => t.count > 0)
  const unpracticed = allTopics.filter(t => t.count === 0)
  const weakest = [...practiced].sort((a, b) => a.score - b.score)[0]

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-[var(--text-muted)]">Riješeno ispita</div>
            <div className="text-xl font-bold">{subjectExams.filter(e => e.status === 'rijeseno').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-[var(--text-muted)]">Zadataka u banci pogrešaka</div>
            <div className="text-xl font-bold">{subjectTasks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-[var(--text-muted)]">Prosječan rezultat na maturama</div>
            <div className="text-xl font-bold">
              {scoreTrend.length ? Math.round(scoreTrend.reduce((s, e) => s + e.pct, 0) / scoreTrend.length) + '%' : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Rezultati na starim maturama kroz vrijeme</CardTitle></CardHeader>
        <CardContent className="h-56">
          {scoreTrend.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Line type="monotone" dataKey="pct" stroke={`var(${SUBJECT_COLOR_VAR[subject]})`} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">Još nema riješenih ispita s unesenim bodovima za ovaj predmet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Uspješnost po gradivu</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={allTopics} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="topic" tick={{ fontSize: 11 }} width={140} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Bar dataKey="score" fill={`var(${SUBJECT_COLOR_VAR[subject]})`} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Analiza napretka</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {weakest ? (
            <p>Najslabije gradivo trenutno je <b>{weakest.topic}</b> ({weakest.score}% savladanosti na temelju {weakest.count} zadataka u banci pogrešaka).</p>
          ) : (
            <p className="text-[var(--text-muted)]">Nema još dovoljno podataka za procjenu — spremi nekoliko zadataka u banku pogrešaka.</p>
          )}
          {unpracticed.length > 0 && (
            <p className="text-[var(--text-muted)]">
              Još nema spremljenih zadataka iz: {unpracticed.map(t => t.topic).join(', ')}.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
