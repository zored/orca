import { useWorktreeJumpPaletteStoreState } from './state/use-worktree-jump-palette-store-state'
import { useWorktreeJumpPaletteLocalState } from './state/use-worktree-jump-palette-local-state'
import { useWorktreeJumpPaletteFilter } from './results/use-worktree-jump-palette-filter'
import { useWorktreeJumpPaletteWorktrees } from './workspaces/use-worktree-jump-palette-worktrees'
import { useWorktreeJumpPaletteOpenTabs } from './tabs/use-worktree-jump-palette-open-tabs'
import { useWorktreeJumpPaletteRecentTabs } from './tabs/use-worktree-jump-palette-recent-tabs'
import { useWorktreeJumpPaletteProjectTargets } from './workspaces/use-worktree-jump-palette-project-targets'
import { useWorktreeJumpPaletteQuickActions } from './workspaces/use-worktree-jump-palette-quick-actions'
import { useWorktreeJumpPaletteExtraResults } from './results/use-worktree-jump-palette-extra-results'
import { useWorktreeJumpPaletteSections } from './results/use-worktree-jump-palette-sections'
import { useWorktreeJumpPaletteListEntries } from './results/use-worktree-jump-palette-list-entries'
import { useWorktreeJumpPaletteSelectionLifecycle } from './selection/use-worktree-jump-palette-selection-lifecycle'
import { useWorktreeJumpPaletteSelectionActions } from './selection/use-worktree-jump-palette-selection-actions'
import { useWorktreeJumpPaletteCreateAction } from './workspaces/use-worktree-jump-palette-create-action'
import { useWorktreeJumpPaletteTaskSearch } from './tasks/use-worktree-jump-palette-task-search'
import { useWorktreeJumpPaletteTaskUrl } from './tasks/use-worktree-jump-palette-task-url'
import { useWorktreeJumpPaletteBotScope } from './use-worktree-jump-palette-bot-scope'
import { useWorktreeJumpPaletteBotScopeEntries } from './worktree-jump-palette-bot-scope-entries'
import { useWorkspaceEmojiShortcodeInput } from '@/components/workspace-emoji/useWorkspaceEmojiShortcodeInput'
import { usePaletteSearchEvaluationContext } from '@/lib/workspace/search/palette/use-palette-search-evaluation-context'
import type { WorktreePaletteRequestGuard } from '@/lib/workspace/search/worktrees/worktree-palette-create-action'
import { useCallback, useMemo } from 'react'
import { getWorktreeCommandItems } from './worktree-jump-palette-command-items'
import { getAvailableAppCommands } from '@/lib/app-commands/app-command-dispatch'
import { useShallow } from 'zustand/react/shallow'

const NO_COMMANDS: ReturnType<typeof getAvailableAppCommands> = []

