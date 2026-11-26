import { defaultRangeExtractor, type Range } from '@tanstack/react-virtual'
import type { ActivityGroupBy } from '../../../../../shared/agent-status/presentation/agents-view-thread-filters'
import {
  getActiveStickyHeaderIndex,
  getPreviousStickyHeaderIndex
} from '../../sidebar/worktree-list/viewport/virtual-rows'
import type { ActivityThreadGroup, AgentPaneThread } from '../threads/activity-thread-types'

/** One row of the virtualized Activity list: a group header or a thread. */
export type ActivityVirtualItemDescriptor =
  | { type: 'header'; group: ActivityThreadGroup }
  | { type: 'thread'; thread: AgentPaneThread; groupKey: string }

export const ACTIVITY_HEADER_ROW_ESTIMATE = 32
export const ACTIVITY_THREAD_ROW_COMPACT_ESTIMATE = 96
export const ACTIVITY_THREAD_ROW_FULL_ESTIMATE = 116

/**
 * Flatten grouped threads into a single virtualizable row list, honoring
 * collapsed groups (their thread rows are omitted entirely).
 */
export function buildActivityVirtualItems(args: {
  groups: readonly ActivityThreadGroup[]
  groupBy: ActivityGroupBy
  collapsedGroupKeys: ReadonlySet<string>
}): ActivityVirtualItemDescriptor[] {
  const items: ActivityVirtualItemDescriptor[] = []
  for (const group of args.groups) {
    if (args.groupBy !== 'none') {
      items.push({ type: 'header', group })
      if (args.collapsedGroupKeys.has(group.key)) {
        continue
      }
    }
    for (const thread of group.threads) {
      items.push({ type: 'thread', thread, groupKey: group.key })
    }
  }
  return items
}

/** Stable per-row key: group key for headers, paneKey for threads. */
export function getActivityVirtualItemKey(item: ActivityVirtualItemDescriptor): string {
  return item.type === 'header' ? `h:${item.group.key}` : `t:${item.thread.paneKey}`
}

export function estimateActivityVirtualItemSize(
  item: ActivityVirtualItemDescriptor | undefined,
  compactMode: boolean
): number {
  if (!item || item.type === 'header') {
    return ACTIVITY_HEADER_ROW_ESTIMATE
  }
  return compactMode ? ACTIVITY_THREAD_ROW_COMPACT_ESTIMATE : ACTIVITY_THREAD_ROW_FULL_ESTIMATE
}

/** Index of the selected thread's row, or null; kept mounted so activation and focus survive scrolling. */
export function findActivityThreadItemIndex(
  items: readonly ActivityVirtualItemDescriptor[],
  paneKey: string | null
): number | null {
  if (paneKey === null) {
    return null
  }
  const index = items.findIndex((item) => item.type === 'thread' && item.thread.paneKey === paneKey)
  return index === -1 ? null : index
}

export function findNextActivityThreadItemIndex(
  items: readonly ActivityVirtualItemDescriptor[],
  currentIndex: number | null,
  direction: 1 | -1
): number | null {
  const start = currentIndex ?? (direction === 1 ? -1 : items.length)
  for (let index = start + direction; index >= 0 && index < items.length; index += direction) {
    if (items[index]?.type === 'thread') {
      return index
    }
  }
  return null
}

/** Indexes of header rows, for sticky-header resolution. */
export function getActivityHeaderItemIndexes(
  items: readonly ActivityVirtualItemDescriptor[]
): number[] {
  const indexes: number[] = []
  items.forEach((item, index) => {
    if (item.type === 'header') {
      indexes.push(index)
    }
  })
  return indexes
}

export function getActivityVirtualRange(
  range: Range,
  headerIndexes: readonly number[],
  selectedIndex: number | null,
  keyboardIndex: number | null
): number[] {
  const activeHeader = getActiveStickyHeaderIndex(headerIndexes, range.startIndex)
  const previousHeader =
    activeHeader === null ? null : getPreviousStickyHeaderIndex(headerIndexes, activeHeader)
  const indexes = new Set(defaultRangeExtractor(range))
  for (const index of [activeHeader, previousHeader, selectedIndex, keyboardIndex]) {
    if (index !== null) {
      indexes.add(index)
    }
  }
  return Array.from(indexes).sort((a, b) => a - b)
}
