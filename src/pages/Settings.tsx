import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, exportAllData, importAllData, importExamsFromJson } from '../lib/db'
import { SUBJECTS, SUBJECT_LABEL, type Subject, type Settings } from '../lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Label, Textarea } from '../components/ui/Input'
import { useTheme } from '../hooks/useTheme'
import { extendPlan, autoLinkExamsToPlan } from '../lib/schedule'
import { NCVVO_ARCHIVE } from '../lib/ncvvoArchive'

export function SettingsPage() {
  const settings = useLiveQuery(() => db.settings.get(1))
  const { mode, setTheme } = useTheme()
  const [examCounts, setExamCounts] = useState<Record<Subject, number> | undefined>(settings?.examCounts)
  const [maturaDates, setMaturaDates] = useState<Partial<Record<Subject, string>> | undefined>(settings?.maturaDates)
  const [apiKey, setApiKey] = useState(settings?.anthropicApiKey ?? '')
  const [importJson, setImportJson] = useState('')
  const [importStatus, setImportStatus] = useState('')
  const [examImportJson, setExamImportJson] = useState('')
  const [examImportStatus, setExamImportStatus] = useState('')
  const [ncvvoStatus, setNcvvoStatus] = useState('')
  const [ncvvoImporting, setNcvvoImporting] = useState(false)

  useEffect(() => {
    if (settings) {
      setExamCounts(settings.examCounts)
      setMaturaDates(settings.maturaDates)
      setApiKey(settings.anthropicApiKey ?? '')
    }
  }, [settings])

  if (!settings || !examCounts) return null
  const currentExamCounts = examCounts
  const currentSettings = settings

  async function saveCounts() {
    await db.settings.update(1, { examCounts: currentExamCounts })
    const updated: Settings = { ...currentSettings, examCounts: currentExamCounts }
    await extendPlan(updated, 20)
    await autoLinkExamsToPlan()
  }

  async function saveMaturaDates() {
    await db.settings.update(1, { maturaDates })
  }

  async function saveApiKey() {
    await db.settings.update(1, { anthropicApiKey: apiKey.trim() || undefined })
  }

  async function doExport() {
    const json = await exportAllData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `matura-master-2027-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function doImport() {
    try {
      await importAllData(importJson)
      setImportStatus('Podaci uspješno uvezeni.')
    } catch {
      setImportStatus('Greška: datoteka nije valjan izvoz iz ove aplikacije.')
    }
  }

  async function doImportExamsJson() {
    try {
      const { added, skipped } = await importExamsFromJson(examImportJson)
      setExamImportStatus(`Uvezeno ${added} ispita${skipped ? `, preskočeno ${skipped} (već postoje)` : ''}.`)
      setExamImportJson('')
    } catch (e) {
      setExamImportStatus(`Greška: ${e instanceof Error ? e.message : 'nevažeći JSON'}`)
    }
  }

  async function doImportNcvvoArchive() {
    setNcvvoImporting(true)
    try {
      const { added, skipped } = await importExamsFromJson(JSON.stringify(NCVVO_ARCHIVE))
      setNcvvoStatus(`Uvezeno ${added} stvarnih ispita s NCVVO arhive${skipped ? `, ${skipped} već je bilo uvezeno` : ''}.`)
      await autoLinkExamsToPlan()
    } finally {
      setNcvvoImporting(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Postavke</h1>

      <Card>
        <CardHeader><CardTitle>Tema</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          {(['light', 'dark', 'system'] as const).map(m => (
            <Button key={m} size="sm" variant={mode === m ? 'primary' : 'outline'} onClick={() => setTheme(m)}>
              {m === 'light' ? 'Svijetla' : m === 'dark' ? 'Tamna' : 'Sustav'}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Broj ispita po predmetu</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {SUBJECTS.map(s => (
            <div key={s} className="flex items-center justify-between gap-3">
              <Label className="mb-0">{SUBJECT_LABEL[s]}</Label>
              <Input
                type="number"
                className="w-24"
                value={examCounts[s]}
                onChange={e => setExamCounts({ ...examCounts, [s]: Number(e.target.value) })}
              />
            </div>
          ))}
          <Button size="sm" onClick={saveCounts}>Spremi i ažuriraj plan</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Rokovi državne mature 2027</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {SUBJECTS.map(s => (
            <div key={s} className="flex items-center justify-between gap-3">
              <Label className="mb-0">{SUBJECT_LABEL[s]}</Label>
              <Input
                type="date"
                className="w-44"
                value={maturaDates?.[s] ?? ''}
                onChange={e => setMaturaDates({ ...maturaDates, [s]: e.target.value })}
              />
            </div>
          ))}
          <Button size="sm" onClick={saveMaturaDates}>Spremi</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>AI tutor — Anthropic API ključ</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-[var(--text-muted)]">
            Ključ se čuva isključivo lokalno u IndexedDB tvog preglednika i koristi se samo za tvoje AI pozive izravno prema Anthropicu.
            Nikad se ne šalje ni na koji drugi server. Ovo je izravan poziv iz preglednika (BYOK) jer aplikacija nema vlastiti backend.
          </p>
          <Input type="password" placeholder="sk-ant-..." value={apiKey} onChange={e => setApiKey(e.target.value)} />
          <Button size="sm" onClick={saveApiKey}>Spremi ključ</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Uvoz stvarnih NCVVO ispita</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-[var(--text-muted)]">
            Aplikacija ne izmišlja ispite niti PDF poveznice. Svaka poveznica u ugrađenoj arhivi ispod ručno je dohvaćena i provjerena izravno
            na ncvvo.hr prije uvoza.
          </p>

          <div className="rounded-xl border p-3 space-y-2">
            <div className="font-medium">Službena NCVVO arhiva (2020./2021. – 2025./2026.)</div>
            <p className="text-[var(--text-muted)]">
              {NCVVO_ARCHIVE.length} stvarnih ispita (Matematika A, Fizika, Hrvatski jezik — svi ljetni i jesenski rokovi objavljeni na{' '}
              <a href="https://www.ncvvo.hr/kategorija/drzavna-matura/provedeni-ispiti/" target="_blank" rel="noreferrer" className="text-[var(--accent)] underline">
                ncvvo.hr
              </a>
              ). NCVVO objavljuje svaki ispit kao ZIP arhivu (ispitna knjižica i materijali zajedno), pa se u aplikaciji otvara kao poveznica za
              preuzimanje, a ne kao ugrađeni PDF pregled.
            </p>
            <Button size="sm" onClick={doImportNcvvoArchive} disabled={ncvvoImporting}>
              {ncvvoImporting ? 'Uvozim…' : `Uvezi svih ${NCVVO_ARCHIVE.length} ispita`}
            </Button>
            {ncvvoStatus && <p>{ncvvoStatus}</p>}
          </div>

          <div>
            <Label>Ili uvezi vlastiti popis ispita (JSON)</Label>
            <p className="text-[var(--text-muted)] mb-1">
              Polja po stavci: subject (matematika/fizika/hrvatski), schoolYear, season (ljetni/jesenski), examPdfUrl, solutionPdfUrl (po
              želji), level (po želji).
            </p>
            <Textarea
              rows={4}
              value={examImportJson}
              onChange={e => setExamImportJson(e.target.value)}
              placeholder='[{"subject":"fizika","schoolYear":"2019./2020.","season":"ljetni","examPdfUrl":"https://..."}]'
            />
            <Button size="sm" className="mt-2" onClick={doImportExamsJson} disabled={!examImportJson.trim()}>Uvezi popis</Button>
            {examImportStatus && <p className="mt-1">{examImportStatus}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Izvoz i uvoz svih podataka</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button size="sm" onClick={doExport}>Izvezi sve podatke (JSON)</Button>
          <div>
            <Label>Uvezi iz izvezene JSON datoteke</Label>
            <Textarea rows={4} value={importJson} onChange={e => setImportJson(e.target.value)} placeholder="Zalijepi sadržaj JSON datoteke ovdje…" />
            <Button size="sm" className="mt-2" onClick={doImport} disabled={!importJson.trim()}>Uvezi</Button>
            {importStatus && <p className="text-sm mt-1">{importStatus}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Dnevno vrijeme za učenje</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-3">
          <Input
            type="number"
            className="w-24"
            value={settings.dailyStudyMinutes}
            onChange={e => db.settings.update(1, { dailyStudyMinutes: Number(e.target.value) })}
          />
          <span className="text-sm text-[var(--text-muted)]">minuta dnevno</span>
        </CardContent>
      </Card>
    </div>
  )
}
