import {
  PLUGIN_AGENT_PRESET_GROUP_LIMIT,
  type PluginAgentPresetItem,
  type PluginAgentPresetSnapshot,
  type PluginAgentPresetView
} from '../../../shared/plugins/contributions/plugin-agent-preset-contribution'
import { readPluginImageHeader } from '../../../shared/plugins/images/plugin-image-format'
import { pluginShaImageUrl } from '../../../shared/plugins/images/plugin-image-url'
import { readContainedPluginArtifactBytes } from '../artifacts/plugin-contained-artifact'
import type { PluginImageCache } from '../media/plugin-image-cache'

const PRESET_ICON_MAX_BYTES = 256 * 1024
const PRESET_ICON_FORMATS = new Set(['png', 'webp'])

/** Verifies a preset icon inside the plugin and caches it by hash; throws why it cannot be shown. */
export async function cachePluginAgentPresetIcon(
  cache: PluginImageCache,
  rootDir: string,
  path: string
): Promise<string> {
  const bytes = await readContainedPluginArtifactBytes(rootDir, path, PRESET_ICON_MAX_BYTES)
  const info = readPluginImageHeader(bytes)
  if (typeof info === 'string') {
    throw new Error(`${path}: ${info}`)
  }
  if (!PRESET_ICON_FORMATS.has(info.format)) {
    throw new Error(`${path}: must be PNG or WebP`)
  }
  const sha256 = await cache.put(bytes)
  if (!sha256) {
    throw new Error(`${path}: could not be cached`)
  }
  return pluginShaImageUrl(sha256)
}

/** What workers set with `agentPresets.set`, by plugin and group. Session-only. */
export class PluginAgentPresetState {
  private presets: PluginAgentPresetSnapshot = {}
  private readonly revisions = new Map<string, string>()
  private readonly listeners = new Set<(presets: PluginAgentPresetSnapshot) => void>()

  constructor(private readonly cache: PluginImageCache) {}

  async set(
    plugin: { pluginKey: string; revision: string; rootDir: string },
    group: { id: string; title: string },
    items: readonly PluginAgentPresetItem[]
  ): Promise<void> {
    const views = await Promise.all(
      items.map(async ({ icon, ...item }): Promise<PluginAgentPresetView> => {
        if (icon === undefined) {
          return item
        }
        try {
          return {
            ...item,
            iconUrl: await cachePluginAgentPresetIcon(this.cache, plugin.rootDir, icon)
          }
        } catch (error) {
          throw new Error(
            `items: ${item.id} icon ${error instanceof Error ? error.message : String(error)}`
          )
        }
      })
    )
    const { pluginKey, revision } = plugin
    const groups = this.revisions.get(pluginKey) === revision ? this.presets[pluginKey] : {}
    if (
      groups?.[group.id] === undefined &&
      Object.keys(groups ?? {}).length >= PLUGIN_AGENT_PRESET_GROUP_LIMIT
    ) {
      throw new Error(`group: at most ${PLUGIN_AGENT_PRESET_GROUP_LIMIT} groups per plugin`)
    }
    this.revisions.set(pluginKey, revision)
    // Why replace, not mutate: listeners and the renderer compare snapshots by identity.
    this.presets = {
      ...this.presets,
      [pluginKey]: { ...groups, [group.id]: { title: group.title, items: views } }
    }
    this.emit()
  }

  /** Drops presets of plugins now disabled, removed or updated (`revisionOf` null or different). */
  prune(revisionOf: (pluginKey: string) => string | null): void {
    const stale = [...this.revisions].filter(([key, revision]) => revisionOf(key) !== revision)
    if (stale.length === 0) {
      return
    }
    const next = { ...this.presets }
    for (const [key] of stale) {
      this.revisions.delete(key)
      delete next[key]
    }
    this.presets = next
    this.emit()
  }

  snapshot(): PluginAgentPresetSnapshot {
    return this.presets
  }

  onChanged(listener: (presets: PluginAgentPresetSnapshot) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.presets)
    }
  }
}
