import { createContext, type Dispatch, type SetStateAction } from 'react'

export type ActivityThreadCollapseState = {
  collapsedGroupKeys: ReadonlySet<string>
  setCollapsedGroupKeys: Dispatch<SetStateAction<ReadonlySet<string>>>
}

/** Retain caller-owned collapsed groups across pane unmounts. */
export const ActivityThreadCollapseContext = createContext<ActivityThreadCollapseState | null>(null)

export function toggleActivityGroups(
  current: ReadonlySet<string>,
  keys: readonly string[]
): ReadonlySet<string> {
  const next = new Set(current)
  const expand = keys.every((key) => next.has(key))
  for (const key of keys) {
    if (expand) {
      next.delete(key)
    } else {
      next.add(key)
    }
  }
  return next
}
