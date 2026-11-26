import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'
import { useShellStorage } from '../platform/shell-storage/shell-storage'
import { persistMirrored } from '../storage/mirrored-storage-keys'

const KEY = 'orca:largerListRows'
const listeners = new Set<() => void>()
let enabled = false
let loading: Promise<void> | undefined

function publish(next: boolean): void {
  if (enabled !== next) {
    enabled = next
    listeners.forEach((listener) => listener())
  }
}

function load(): Promise<void> {
  return (loading ??= AsyncStorage.getItem(KEY)
    .then((stored) => publish(stored === 'true'))
    .catch((error: unknown) => console.warn('Could not load list row size', error)))
}

let writes: Promise<void> | undefined

export function setLargerListRows(next: boolean): Promise<void> {
  const write = (writes ?? load()).then(async () => {
    await persistMirrored(KEY, String(next))
    publish(next)
  })
  writes = write.catch((error: unknown) => console.warn('Could not save list row size', error))
  return write
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  void load()
  return () => listeners.delete(listener)
}

const read = () => enabled

export function useLargerListRows(): boolean {
  const shellStorage = useShellStorage()
  const saved = useSyncExternalStore(subscribe, read, read)
  return shellStorage === null ? saved : shellStorage[KEY] === 'true'
}
