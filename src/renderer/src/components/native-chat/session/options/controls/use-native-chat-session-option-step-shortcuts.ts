import { useEffect, useRef } from 'react'
import { keybindingMatchesAction } from '../../../../../../../shared/keybindings/matching'
import type { KeybindingActionId } from '../../../../../../../shared/keybindings/types'
import type {
  SessionOptionDescriptor,
  SessionOptionValue
} from '../../../../../../../shared/native-chat/input/native-chat-session-options'
import { getShortcutPlatform } from '@/lib/keyboard/shortcut-platform'
import { addAppKeyListener, removeAppKeyListener } from '@/lib/keyboard/app-keyboard-router'
import { useAppStore } from '../../../../../store/index'
import {
  steppedSessionOptionValue,
  type SessionOptionStep
} from './native-chat-session-option-step'

const STEP_ACTIONS: readonly {
  actionId: KeybindingActionId
  target: 'model' | 'effort'
  step: SessionOptionStep
}[] = [
  { actionId: 'chat.nextModel', target: 'model', step: 1 },
  { actionId: 'chat.previousModel', target: 'model', step: -1 },
  { actionId: 'chat.nextEffort', target: 'effort', step: 1 },
  { actionId: 'chat.previousEffort', target: 'effort', step: -1 }
]

type StepShortcutArgs = {
  model: SessionOptionDescriptor
  options: readonly SessionOptionDescriptor[]
  isWorking: boolean
  pendingIds: ReadonlySet<string>
  onSet: (descriptor: SessionOptionDescriptor, value: SessionOptionValue) => void
  /** The picker's trigger; its chat root bounds which key events this picker answers. */
  triggerRef: React.RefObject<HTMLElement | null>
}

/** Model and effort step keys for the chat that holds focus, through the picker's own write path. */
export function useNativeChatSessionOptionStepShortcuts(args: StepShortcutArgs): void {
  const latest = useRef(args)
  useEffect(() => {
    latest.current = args
  })
  useEffect(() => {
    const platform = getShortcutPlatform()
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || !(event.target instanceof Node)) {
        return
      }
      const { model, options, isWorking, pendingIds, onSet, triggerRef } = latest.current
      const root = triggerRef.current?.closest('[data-native-chat-root]')
      if (!root?.contains(event.target)) {
        return
      }
      const keybindings = useAppStore.getState().keybindings
      const action = STEP_ACTIONS.find((candidate) =>
        keybindingMatchesAction(candidate.actionId, event, platform, keybindings)
      )
      if (!action) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      const descriptor =
        action.target === 'model'
          ? model
          : options.find((option) => option.category === 'thought_level')
      if (
        event.repeat ||
        !descriptor?.settable ||
        descriptor.action ||
        pendingIds.has(descriptor.id) ||
        (isWorking && descriptor.transport !== 'agent-session')
      ) {
        return
      }
      const value = steppedSessionOptionValue(descriptor, action.step)
      if (value !== null) {
        onSet(descriptor, value)
      }
    }
    addAppKeyListener('keydown', onKeyDown)
    return () => removeAppKeyListener('keydown', onKeyDown)
  }, [])
}
