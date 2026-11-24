import { useEffect, useLayoutEffect, useRef } from 'react'

/** A mounted structured chat a plugin preset may reconfigure in place instead of launching. */
export type NativeChatPresetTarget = {
  agent: string
  /** No message, send or queued card yet: changing its model loses nothing. */
  empty: boolean
  setOption: (id: string, value: string) => Promise<unknown>
}

const targets = new Map<string, () => NativeChatPresetTarget>()

/** Keeps the chat in tab `tabId` reachable by the new-tab menu while it is mounted; `empty`: no
 *  message, send or pending send yet. */
export function useNativeChatPresetTarget(
  tabId: string | undefined,
  agent: string,
  setOption: NativeChatPresetTarget['setOption'],
  empty: boolean
): void {
  const target = { agent, empty, setOption }
  const current = useRef(target)
  useLayoutEffect(() => {
    current.current = target
  })
  useEffect(() => {
    if (tabId === undefined) {
      return
    }
    const read = () => current.current
    targets.set(tabId, read)
    return () => {
      if (targets.get(tabId) === read) {
        targets.delete(tabId)
      }
    }
  }, [tabId])
}

/** The empty chat of `agent` in tab `tabId`, or null when that tab is anything else. */
export function emptyNativeChatPresetTarget(
  tabId: string | null,
  agent: string
): NativeChatPresetTarget | null {
  const target = tabId === null ? undefined : targets.get(tabId)?.()
  return target && target.empty && target.agent === agent ? target : null
}
