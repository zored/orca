import React from 'react'
import { ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { useAppStore } from '../../../store'
import {
  clampUsedPercent,
  getDisplayedUsagePercentage,
  normalizeUsagePercentageDisplay,
  type UsagePercentageDisplay
} from '../../../../../shared/agent-usage/display/usage-percentage-display'
import { formatBareUsagePercentage } from './usage-percentage-label'
import { usageBarClass, type UsageBarTone } from './usage-health-tone'

/**
 * Track stays neutral; the fill is the displayed %. Only a provider's details card passes
 * tone="health" to color the fill by consumption; everywhere else it stays grey.
 */
export function UsageBar({
  usedPercent,
  display,
  tone = 'plain',
  paceUsedPercent,
  scopedUsedPercent,
  className,
  trackClassName = 'bg-muted'
}: {
  usedPercent: number
  display: UsagePercentageDisplay
  tone?: UsageBarTone
  paceUsedPercent?: number
  scopedUsedPercent?: number
  className?: string
  trackClassName?: string
}): React.JSX.Element {
  const pace =
    paceUsedPercent === undefined
      ? undefined
      : display === 'remaining'
        ? 100 - paceUsedPercent
        : paceUsedPercent
  return (
    <span
      data-usage-bar
      className={cn('relative block overflow-hidden rounded-full', trackClassName, className)}
    >
      {pace !== undefined ? (
        <span
          className="absolute inset-y-0 start-0 bg-muted-foreground/15"
          style={{ width: `${pace}%` }}
        />
      ) : null}
      <span
        className={`relative block h-full rounded-[inherit] transition-[width] duration-300 motion-reduce:transition-none ${usageBarClass(usedPercent, tone)}`}
        style={{ width: `${getDisplayedUsagePercentage(usedPercent, display)}%` }}
      />
      {scopedUsedPercent !== undefined ? (
        <span
          aria-hidden="true"
          className={cn(
            'absolute inset-y-0 bg-foreground/55 transition-[width] duration-300 motion-reduce:transition-none',
            display === 'remaining' ? 'end-0' : 'start-0'
          )}
          style={{
            width: `${(clampUsedPercent(usedPercent) * clampUsedPercent(scopedUsedPercent)) / 100}%`
          }}
        />
      ) : null}
    </span>
  )
}

/** Bare "86%" in the surrounding text color; the Used/Left column header names what it counts. */
export function UsageValue({
  usedPercent,
  display,
  className
}: {
  usedPercent: number
  display: UsagePercentageDisplay
  className?: string
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <span className={cn('tabular-nums', className)}>
      {formatBareUsagePercentage(usedPercent, display, t)}
    </span>
  )
}

export function useUsageDisplayLabel(display: UsagePercentageDisplay): string {
  const t = useTranslate()
  return display === 'used'
    ? t('auto.components.status.bar.AccountSwitchList.used', 'Used')
    : t('auto.components.status.bar.AccountSwitchList.left', 'Left')
}

/**
 * "Used ⇅" / "Left ⇅" column header that flips the persisted setting Settings also edits.
 * Inside a menu it must be a menu item: Radix menus swallow Tab, so a plain button is unreachable.
 */
export function UsageDisplayToggle({
  asMenuItem = false
}: {
  asMenuItem?: boolean
}): React.JSX.Element {
  const t = useTranslate()
  const display = normalizeUsagePercentageDisplay(useAppStore((s) => s.usagePercentageDisplay))
  const setDisplay = useAppStore((s) => s.setUsagePercentageDisplay)
  const label = useUsageDisplayLabel(display)
  const next: UsagePercentageDisplay = display === 'used' ? 'remaining' : 'used'
  const actionLabel =
    next === 'remaining'
      ? t('auto.components.status.bar.UsageDisplayToggle.showRemaining', 'Show remaining usage')
      : t('auto.components.status.bar.UsageDisplayToggle.showUsed', 'Show used usage')
  const button = (
    <Button
      type="button"
      variant="muted-field-icon"
      size="xs"
      title={actionLabel}
      // Why not aria-label: the accessible name must contain the visible "Used"/"Left" (WCAG 2.5.3).
      aria-description={actionLabel}
      data-usage-display-toggle={display}
      onClick={asMenuItem ? undefined : () => setDisplay(next)}
    >
      {label}
      <ArrowUpDown aria-hidden="true" className="size-3" />
    </Button>
  )
  if (!asMenuItem) {
    return button
  }
  return (
    <DropdownMenuItem
      asChild
      onSelect={(event) => {
        // Why: keep the menu open so the flipped numbers are visible right away.
        event.preventDefault()
        setDisplay(next)
      }}
    >
      {button}
    </DropdownMenuItem>
  )
}
