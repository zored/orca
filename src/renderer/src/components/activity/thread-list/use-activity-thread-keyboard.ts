import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject
} from 'react'
import type { Virtualizer } from '@tanstack/react-virtual'
import { isImeOwnedKeyboardEvent } from '@/lib/text-input/ime/ime-composition-keyboard-event'
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
  const awaitingFocus = useRef(false)

  const focusThreadAtIndex = useCallback(
    (index: number) => {
      const target = scrollContainerRef.current?.querySelector<HTMLElement>(
        `[data-index="${index}"] [data-activity-thread-primary]`
      )
      target?.focus({ preventScroll: true })
      return target !== null && target !== undefined
    },
    [scrollContainerRef]
  )
  useLayoutEffect(() => {
    if (
      awaitingFocus.current &&
      keyboardTargetIndex !== null &&
      (document.activeElement === document.body ||
        scrollContainerRef.current?.contains(document.activeElement))
    ) {
      focusThreadAtIndex(keyboardTargetIndex)
    }
    awaitingFocus.current = false
  }, [focusThreadAtIndex, keyboardTargetIndex, scrollContainerRef])

  const handleListKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
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
    if (key === 'Enter' && target === currentTarget && selectedItemIndex !== null) {
      const item = virtualItems[selectedItemIndex]
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
    const rowIndex = target.closest<HTMLElement>('[data-index]')?.dataset.index
    const index = rowIndex === undefined ? selectedItemIndex : Number(rowIndex)
    const next = findNextActivityThreadItemIndex(virtualItems, index, key === 'ArrowDown' ? 1 : -1)
    const item = next === null ? null : virtualItems[next]
    if (next !== null && item?.type === 'thread') {
      scrollToIndex(next, { align: 'auto' })
      awaitingFocus.current = !focusThreadAtIndex(next)
      setKeyboardTarget(item.thread.paneKey)
    }
  }

  return { selectedItemIndex, keyboardTargetIndex, handleListKeyDown }
}
