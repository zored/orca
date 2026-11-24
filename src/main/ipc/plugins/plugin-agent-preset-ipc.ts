import { BrowserWindow, ipcMain } from 'electron'
import type { PluginService } from '../../plugins/plugin-service'
import { pluginStatusBarRevision } from '../../plugins/status-bar/plugin-status-bar-state'
import { PLUGIN_AGENT_PRESETS_CHANGED_CHANNEL } from '../../../shared/plugins/contributions/plugin-agent-preset-contribution'

/** Desktop windows read the workers' agent presets, then hear each new snapshot. */
export function registerPluginAgentPresetHandlers(pluginService: PluginService): void {
  const { agentPresets } = pluginService.options
  ipcMain.handle('plugins:agentPresetsState', () => agentPresets?.snapshot() ?? {})
  if (!agentPresets) {
    return
  }
  pluginService.onChanged(() =>
    agentPresets.prune((pluginKey) => {
      const plugin = pluginService.findApprovedPlugin(pluginKey, true)
      return plugin ? pluginStatusBarRevision(plugin) : null
    })
  )
  agentPresets.onChanged((presets) => {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) {
        window.webContents.send(PLUGIN_AGENT_PRESETS_CHANGED_CHANNEL, presets)
      }
    }
  })
}
