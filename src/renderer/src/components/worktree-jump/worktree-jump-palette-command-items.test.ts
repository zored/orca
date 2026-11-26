import { expect, it } from 'vitest'
import {
  registerAppCommandDispatcher,
  getAvailableAppCommands
} from '@/lib/app-commands/app-command-dispatch'
import type { CmdJQuickActionContext } from '@/components/cmd-j/quick-action-context'
import type { ActivePluginCommand } from '@/store/plugins/catalog/plugin-contribution-catalog'
import { getWorktreeCommandItems } from './worktree-jump-palette-command-items'

it('excludes out-of-context commands and dispatches the selected registered action once', async () => {
  const context: CmdJQuickActionContext = {
    activeView: 'terminal',
    activeWorktreeId: null,
    activeWorktree: null,
    activeGroupId: null,
    isLoading: false,
    sshStatus: null,
    runtimeMode: 'local-desktop',
    openNewBrowserTab: async () => {},
    openBrowserUrl: async () => {},
    openNewMarkdownFile: async () => {},
    openNewTerminalTab: async () => {},
    openCreateWorkspace: () => {},
    deleteActiveWorkspace: () => {},
    openAddQuickCommand: () => {}
  }
  const globalCommand: ActivePluginCommand = {
    id: 'global',
    title: 'Global plugin command',
    pluginKey: 'example',
    pluginName: 'Example',
    context: 'global',
    handler: { type: 'worker' },
    keybindings: []
  }
  const pluginCommands: ActivePluginCommand[] = [
    globalCommand,
    { ...globalCommand, id: 'workspace', title: 'Workspace plugin command', context: 'workspace' }
  ]
  const dispatched: string[] = []
  const unregister = registerAppCommandDispatcher(
    (actionId, source) => {
      dispatched.push(`${actionId}:${source}`)
      return true
    },
    () => ['sidebar.revealCurrent', 'sidebar.activity.toggle']
  )

  try {
    const initial = getWorktreeCommandItems('', getAvailableAppCommands(), pluginCommands, context)
    expect(initial.map(({ id }) => id)).toEqual([
      'quick-action:sidebar.revealCurrent',
      'quick-action:sidebar.activity.toggle',
      'quick-action:plugin:example/global'
    ])
    const matches = getWorktreeCommandItems(
      'reveal',
      getAvailableAppCommands(),
      pluginCommands,
      context
    )
    expect(matches.map(({ id }) => id)).toEqual(['quick-action:sidebar.revealCurrent'])
    expect(dispatched).toEqual([])
    await expect(matches[0]?.result.run(context)).resolves.toEqual({ status: 'ok' })
    expect(dispatched).toEqual(['sidebar.revealCurrent:app-palette'])
  } finally {
    unregister()
  }
})
