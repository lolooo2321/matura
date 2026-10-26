import { useMemo } from 'react'

export function Heatmap({ data }: { data: { date: string; count: number }[] }) {
  const weeks = useMemo(() => {
    const out: { date: string; count: number }[][] = []
    let week: { date: string; count: number }[] = []
    const firstDow = new Date(data[0]?.date ?? Date.now()).getDay()
    const pad = firstDow === 0 ? 6 : firstDow - 1
    for (let i = 0; i < pad; i++) week.push({ date: '', count: -1 })
    for (const d of data) {
      week.push(d)
      if (week.length === 7) {
        out.push(week)
        week = []
      }
    }
    if (week.length) out.push(week)
    return out
  }, [data])

  const max = Math.max(1, ...data.map(d => d.count))

  function colorFor(count: number) {
    if (count < 0) return 'transparent'
    if (count === 0) return 'var(--bg-sunken)'
    const intensity = Math.min(1, count / max)
    return `color-mix(in srgb, var(--accent) ${20 + intensity * 70}%, var(--bg-sunken))`
  }

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((day, di) => (
            <div
              key={di}
              title={day.date ? `${day.date}: ${day.count} aktivnosti` : ''}
              className="h-3 w-3 rounded-sm"
              style={{ background: colorFor(day.count) }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
