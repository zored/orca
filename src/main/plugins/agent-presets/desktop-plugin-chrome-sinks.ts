import type { PluginImageCache } from '../media/plugin-image-cache'
import { PluginStatusBarState } from '../status-bar/plugin-status-bar-state'
import { PluginAgentPresetState } from './plugin-agent-preset-state'

/** What workers draw into the desktop window's chrome: status bar items and new-tab presets. */
export function createDesktopPluginChromeSinks(imageCache: PluginImageCache) {
  return {
    statusBar: new PluginStatusBarState(),
    agentPresets: new PluginAgentPresetState(imageCache)
  }
}
