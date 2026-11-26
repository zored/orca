import type { RateLimitWindow } from '../../../../../shared/agent-usage/rate-limits/rate-limit-types'
import { clampUsedPercent } from '../../../../../shared/agent-usage/display/usage-percentage-display'
import type { Translate } from '@/i18n/use-translate'

export function usagePace(window: RateLimitWindow, now: number): number | undefined {
  const duration = window.windowMinutes * 60_000
  const reset = window.resetsAt
  if (!Number.isFinite(duration) || duration <= 0 || reset === null || !Number.isFinite(reset)) {
    return undefined
  }
  const remaining = reset - now
  if (remaining <= 0 || remaining > duration) {
    return undefined
  }
  return ((duration - remaining) / duration) * 100
}

export function usagePaceLabel(used: number, expected: number | undefined, t: Translate): string {
  if (expected === undefined) {
    return ''
  }
  const difference = clampUsedPercent(used) - expected
  const points = Math.round(Math.abs(difference))
  if (points === 0) {
    return t('statusBar.usagePace.onPace', 'On pace')
  }
  return difference > 0
    ? t('statusBar.usagePace.ahead', '{{points}} percentage points ahead of pace', { points })
    : t('statusBar.usagePace.behind', '{{points}} percentage points behind pace', { points })
}
