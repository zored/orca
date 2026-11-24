import { z } from 'zod'
import { pluginIdSchema } from '../manifest/plugin-manifest-fields'
import {
  PLUGIN_AGENT_PRESET_ITEM_LIMIT,
  pluginAgentPresetGroupTitleSchema,
  pluginAgentPresetItemSchema
} from '../contributions/plugin-agent-preset-contribution'
import { spec, WORKER_ONLY } from './plugin-host-method-spec'

const agentPresetsSetParams = z.strictObject({
  /** A `contributes.agentPresets` id, or any id of the plugin's own when `title` is given. */
  group: pluginIdSchema,
  /** The group's heading; required for a group the manifest does not declare. */
  title: pluginAgentPresetGroupTitleSchema.optional(),
  /** The whole list, in menu order; an empty list hides the group. */
  items: z.array(pluginAgentPresetItemSchema).max(PLUGIN_AGENT_PRESET_ITEM_LIMIT)
})
const agentPresetsSetResult = z.object({ ok: z.literal(true) })

/** Host API 1.11: the plugin's agent presets in the new-tab menu; spread into PLUGIN_HOST_API. */
export const PLUGIN_AGENT_PRESETS_API = {
  'agentPresets.set': spec({
    summary:
      "Replaces the presets of one of the plugin's groups, shown in the new-tab menu above the built-in agents. A group the manifest declares in `contributes.agentPresets` takes its title from there; any other needs `title`, so a plugin can add presets without requiring this Orca in its manifest. Choosing one applies its `model` and `effort` to the active chat when it is an empty chat of the same agent, else launches the agent with them on the surface the person chose (chat or terminal). `icon` is a PNG or WebP inside the plugin folder (at most 256 KB); `keybinding` is display text only. Desktop app only; lasts until Orca restarts, and is hidden while the plugin is disabled. A plugin with `main` and preset groups has its worker started when it is enabled and kept running.",
    since: 11,
    scope: 'plugin-private',
    capability: null,
    // Why not audited: it only redraws the plugin's own menu rows; a launch is the person's choice.
    mutation: false,
    surfaces: WORKER_ONLY,
    params: agentPresetsSetParams,
    result: agentPresetsSetResult
  })
}