export function useWorktreeJumpPaletteController({
  visible,
  lingering,
  commandsOnly,
  createLookupGuard
}: {
  visible: boolean
  lingering: boolean
  commandsOnly: boolean
  createLookupGuard: WorktreePaletteRequestGuard
}) {
  const storeState = useWorktreeJumpPaletteStoreState({ visible, lingering })
  const localState = useWorktreeJumpPaletteLocalState({ createLookupGuard, visible })
  // Showing only bots, every other section keeps the inputs it had, so none of its work reruns.
  const scoped = !commandsOnly && localState.scope === 'bots'
  const othersLocal = commandsOnly
    ? {
        ...localState,
        query: '',
        deferredQuery: '',
        scope: 'all' as const,
        paletteSearchQuery: '',
        createWorktreeName: '',
        taskSourceUrl: null,
        showCreateAction: false
      }
    : scoped
      ? {
          ...localState,
          query: localState.scopeHeldQuery,
          deferredQuery: localState.scopeHeldQuery,
          paletteSearchQuery: localState.scopeHeldQuery.trim(),
          createWorktreeName: ''
        }
      : localState
  const paletteEvaluationSnapshot = useMemo(
    () => ({
      query: othersLocal.paletteSearchQuery,
      agentStatus: storeState.agentStatusByPaneKey,
      worktrees: storeState.workspaces,
      browserPages: storeState.browserPagesByWorkspace,
      browserWorkspaces: storeState.browserTabsByWorktree,
      openFiles: storeState.openFiles,
      sleepingAgents: storeState.sleepingAgentSessionsByPaneKey,
      unifiedTabs: storeState.unifiedTabsByWorktree,
      visible: visible && !commandsOnly
    }),
    [
      othersLocal.paletteSearchQuery,
      storeState.agentStatusByPaneKey,
      storeState.workspaces,
      storeState.browserPagesByWorkspace,
      storeState.browserTabsByWorktree,
      storeState.openFiles,
      storeState.sleepingAgentSessionsByPaneKey,
      storeState.unifiedTabsByWorktree,
      visible,
      commandsOnly
    ]
  )
  const paletteSearchContext = usePaletteSearchEvaluationContext(paletteEvaluationSnapshot)
  const evaluation = { paletteSearchContext }
  const taskUrl = useWorktreeJumpPaletteTaskUrl({
    visible: visible && !commandsOnly,
    createWorktreeName: othersLocal.createWorktreeName,
    taskSourceUrl: othersLocal.taskSourceUrl,
    createLookupGuard
  })
  const filter = useWorktreeJumpPaletteFilter({ ...storeState, ...localState })
  // Showing only bots, task search is off: pending and debounced requests abort and no status shows.
  const taskSearch = useWorktreeJumpPaletteTaskSearch({
    ...storeState,
    ...othersLocal,
    ...filter,
    visible: visible && !scoped && !commandsOnly
  })
  const worktrees = useWorktreeJumpPaletteWorktrees({
    ...storeState,
    ...othersLocal,
    ...filter,
    ...evaluation
  })
  const extraResults = useWorktreeJumpPaletteExtraResults({
    ...othersLocal,
    ...filter,
    ...evaluation,
    visible: visible && !commandsOnly,
    scoped
  })
  const openTabs = useWorktreeJumpPaletteOpenTabs({
    ...storeState,
    ...othersLocal,
    ...filter,
    ...worktrees,
    ...extraResults,
    ...evaluation
  })
  const recentTabs = useWorktreeJumpPaletteRecentTabs({
    ...storeState,
    ...othersLocal,
    ...filter,
    ...worktrees,
    ...openTabs
  })
  const projectTargets = useWorktreeJumpPaletteProjectTargets({
    ...storeState,
    ...othersLocal,
    ...filter,
    ...worktrees
  })
  const quickActions = useWorktreeJumpPaletteQuickActions({
    ...storeState,
    ...othersLocal,
    ...worktrees,
    ...openTabs,
    ...projectTargets
  })
  const sections = useWorktreeJumpPaletteSections({
    ...othersLocal,
    ...filter,
    ...worktrees,
    ...openTabs,
    ...recentTabs,
    ...projectTargets,
    ...quickActions,
    ...extraResults,
    ...taskUrl,
    scoped
  })
  const botScopeEntries = useWorktreeJumpPaletteBotScopeEntries({
    ...extraResults,
    scoped,
    query: localState.query,
    visibleExtraSections: sections.paletteSections.visibleExtraSections,
    handleExpandSection: sections.handleExpandSection
  })
  const availableCommands = useShallow((enabled: boolean) =>
    enabled ? getAvailableAppCommands() : NO_COMMANDS
  )(commandsOnly)
  const { buildQuickActionContext } = quickActions
  const commandItems = useMemo(
    () =>
      commandsOnly
        ? getWorktreeCommandItems(
            localState.deferredQuery,
            availableCommands,
            storeState.pluginCommands,
            buildQuickActionContext()
          )
        : null,
    [
      availableCommands,
      commandsOnly,
      localState.deferredQuery,
      buildQuickActionContext,
      storeState.pluginCommands
    ]
  )
  const listEntries = useWorktreeJumpPaletteListEntries({
    ...othersLocal,
    ...worktrees,
    ...openTabs,
    ...sections,
    ...taskSearch,
    ...taskUrl,
    scopedEntries: commandItems ?? botScopeEntries.botScopeEntries
  })
  const selectionLifecycle = useWorktreeJumpPaletteSelectionLifecycle({
    ...storeState,
    ...localState,
    ...filter,
    ...worktrees,
    ...openTabs,
    ...recentTabs,
    ...projectTargets,
    ...quickActions,
    ...sections,
    ...listEntries,
    ...taskSearch,
    ...taskUrl,
    ...(commandsOnly ? { showCreateAction: false, taskSourceUrl: null } : {})
  })
  const botScope = useWorktreeJumpPaletteBotScope({
    ...localState,
    visible: visible && !commandsOnly,
    handleQueryChange: selectionLifecycle.handleQueryChange
  })
  const selectionActions = useWorktreeJumpPaletteSelectionActions({
    ...storeState,
    ...localState,
    ...quickActions,
    ...taskSearch,
    ...selectionLifecycle,
    botScope
  })
  const emojiInput = useWorkspaceEmojiShortcodeInput({
    disabled: commandsOnly,
    inputRef: localState.inputRef,
    onValueChange: selectionLifecycle.handleQueryChange,
    value: localState.query
  })
  const createAction = useWorktreeJumpPaletteCreateAction({
    ...storeState,
    ...localState,
    ...filter,
    ...worktrees,
    ...quickActions,
    ...sections,
    ...selectionLifecycle,
    ...selectionActions,
    ...taskUrl,
    ...(commandsOnly ? { showCreateAction: false, taskSourceUrl: null } : {})
  })
  const { selectionMovedByUserRef } = localState
  const markSelectionMovedByUser = useCallback(() => {
    selectionMovedByUserRef.current = true
  }, [selectionMovedByUserRef])

  return {
    ...storeState,
    commandsOnly,
    markSelectionMovedByUser,
    ...localState,
    ...taskUrl,
    ...taskSearch,
    ...filter,
    ...worktrees,
    ...openTabs,
    ...recentTabs,
    ...projectTargets,
    ...quickActions,
    ...extraResults,
    ...sections,
    ...listEntries,
    ...selectionLifecycle,
    ...selectionActions,
    botScope,
    botScopeNote: botScopeEntries.botScopeNote,
    paletteNowMs: worktrees.hasQuery ? paletteSearchContext.nowMs : storeState.paletteNowMs,
    emojiInput,
    ...createAction,
    ...(commandsOnly ? { showCreateAction: false } : {})
  }
}

export type WorktreeJumpPaletteController = ReturnType<typeof useWorktreeJumpPaletteController>
