import React from 'react'
import { toast } from 'sonner'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut
} from '@/components/ui/dropdown-menu'
import { AgentIcon } from '@/components/agent/icons/AgentIcon'
import { useTranslate } from '@/i18n/use-translate'
import {
  useAgentPickerInventoryEntries,
  type AgentPickerInventorySource
} from '../agent-picker-inventory-source'
import { usePluginAgentPresetGroups } from '@/store/plugins/agent-presets/plugin-agent-presets'
import { emptyNativeChatPresetTarget } from '@/components/native-chat/session/options/structured/native-chat-preset-target'
import { resolveAgentChoiceLayers } from '../../../../../shared/agent-launch/choices/agent-choice-layers'
import { isTuiAgent } from '../../../../../shared/agent-launch/catalog/tui-agent-config'
import type { AgentPickerEntry } from '../../../../../shared/agent-launch/picker/agent-launch-picker'
import type { NewTabAgentMenuRow } from '../../../../../shared/agent-launch/picker/agent-launch-picker-rows'
import type { PluginAgentPresetView } from '../../../../../shared/plugins/contributions/plugin-agent-preset-contribution'
import type { useTabAgentMenuLaunch } from './AgentMenuItems'

/** The row a preset launches on: the agent's own row for the surface the person chose. */
function presetLaunchRow(entry: AgentPickerEntry): NewTabAgentMenuRow | undefined {
  return entry.rows.find((row) =>
    entry.defaultSurface === 'chat'
      ? row.kind === 'chat'
      : row.kind === 'cli' || row.kind === 'terminal'
  )
}

async function applyPresetInPlace(
  setOption: (id: string, value: string) => Promise<unknown>,
  preset: PluginAgentPresetView
): Promise<void> {
  // Model first: the efforts a chat offers depend on its model.
  if (preset.model !== undefined) {
    await setOption('model', preset.model)
  }
  if (preset.effort !== undefined) {
    await setOption('effort', preset.effort)
  }
}

export function PluginAgentPresetMenuItems({
  inventory,
  activeTabId,
  runLaunch
}: {
  inventory: AgentPickerInventorySource
  activeTabId: string | null
  runLaunch: ReturnType<typeof useTabAgentMenuLaunch>
}): React.JSX.Element | null {
  const t = useTranslate()
  const groups = usePluginAgentPresetGroups()
  const entries = useAgentPickerInventoryEntries(inventory)
  if (groups.length === 0) {
    return null
  }
  const choose = (
    preset: PluginAgentPresetView,
    entry: AgentPickerEntry,
    row: NewTabAgentMenuRow
  ) => {
    const inPlace = emptyNativeChatPresetTarget(activeTabId, preset.agent)
    if (inPlace) {
      applyPresetInPlace(inPlace.setOption, preset).catch((error: unknown) => {
        toast.error(
          t('pluginAgentPresets.applyFailed', 'Couldn’t apply {{value0}}', {
            value0: preset.title
          }),
          { description: error instanceof Error ? error.message : String(error) }
        )
      })
      return true
    }
    const choices = resolveAgentChoiceLayers({
      agent: entry.agent,
      explicit: {
        ...(preset.model !== undefined ? { model: preset.model } : {}),
        ...(preset.effort !== undefined ? { options: { effort: preset.effort } } : {})
      },
      argumentOwner: 'defaults'
    })
    return runLaunch(row, { agent: entry.agent, surface: entry.defaultSurface, choices }, entry)
  }
  return (
    <>
      {groups.map((group) => (
        <React.Fragment key={group.key}>
          <DropdownMenuLabel title={group.pluginName}>{group.title}</DropdownMenuLabel>
          {group.items.map((preset) => {
            const entry = entries.find((candidate) => candidate.agent === preset.agent)
            const row = entry ? presetLaunchRow(entry) : undefined
            const unavailable = !entry || !row
            return (
              <DropdownMenuItem
                key={preset.id}
                variant="launch"
                disabled={unavailable}
                title={
                  unavailable
                    ? t(
                        'pluginAgentPresets.agentUnavailable',
                        '{{value0}} isn’t available in this workspace',
                        { value0: preset.agent }
                      )
                    : [preset.model, preset.effort].filter(Boolean).join(' · ') || undefined
                }
                onSelect={(event) => {
                  if (!entry || !row || choose(preset, entry, row) === false) {
                    event.preventDefault()
                  }
                }}
              >
                {preset.iconUrl ? (
                  <img
                    src={preset.iconUrl}
                    alt=""
                    className="size-3.5 shrink-0 rounded-sm object-cover"
                  />
                ) : (
                  <AgentIcon agent={isTuiAgent(preset.agent) ? preset.agent : null} size={14} />
                )}
                <span className="min-w-0 flex-1 truncate">{preset.title}</span>
                {preset.keybinding ? (
                  <DropdownMenuShortcut>{preset.keybinding}</DropdownMenuShortcut>
                ) : null}
              </DropdownMenuItem>
            )
          })}
          <DropdownMenuSeparator />
        </React.Fragment>
      ))}
    </>
  )
}
