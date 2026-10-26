import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../lib/db'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Label, Textarea, NativeSelect } from '../components/ui/Input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { Badge } from '../components/ui/Badge'
import { askTutor, generateSimilarTask, reviewEssay } from '../lib/ai'
import { SUBJECTS, SUBJECT_LABEL, TOPICS, type Subject } from '../lib/types'

function useApiKey() {
  const settings = useLiveQuery(() => db.settings.get(1))
  return settings?.anthropicApiKey
}

function NotConfigured() {
  return (
    <Card>
      <CardContent className="p-6 text-sm space-y-2">
        <p className="font-semibold">AI tutor treba konfiguraciju.</p>
        <p className="text-[var(--text-muted)]">
          Za rad AI tutora potreban je Anthropic API ključ. Unesi ga u{' '}
          <Link to="/postavke" className="text-[var(--accent)] underline">Postavkama</Link>. Ključ se čuva samo lokalno u tvojem pregledniku i
          nikad se ne šalje nikamo osim direktno Anthropicu kad zatražiš AI odgovor.
        </p>
      </CardContent>
    </Card>
  )
}

export function AiTutor() {
  const apiKey = useApiKey()

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">AI tutor</h1>
      <Tabs defaultValue="tutor">
        <TabsList>
          <TabsTrigger value="tutor">Objasni zadatak</TabsTrigger>
          <TabsTrigger value="slicni">Slični zadaci</TabsTrigger>
          <TabsTrigger value="esej">Priprema za esej</TabsTrigger>
          <TabsTrigger value="formule">Bilježnica formula</TabsTrigger>
        </TabsList>
        <TabsContent value="tutor" className="mt-4">
          {apiKey ? <TutorTab apiKey={apiKey} /> : <NotConfigured />}
        </TabsContent>
        <TabsContent value="slicni" className="mt-4">
          {apiKey ? <SimilarTab apiKey={apiKey} /> : <NotConfigured />}
        </TabsContent>
        <TabsContent value="esej" className="mt-4">
          {apiKey ? <EssayTab apiKey={apiKey} /> : <NotConfigured />}
        </TabsContent>
        <TabsContent value="formule" className="mt-4">
          <FormulaNotebook />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TutorTab({ apiKey }: { apiKey: string }) {
  const [question, setQuestion] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [level, setLevel] = useState<'hint' | 'next_step' | 'full_solution'>('hint')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function send(newLevel?: typeof level) {
    const useLevel = newLevel ?? level
    setLevel(useLevel)
    setLoading(true)
    setError('')
    try {
      const result = await askTutor({ apiKey, question, level: useLevel, image: image ?? undefined })
      setAnswer(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Greška')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <Label>Fotografija zadatka (po želji)</Label>
      <input type="file" accept="image/*" onChange={e => setImage(e.target.files?.[0] ?? null)} className="text-sm" />
      <Label>Ili opiši / zalijepi tekst zadatka</Label>
      <Textarea rows={4} value={question} onChange={e => setQuestion(e.target.value)} />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => send('hint')} disabled={loading}>Daj mi hint</Button>
        <Button size="sm" variant="secondary" onClick={() => send('next_step')} disabled={loading}>Sljedeći korak</Button>
        <Button size="sm" variant="outline" onClick={() => send('full_solution')} disabled={loading}>Potpuno rješenje</Button>
      </div>
      {loading && <p className="text-sm text-[var(--text-muted)]">AI razmišlja…</p>}
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      {answer && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <Badge tone="accent">AI prijedlog</Badge>
            <div className="text-sm whitespace-pre-wrap">{answer}</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SimilarTab({ apiKey }: { apiKey: string }) {
  const [subject, setSubject] = useState<Subject>('matematika')
  const [topic, setTopic] = useState(TOPICS.matematika[0])
  const [originalText, setOriginalText] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  async function generate() {
    setLoading(true)
    try {
      const r = await generateSimilarTask({ apiKey, subject: SUBJECT_LABEL[subject], topic, originalText })
      setResult(r)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
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
      <Label>Izvorni zadatak koji ti je bio težak</Label>
      <Textarea rows={4} value={originalText} onChange={e => setOriginalText(e.target.value)} />
      <Button onClick={generate} disabled={loading || !originalText.trim()}>
        {loading ? 'Generiram…' : 'Generiraj sličan zadatak'}
      </Button>
      {result && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <Badge tone="warning">AI-generiran zadatak — nije iz službene mature</Badge>
            <div className="text-sm whitespace-pre-wrap">{result}</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function EssayTab({ apiKey }: { apiKey: string }) {
  const essays = useLiveQuery(() => db.essays.orderBy('date').reverse().toArray(), [], [])
  const [essayType, setEssayType] = useState('Esej')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    setLoading(true)
    try {
      const feedback = await reviewEssay({ apiKey, essayText: text, essayType })
      await db.essays.add({ id: crypto.randomUUID(), date: new Date().toISOString(), essayType, text, feedback })
      setText('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Vrsta teksta</Label>
        <NativeSelect value={essayType} onChange={e => setEssayType(e.target.value)}>
          <option>Esej</option>
          <option>Sažetak</option>
          <option>Interpretacija</option>
        </NativeSelect>
      </div>
      <Label>Tvoj tekst</Label>
      <Textarea rows={8} value={text} onChange={e => setText(e.target.value)} />
      <Button onClick={submit} disabled={loading || !text.trim()}>{loading ? 'AI procjenjuje…' : 'Zatraži AI povratnu informaciju'}</Button>

      <div className="space-y-3">
        {(essays ?? []).map(e => (
          <Card key={e.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-xs text-[var(--text-muted)]">
                <span>{e.essayType}</span>
                <span>{new Date(e.date).toLocaleDateString('hr-HR')}</span>
              </div>
              <Badge tone="warning">AI procjena — nije službena ocjena</Badge>
              <div className="text-sm whitespace-pre-wrap">{e.feedback}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function FormulaNotebook() {
  const formulas = useLiveQuery(() => db.formulas.toArray(), [], [])
  const [subject, setSubject] = useState<Subject>('matematika')
  const [name, setName] = useState('')
  const [formula, setFormula] = useState('')

  async function add() {
    if (!name.trim() || !formula.trim()) return
    await db.formulas.add({ id: crypto.randomUUID(), subject, name: name.trim(), formula: formula.trim() })
    setName(''); setFormula('')
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <NativeSelect value={subject} onChange={e => setSubject(e.target.value as Subject)}>
              {SUBJECTS.map(s => <option key={s} value={s}>{SUBJECT_LABEL[s]}</option>)}
            </NativeSelect>
            <Input placeholder="Naziv formule" value={name} onChange={e => setName(e.target.value)} />
            <Input placeholder="npr. v = v0 + a*t" value={formula} onChange={e => setFormula(e.target.value)} />
          </div>
          <Button size="sm" onClick={add}>Dodaj formulu</Button>
        </CardContent>
      </Card>
      <div className="grid md:grid-cols-2 gap-3">
        {(formulas ?? []).map(f => (
          <Card key={f.id}>
            <CardContent className="p-4">
              <div className="flex justify-between">
                <span className="font-semibold">{f.name}</span>
                <Badge tone="neutral">{SUBJECT_LABEL[f.subject]}</Badge>
              </div>
              <div className="text-sm font-mono mt-1">{f.formula}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
