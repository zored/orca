import { expect, it } from 'vitest'
import { makeWorktree } from '@/store/slices/worktrees/worktree.test-fixture'
import { makeTab } from '@/store/terminals/testing/terminal-tab.test-fixture'
import type { AgentPaneThread } from '../threads/activity-thread-types'
import {
  buildActivityVirtualItems,
  findActivityThreadItemIndex,
  findNextActivityThreadItemIndex,
  getActivityHeaderItemIndexes,
  getActivityVirtualRange
} from './activity-thread-virtual-items'

function thread(paneKey: string): AgentPaneThread {
  const worktree = makeWorktree({ id: 'workspace', repoId: 'repo' })
  return {
    paneKey,
    paneTitle: paneKey,
    worktree,
    tab: makeTab({ id: 'tab', worktreeId: worktree.id }),
    repo: null,
    agentType: 'codex',
    currentAgentState: null,
    currentAgentEntry: null,
    responsePreview: '',
    latestTimestamp: 0,
    latestEvent: null,
    events: [],
    unread: false
  }
}

it('traverses the filtered row order, skipping headers and collapsed threads', () => {
  const groups = [
    { key: 'first', label: 'First', threads: [thread('first')] },
    { key: 'collapsed', label: 'Collapsed', threads: [thread('hidden')] },
    { key: 'last', label: 'Last', threads: [thread('last')] }
  ]
  const items = buildActivityVirtualItems({
    groups,
    groupBy: 'status',
    collapsedGroupKeys: new Set(['collapsed'])
  })
  expect(findNextActivityThreadItemIndex(items, 1, 1)).toBe(4)
  expect(findNextActivityThreadItemIndex(items, 4, -1)).toBe(1)
  expect(findNextActivityThreadItemIndex(items, 4, 1)).toBeNull()
  expect(
    getActivityVirtualRange(
      { startIndex: 1, endIndex: 1, overscan: 0, count: items.length },
      getActivityHeaderItemIndexes(items),
      null,
      4
    )
  ).toEqual([0, 1, 4])

  const filtered = buildActivityVirtualItems({
    groups: groups.slice(1),
    groupBy: 'status',
    collapsedGroupKeys: new Set(['collapsed'])
  })
  const filteredSelection = findActivityThreadItemIndex(filtered, 'first')
  expect(findNextActivityThreadItemIndex(filtered, filteredSelection, 1)).toBe(2)
})
