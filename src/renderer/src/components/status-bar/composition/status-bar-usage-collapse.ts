/** Usage row forms, roomiest first. "+N" joins the last. */
export const USAGE_ROW_LEVELS = [
  { compact: false, tightestOnly: false },
  { compact: true, tightestOnly: false },
  { compact: true, tightestOnly: true }
] as const

export type UsageRowLevel = 0 | 1 | 2

/** Natural widths read off the hidden measuring row, which no layout choice changes. */
export type UsageRowWidths = {
  /** Room for the chips: the usage area minus the trigger's padding and the refresh button. */
  available: number
  chipGap: number
  moreChipWidth: number
  /** Per provider, its chip width at each level. */
  chips: Record<string, readonly [number, number, number]>
}

export type UsageChipFacts = {
  provider: string
  urgent: boolean
}

export type UsageRowLayout = { level: UsageRowLevel; collapsed: string[] }

// Why: hidden measuring chips don't tick their countdowns, so a live label can run a character wider.
const STALE_LABEL_SLACK_PX = 8

function rowWidth(
  widths: UsageRowWidths,
  chips: readonly UsageChipFacts[],
  level: UsageRowLevel
): number {
  const items = chips.map((chip) => widths.chips[chip.provider]?.[level] ?? 0)
  return (
    items.reduce((sum, width) => sum + width, 0) + widths.chipGap * Math.max(0, items.length - 1)
  )
}

/** Roomiest form whose full row fits; otherwise fold chips into "+N". */
export function chooseUsageRowLayout(
  widths: UsageRowWidths,
  chips: readonly UsageChipFacts[]
): UsageRowLayout {
  const room = widths.available - STALE_LABEL_SLACK_PX
  for (const level of [0, 1, 2] as const) {
    if (rowWidth(widths, chips, level) <= room) {
      return { level, collapsed: [] }
    }
  }
  const collapsed = pickCollapsedUsageChips(
    chips.map((chip) => ({
      provider: chip.provider,
      width: widths.chips[chip.provider]?.[2] ?? 0,
      urgent: chip.urgent
    })),
    rowWidth(widths, chips, 2) - room,
    widths.moreChipWidth,
    widths.chipGap
  )
  return { level: 2, collapsed }
}

/** Collapse calm chips from the roster’s end before urgent chips until the overflow and replacement chip fit. */
export function pickCollapsedUsageChips(
  chips: readonly { provider: string; width: number; urgent: boolean }[],
  overflowPx: number,
  moreChipWidth: number,
  chipGap: number
): string[] {
  if (overflowPx <= 0) {
    return []
  }
  // The first collapsed chip brings the "+N" chip (and its gap) into the row.
  const needed = overflowPx + moreChipWidth + chipGap
  const dropOrder = [
    ...chips.filter((chip) => !chip.urgent).toReversed(),
    ...chips.filter((chip) => chip.urgent).toReversed()
  ]
  const collapsed: string[] = []
  let freed = 0
  for (const chip of dropOrder) {
    if (freed >= needed) {
      break
    }
    collapsed.push(chip.provider)
    freed += chip.width + chipGap
  }
  return collapsed
}
