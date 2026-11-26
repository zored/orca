// @vitest-environment happy-dom

import { act, renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { stubBots } from '@/component-fixtures/fixture-bots'
import { createWorktreePaletteRequestGuard } from '@/lib/workspace/search/worktrees/worktree-palette-create-action'
import { useAppStore } from '@/store'
import { makeFolderWorkspace } from '@/store/folder-workspaces/folder-workspace.test-fixture'
import type { Bot } from '../../../../shared/bot-types'
import { useWorktreeJumpPaletteController } from './use-worktree-jump-palette-controller'

function makeBot(id: string, name: string): Bot {
  return {
    id,
    name,
    hostId: 'local',
    folder: id,
    folderWorkspaceId: id,
    agent: 'claude',
    avatar: null,
    paused: false,
    notifications: { needsPermission: true, taskComplete: true, couldNotFinish: true },
    members: [],
    slack: null,
    linear: null,
    github: null,
    chatSessionId: null,
    createdAt: 1,
    updatedAt: 1
  }
}

it('filters bots by scoped text without replacing the held global query', async () => {
  const initial = useAppStore.getState()
  vi.stubGlobal('api', {})
  const bots = [makeBot('orchard', 'Orchard'), makeBot('marina', 'Marina')]
  stubBots(bots)
  useAppStore.setState({
    folderWorkspaces: bots.map((bot) =>
      makeFolderWorkspace({
        id: bot.folderWorkspaceId,
        name: bot.name,
        folderPath: `/test/${bot.id}`
      })
    )
  })
  const createLookupGuard = createWorktreePaletteRequestGuard()
  const { result, unmount } = renderHook(() =>
    useWorktreeJumpPaletteController({
      visible: false,
      lingering: false,
      commandsOnly: false,
      createLookupGuard
    })
  )
  const botNames = () =>
    result.current.extraSections.flatMap(({ items }) => items.map(({ result: item }) => item.title))
  try {
    await act(async () => result.current.handleQueryChange('Marina'))
    expect(botNames()).toEqual(['Marina'])
    await act(async () => result.current.botScope.enterBotScope(''))
    expect(botNames().sort()).toEqual(['Marina', 'Orchard'])
    expect(result.current.botScope.scoped).toBe(true)
    await act(async () => result.current.handleQueryChange('Orchard'))
    expect(botNames()).toEqual(['Orchard'])
    expect(result.current.scopeHeldQuery).toBe('Marina')
    await act(async () => result.current.botScope.selectAction('show-everything'))
    expect(result.current.query).toBe('@Orchard')
    expect(result.current.botScope.scoped).toBe(false)
  } finally {
    unmount()
    stubBots([])
    useAppStore.setState(initial, true)
    vi.unstubAllGlobals()
  }
})
