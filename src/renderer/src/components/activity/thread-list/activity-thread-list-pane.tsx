import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  measureElement as measureVirtualElementSize,
  observeElementRect,
  useVirtualizer,
  type Range
} from '@tanstack/react-virtual'
import { createPortal } from 'react-dom'
import { SectionCollapseAllButton } from '../../sidebar/worktree-list/controls/SectionCollapseAllButton'
import { cn } from '@/lib/class-names'
import { useTranslate } from '@/i18n/use-translate'
import { ActivityThreadListToolbar } from './activity-thread-list-toolbar'
import { getActiveStickyHeaderIndexForScroll } from '../../sidebar/worktree-list/viewport/virtual-rows'
import { ActivityThreadVirtualRow } from './activity-thread-virtual-row'
import { ActivityThreadListResizeHandle } from './activity-thread-list-resize-handle'
import {
  buildActivityVirtualItems,
  estimateActivityVirtualItemSize,
  getActivityHeaderItemIndexes,
  getActivityVirtualRange,
  getActivityVirtualItemKey,
  ACTIVITY_HEADER_ROW_ESTIMATE
} from './activity-thread-virtual-items'
import {
  ActivityThreadCollapseContext,
  toggleActivityGroups
} from './activity-thread-collapse-context'
import { useActivityThreadKeyboard } from './use-activity-thread-keyboard'
import { useActivityThreadSelection } from './use-activity-thread-selection'
import type {
  ActivityGroupBy,
  ThreadReadFilter
} from '../../../../../shared/agent-status/presentation/agents-view-thread-filters'
import type { ActivityThreadGroup, AgentPaneThread } from '../threads/activity-thread-types'

const ZERO_RECT_FALLBACK_VIEWPORT = { width: 320, height: 600 }
const observeActivityListRect: typeof observeElementRect = (instance, cb) =>
  observeElementRect(instance, (rect) => {
    cb(rect.height > 0 ? rect : ZERO_RECT_FALLBACK_VIEWPORT)
  })

// Allow briefly undersized content to hydrate before restoring scroll; abandon stale offsets before later growth can yank the viewport.
const DEFERRED_SCROLL_RESTORE_WINDOW_MS = 3000

