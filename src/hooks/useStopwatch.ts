import { useEffect, useRef, useState } from 'react'

export function useStopwatch() {
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => setSeconds(s => s + 1), 1000)
    } else if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
    }
  }, [running])

  function reset() {
    setSeconds(0)
    setRunning(false)
  }

  function format() {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return { seconds, running, start: () => setRunning(true), pause: () => setRunning(false), reset, format }
}
