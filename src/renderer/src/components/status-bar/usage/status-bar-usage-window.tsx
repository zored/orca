import { cn } from '@/lib/class-names'
import { useTranslate } from '@/i18n/use-translate'
import type { RateLimitWindow } from '../../../../../shared/agent-usage/rate-limits/rate-limit-types'
import {
  getDisplayedUsagePercentage,
  type UsagePercentageDisplay
} from '../../../../../shared/agent-usage/display/usage-percentage-display'
import { formatBareUsagePercentage, formatUsagePercentageLabel } from './usage-percentage-label'
import { UsageBar } from './usage-meter'
import { usagePace, usagePaceLabel } from './usage-pace'

export function StatusBarWindowMeter({
  window,
  label,
  display,
  now,
  compact = false
}: {
  window: RateLimitWindow
  label: string
  display: UsagePercentageDisplay
  now: number
  compact?: boolean
}): React.JSX.Element {
  const t = useTranslate()
  const pace = usagePace(window, now)
  const title = [
    label,
    formatUsagePercentageLabel(window.usedPercent, display, t),
    usagePaceLabel(window.usedPercent, pace, t)
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <span title={title} className="inline-flex">
      <UsageBar
        usedPercent={window.usedPercent}
        display={display}
        paceUsedPercent={pace}
        className={cn('h-1.5 shrink-0', compact ? 'w-4' : 'w-7')}
      />
    </span>
  )
}

export function StatusBarWindowLabel({
  w,
  label,
  display,
  showLabel = true,
  labelFirst = false,
  compact = false
}: {
  w: RateLimitWindow
  label: string
  display: UsagePercentageDisplay
  showLabel?: boolean
  labelFirst?: boolean
  /** Compact bar: a bright number with a smaller, dimmer unit. */
  compact?: boolean
}): React.JSX.Element {
  const t = useTranslate()
  const text = formatBareUsagePercentage(w.usedPercent, display, t)
  if (compact) {
    const value = String(getDisplayedUsagePercentage(w.usedPercent, display))
    const at = text.indexOf(value)
    const unit = (part: string) =>
      part.trim() ? <span className="text-[0.82em] opacity-60">{part}</span> : part
    return (
      <span className="tabular-nums">
        {showLabel && labelFirst ? <span className="text-foreground/50">{`${label} `}</span> : ''}
        {at === -1 ? (
          <span className="font-semibold text-foreground">{text}</span>
        ) : (
          <span className="font-semibold text-foreground">
            {unit(text.slice(0, at))}
            {value}
            {unit(text.slice(at + value.length))}
          </span>
        )}
        {showLabel && !labelFirst ? <span className="text-foreground/50">{` ${label}`}</span> : ''}
      </span>
    )
  }
  return (
    <span className="tabular-nums">
      {showLabel && labelFirst ? `${label} ` : ''}
      {text}
      {showLabel && !labelFirst ? ` ${label}` : ''}
    </span>
  )
}