export function ActivityThreadListPane({
  threadListRef,
  threadListWidth,
  activityFilterInputRef,
  query,
  onQueryChange,
  groupBy,
  onGroupByChange,
  readFilter,
  onReadFilterChange,
  compactMode,
  showChildAgents,
  hasUnreadThreads,
  onCompactModeChange,
  onShowChildAgentsChange,
  onMarkAllThreadsRead,
  hasCompletedThreads,
  onClearCompleted,
  visibleThreadGroups,
  visibleThreadCount,
  selectedPaneKey,
  onSelectThread,
  onJumpToWorkspace,
  onMarkThreadRead,
  onMarkThreadUnread,
  onMarkThreadsRead,
  onMarkThreadsUnread,
  canJumpToWorkspace,
  allowMarkUnreadWhenSelected = false,
  showJumpAction = true,
  isThreadListResizing,
  onResizeStart,
  showFilterControls = true,
  showOptionsMenu = true,
  showInlineActions = true,
  collapseAllTarget,
  scrollTopRef
}: {
  threadListRef?: React.RefObject<HTMLDivElement | null>
  threadListWidth?: number
  activityFilterInputRef: React.RefObject<HTMLInputElement | null>
  query: string
  onQueryChange: (query: string) => void
  groupBy: ActivityGroupBy
  onGroupByChange: (groupBy: ActivityGroupBy) => void
  readFilter: ThreadReadFilter
  onReadFilterChange: (readFilter: ThreadReadFilter) => void
  compactMode: boolean
  showChildAgents?: boolean
  hasUnreadThreads: boolean
  onCompactModeChange: (compactMode: boolean) => void
  onShowChildAgentsChange?: (showChildAgents: boolean) => void
  onMarkAllThreadsRead?: () => void
  hasCompletedThreads?: boolean
  onClearCompleted?: () => void
  visibleThreadGroups: ActivityThreadGroup[]
  visibleThreadCount: number
  selectedPaneKey: string | null
  onSelectThread: (thread: AgentPaneThread) => void
  onJumpToWorkspace: (thread: AgentPaneThread) => void
  onMarkThreadRead: (thread: AgentPaneThread) => void
  onMarkThreadUnread: (thread: AgentPaneThread) => void
  onMarkThreadsRead: (threads: readonly AgentPaneThread[]) => void
  onMarkThreadsUnread: (threads: readonly AgentPaneThread[]) => void
  canJumpToWorkspace: (thread: AgentPaneThread) => boolean
  allowMarkUnreadWhenSelected?: boolean
  showJumpAction?: boolean
  isThreadListResizing?: boolean
  onResizeStart?: React.MouseEventHandler<HTMLDivElement>
  showFilterControls?: boolean
  showOptionsMenu?: boolean
  showInlineActions?: boolean
  collapseAllTarget?: HTMLElement | null
  /** Optional view-local scroll memory; updated without triggering React renders. */
  scrollTopRef?: React.MutableRefObject<number>
}): React.JSX.Element {
  const t = useTranslate()
  const [internalCollapsedGroupKeys, setInternalCollapsedGroupKeys] = useState<ReadonlySet<string>>(
    () => new Set()
  )
  const contextCollapse = useContext(ActivityThreadCollapseContext)
  const effectiveCollapsedGroupKeys =
    contextCollapse?.collapsedGroupKeys ?? internalCollapsedGroupKeys
  const setCollapsedGroupKeys =
    contextCollapse?.setCollapsedGroupKeys ?? setInternalCollapsedGroupKeys
  const handleToggleGroup = (groupKey: string) =>
    setCollapsedGroupKeys((prev) => toggleActivityGroups(prev, [groupKey]))
  const collapseAllButton =
    groupBy !== 'none' && visibleThreadGroups.length > 0 ? (
      <SectionCollapseAllButton
        allCollapsed={visibleThreadGroups.every(({ key }) => effectiveCollapsedGroupKeys.has(key))}
        onToggle={() =>
          setCollapsedGroupKeys((prev) =>
            toggleActivityGroups(
              prev,
              visibleThreadGroups.map(({ key }) => key)
            )
          )
        }
        collapseLabel={t('activity.groups.collapseAll', 'Collapse all activity groups')}
        expandLabel={t('activity.groups.expandAll', 'Expand all activity groups')}
      />
    ) : null

  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const hasRestoredScrollRef = useRef(false)
  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (!scrollTopRef) {
        return
      }
      const scrollTop = event.currentTarget.scrollTop
      // A clamp-to-0 fired before the deferred restore must not wipe the saved offset.
      if (!hasRestoredScrollRef.current) {
        if (scrollTop === 0) {
          return
        }
        hasRestoredScrollRef.current = true
      }
      scrollTopRef.current = scrollTop
    },
    [scrollTopRef]
  )
  const virtualItems = useMemo(
    () =>
      buildActivityVirtualItems({
        groups: visibleThreadGroups,
        groupBy,
        collapsedGroupKeys: effectiveCollapsedGroupKeys
      }),
    [visibleThreadGroups, groupBy, effectiveCollapsedGroupKeys]
  )
  const headerItemIndexes = useMemo(
    () => getActivityHeaderItemIndexes(virtualItems),
    [virtualItems]
  )
  const { selectedKeys, handleSelectThread, getContextMenuTargets } = useActivityThreadSelection({
    virtualItems,
    scrollContainerRef,
    onSelectThread
  })
  const canMarkThreadUnread = useCallback(
    (thread: AgentPaneThread) => allowMarkUnreadWhenSelected || thread.paneKey !== selectedPaneKey,
    [allowMarkUnreadWhenSelected, selectedPaneKey]
  )
  const { selectedItemIndex, keyboardTargetIndex, handleListKeyDown } = useActivityThreadKeyboard({
    virtualItems,
    selectedPaneKey,
    scrollContainerRef,
    onSelectThread
  })

  // Key getItemKey to virtualItems: per-render closures invalidate measurements; a fully stable closure misses same-count reorders.
  const getItemKey = useCallback(
    (index: number) => {
      const item = virtualItems[index]
      return item ? getActivityVirtualItemKey(item) : `__stale_${index}`
    },
    [virtualItems]
  )
  const virtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: (index) => estimateActivityVirtualItemSize(virtualItems[index], compactMode),
    getItemKey,
    measureElement: (element, entry, instance) => {
      const measured = measureVirtualElementSize(element, entry, instance)
      if (measured > 0) {
        return measured
      }
      const index = Number.parseInt(element.getAttribute('data-index') ?? '', 10)
      return estimateActivityVirtualItemSize(
        Number.isNaN(index) ? undefined : virtualItems[index],
        compactMode
      )
    },
    rangeExtractor: useCallback(
      (range: Range) =>
        getActivityVirtualRange(range, headerItemIndexes, selectedItemIndex, keyboardTargetIndex),
      [headerItemIndexes, selectedItemIndex, keyboardTargetIndex]
    ),
    overscan: 8,
    scrollPaddingStart: groupBy === 'none' ? 0 : ACTIVITY_HEADER_ROW_ESTIMATE,
    observeElementRect: observeActivityListRect,
    useFlushSync: false
  })

  // Row heights differ between densities; drop stale measurements on toggle (not on mount).
  const measuredCompactModeRef = useRef(compactMode)
  useEffect(() => {
    if (measuredCompactModeRef.current === compactMode) {
      return
    }
    measuredCompactModeRef.current = compactMode
    virtualizer.measure()
  }, [virtualizer, compactMode])

  // Wait for content to contain the saved offset; pre-hydration clamping would consume the one restore.
  const totalSize = virtualizer.getTotalSize()
  const restoreArmedAtRef = useRef<number | null>(null)
  useEffect(() => {
    if (!scrollTopRef || hasRestoredScrollRef.current) {
      return
    }
    if (restoreArmedAtRef.current === null) {
      restoreArmedAtRef.current = Date.now()
    } else if (Date.now() - restoreArmedAtRef.current > DEFERRED_SCROLL_RESTORE_WINDOW_MS) {
      // Abandon offsets the shrunken list cannot hold before later growth can yank the viewport.
      hasRestoredScrollRef.current = true
      scrollTopRef.current = 0
      return
    }
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) {
      return
    }
    // Use max scroll offset, not content height, or a taller viewport clamps to zero and consumes the restore.
    const maxScrollTop = Math.max(0, totalSize - scrollContainer.clientHeight)
    if (scrollTopRef.current > maxScrollTop) {
      return
    }
    scrollContainer.scrollTop = scrollTopRef.current
    hasRestoredScrollRef.current = true
  }, [scrollTopRef, totalSize])

  const scrollOffset = virtualizer.scrollOffset ?? 0
  const activeStickyHeaderIndex =
    groupBy !== 'none'
      ? getActiveStickyHeaderIndexForScroll({
          rangeStartIndex: virtualizer.range?.startIndex ?? 0,
          scrollOffset,
          stickyHeaderIndexes: headerItemIndexes,
          virtualItems: virtualizer.getVirtualItems()
        })
      : null

  const resizable = onResizeStart !== undefined
  return (
    <aside
      ref={threadListRef}
      className={cn(
        'relative flex min-h-0 flex-col',
        resizable ? 'shrink-0 border-r border-border' : 'min-w-0 flex-1'
      )}
      style={resizable ? { width: threadListWidth } : undefined}
    >
      {collapseAllTarget && collapseAllButton
        ? createPortal(collapseAllButton, collapseAllTarget)
        : null}
      <ActivityThreadListToolbar
        activityFilterInputRef={activityFilterInputRef}
        query={query}
        onQueryChange={onQueryChange}
        groupBy={groupBy}
        onGroupByChange={onGroupByChange}
        readFilter={readFilter}
        onReadFilterChange={onReadFilterChange}
        compactMode={compactMode}
        showChildAgents={showChildAgents}
        hasUnreadThreads={hasUnreadThreads}
        onCompactModeChange={onCompactModeChange}
        onShowChildAgentsChange={onShowChildAgentsChange}
        onMarkAllThreadsRead={onMarkAllThreadsRead}
        hasCompletedThreads={hasCompletedThreads}
        onClearCompleted={onClearCompleted}
        resizable={resizable}
        showFilterControls={showFilterControls}
        showOptionsMenu={showOptionsMenu}
        showInlineActions={showInlineActions}
        collapseAllButton={collapseAllTarget ? undefined : collapseAllButton}
      />
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollContainerRef}
          tabIndex={0}
          role="region"
          aria-label={t('activity.list.label', 'Activity threads')}
          onKeyDown={(event) => handleListKeyDown(event, virtualizer.scrollToIndex)}
          onScroll={scrollTopRef ? handleScroll : undefined}
          className="h-full overflow-y-auto overflow-x-hidden px-1.5 pb-1.5 pt-px scrollbar-sleek focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-ring"
        >
          <div
            className="relative w-full"
            style={{ height: virtualizer.getTotalSize() }}
            data-activity-virtual-list=""
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const item = virtualItems[virtualRow.index]
              if (!item) {
                return null
              }
              const isActiveSticky =
                item.type === 'header' && virtualRow.index === activeStickyHeaderIndex
              return (
                <div
                  key={virtualRow.key}
                  ref={virtualizer.measureElement}
                  data-index={virtualRow.index}
                  data-activity-sticky-header={item.type === 'header' ? '' : undefined}
                  data-activity-sticky-header-active={isActiveSticky ? '' : undefined}
                  className={cn(
                    'left-0 right-0 w-full',
                    isActiveSticky
                      ? cn(
                          'sticky -top-px z-20',
                          resizable ? 'bg-background' : 'bg-worktree-sidebar'
                        )
                      : 'absolute top-0'
                  )}
                  style={
                    isActiveSticky ? undefined : { transform: `translateY(${virtualRow.start}px)` }
                  }
                >
                  <ActivityThreadVirtualRow
                    item={item}
                    collapsed={
                      item.type === 'header' && effectiveCollapsedGroupKeys.has(item.group.key)
                    }
                    onToggleGroup={handleToggleGroup}
                    selectedPaneKey={selectedPaneKey}
                    multiSelectedKeys={selectedKeys}
                    onSelectThread={handleSelectThread}
                    onOpenThread={onSelectThread}
                    getContextMenuTargets={getContextMenuTargets}
                    onJumpToWorkspace={onJumpToWorkspace}
                    onMarkThreadRead={onMarkThreadRead}
                    onMarkThreadUnread={onMarkThreadUnread}
                    onMarkThreadsRead={onMarkThreadsRead}
                    onMarkThreadsUnread={onMarkThreadsUnread}
                    canJumpToWorkspace={canJumpToWorkspace}
                    canMarkThreadUnread={canMarkThreadUnread}
                    compactMode={compactMode}
                    showJumpAction={showJumpAction}
                    groupBy={groupBy}
                  />
                </div>
              )
            })}
          </div>
          {visibleThreadCount === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              {t(
                'auto.components.activity.ActivityPrototypePage.7cd632006b',
                'No agent activity matches these filters.'
              )}
            </div>
          ) : null}
        </div>
      </div>
      {resizable ? (
        <ActivityThreadListResizeHandle
          isResizing={isThreadListResizing}
          onResizeStart={onResizeStart}
        />
      ) : null}
    </aside>
  )
}
