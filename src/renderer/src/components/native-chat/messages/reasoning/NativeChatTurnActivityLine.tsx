import {
  NativeChatHeldTextSessionContext,
  NativeChatReplyRevealsContext,
  NativeChatSaveFallbackContext,
  useNativeChatHeldReveals
} from '../../markdown/native-chat-reply-reveals'
import type { NativeChatTranscriptRowContext } from '../rows/NativeChatTranscriptRow'
import { useId, useState } from 'react'
import { useAppStore } from '@/store'
import { cn } from '@/lib/class-names'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { translate } from '@/i18n/i18n'
import { useTranslate, type Translate } from '@/i18n/use-translate'
import type { NativeChatLiveLine } from '../../../../../../shared/native-chat/transcript/row-content/native-chat-live-line'
import { nativeChatReasoningDisclosureKey } from '../../../../../../shared/native-chat/transcript/row-content/native-chat-reasoning-row'
import {
  describeNativeChatActiveTurnLabel,
  type NativeChatActiveTurnLabel
} from '../../../../../../shared/native-chat/transcript/turns/native-chat-turn-status'
import {
  NativeChatReasoningBody,
  NativeChatReasoningChevron
} from './NativeChatReasoningDisclosure'
import { useNativeChatDisclosure } from '../disclosure/native-chat-disclosure-store'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// Literal keys with literal fallbacks: a dynamic key registers no catalog reference.
function statusLabel(
  key: Extract<NativeChatActiveTurnLabel, { source: 'status' }>['key'],
  t: Translate = translate
): string {
  switch (key) {
    case 'thinking':
      return t('components.native-chat.status.thinking', 'Thinking')
    case 'stopping':
      return t('components.native-chat.status.stopping', 'Stopping…')
    case 'working':
      return t('components.native-chat.status.working', 'Working…')
  }
}

/** Keep the clock in the turn bar; this tail shows activity or discloses open reasoning. */
export function NativeChatTurnActivityLine({
  line,
  context
}: {
  line: NativeChatLiveLine
  /** The transcript's, so reasoning held while the window was hidden is drawn at once too. */
  context?: Pick<NativeChatTranscriptRowContext, 'heldTextSession' | 'savesAsRepliesGrow'>
}): React.JSX.Element {
  const t = useTranslate()
  const resolved = describeNativeChatActiveTurnLabel(line)
  const label = resolved.source === 'activity' ? resolved.text : statusLabel(resolved.key, t)
  const { reasoning } = line
  // The finished row reads this key too, so a block opened here lands open once it ends.
  const disclosureKey = reasoning
    ? nativeChatReasoningDisclosureKey(reasoning.message.id)
    : undefined
  const disclosure = useNativeChatDisclosure(disclosureKey, false)
  const collapseActivity = useAppStore(
    (state) => state.settings?.nativeChatCollapseLiveActivity === true
  )
  const compact = collapseActivity && !line.stopping
  const [activityExpanded, setActivityExpanded] = useState(false)
  const open = compact ? activityExpanded : reasoning !== null && disclosure.open
  const hideLabel = compact && !open
  const toggle = (next: boolean) => {
    if (compact) {
      setActivityExpanded(next)
    }
    if (reasoning) {
      disclosure.setOpen(next)
    }
  }
  const toggleLabel = compact
    ? open
      ? t('components.native-chat.status.hideLiveActivity', 'Hide live activity')
      : t('components.native-chat.status.showLiveActivity', 'Show live activity')
    : undefined
  const labelId = useId()
  // The body unmounts when collapsed; this line outlives it, so its reveal resumes on reopening.
  const heldReveals = useNativeChatHeldReveals(disclosureKey)

  return (
    <Collapsible open={open} onOpenChange={toggle}>
      {/* Keep one live region so label changes announce; overlay its trigger and place reasoning outside it. */}
      <div
        className="group/reasoning relative flex min-h-6 items-center gap-1.5 text-sm leading-relaxed text-chat-foreground-faint"
        data-native-chat-turn-activity="true"
        data-state={open ? 'open' : 'closed'}
        aria-live="polite"
        aria-atomic="true"
      >
        <LoadingSpinner className="size-4 shrink-0" />
        <span
          id={labelId}
          className={hideLabel ? 'sr-only' : 'min-w-0 truncate text-chat-foreground'}
        >
          {hideLabel ? statusLabel('working', t) : label}
        </span>
        {(reasoning || compact) && !hideLabel ? <NativeChatReasoningChevron /> : null}
        {reasoning || compact ? (
          <CollapsibleTrigger asChild>
            <button
              type="button"
              aria-label={toggleLabel}
              aria-labelledby={compact ? undefined : labelId}
              className={cn(
                'absolute inset-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                hideLabel && 'w-6 cursor-pointer'
              )}
            />
          </CollapsibleTrigger>
        ) : null}
      </div>
      {reasoning ? (
        <CollapsibleContent>
          <NativeChatReplyRevealsContext.Provider value={heldReveals}>
            <NativeChatHeldTextSessionContext.Provider value={context?.heldTextSession}>
              <NativeChatSaveFallbackContext.Provider value={context?.savesAsRepliesGrow ?? false}>
                <NativeChatReasoningBody
                  rowKey={disclosureKey}
                  markdown={reasoning.markdown}
                  streaming
                  savedRevision={reasoning.message.journalRevision}
                />
              </NativeChatSaveFallbackContext.Provider>
            </NativeChatHeldTextSessionContext.Provider>
          </NativeChatReplyRevealsContext.Provider>
        </CollapsibleContent>
      ) : null}
    </Collapsible>
  )
}
