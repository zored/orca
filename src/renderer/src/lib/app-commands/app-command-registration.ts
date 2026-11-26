import { registerAppCommandDispatcher } from './app-command-dispatch'
import { createAppCommandHandlers, type AppShortcutState } from './app-command-handlers'

export function registerAppShortcutCommands(readShortcutState: () => AppShortcutState): () => void {
  return registerAppCommandDispatcher(
    (actionId, source) =>
      createAppCommandHandlers(
        readShortcutState(),
        undefined,
        'app',
        source === 'plugin-host',
        source === 'app-palette' ? 'run' : undefined
      ).get(actionId)?.() ?? false,
    () => {
      const handlers = createAppCommandHandlers(
        readShortcutState(),
        undefined,
        'app',
        false,
        'preview'
      )
      return [...handlers].filter(([, available]) => available()).map(([actionId]) => actionId)
    }
  )
}
