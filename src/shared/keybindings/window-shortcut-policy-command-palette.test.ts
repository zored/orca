import { expect, it } from 'vitest'
import { resolveWindowShortcutAction } from './window-shortcut-policy'

it('routes command palette independently of Search Everything and respects user overrides', () => {
  const commandChord = { code: 'KeyP', key: 'P', shiftKey: true, metaKey: true }
  expect(resolveWindowShortcutAction(commandChord, 'darwin')).toEqual({
    type: 'toggleWorktreePalette',
    commandsOnly: true
  })
  expect(
    resolveWindowShortcutAction(commandChord, 'darwin', { 'worktree.commands': [] })
  ).toBeNull()
  expect(resolveWindowShortcutAction({ code: 'KeyK', key: 'k', metaKey: true }, 'darwin')).toEqual({
    type: 'toggleWorktreePalette'
  })
})
