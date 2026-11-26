import { expect, it } from 'vitest'
import { findNativeChatTldr } from './native-chat-tldr'

it('finds the first summary without treating examples or prose mentions as a TLDR', () => {
  expect(findNativeChatTldr('Details\r\n**tl;dr:** Done.\r\nTLDR: Second')).toBe('Done.')
  expect(findNativeChatTldr('Example:\n```md\nTLDR: Example\n```\n## TLDR Ready')).toBe('## Ready')
  expect(
    findNativeChatTldr('Mention TLDR: here\nTLDRish\n> TLDR: quoted\n    TLDR: code')
  ).toBeUndefined()
})

it('drops just the marker and leaves summary formatting intact', () => {
  expect(findNativeChatTldr('TLDR: **Done.**')).toBe('**Done.**')
  expect(findNativeChatTldr('__TLDR__: Done.')).toBe('Done.')
  expect(findNativeChatTldr('**TLDR: Done.**')).toBe('**Done.**')
  expect(findNativeChatTldr('TL;DR:\nMore details.')).toBeUndefined()
})
