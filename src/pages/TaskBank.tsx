import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import { db, saveBlob, getBlobUrl } from '../lib/db'
import type { ErrorReason, MasteryStatus, Subject, TaskItem } from '../lib/types'
import { SUBJECTS, SUBJECT_LABEL, TOPICS, ERROR_REASON_LABEL, MASTERY_LABEL, TAGS } from '../lib/types'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Dialog } from '../components/ui/Dialog'
import { Input, Label, Textarea, NativeSelect } from '../components/ui/Input'
import { freshSrsState } from '../lib/srs'

export function TaskBank() {
  const tasks = useLiveQuery(() => db.tasks.toArray(), [], [])
  const [filterSubject, setFilterSubject] = useState<Subject | ''>('')
  const [filterTopic, setFilterTopic] = useState('')
  const [filterStatus, setFilterStatus] = useState<MasteryStatus | ''>('')
  const [addOpen, setAddOpen] = useState(false)
  const [active, setActive] = useState<TaskItem | null>(null)

  const topics = filterSubject ? TOPICS[filterSubject] : []

  const filtered = useMemo(() => {
    return (tasks ?? [])
      .filter(t => !filterSubject || t.subject === filterSubject)
      .filter(t => !filterTopic || t.topic === filterTopic)
      .filter(t => !filterStatus || t.status === filterStatus)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [tasks, filterSubject, filterTopic, filterStatus])

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Banka zadataka</h1>
        <Button onClick={() => setAddOpen(true)}><Plus size={16} /> Spremi zadatak</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <NativeSelect className="w-auto" value={filterSubject} onChange={e => { setFilterSubject(e.target.value as Subject | ''); setFilterTopic('') }}>
          <option value="">Svi predmeti</option>
          {SUBJECTS.map(s => <option key={s} value={s}>{SUBJECT_LABEL[s]}</option>)}
        </NativeSelect>
        {filterSubject && (
          <NativeSelect className="w-auto" value={filterTopic} onChange={e => setFilterTopic(e.target.value)}>
            <option value="">Sve teme</option>
            {topics.map(t => <option key={t} value={t}>{t}</option>)}
          </NativeSelect>
        )}
        <NativeSelect className="w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value as MasteryStatus | '')}>
          <option value="">Svi statusi</option>
          {Object.entries(MASTERY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </NativeSelect>
      </div>

      {filtered.length === 0 && (
        <Card><CardContent className="p-8 text-center text-sm text-[var(--text-muted)]">
          Još nema spremljenih zadataka. Dok rješavaš stare mature, spremi ovdje sve što ne znaš.
        </CardContent></Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(task => (
          <TaskCard key={task.id} task={task} onClick={() => setActive(task)} />
        ))}
      </div>

      <AddTaskDialog open={addOpen} onClose={() => setAddOpen(false)} />
      {active && <TaskDetailDialog task={active} onClose={() => setActive(null)} />}
    </div>
  )
}

function TaskCard({ task, onClick }: { task: TaskItem; onClick: () => void }) {
  const [imgUrl, setImgUrl] = useState<string | undefined>()
  useEffect(() => {
    let revoke: string | undefined
    getBlobUrl(task.imageBlobId).then(u => { revoke = u; setImgUrl(u) })
    return () => { if (revoke) URL.revokeObjectURL(revoke) }
  }, [task.imageBlobId])

  const statusTone = { ne_znam: 'danger', trebam_vjezbati: 'warning', skoro_znam: 'accent', znam_samostalno: 'success' } as const

  return (
    <Card className="cursor-pointer hover:shadow-[var(--shadow-md)] transition-shadow" onClick={onClick}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">{SUBJECT_LABEL[task.subject]}</span>
          <Badge tone={statusTone[task.status]}>{MASTERY_LABEL[task.status]}</Badge>
        </div>
        <div className="text-sm text-[var(--text-muted)]">{task.topic}{task.subtopic ? ` · ${task.subtopic}` : ''}</div>
        {imgUrl && <img src={imgUrl} alt="zadatak" className="rounded-lg max-h-28 object-cover w-full" />}
        {task.text && <p className="text-sm line-clamp-2">{task.text}</p>}
        <div className="flex gap-1 flex-wrap">
          {task.tags.map(t => <Badge key={t} tone="neutral">{t}</Badge>)}
        </div>
      </CardContent>
    </Card>
  )
}

function AddTaskDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [subject, setSubject] = useState<Subject>('matematika')
  const [topic, setTopic] = useState(TOPICS.matematika[0])
  const [subtopic, setSubtopic] = useState('')
  const [text, setText] = useState('')
  const [myAttempt, setMyAttempt] = useState('')
  const [correctSolution, setCorrectSolution] = useState('')
  const [explanation, setExplanation] = useState('')
  const [reasons, setReasons] = useState<ErrorReason[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)

  function toggleReason(r: ErrorReason) {
    setReasons(prev => (prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]))
  }
  function toggleTag(t: string) {
    setTags(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]))
  }

  async function save() {
    const imageBlobId = file ? await saveBlob(file, file.name) : undefined
    await db.tasks.add({
      id: crypto.randomUUID(),
      subject,
      topic,
      subtopic: subtopic.trim() || undefined,
      imageBlobId,
      text: text.trim() || undefined,
      reasonCodes: reasons,
      myAttempt: myAttempt.trim() || undefined,
      correctSolution: correctSolution.trim() || undefined,
      explanation: explanation.trim() || undefined,
      status: 'ne_znam',
      tags,
      createdAt: new Date().toISOString(),
      srs: freshSrsState(),
    })
    setText(''); setMyAttempt(''); setCorrectSolution(''); setExplanation(''); setReasons([]); setTags([]); setFile(null); setSubtopic('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()} title="Spremi zadatak koji ne znam" className="max-w-2xl">
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Predmet</Label>
            <NativeSelect value={subject} onChange={e => { const s = e.target.value as Subject; setSubject(s); setTopic(TOPICS[s][0]) }}>
              {SUBJECTS.map(s => <option key={s} value={s}>{SUBJECT_LABEL[s]}</option>)}
            </NativeSelect>
          </div>
          <div>
            <Label>Tema</Label>
            <NativeSelect value={topic} onChange={e => setTopic(e.target.value)}>
              {TOPICS[subject].map(t => <option key={t} value={t}>{t}</option>)}
            </NativeSelect>
          </div>
        </div>
        <div>
          <Label>Podtema (po želji)</Label>
          <Input value={subtopic} onChange={e => setSubtopic(e.target.value)} />
        </div>
        <div>
          <Label>Fotografija / screenshot zadatka</Label>
          <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
        </div>
        <div>
          <Label>Tekst zadatka (ako nema slike)</Label>
          <Textarea rows={2} value={text} onChange={e => setText(e.target.value)} />
        </div>
        <div>
          <Label>Moj pokušaj rješenja</Label>
          <Textarea rows={2} value={myAttempt} onChange={e => setMyAttempt(e.target.value)} />
        </div>
        <div>
          <Label>Točno rješenje</Label>
          <Textarea rows={2} value={correctSolution} onChange={e => setCorrectSolution(e.target.value)} />
        </div>
        <div>
          <Label>Objašnjenje</Label>
          <Textarea rows={2} value={explanation} onChange={e => setExplanation(e.target.value)} />
        </div>
        <div>
          <Label>Razlog pogreške</Label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ERROR_REASON_LABEL) as ErrorReason[]).map(r => (
              <button key={r} onClick={() => toggleReason(r)} type="button"
                className={`text-xs rounded-full px-3 py-1 border ${reasons.includes(r) ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)]' : ''}`}>
                {ERROR_REASON_LABEL[r]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Oznake</Label>
          <div className="flex flex-wrap gap-2">
            {TAGS.map(t => (
              <button key={t} onClick={() => toggleTag(t)} type="button"
                className={`text-xs rounded-full px-3 py-1 border ${tags.includes(t) ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)]' : ''}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <Button className="w-full" onClick={save}>Spremi u banku zadataka</Button>
      </div>
    </Dialog>
  )
}

function TaskDetailDialog({ task, onClose }: { task: TaskItem; onClose: () => void }) {
  const [status, setStatus] = useState<MasteryStatus>(task.status)
  const [imgUrl, setImgUrl] = useState<string | undefined>()
  useEffect(() => {
    let revoke: string | undefined
    getBlobUrl(task.imageBlobId).then(u => { revoke = u; setImgUrl(u) })
    return () => { if (revoke) URL.revokeObjectURL(revoke) }
  }, [task.imageBlobId])

  async function save() {
    await db.tasks.update(task.id, { status })
    onClose()
  }

  return (
    <Dialog open onOpenChange={v => !v && onClose()} title={`${SUBJECT_LABEL[task.subject]} — ${task.topic}`} className="max-w-2xl">
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        {imgUrl && <img src={imgUrl} alt="zadatak" className="rounded-xl w-full" />}
        {task.text && <p className="text-sm">{task.text}</p>}
        {task.myAttempt && <div><Label>Moj pokušaj</Label><p className="text-sm">{task.myAttempt}</p></div>}
        {task.correctSolution && <div><Label>Točno rješenje</Label><p className="text-sm">{task.correctSolution}</p></div>}
        {task.explanation && <div><Label>Objašnjenje</Label><p className="text-sm">{task.explanation}</p></div>}
        <div className="flex gap-1 flex-wrap">
          {task.reasonCodes.map(r => <Badge key={r} tone="neutral">{ERROR_REASON_LABEL[r]}</Badge>)}
        </div>
        <div>
          <Label>Status znanja</Label>
          <NativeSelect value={status} onChange={e => setStatus(e.target.value as MasteryStatus)}>
            {Object.entries(MASTERY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </NativeSelect>
        </div>
        <Button className="w-full" onClick={save}>Spremi</Button>
      </div>
    </Dialog>
  )
}
