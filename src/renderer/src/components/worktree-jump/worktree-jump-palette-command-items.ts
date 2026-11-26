import { Command } from 'lucide-react'
import { localizedKeybindingTitle } from '@/components/settings/shortcuts/keybinding-title-copy'
import { buildPluginQuickActions } from '@/components/cmd-j/plugin-quick-actions'
import { buildCmdJActionResults, rankCmdJMiddleResults } from '@/components/cmd-j/palette-results'
import type { CmdJQuickActionContext } from '@/components/cmd-j/quick-action-context'
import { dispatchAppCommand } from '@/lib/app-commands/app-command-dispatch'
import type { ActivePluginCommand } from '@/store/plugins/catalog/plugin-contribution-catalog'
import { DEFINITIONS_BY_ID } from '../../../../shared/keybindings/definitions'
import type { KeybindingActionId } from '../../../../shared/keybindings/types'
import type { QuickActionPaletteItem } from './worktree-jump-palette-model'

export function getWorktreeCommandItems(
  query: string,
  builtInCommandIds: readonly KeybindingActionId[],
  pluginCommands: readonly ActivePluginCommand[],
  context: CmdJQuickActionContext
): QuickActionPaletteItem[] {
  const actionResults = buildCmdJActionResults([
    ...builtInCommandIds.map((actionId) => {
      const definition = DEFINITIONS_BY_ID.get(actionId)!
      return {
        id: actionId,
        kind: 'action' as const,
        title: localizedKeybindingTitle(definition),
        description: '',
        icon: Command,
        verbKeywords: [definition.title, ...definition.searchKeywords],
        isAvailable: () => ({ available: true as const }),
        run: async () =>
          dispatchAppCommand(actionId, 'app-palette')
            ? { status: 'ok' as const }
            : { status: 'unavailable' as const, reason: 'client-action-unsupported' as const }
      }
    }),
    ...buildPluginQuickActions(pluginCommands).filter(
      (action) => action.isAvailable(context).available
    )
  ])
  const results = query.trim()
    ? rankCmdJMiddleResults({
        query,
        actionResults,
        settingsResults: [],
        allowSingleCharacter: true
      })
    : actionResults.map((action) => ({ ...action, qualityClass: 'visible-prefix' as const }))
  return results.flatMap((result) =>
    result.kind === 'action'
      ? [
          {
            id: `quick-action:${result.id}`,
            type: 'quick-action',
            result: { ...result, sourceQuery: query.trim() }
          }
        ]
      : []
  )
}
