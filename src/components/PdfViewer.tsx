import { useEffect, useState } from 'react'
import { FileArchive, ExternalLink } from 'lucide-react'
import { getBlobUrl } from '../lib/db'

export function PdfViewer({ url, blobId }: { url?: string; blobId?: string }) {
  const [resolvedUrl, setResolvedUrl] = useState<string | undefined>(url)

  useEffect(() => {
    if (url) {
      setResolvedUrl(url)
      return
    }
    if (blobId) {
      let objectUrl: string | undefined
      getBlobUrl(blobId).then(u => {
        objectUrl = u
        setResolvedUrl(u)
      })
      return () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl)
      }
    }
    setResolvedUrl(undefined)
  }, [url, blobId])

  if (!resolvedUrl) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border bg-[var(--bg-sunken)] text-sm text-[var(--text-muted)] p-6 text-center">
        Nema dostupnog PDF-a. Dodaj poveznicu ili učitaj datoteku.
      </div>
    )
  }

  const isZip = /\.zip($|\?)/i.test(resolvedUrl)

  if (isZip) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border bg-[var(--bg-sunken)] p-6 text-center">
        <FileArchive size={32} className="text-[var(--text-muted)]" />
        <p className="text-sm text-[var(--text-muted)] max-w-sm">
          NCVVO ovaj ispit objavljuje kao ZIP arhivu (ispitna knjižica i popratni materijali u jednoj datoteci), pa se ne može prikazati izravno
          u pregledniku. Preuzmi i otvori arhivu da vidiš sadržaj.
        </p>
        <a
          href={resolvedUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          <ExternalLink size={16} /> Preuzmi ZIP arhivu
        </a>
      </div>
    )
  }

  return <iframe src={resolvedUrl} title="PDF" className="w-full h-full rounded-xl border bg-white" />
}
