import {
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject
} from 'react'
import type { Virtualizer } from '@tanstack/react-virtual'
import { hasVisibleOverlay } from '@/lib/overlay-interaction/visible-overlay'
import { INPUT_PROXY_SELECTOR, isEditableTarget } from '@/lib/text-input/focus/editable-target'
import { isImeOwnedKeyboardEvent } from '@/lib/text-input/ime/ime-composition-keyboard-event'
import { useAppStore } from '@/store'
import type { AgentPaneThread } from '../threads/activity-thread-types'
import {
  findActivityThreadItemIndex,
  findNextActivityThreadItemIndex,
  type ActivityVirtualItemDescriptor
} from './activity-thread-virtual-items'

export function useActivityThreadKeyboard({
  virtualItems,
  selectedPaneKey,
  scrollContainerRef,
  onSelectThread
}: {
  virtualItems: readonly ActivityVirtualItemDescriptor[]
  selectedPaneKey: string | null
  scrollContainerRef: RefObject<HTMLDivElement | null>
  onSelectThread: (thread: AgentPaneThread) => void
}) {
  const selectedItemIndex = useMemo(
    () => findActivityThreadItemIndex(virtualItems, selectedPaneKey),
    [virtualItems, selectedPaneKey]
  )
  const [keyboardTarget, setKeyboardTarget] = useState<string | null>(null)
  const keyboardTargetIndex = findActivityThreadItemIndex(virtualItems, keyboardTarget)
  const pendingFocus = useRef<string | null>(null)

  const focusThreadAtIndex = useCallback(
    (index: number) => {
      const target = scrollContainerRef.current?.querySelector<HTMLElement>(
        `[data-index="${index}"] [data-activity-thread-primary]`
      )
      target?.focus({ preventScroll: true })
      return target != null && document.activeElement === target
    },
    [scrollContainerRef]
  )
  useLayoutEffect(() => {
    if (pendingFocus.current === null) {
      return
    }
    if (
      keyboardTargetIndex === null ||
      document.activeElement !== scrollContainerRef.current ||
      focusThreadAtIndex(keyboardTargetIndex)
    ) {
      pendingFocus.current = null
    }
  })

  const navigateThreads = (
    event: Pick<KeyboardEvent, 'key' | 'target' | 'preventDefault'>,
    scrollToIndex: Virtualizer<HTMLDivElement, Element>['scrollToIndex']
  ): void => {
    const row =
      event.target instanceof Element && event.target.closest('[data-activity-thread-primary]')
    const rowIndex =
      row && scrollContainerRef.current?.contains(row)
        ? row.closest<HTMLElement>('[data-index]')?.dataset.index
        : undefined
    const index =
      rowIndex === undefined
        ? (findActivityThreadItemIndex(virtualItems, pendingFocus.current) ?? selectedItemIndex)
        : Number(rowIndex)
    const next = findNextActivityThreadItemIndex(
      virtualItems,
      index,
      event.key === 'ArrowDown' ? 1 : -1
    )
    const item = next === null ? null : virtualItems[next]
    if (next === null || item?.type !== 'thread') {
      return
    }
    event.preventDefault()
    scrollToIndex(next, { align: 'auto' })
    pendingFocus.current = null
    if (!focusThreadAtIndex(next)) {
      scrollContainerRef.current?.focus({ preventScroll: true })
      pendingFocus.current = item.thread.paneKey
    }
    setKeyboardTarget(item.thread.paneKey)
  }

  const handleListKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
    scrollToIndex: Virtualizer<HTMLDivElement, Element>['scrollToIndex']
  ): void => {
    const { key, target, currentTarget } = event
    if (
      event.defaultPrevented ||
      isImeOwnedKeyboardEvent(event) ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      !(target instanceof HTMLElement) ||
      (target !== currentTarget && !target.hasAttribute('data-activity-thread-primary'))
    ) {
      return
    }
    if (key === 'Enter' && target === currentTarget) {
      const index =
        findActivityThreadItemIndex(virtualItems, pendingFocus.current) ?? selectedItemIndex
      const item = index === null ? null : virtualItems[index]
      if (item?.type === 'thread') {
        event.preventDefault()
        onSelectThread(item.thread)
      }
      return
    }
    if (key !== 'ArrowDown' && key !== 'ArrowUp') {
      return
    }
    event.preventDefault()
    navigateThreads(event, scrollToIndex)
  }

  return { selectedItemIndex, keyboardTargetIndex, handleListKeyDown, navigateThreads }
}

export function useActivityNavigationShortcut(
  scrollContainerRef: RefObject<HTMLDivElement | null>,
  fullPage: boolean,
  navigateThreads: (event: KeyboardEvent) => void
): void {
  const handleActivityShortcut = useEffectEvent((event: KeyboardEvent) => {
    const list = scrollContainerRef.current
    if (
      event.defaultPrevented ||
      !event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') ||
      isImeOwnedKeyboardEvent(event) ||
      isEditableTarget(event.target) ||
      (event.target instanceof Element &&
        event.target.closest(`.xterm, ${INPUT_PROXY_SELECTOR}`)) ||
      (!fullPage && useAppStore.getState().activeView === 'activity') ||
      !list?.checkVisibility({ visibilityProperty: true }) ||
      list.closest('[inert], [aria-hidden="true"]') ||
      hasVisibleOverlay({ ignoreDismissed: true, ignoreContaining: list })
    ) {
      return
    }
    navigateThreads(event)
  })
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => handleActivityShortcut(event)
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
