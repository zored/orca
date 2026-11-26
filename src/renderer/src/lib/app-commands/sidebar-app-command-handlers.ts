import { hasVisibleOverlay } from '@/lib/overlay-interaction/visible-overlay'
import { requestVirtualizedScrollAnchorRecord } from '@/lib/list-interaction/virtualized-scrolling/requestVirtualizedScrollAnchorRecord'
import {
  getRenderedLineageChipKeys,
  resolveChildWorkspacesToggleGroupKey
} from '../../components/sidebar/workspace-card/identity/child-workspaces-toggle-target'
import { readRuntimeStatuses } from '@/store/slices/runtime-status/views/runtime-status-owner'
import { useAppStore } from '@/store'
import { readSidebarRevealTarget } from '@/components/sidebar/sidebar-reveal-target-state'
import { requestScrollToCurrentWorkspaceReveal } from '@/lib/workspace/navigation/scroll-to-current-workspace-status'
import { showWorkspaceListThen } from '@/components/app-rail/app-rail-navigation'
import type { KeybindingActionId } from '../../../../shared/keybindings/types'

export function createSidebarAppCommandHandlers({
  claim,
  creationLayoutActive,
  floatingWorkspaceFocused,
  modalOutsidePalette,
  ignorePalette
}: {
  claim: (actionId: KeybindingActionId, run: () => void) => boolean
  creationLayoutActive: boolean
  floatingWorkspaceFocused: boolean
  modalOutsidePalette: () => string
  ignorePalette: boolean
}): [KeybindingActionId, () => boolean][] {
  return [
    [
      'sidebar.revealCurrent',
      () =>
        readSidebarRevealTarget().section !== 'none' &&
        claim('sidebar.revealCurrent', () => {
          const store = useAppStore.getState()
          store.setSidebarBody('workspaces')
          store.setSidebarOpen(true)
          requestScrollToCurrentWorkspaceReveal()
        })
    ],
    [
      'sidebar.activity.toggle',
      () =>
        !creationLayoutActive &&
        claim('sidebar.activity.toggle', () => {
          const store = useAppStore.getState()
          if (showWorkspaceListThen(useAppStore, () => store.setSidebarBody('agents'))) {
            return
          }
          store.setSidebarBody(
            store.sidebarBody === 'agents' && store.sidebarOpen ? 'workspaces' : 'agents'
          )
          store.setSidebarOpen(true)
        })
    ],
    [
      'sidebar.childWorkspaces.toggle',
      () => {
        const store = useAppStore.getState()
        // Locally controlled dialogs do not set activeModal.
        if (
          modalOutsidePalette() !== 'none' ||
          floatingWorkspaceFocused ||
          hasVisibleOverlay({
            ignoreMatches: '[role="listbox"], [role="menu"]',
            ignoreSelector: ignorePalette ? '[data-slot="command-dialog-content"]' : undefined
          })
        ) {
          return false
        }
        const groupKey = resolveChildWorkspacesToggleGroupKey(
          store,
          getRenderedLineageChipKeys(store, readRuntimeStatuses())
        )
        if (!groupKey) {
          return false
        }
        return claim('sidebar.childWorkspaces.toggle', () => {
          const expanding = store.collapsedGroups.has(groupKey)
          // Match chip-click scroll anchoring to avoid viewport jumps.
          requestVirtualizedScrollAnchorRecord('[data-worktree-sidebar]')
          store.toggleCollapsedGroup(groupKey)
          if (expanding) {
            store.setSidebarOpen(true)
          }
        })
      }
    ]
  ]
}
