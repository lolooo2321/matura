import confetti from 'canvas-confetti'

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#5b5bf0'
}

const ACCENT_COLORS = () => [cssVar('--accent'), cssVar('--success'), cssVar('--warning'), cssVar('--math'), cssVar('--physics')]

/** A quick confetti burst from the center-top of the screen, for everyday wins. */
export function confettiBurst(intensity: 'small' | 'big' = 'small') {
  const colors = ACCENT_COLORS()
  if (intensity === 'small') {
    confetti({ particleCount: 28, spread: 55, startVelocity: 32, origin: { y: 0.7 }, colors, scalar: 0.8, ticks: 120 })
    return
  }
  const end = Date.now() + 500
  ;(function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0 }, colors })
    confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1 }, colors })
    if (Date.now() < end) requestAnimationFrame(frame)
  })()
  confetti({ particleCount: 90, spread: 100, startVelocity: 45, origin: { y: 0.6 }, colors, scalar: 1.1 })
}

export interface XpToastDetail {
  xp: number
  label: string
}

/** Dispatches a floating "+XP" toast, picked up by <XpToastLayer /> mounted once in the app shell. */
export function fireXpToast(xp: number, label: string) {
  window.dispatchEvent(new CustomEvent<XpToastDetail>('xp-toast', { detail: { xp, label } }))
}
