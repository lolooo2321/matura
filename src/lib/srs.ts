import type { SrsState, MasteryStatus } from './types'
import { addDays, todayIso } from './utils'

export const BASE_INTERVALS = [1, 3, 7, 14, 30]

export function freshSrsState(): SrsState {
  return { interval: 0, dueDate: todayIso(), repetitions: 0, lastResult: null, learnedByHeart: false }
}

export type ReviewResult = 'wrong' | 'hard' | 'good' | 'easy'

/**
 * Updates SRS state after a review. A "wrong" answer resets progress.
 * "hard" repeats the same step, "good" advances a step, "easy" skips a step ahead.
 */
export function reviewTask(state: SrsState, result: ReviewResult): SrsState {
  let repetitions = state.repetitions
  if (result === 'wrong') {
    repetitions = 0
  } else if (result === 'hard') {
    repetitions = Math.max(0, repetitions)
  } else if (result === 'good') {
    repetitions = repetitions + 1
  } else {
    repetitions = repetitions + 2
  }
  const idx = Math.min(repetitions, BASE_INTERVALS.length - 1)
  const interval = result === 'wrong' ? 1 : BASE_INTERVALS[idx]
  const learnedByHeart = repetitions >= BASE_INTERVALS.length - 1 && result !== 'wrong'

  return {
    interval,
    dueDate: addDays(todayIso(), interval),
    repetitions,
    lastResult: result,
    learnedByHeart,
  }
}

export function isDue(state: SrsState): boolean {
  return state.dueDate <= todayIso()
}

const STATUS_ORDER: MasteryStatus[] = ['ne_znam', 'trebam_vjezbati', 'skoro_znam', 'znam_samostalno']

/** Derives the next mastery status from a quiz review result, never skipping more than one step up. */
export function nextMasteryStatus(current: MasteryStatus, result: ReviewResult, newState: SrsState): MasteryStatus {
  if (result === 'wrong') return 'ne_znam'
  if (result === 'hard') return 'trebam_vjezbati'
  const currentIdx = STATUS_ORDER.indexOf(current)
  if (newState.learnedByHeart) return 'znam_samostalno'
  const targetIdx = result === 'easy' ? currentIdx + 2 : currentIdx + 1
  return STATUS_ORDER[Math.min(targetIdx, STATUS_ORDER.length - 1)]
}
