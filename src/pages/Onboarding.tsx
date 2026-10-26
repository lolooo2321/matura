import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../lib/db'
import { DEFAULT_EXAM_COUNTS, SUBJECTS, SUBJECT_LABEL, type Settings, type Shift, type Subject } from '../lib/types'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { Input, Label } from '../components/ui/Input'
import { extendPlan } from '../lib/schedule'
import { startOfWeekMonday } from '../lib/utils'

const PLAN_START = '2026-10-26'
const PLAN_END = '2027-05-31'

export function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [firstWeekShift, setFirstWeekShift] = useState<Shift>('jutarnja')
  const [examCounts, setExamCounts] = useState(DEFAULT_EXAM_COUNTS)
  const [alreadySolved, setAlreadySolved] = useState<Record<Subject, number>>({ matematika: 0, fizika: 0, hrvatski: 0 })
  const [maturaDates, setMaturaDates] = useState<Partial<Record<Subject, string>>>({})
  const [dailyMinutes, setDailyMinutes] = useState(90)
  const [saving, setSaving] = useState(false)

  const steps = ['Smjena', 'Ispiti i gradivo', 'Rokovi mature', 'Vrijeme za učenje', 'Gotovo']

  async function finish() {
    setSaving(true)
    const settings: Settings = {
      id: 1,
      onboardingDone: true,
      firstWeekMonday: startOfWeekMonday(PLAN_START),
      firstWeekShift,
      examCounts,
      alreadySolved,
      maturaDates,
      studyDaysPerSubject: {},
      dailyStudyMinutes: dailyMinutes,
      theme: 'system',
      planStartDate: PLAN_START,
      planEndDate: PLAN_END,
    }
    await db.settings.put(settings)
    await extendPlan(settings, 16)
    setSaving(false)
    navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)]">
      <Card className="w-full max-w-xl animate-fade-in">
        <CardContent className="p-8">
          <div className="text-2xl font-bold mb-1">Matura Master 2027</div>
          <div className="text-sm text-[var(--text-muted)] mb-6">
            Korak {step + 1} od {steps.length} — {steps[step]}
          </div>

          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-muted)]">
                Plan priprema kreće 26. listopada 2026. Koja je školska smjena u tom prvom tjednu?
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(['jutarnja', 'popodnevna'] as Shift[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setFirstWeekShift(s)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      firstWeekShift === s ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'hover:bg-[var(--bg-sunken)]'
                    }`}
                  >
                    <div className="font-semibold capitalize">{s}</div>
                    <div className="text-xs text-[var(--text-muted)]">{s === 'jutarnja' ? '4 mature tjedno' : '3 mature tjedno'}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-muted)]">
                Koliko ukupno starih matura ima po predmetu, i koliko si ih već riješio prije korištenja aplikacije? Brojke možeš kasnije promijeniti.
              </p>
              {SUBJECTS.map(s => (
                <div key={s} className="grid grid-cols-3 items-end gap-2">
                  <div className="text-sm font-medium col-span-1">{SUBJECT_LABEL[s]}</div>
                  <div>
                    <Label>Ukupno ispita</Label>
                    <Input
                      type="number"
                      min={0}
                      value={examCounts[s]}
                      onChange={e => setExamCounts({ ...examCounts, [s]: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Već riješeno</Label>
                    <Input
                      type="number"
                      min={0}
                      value={alreadySolved[s]}
                      onChange={e => setAlreadySolved({ ...alreadySolved, [s]: Number(e.target.value) })}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-muted)]">Kada su ti ispiti državne mature 2027? (po želji, možeš ostaviti prazno i dodati kasnije)</p>
              {SUBJECTS.map(s => (
                <div key={s}>
                  <Label>{SUBJECT_LABEL[s]}</Label>
                  <Input
                    type="date"
                    value={maturaDates[s] ?? ''}
                    onChange={e => setMaturaDates({ ...maturaDates, [s]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Label>Koliko minuta dnevno realno možeš učiti?</Label>
              <Input type="number" min={15} step={15} value={dailyMinutes} onChange={e => setDailyMinutes(Number(e.target.value))} />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-2 text-sm text-[var(--text-muted)]">
              <p>Spremno! Na temelju tvojih unosa generirat ćemo osobni plan priprema do svibnja 2027.</p>
              <p>Plan uvijek možeš kasnije uređivati — dodavati ispite, premještati dane i mijenjati brojke.</p>
            </div>
          )}

          <div className="flex justify-between mt-8">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
              Natrag
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep(step + 1)}>Dalje</Button>
            ) : (
              <Button onClick={finish} disabled={saving}>
                {saving ? 'Generiram plan…' : 'Započni pripremu'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
