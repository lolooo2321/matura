import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Clock, FileText } from 'lucide-react'
import { db, saveBlob } from '../lib/db'
import type { Exam, ExamStatus, Season, Subject } from '../lib/types'
import { SUBJECTS, SUBJECT_LABEL } from '../lib/types'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Dialog } from '../components/ui/Dialog'
import { Input, Label, Textarea, NativeSelect } from '../components/ui/Input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { PdfViewer } from '../components/PdfViewer'
import { useStopwatch } from '../hooks/useStopwatch'
import { logActivity, revokeXp, XP_RULES, checkAndAwardBadges } from '../lib/gamification'
import { confettiBurst, fireXpToast } from '../lib/celebrate'
import { todayIso } from '../lib/utils'

const STATUS_LABEL: Record<ExamStatus, string> = {
  nije_zaposeto: 'Nije započeto',
  u_tijeku: 'U tijeku',
  rijeseno: 'Riješeno',
}

export function Exams() {
  const exams = useLiveQuery(() => db.exams.toArray(), [], [])
  const [filterSubject, setFilterSubject] = useState<Subject | ''>('')
  const [filterYear, setFilterYear] = useState('')
  const [filterSeason, setFilterSeason] = useState<Season | ''>('')
  const [filterStatus, setFilterStatus] = useState<ExamStatus | ''>('')
  const [addOpen, setAddOpen] = useState(false)
  const [activeExam, setActiveExam] = useState<Exam | null>(null)

  const years = useMemo(() => [...new Set((exams ?? []).map(e => e.schoolYear))].sort(), [exams])

  const filtered = useMemo(() => {
    return (exams ?? [])
      .filter(e => !filterSubject || e.subject === filterSubject)
      .filter(e => !filterYear || e.schoolYear === filterYear)
      .filter(e => !filterSeason || e.season === filterSeason)
      .filter(e => !filterStatus || e.status === filterStatus)
      .sort((a, b) => b.schoolYear.localeCompare(a.schoolYear) || a.subject.localeCompare(b.subject))
  }, [exams, filterSubject, filterYear, filterSeason, filterStatus])

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stare mature</h1>
        <Button onClick={() => setAddOpen(true)}><Plus size={16} /> Dodaj ispit</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <NativeSelect className="w-auto" value={filterSubject} onChange={e => setFilterSubject(e.target.value as Subject | '')}>
          <option value="">Svi predmeti</option>
          {SUBJECTS.map(s => <option key={s} value={s}>{SUBJECT_LABEL[s]}</option>)}
        </NativeSelect>
        <NativeSelect className="w-auto" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
          <option value="">Sve godine</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </NativeSelect>
        <NativeSelect className="w-auto" value={filterSeason} onChange={e => setFilterSeason(e.target.value as Season | '')}>
          <option value="">Svi rokovi</option>
          <option value="ljetni">Ljetni</option>
          <option value="jesenski">Jesenski</option>
        </NativeSelect>
        <NativeSelect className="w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value as ExamStatus | '')}>
          <option value="">Svi statusi</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </NativeSelect>
      </div>

      {filtered.length === 0 && (
        <Card><CardContent className="p-8 text-center text-sm text-[var(--text-muted)]">
          Nema unesenih ispita. Dodaj ispit ručno ili uvezi stvarne poveznice s NCVVO arhive u Postavkama.
        </CardContent></Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(exam => (
          <Card key={exam.id} className="cursor-pointer hover:shadow-[var(--shadow-md)] transition-shadow" onClick={() => setActiveExam(exam)}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{SUBJECT_LABEL[exam.subject]}</span>
                <Badge tone={exam.status === 'rijeseno' ? 'success' : exam.status === 'u_tijeku' ? 'warning' : 'neutral'}>
                  {STATUS_LABEL[exam.status]}
                </Badge>
              </div>
              <div className="text-sm text-[var(--text-muted)]">{exam.schoolYear} · {exam.season === 'ljetni' ? 'Ljetni rok' : 'Jesenski rok'}{exam.level ? ` · ${exam.level}` : ''}</div>
              {exam.status === 'rijeseno' && exam.scoreMax ? (
                <div className="text-sm font-medium">{exam.scoreAchieved ?? 0} / {exam.scoreMax} bodova ({Math.round(((exam.scoreAchieved ?? 0) / exam.scoreMax) * 100)}%)</div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <AddExamDialog open={addOpen} onClose={() => setAddOpen(false)} />
      {activeExam && <ExamDetailDialog exam={activeExam} onClose={() => setActiveExam(null)} />}
    </div>
  )
}

function AddExamDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [subject, setSubject] = useState<Subject>('matematika')
  const [schoolYear, setSchoolYear] = useState('')
  const [season, setSeason] = useState<Season>('ljetni')
  const [level, setLevel] = useState('')
  const [examPdfUrl, setExamPdfUrl] = useState('')
  const [solutionPdfUrl, setSolutionPdfUrl] = useState('')
  const [examFile, setExamFile] = useState<File | null>(null)
  const [solutionFile, setSolutionFile] = useState<File | null>(null)

  async function save() {
    if (!schoolYear.trim()) return
    const examBlobId = examFile ? await saveBlob(examFile, examFile.name) : undefined
    const solutionBlobId = solutionFile ? await saveBlob(solutionFile, solutionFile.name) : undefined
    const count = await db.exams.where('subject').equals(subject).count()
    await db.exams.add({
      id: crypto.randomUUID(),
      subject,
      schoolYear: schoolYear.trim(),
      season,
      level: level.trim() || undefined,
      examPdfUrl: examPdfUrl.trim() || undefined,
      solutionPdfUrl: solutionPdfUrl.trim() || undefined,
      examBlobId,
      solutionBlobId,
      status: 'nije_zaposeto',
      source: 'rucno',
      order: count,
      createdAt: new Date().toISOString(),
    })
    setSchoolYear('')
    setLevel('')
    setExamPdfUrl('')
    setSolutionPdfUrl('')
    setExamFile(null)
    setSolutionFile(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()} title="Dodaj ispit">
      <div className="space-y-3">
        <div>
          <Label>Predmet</Label>
          <NativeSelect value={subject} onChange={e => setSubject(e.target.value as Subject)}>
            {SUBJECTS.map(s => <option key={s} value={s}>{SUBJECT_LABEL[s]}</option>)}
          </NativeSelect>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Školska godina</Label>
            <Input placeholder="2023./2024." value={schoolYear} onChange={e => setSchoolYear(e.target.value)} />
          </div>
          <div>
            <Label>Rok</Label>
            <NativeSelect value={season} onChange={e => setSeason(e.target.value as Season)}>
              <option value="ljetni">Ljetni</option>
              <option value="jesenski">Jesenski</option>
            </NativeSelect>
          </div>
        </div>
        <div>
          <Label>Razina (po potrebi)</Label>
          <Input placeholder="A razina" value={level} onChange={e => setLevel(e.target.value)} />
        </div>
        <div>
          <Label>Poveznica na PDF ispitne knjižice (stvarna NCVVO poveznica)</Label>
          <Input placeholder="https://..." value={examPdfUrl} onChange={e => setExamPdfUrl(e.target.value)} />
        </div>
        <div>
          <Label>Ili učitaj PDF ispitne knjižice ručno</Label>
          <input type="file" accept="application/pdf" onChange={e => setExamFile(e.target.files?.[0] ?? null)} className="text-sm" />
        </div>
        <div>
          <Label>Poveznica na PDF rješenja</Label>
          <Input placeholder="https://..." value={solutionPdfUrl} onChange={e => setSolutionPdfUrl(e.target.value)} />
        </div>
        <div>
          <Label>Ili učitaj PDF rješenja ručno</Label>
          <input type="file" accept="application/pdf" onChange={e => setSolutionFile(e.target.files?.[0] ?? null)} className="text-sm" />
        </div>
        <Button className="w-full" onClick={save}>Spremi ispit</Button>
      </div>
    </Dialog>
  )
}

function ExamDetailDialog({ exam, onClose }: { exam: Exam; onClose: () => void }) {
  const sw = useStopwatch()
  const [notes, setNotes] = useState(exam.notes ?? '')
  const [scoreAchieved, setScoreAchieved] = useState(exam.scoreAchieved ?? 0)
  const [scoreMax, setScoreMax] = useState(exam.scoreMax ?? 100)
  const [status, setStatus] = useState<ExamStatus>(exam.status)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (saving) return
    setSaving(true)
    const durationMinutes = sw.seconds > 0 ? Math.round(sw.seconds / 60) : exam.durationMinutes
    const wasAlreadySolved = exam.status === 'rijeseno'
    const nowSolved = status === 'rijeseno'
    let xpActivityId = exam.xpActivityId

    if (nowSolved && !wasAlreadySolved) {
      xpActivityId = await logActivity('exam_solved', XP_RULES.examSolved, exam.id)
      confettiBurst('small')
      fireXpToast(XP_RULES.examSolved, SUBJECT_LABEL[exam.subject])
    } else if (!nowSolved && wasAlreadySolved) {
      await revokeXp(xpActivityId)
      xpActivityId = undefined
    }

    await db.exams.update(exam.id, {
      notes,
      scoreAchieved,
      scoreMax,
      status,
      durationMinutes,
      solvedDate: nowSolved ? exam.solvedDate ?? todayIso() : exam.solvedDate,
      xpActivityId,
    })
    const assignment = await db.planAssignments.where('examId').equals(exam.id).first()
    if (assignment) {
      await db.planAssignments.update(assignment.id, { done: nowSolved })
    }
    if (nowSolved && !wasAlreadySolved) {
      const newBadges = await checkAndAwardBadges()
      if (newBadges.length) window.setTimeout(() => confettiBurst('big'), 250)
    }
    onClose()
  }

  return (
    <Dialog open onOpenChange={v => !v && onClose()} title={`${SUBJECT_LABEL[exam.subject]} — ${exam.schoolYear} (${exam.season === 'ljetni' ? 'ljetni' : 'jesenski'})`} className="max-w-3xl">
      <Tabs defaultValue="ispit">
        <TabsList>
          <TabsTrigger value="ispit"><FileText size={14} className="inline mr-1" />Ispit</TabsTrigger>
          <TabsTrigger value="rjesenje"><FileText size={14} className="inline mr-1" />Rješenje</TabsTrigger>
          <TabsTrigger value="rezultat"><Clock size={14} className="inline mr-1" />Rezultat i bilješke</TabsTrigger>
        </TabsList>
        <TabsContent value="ispit" className="h-[50vh] mt-3">
          <PdfViewer url={exam.examPdfUrl} blobId={exam.examBlobId} />
        </TabsContent>
        <TabsContent value="rjesenje" className="h-[50vh] mt-3">
          <PdfViewer url={exam.solutionPdfUrl} blobId={exam.solutionBlobId} />
        </TabsContent>
        <TabsContent value="rezultat" className="mt-3 space-y-3">
          <div className="flex items-center gap-3 rounded-xl border p-3">
            <span className="font-mono text-lg">{sw.format()}</span>
            {!sw.running ? (
              <Button size="sm" onClick={sw.start}>Pokreni štopericu</Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={sw.pause}>Pauziraj</Button>
            )}
            <Button size="sm" variant="ghost" onClick={sw.reset}>Reset</Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Status</Label>
              <NativeSelect value={status} onChange={e => setStatus(e.target.value as ExamStatus)}>
                <option value="nije_zaposeto">Nije započeto</option>
                <option value="u_tijeku">U tijeku</option>
                <option value="rijeseno">Riješeno</option>
              </NativeSelect>
            </div>
            <div>
              <Label>Bodovi</Label>
              <Input type="number" value={scoreAchieved} onChange={e => setScoreAchieved(Number(e.target.value))} />
            </div>
            <div>
              <Label>Maksimalno bodova</Label>
              <Input type="number" value={scoreMax} onChange={e => setScoreMax(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <Label>Bilješke</Label>
            <Textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <Button className="w-full" onClick={save} disabled={saving}>Spremi</Button>
        </TabsContent>
      </Tabs>
    </Dialog>
  )
}
