import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { expect, it, vi } from 'vitest'
import {
  resetNativeChatTextSettings,
  updateNativeChatTextSettings,
  useNativeChatTextSettingsSnapshot,
  NATIVE_CHAT_TEXT_KEY
} from './native-chat-text-settings'

const { storage, screen } = vi.hoisted(() => ({
  storage: new Map<string, string>(),
  screen: { width: 390, onChange: () => {} }
}))

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      storage.set(key, value)
    }
  }
}))
vi.mock('react-native', () => ({
  Dimensions: {
    get: () => ({ width: screen.width, height: 850 }),
    addEventListener: (_event: string, onChange: () => void) => {
      screen.onChange = onChange
    }
  }
}))
vi.mock('../transcript/messages/mobile-native-chat-message-styles', () => ({ CHAT_PROSE_SCALE: 1 }))

it('persists TLDR without opting into a fixed chat text size, even after a typography reset', async () => {
  function ChatSettings() {
    return JSON.stringify(useNativeChatTextSettingsSnapshot())
  }

  let view!: ReactTestRenderer
  await act(async () => {
    view = create(<ChatSettings />)
  })
  const snapshot = () => JSON.parse(String(view.toJSON()))
  try {
    await act(async () => {
      await updateNativeChatTextSettings({ collapseTldr: true })
    })
    expect(storage.get(NATIVE_CHAT_TEXT_KEY)).toBe('{"collapseTldr":true}')
    expect(snapshot()).toMatchObject({ stored: false, settings: { size: 14, collapseTldr: true } })

    act(() => {
      screen.width = 700
      screen.onChange()
    })
    expect(snapshot().settings.size).toBe(16)

    await act(async () => {
      await updateNativeChatTextSettings({ size: 18 })
    })
    await act(async () => {
      await resetNativeChatTextSettings()
    })
    expect(storage.get(NATIVE_CHAT_TEXT_KEY)).toBe('{"collapseTldr":true}')
    expect(snapshot()).toMatchObject({ stored: false, settings: { size: 16, collapseTldr: true } })
  } finally {
    act(() => view.unmount())
  }
})
