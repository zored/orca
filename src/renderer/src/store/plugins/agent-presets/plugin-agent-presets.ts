import { useEffect, useMemo } from 'react'
import { create } from 'zustand'
import type { PluginHostListEntry } from '../../../../../shared/plugins/plugin-list-entry'
import type {
  PluginAgentPresetSnapshot,
  PluginAgentPresetView
} from '../../../../../shared/plugins/contributions/plugin-agent-preset-contribution'
import {
  ensurePluginPanelsLoaded,
  installedPluginDisplayNames,
  isLivePlugin,
  usePluginPanelsStore
} from '../catalog/plugin-contribution-catalog'

/** A filled preset group of an enabled plugin, in the order its worker first set them. */
export type ActivePluginAgentPresetGroup = {
  key: string
  title: string
  pluginName: string
  items: readonly PluginAgentPresetView[]
}

/** Mirrors main's snapshot of `agentPresets.set` lists. */
export const usePluginAgentPresetStore = create<{ presets: PluginAgentPresetSnapshot }>(() => ({
  presets: {}
}))

let watching = false

function watchPluginAgentPresets(): void {
  const plugins = window.api?.plugins
  if (watching || !plugins?.agentPresetsState || !plugins.onAgentPresetsChanged) {
    return
  }
  watching = true
  plugins.onAgentPresetsChanged((presets) => usePluginAgentPresetStore.setState({ presets }))
  void plugins
    .agentPresetsState()
    .then((presets) => usePluginAgentPresetStore.setState({ presets }))
    // Why ignored: an older host has no preset groups to show.
    .catch(() => undefined)
}

export function collectPluginAgentPresetGroups(
  plugins: readonly PluginHostListEntry[],
  presets: PluginAgentPresetSnapshot
): ActivePluginAgentPresetGroup[] {
  const names = installedPluginDisplayNames(plugins)
  return plugins.filter(isLivePlugin).flatMap((plugin) =>
    Object.entries(presets[plugin.pluginKey] ?? {}).flatMap(([id, group]) =>
      group.items.length === 0
        ? []
        : [
            {
              key: `${plugin.pluginKey}/${id}`,
              title: group.title,
              pluginName: names.get(plugin.pluginKey) ?? plugin.name,
              items: group.items
            }
          ]
    )
  )
}

export function usePluginAgentPresetGroups(): ActivePluginAgentPresetGroup[] {
  const plugins = usePluginPanelsStore((state) => state.plugins)
  const presets = usePluginAgentPresetStore((state) => state.presets)
  useEffect(() => {
    ensurePluginPanelsLoaded()
    watchPluginAgentPresets()
  }, [])
  return useMemo(() => collectPluginAgentPresetGroups(plugins, presets), [plugins, presets])
}
