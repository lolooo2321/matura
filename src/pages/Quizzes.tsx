import { useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../lib/db'
import type { QuizAttempt, Subject, TaskItem } from '../lib/types'
import { SUBJECTS, SUBJECT_LABEL, TOPICS, MASTERY_LABEL } from '../lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { NativeSelect } from '../components/ui/Input'
import { isDue, reviewTask, nextMasteryStatus, type ReviewResult } from '../lib/srs'
import { topicBreakdown } from '../lib/stats'
import { logActivity, XP_RULES, checkAndAwardBadges } from '../lib/gamification'
import { confettiBurst, fireXpToast } from '../lib/celebrate'
import { todayIso } from '../lib/utils'

type QuizKind = QuizAttempt['kind']

const KIND_LABEL: Record<QuizKind, string> = {
  pogreske: 'Kviz mojih pogrešaka',
  ai_slicni: 'AI slični zadaci',
  brzi: 'Brzi kviz',
  tematski: 'Tematski kviz',
  slaba_podrucja: 'Kviz slabih područja',
  simulacija: 'Simulacija mature',
}

export function Quizzes() {
  const tasks = useLiveQuery(() => db.tasks.toArray(), [], [])
  const exams = useLiveQuery(() => db.exams.toArray(), [], [])
  const [running, setRunning] = useState<{ kind: QuizKind; subject?: Subject; topic?: string; tasks: TaskItem[] } | null>(null)

  const [subject, setSubject] = useState<Subject>('matematika')
  const [topic, setTopic] = useState(TOPICS.matematika[0])
  const [quizSize, setQuizSize] = useState(10)

  function startMistakes() {
    const due = (tasks ?? []).filter(t => isDue(t.srs))
    setRunning({ kind: 'pogreske', tasks: shuffle(due) })
  }
  function startQuick() {
    const pool = (tasks ?? [])
    setRunning({ kind: 'brzi', tasks: shuffle(pool).slice(0, quizSize) })
  }
  function startThematic() {
    const pool = (tasks ?? []).filter(t => t.subject === subject && t.topic === topic)
    setRunning({ kind: 'tematski', subject, topic, tasks: shuffle(pool) })
  }
  function startWeakArea() {
    const breakdown = topicBreakdown(tasks ?? []).filter(t => t.count >= 1)
    if (!breakdown.length) return
    const weakest = [...breakdown].sort((a, b) => a.score - b.score)[0]
    const pool = (tasks ?? []).filter(t => t.subject === weakest.subject && t.topic === weakest.topic)
    setRunning({ kind: 'slaba_podrucja', subject: weakest.subject, topic: weakest.topic, tasks: shuffle(pool) })
  }

  if (running) {
    return <QuizRunner session={running} onExit={() => setRunning(null)} />
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Kvizovi</h1>

      <div className="grid md:grid-cols-2 gap-4">
        <QuizCard title={KIND_LABEL.pogreske} desc="Ponavljaj zadatke iz banke pogrešaka koji su spremni za ponavljanje (sustav pametnog ponavljanja).">
          <div className="text-sm mb-2">Na čekanju: <b>{(tasks ?? []).filter(t => isDue(t.srs)).length}</b></div>
          <Button onClick={startMistakes} disabled={!(tasks ?? []).some(t => isDue(t.srs))}>Pokreni</Button>
        </QuizCard>

        <QuizCard title={KIND_LABEL.brzi} desc="Kratko dnevno ponavljanje iz cijele banke zadataka.">
          <NativeSelect className="w-28 mb-2" value={quizSize} onChange={e => setQuizSize(Number(e.target.value))}>
            <option value={5}>5 zadataka</option>
            <option value={10}>10 zadataka</option>
          </NativeSelect>
          <br />
          <Button onClick={startQuick} disabled={!(tasks ?? []).length}>Pokreni</Button>
        </QuizCard>

        <QuizCard title={KIND_LABEL.tematski} desc="Sam biraš predmet i temu.">
          <div className="flex gap-2 mb-2">
            <NativeSelect value={subject} onChange={e => { const s = e.target.value as Subject; setSubject(s); setTopic(TOPICS[s][0]) }}>
              {SUBJECTS.map(s => <option key={s} value={s}>{SUBJECT_LABEL[s]}</option>)}
            </NativeSelect>
            <NativeSelect value={topic} onChange={e => setTopic(e.target.value)}>
              {TOPICS[subject].map(t => <option key={t} value={t}>{t}</option>)}
            </NativeSelect>
          </div>
          <Button onClick={startThematic}>Pokreni</Button>
        </QuizCard>

        <QuizCard title={KIND_LABEL.slaba_podrucja} desc="Automatski odabire gradivo u kojem imaš najniži uspjeh.">
          <Button onClick={startWeakArea} disabled={!(tasks ?? []).length}>Pokreni</Button>
        </QuizCard>

        <QuizCard title={KIND_LABEL.ai_slicni} desc="AI generira nove zadatke slične onima koje si pogriješio. Dostupno u AI tutoru (treba API ključ).">
          <Link to="/tutor"><Button variant="outline">Otvori AI tutor</Button></Link>
        </QuizCard>

        <QuizCard title={KIND_LABEL.simulacija} desc="Riješi ispit uz vremensko ograničenje i bez AI pomoći, u biblioteci starih matura.">
          <div className="text-sm mb-2">Neriješenih ispita: <b>{(exams ?? []).filter(e => e.status !== 'rijeseno').length}</b></div>
          <Link to="/mature"><Button variant="outline">Otvori biblioteku matura</Button></Link>
        </QuizCard>
      </div>
    </div>
  )
}

function QuizCard({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-[var(--text)]">{title}</CardTitle>
        <p className="text-xs text-[var(--text-muted)] mt-1">{desc}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function QuizRunner({
  session,
  onExit,
}: {
  session: { kind: QuizKind; subject?: Subject; topic?: string; tasks: TaskItem[] }
  onExit: () => void
}) {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [results, setResults] = useState<{ taskId: string; correct: boolean }[]>([])
  const [startTime] = useState(Date.now())
  const [done, setDone] = useState(false)

  const current = session.tasks[index]

  if (!session.tasks.length) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <p>Nema zadataka za ovaj kviz.</p>
        <Button onClick={onExit}>Natrag</Button>
      </div>
    )
  }

  async function grade(result: ReviewResult) {
    const newSrs = reviewTask(current.srs, result)
    const newStatus = nextMasteryStatus(current.status, result, newSrs)
    await db.tasks.update(current.id, { srs: newSrs, status: newStatus })
    const correct = result === 'good' || result === 'easy'
    const nextResults = [...results, { taskId: current.id, correct }]
    setResults(nextResults)
    if (correct) confettiBurst('small')

    if (index + 1 < session.tasks.length) {
      setIndex(index + 1)
      setRevealed(false)
    } else {
      const durationSeconds = Math.round((Date.now() - startTime) / 1000)
      const correctCount = nextResults.filter(r => r.correct).length
      const perfect = correctCount === nextResults.length
      await db.quizAttempts.add({
        id: crypto.randomUUID(),
        date: todayIso(),
        kind: session.kind,
        subject: session.subject,
        topic: session.topic,
        taskIds: session.tasks.map(t => t.id),
        correctCount,
        totalCount: nextResults.length,
        durationSeconds,
        mistakeTaskIds: nextResults.filter(r => !r.correct).map(r => r.taskId),
      })
      fireXpToast(perfect ? XP_RULES.perfectQuiz : XP_RULES.quizCompleted, perfect ? 'Savršeno!' : 'Kviz gotov')
      await logActivity('quiz_completed', perfect ? XP_RULES.perfectQuiz : XP_RULES.quizCompleted)
      await checkAndAwardBadges()
      window.setTimeout(() => confettiBurst('big'), 200)
      setDone(true)
    }
  }

  if (done) {
    const correctCount = results.filter(r => r.correct).length
    const pct = Math.round((correctCount / results.length) * 100)
    const mistakes = session.tasks.filter(t => results.find(r => r.taskId === t.id && !r.correct))
    const { emoji, message } = pct === 100
      ? { emoji: '🏆', message: 'Savršeno! Nijedna greška.' }
      : pct >= 80
      ? { emoji: '🎉', message: 'Odličan rezultat!' }
      : pct >= 50
      ? { emoji: '💪', message: 'Dobro, nastavi vježbati.' }
      : { emoji: '🌱', message: 'Svaki kviz te približava cilju.' }
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4 animate-fade-in">
        <h1 className="text-2xl font-bold">Rezultat kviza</h1>
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <div className="text-5xl animate-pop">{emoji}</div>
            <div className="text-5xl font-extrabold animate-pop" style={{ color: pct >= 80 ? 'var(--success)' : 'var(--accent)' }}>{pct}%</div>
            <div className="text-sm text-[var(--text-muted)]">{correctCount} / {results.length} točno · {Math.round((Date.now() - startTime) / 1000)}s</div>
            <div className="text-sm font-medium">{message}</div>
          </CardContent>
        </Card>
        {mistakes.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Za ponoviti sljedeće</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {mistakes.map(m => (
                <div key={m.id} className="text-sm flex justify-between">
                  <span>{m.topic}</span>
                  <Badge tone="warning">{MASTERY_LABEL[m.status]}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        <Button onClick={onExit}>Natrag na kvizove</Button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4 animate-fade-in">
      <div className="flex justify-between items-center">
        <Badge tone="accent">{KIND_LABEL[session.kind]}</Badge>
        <span className="text-sm text-[var(--text-muted)]">{index + 1} / {session.tasks.length}</span>
      </div>
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="text-sm text-[var(--text-muted)]">{SUBJECT_LABEL[current.subject]} · {current.topic}</div>
          {current.text && <p>{current.text}</p>}
          {!current.text && !current.imageBlobId && <p className="text-sm text-[var(--text-faint)]">(Zadatak bez teksta — pogledaj svoju bilješku)</p>}
          {revealed && (
            <div className="rounded-xl border p-3 bg-[var(--bg-sunken)] space-y-1 text-sm">
              {current.correctSolution && <div><b>Rješenje:</b> {current.correctSolution}</div>}
              {current.explanation && <div><b>Objašnjenje:</b> {current.explanation}</div>}
              {current.myAttempt && <div className="text-[var(--text-muted)]"><b>Moj prijašnji pokušaj:</b> {current.myAttempt}</div>}
            </div>
          )}
        </CardContent>
      </Card>
      {!revealed ? (
        <Button className="w-full" onClick={() => setRevealed(true)}>Pokaži rješenje</Button>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          <Button variant="danger" onClick={() => grade('wrong')}>Netočno</Button>
          <Button variant="secondary" onClick={() => grade('hard')}>Teško</Button>
          <Button variant="primary" onClick={() => grade('good')}>Dobro</Button>
          <Button variant="outline" onClick={() => grade('easy')}>Lako</Button>
        </div>
      )}
    </div>
  )
}
