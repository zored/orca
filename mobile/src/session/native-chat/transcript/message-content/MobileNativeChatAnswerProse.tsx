import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode
} from 'react'
import { findNativeChatTldr } from '../../../../../../src/shared/native-chat/transcript/folding/native-chat-tldr'
import { nativeChatProseToMarkdown } from '../../../../../../src/shared/native-chat/transcript/row-content/native-chat-prose'
import { useNativeChatTextSettings } from '../../preferences/native-chat-text-settings'
import { colors, pressedStyle, spacing } from '../../../../theme/mobile-theme'
import { themedStyleSheet } from '../../../../theme/themed-styles'
import { Pressable, Text } from 'react-native'
import { quietBotAnswerBlocks } from '../../../../../../src/shared/bot-quiet-result'
import { useMobileTranslation } from '../../../../i18n/use-mobile-translation'
import { MobileNativeChatBotIdentityContext } from '../../mobile-native-chat-bot-identity'
import { scaledType, styles } from '../messages/mobile-native-chat-message-styles'
import { MobileNativeChatPacedProse } from './MobileNativeChatPacedProse'

/** Whether an automation's row opened the row's turn, and whether the turn said or did something
 *  others see; either already accounts for a quiet result. */
export const MobileNativeChatQuietTurnContext = createContext({
  inAutomationTurn: false,
  inActingTurn: false
})

/** An agent row's prose; where a bot speaks (its chat, a group room's turn) a quiet result shows as
 *  a line, not its marker, as on the desktop. */
export function MobileNativeChatAnswerProse({
  blocks,
  fontScale,
  working = false,
  fullContentStatus,
  ...prose
}: ComponentProps<typeof MobileNativeChatPacedProse> & {
  fontScale: number
  working?: boolean
  fullContentStatus?: ReactNode
}): React.JSX.Element {
  const t = useMobileTranslation()
  const bot = useContext(MobileNativeChatBotIdentityContext)
  // Paced prose is an assistant's own reply; another agent's message draws as its card.
  const answer = quietBotAnswerBlocks(blocks, {
    botAnswer: prose.paced && bot !== null,
    streaming: prose.growingBlock !== undefined,
    ...useContext(MobileNativeChatQuietTurnContext)
  })
  const { collapseTldr } = useNativeChatTextSettings()
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const tldr = useMemo(
    () =>
      collapseTldr && prose.paced && !working && !prose.growingBlock
        ? findNativeChatTldr(nativeChatProseToMarkdown(answer.blocks))
        : undefined,
    [answer.blocks, collapseTldr, prose.paced, prose.growingBlock, working]
  )
  const folded = tldr !== undefined && expandedRow !== prose.rowKey
  return (
    <>
      {folded ? (
        prose.children({ type: 'text', text: tldr }, 0, { text: tldr, revealing: false })
      ) : (
        <MobileNativeChatPacedProse {...prose} blocks={answer.blocks} />
      )}
      {tldr !== undefined ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: !folded }}
          style={({ pressed }) => [disclosureStyles.toggle, pressed && pressedStyle]}
          onPress={() => setExpandedRow(folded ? prose.rowKey : null)}
        >
          <Text style={[disclosureStyles.label, scaledType(13, fontScale)]}>
            {folded
              ? t('chat.tldr.showFull', 'Show full reply')
              : t('chat.tldr.showLess', 'Show less')}
          </Text>
        </Pressable>
      ) : null}
      {answer.nothingToReport ? (
        <Text style={[styles.hostNotice, scaledType(13, fontScale)]}>
          {t('bots.chat.nothingToReport', 'Nothing to report')}
        </Text>
      ) : null}
      {!folded ? fullContentStatus : null}
    </>
  )
}

const disclosureStyles = themedStyleSheet(() => ({
  toggle: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: spacing.xs
  },
  label: { color: colors.chatForegroundStrong, fontWeight: '600' }
}))
