import { isKeybindingActionId } from '../../../../shared/keybindings/definitions'
import type { KeybindingActionId } from '../../../../shared/keybindings/types'

export type AppCommandSource =
  | 'app-palette'
  | 'plugin-keybinding'
  | 'plugin-palette'
  | 'plugin-host'
  | 'plugin-replacement'
export type AppCommandDispatcher = (
  actionId: KeybindingActionId,
  source: AppCommandSource
) => boolean

let currentDispatcher: AppCommandDispatcher | null = null
let readAvailableCommands: (() => KeybindingActionId[]) | null = null

export function registerAppCommandDispatcher(
  dispatcher: AppCommandDispatcher,
  availableCommands: () => KeybindingActionId[]
): () => void {
  currentDispatcher = dispatcher
  readAvailableCommands = availableCommands
  return () => {
    if (currentDispatcher === dispatcher) {
      currentDispatcher = null
      readAvailableCommands = null
    }
  }
}

export function getAvailableAppCommands(): KeybindingActionId[] {
  return readAvailableCommands?.() ?? []
}

export function dispatchAppCommand(actionId: string, source: AppCommandSource): boolean {
  return isKeybindingActionId(actionId) && currentDispatcher !== null
    ? currentDispatcher(actionId, source)
    : false
}
