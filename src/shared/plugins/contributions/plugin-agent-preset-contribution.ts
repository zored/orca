import { z, type RefinementCtx } from 'zod'
import { safePluginDisplayText } from '../manifest/plugin-display-text'
import { pluginIdSchema, pluginRelativePathSchema } from '../manifest/plugin-manifest-fields'
import { pluginFieldDoc } from '../manifest/plugin-schema-field-docs'

/** First release that reads `contributes.agentPresets` and `agentPresets.set`. */
export const PLUGIN_AGENT_PRESETS_SINCE = '1.4.273'
export const PLUGIN_AGENT_PRESET_GROUP_LIMIT = 4
export const PLUGIN_AGENT_PRESET_ITEM_LIMIT = 32

const SINCE = PLUGIN_AGENT_PRESETS_SINCE

export const pluginAgentPresetGroupTitleSchema = safePluginDisplayText(z.string().min(1).max(64))

export const pluginAgentPresetGroupContributionSchema = z
  .object({
    id: pluginIdSchema.meta(
      pluginFieldDoc(
        "Group id, unique among this plugin's preset groups; `agentPresets.set` names it.",
        SINCE,
        ['profiles']
      )
    ),
    title: pluginAgentPresetGroupTitleSchema.meta(
      pluginFieldDoc('Heading shown above the group in the new-tab menu.', SINCE, ['Profiles'])
    )
  })
  .strict()
  .meta({
    id: 'AgentPresetGroupContribution',
    description:
      'A group of agent presets in the new-tab menu, above the built-in agents. Requires `trusted-worker`; the worker fills it with `agentPresets.set`. Declaring it keeps the worker running and lists the group on the plugin page; a worker may also set an undeclared group by passing its `title`.'
  })

export type PluginAgentPresetGroupContribution = z.infer<
  typeof pluginAgentPresetGroupContributionSchema
>

export const pluginAgentPresetItemSchema = z.strictObject({
  id: z.string().min(1).max(128),
  title: safePluginDisplayText(z.string().min(1).max(80)),
  /** An Orca agent id such as `claude` or `codex`; one this Orca does not offer shows disabled. */
  agent: z.string().min(1).max(64),
  model: z.string().min(1).max(256).optional(),
  effort: z.string().min(1).max(64).optional(),
  /** PNG or WebP inside the plugin folder, at most 256 KB. */
  icon: pluginRelativePathSchema.optional(),
  /** Shortcut text shown at the row's end, such as `⌘⌥1`; display only. */
  keybinding: safePluginDisplayText(z.string().min(1).max(32)).optional()
})
export type PluginAgentPresetItem = z.infer<typeof pluginAgentPresetItemSchema>

/** A preset as the renderer gets it: the icon is an `orca-plugin-image` URL main verified. */
export type PluginAgentPresetView = Omit<PluginAgentPresetItem, 'icon'> & { iconUrl?: string }

export type PluginAgentPresetGroupView = {
  title: string
  items: readonly PluginAgentPresetView[]
}

/** Worker-set presets by plugin key then group id; main pushes it to the renderer. */
export type PluginAgentPresetSnapshot = Readonly<
  Record<string, Readonly<Record<string, PluginAgentPresetGroupView>>>
>

/** main → renderer: a new PluginAgentPresetSnapshot. */
export const PLUGIN_AGENT_PRESETS_CHANGED_CHANNEL = 'plugins:agentPresetsChanged'

export function validatePluginAgentPresetGroups(
  contributes: { agentPresets: readonly { id: string }[] },
  main: string | undefined,
  ctx: RefinementCtx
): void {
  const ids = new Set<string>()
  for (const [index, group] of contributes.agentPresets.entries()) {
    if (ids.has(group.id)) {
      ctx.addIssue({
        code: 'custom',
        path: ['contributes', 'agentPresets', index],
        message: `duplicate agentPresets id: ${group.id}`
      })
    }
    ids.add(group.id)
  }
  if (contributes.agentPresets.length > 0 && main === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['contributes', 'agentPresets'],
      message: 'needs `main`: only a worker can fill a preset group'
    })
  }
}
