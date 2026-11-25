import { expect, it } from 'vitest'
import { usagePace } from './usage-pace'

it('derives linear pace only for a current window with known timing', () => {
  const reset = Date.UTC(2026, 10, 26, 12)
  const window = {
    usedPercent: 40,
    windowMinutes: 300,
    resetsAt: reset,
    resetDescription: null
  }

  expect(usagePace(window, reset - 3 * 60 * 60_000)).toBe(40)
  expect(usagePace(window, reset - 5 * 60 * 60_000)).toBe(0)
  expect(usagePace(window, reset - 5 * 60 * 60_000 - 1)).toBeUndefined()
  expect(usagePace(window, reset)).toBeUndefined()
  expect(usagePace({ ...window, resetsAt: null }, reset - 1)).toBeUndefined()
  expect(usagePace({ ...window, windowMinutes: 0 }, reset - 1)).toBeUndefined()
})
