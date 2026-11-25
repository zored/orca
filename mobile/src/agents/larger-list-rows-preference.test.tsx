import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { expect, it, vi } from 'vitest'
import {
  pageStorageForReader,
  pageStorageKeysForRoute,
  TERMINAL_SETTINGS_STORAGE_KEYS
} from '../mobile-web-shell/page-storage/page-storage-keys'
import { setLargerListRows, useLargerListRows } from './larger-list-rows-preference'

const storage = vi.hoisted(() => new Map<string, string>())

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      storage.set(key, value)
    }
  }
}))

it('defaults to compact rows and publishes the last saved preference to mounted lists', async () => {
  function List() {
    return useLargerListRows() ? 'large' : 'compact'
  }

  let list!: ReactTestRenderer
  await act(async () => {
    list = create(<List />)
  })
  expect(list.toJSON()).toBe('compact')

  try {
    await act(async () => {
      await setLargerListRows(true)
    })
    expect(list.toJSON()).toBe('large')
    expect(storage.get('orca:largerListRows')).toBe('true')

    await act(async () => {
      await setLargerListRows(false)
    })
    expect(list.toJSON()).toBe('compact')
    expect(storage.get('orca:largerListRows')).toBe('false')
  } finally {
    act(() => list.unmount())
  }
})

it('only sends the live preference to hosted worktree pages that recognize it', () => {
  const key = 'orca:largerListRows'
  const held = { storage: { [key]: 'true' }, storageOversize: [] }
  expect(pageStorageKeysForRoute('host-a', '/h/host-a')).toContain(key)
  expect(TERMINAL_SETTINGS_STORAGE_KEYS).toContain(key)
  expect(pageStorageForReader(held, null).storage).toEqual({})
  expect(pageStorageForReader(held, [key]).storage).toEqual({ [key]: 'true' })
})
