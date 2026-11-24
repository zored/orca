import { PLUGIN_HOST_API } from '../../../../shared/plugins/workers/plugin-host-api'
import type { PluginAgentPresetItem } from '../../../../shared/plugins/contributions/plugin-agent-preset-contribution'
import { bind, type BoundPluginHostMethod } from './plugin-host-method-bind'
import { PluginHostCallError } from './plugin-host-call-scope'

/** The calling plugin's preset groups; false when the manifest does not declare `group` and no
 *  `title` names it. Throws why an item cannot be shown. */
export type PluginAgentPresetServices = {
  set(
    pluginId: string,
    group: string,
    title: string | undefined,
    items: readonly PluginAgentPresetItem[]
  ): Promise<boolean>
}

export const PLUGIN_AGENT_PRESET_HANDLERS = {
  'agentPresets.set': bind(
    PLUGIN_HOST_API['agentPresets.set'],
    async ({ group, title, items }, { pluginId, services }) => {
      if (!services.agentPresets) {
        throw new PluginHostCallError('unavailable', 'this Orca has no new-tab menu')
      }
      const ids = new Set<string>()
      for (const item of items) {
        if (ids.has(item.id)) {
          throw new PluginHostCallError('invalid_params', `items: duplicate id ${item.id}`)
        }
        ids.add(item.id)
      }
      let declared: boolean
      try {
        declared = await services.agentPresets.set(pluginId, group, title, items)
      } catch (error) {
        throw new PluginHostCallError(
          'invalid_params',
          error instanceof Error ? error.message : String(error)
        )
      }
      if (!declared) {
        throw new PluginHostCallError(
          'invalid_params',
          `title: required, as no contributes.agentPresets entry is named ${group}`
        )
      }
      return { ok: true as const }
    }
  )
} satisfies Record<string, BoundPluginHostMethod>
