import { cn } from '@/lib/class-names'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import type {
  ProviderRateLimits,
  RateLimitWindow
} from '../../../../../shared/agent-usage/rate-limits/rate-limit-types'
import { formatRateLimitWindowChipLabel } from '../../../../../shared/agent-usage/rate-limits/rate-limit-window-label'
import { WEEKLY_WINDOW_MINUTES } from '../../../../../shared/agent-usage/display/usage-provider-windows'
import {
  getDisplayedUsagePercentage,
  type UsagePercentageDisplay
} from '../../../../../shared/agent-usage/display/usage-percentage-display'
import { formatBareUsagePercentage, formatUsagePercentageLabel } from './usage-percentage-label'
import { UsageBar } from './usage-meter'
import { usagePace, usagePaceLabel } from './usage-pace'
import { formatLocalizedResetDuration } from './usage-reset-caption'

const METER_COLUMNS = {
  compact: 'grid-cols-[minmax(1rem,var(--usage-meter-width,1rem))]',
  detailed: 'grid-cols-[minmax(1.75rem,var(--usage-meter-width,1.75rem))]'
}

export function getStatusBarResetTimes(limits: ProviderRateLimits | null): (number | null)[] {
  return [
    limits?.session?.windowMinutes === 5 * 60 ? limits.session.resetsAt : null,
    limits?.weekly?.windowMinutes === WEEKLY_WINDOW_MINUTES ? limits.weekly.resetsAt : null
  ]
}

export function StatusBarResetCountdowns({
  resetTimes,
  now
}: {
  resetTimes: readonly (number | null)[]
  now: number
}): React.JSX.Element | null {
  const locale = useIntlLocale()
  const countdowns = resetTimes
    .map((resetAt) => formatLocalizedResetDuration(resetAt, now, locale))
    .filter(Boolean)
    .join(' · ')
  return countdowns ? (
    <span className="whitespace-nowrap tabular-nums text-muted-foreground">{countdowns}</span>
  ) : null
}

export function StatusBarWindowMeter({
  window,
  label,
  display,
  now,
  compact = false,
  scopedWindow,
  className
}: {
  window: RateLimitWindow
  label: string
  display: UsagePercentageDisplay
  now: number
  compact?: boolean
  scopedWindow?: { window: RateLimitWindow; label: string }
  className?: string
}): React.JSX.Element {
  const t = useTranslate()
  const pace = usagePace(window, now)
  const title = [
    label,
    formatUsagePercentageLabel(window.usedPercent, display, t),
    usagePaceLabel(window.usedPercent, pace, t),
    scopedWindow
      ? `${scopedWindow.label} · ${formatUsagePercentageLabel(scopedWindow.window.usedPercent, display, t)}`
      : undefined
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <span
      title={title}
      className={cn(
        'inline-grid self-stretch',
        className ?? (compact ? METER_COLUMNS.compact : METER_COLUMNS.detailed)
      )}
    >
      <UsageBar
        usedPercent={window.usedPercent}
        display={display}
        paceUsedPercent={pace}
        scopedUsedPercent={scopedWindow?.window.usedPercent}
        className="min-h-1.5 w-full rounded-none"
      />
    </span>
  )
}

export function ClaudeStatusBarMeter({
  limits: { session, weekly, fableWeekly },
  display,
  now,
  compact
}: {
  limits: ProviderRateLimits
  display: UsagePercentageDisplay
  now: number
  compact: boolean
}): React.JSX.Element {
  const t = useTranslate()
  const fableLabel = t('auto.components.status.bar.StatusBar.a79c64f87e', 'Fable')
  const weeklyTrack = weekly ?? fableWeekly
  return (
    <span
      className={cn(
        'inline-grid gap-px self-stretch',
        compact ? METER_COLUMNS.compact : METER_COLUMNS.detailed,
        session && weeklyTrack && 'grid-rows-[minmax(6px,3fr)_minmax(6px,1fr)]'
      )}
    >
      {session ? (
        <StatusBarWindowMeter
          window={session}
          label={formatRateLimitWindowChipLabel(session)}
          display={display}
          now={now}
          className="w-full"
        />
      ) : null}
      {weeklyTrack ? (
        <StatusBarWindowMeter
          window={weeklyTrack}
          label={weekly ? formatRateLimitWindowChipLabel(weekly) : fableLabel}
          scopedWindow={
            weekly && fableWeekly ? { window: fableWeekly, label: fableLabel } : undefined
          }
          display={display}
          now={now}
          className="w-full"
        />
      ) : null}
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
