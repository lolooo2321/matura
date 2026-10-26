const MODEL = 'claude-sonnet-5-5'
const API_URL = 'https://api.anthropic.com/v1/messages'

export class AiNotConfiguredError extends Error {}

async function callClaude(apiKey: string, system: string, userContent: Array<{ type: string; [k: string]: unknown }>): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      system,
      messages: [{ role: 'user', content: userContent }],
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`AI poziv neuspješan (${res.status}): ${body.slice(0, 300)}`)
  }
  const data = await res.json()
  return data.content?.map((c: { text?: string }) => c.text ?? '').join('\n') ?? ''
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const TUTOR_SYSTEM = `Ti si AI tutor za hrvatsku državnu maturu (matematika A, fizika, hrvatski jezik). Nikad ne izmišljaj službena rješenja niti književne činjenice. Jasno razdvoji: [AI PRIJEDLOG] od onoga što je provjereno. Prvo daj samo mali hint, ne cijelo rješenje, osim ako korisnik eksplicitno zatraži sljedeći korak ili potpuno rješenje. Za matematiku koristi LaTeX notaciju ($...$). Za fiziku koristi SI jedinice. Odgovaraj na hrvatskom jeziku.`

export async function askTutor(opts: {
  apiKey: string
  question: string
  level: 'hint' | 'next_step' | 'full_solution'
  image?: File
}): Promise<string> {
  const levelInstruction = {
    hint: 'Korisnik želi samo mali hint — ne otkrivaj cijeli postupak.',
    next_step: 'Korisnik traži sljedeći korak u rješavanju, ne cijelo rješenje odjednom.',
    full_solution: 'Korisnik je zatražio potpuno rješenje s objašnjenjem svih koraka i formula.',
  }[opts.level]

  const content: Array<{ type: string; [k: string]: unknown }> = []
  if (opts.image) {
    const base64 = await fileToBase64(opts.image)
    content.push({ type: 'image', source: { type: 'base64', media_type: opts.image.type || 'image/jpeg', data: base64 } })
  }
  content.push({ type: 'text', text: `${levelInstruction}\n\nZadatak / pitanje:\n${opts.question}` })

  return callClaude(opts.apiKey, TUTOR_SYSTEM, content)
}

const SIMILAR_SYSTEM = `Ti generiraš nove zadatke slične zadanom, za hrvatsku državnu maturu. Promijeni brojeve i uvjete, ali zadrži istu temu i razinu težine. Obavezno sam izračunaj i priloži ispravno rješenje, provjeri ga prije nego ga prikažeš. Jasno označi da je zadatak AI-generiran, a ne iz službene mature. Odgovaraj na hrvatskom jeziku.`

export async function generateSimilarTask(opts: { apiKey: string; subject: string; topic: string; originalText: string }): Promise<string> {
  return callClaude(
    opts.apiKey,
    SIMILAR_SYSTEM,
    [{ type: 'text', text: `Predmet: ${opts.subject}\nTema: ${opts.topic}\nIzvorni zadatak:\n${opts.originalText}\n\nGeneriraj jedan novi, sličan zadatak s rješenjem.` }],
  )
}

const ESSAY_SYSTEM = `Ti procjenjuješ esej/tekst za hrvatsku maturu prema službenim kriterijima (sadržaj, struktura, jezik i stil, pravopis). Tvoja procjena NIJE službena ocjena — to moraš eksplicitno napisati na početku. Daj konkretne, obrazložene povratne informacije i prijedloge poboljšanja. Odgovaraj na hrvatskom jeziku.`

export async function reviewEssay(opts: { apiKey: string; essayText: string; essayType: string }): Promise<string> {
  return callClaude(
    opts.apiKey,
    ESSAY_SYSTEM,
    [{ type: 'text', text: `Vrsta teksta: ${opts.essayType}\n\nTekst:\n${opts.essayText}` }],
  )
}
