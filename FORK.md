# Robbo's Orca fork

Branch `robbo` of [zored/orca](https://github.com/zored/orca), based on upstream tag `v1.4.272`.
Features land here first; each gets a section below.

## Run

```sh
R=https://registry.npmjs.org/
env -u LDFLAGS -u CPPFLAGS npm_config_registry=$R npx -y pnpm@12.18.0 install --frozen-lockfile --registry=$R
env -u LDFLAGS -u CPPFLAGS npm_config_registry=$R npx -y pnpm@12.18.0 dev --seed-profile="$HOME/Library/Application Support/orca"
```

- The public registry bypasses the corporate npm mirror from `~/.npmrc`; pnpm 12 needs `--registry`, `npx` needs `npm_config_registry`.
- The shell profile sets `LDFLAGS=-linkmode=internal …`, which breaks the `node-pty` link step.
- Corepack's `pnpm` shim cannot unpack pnpm 12, hence `npx`.

The dev instance runs next to the regular Orca with its own data in
`~/Library/Application Support/orca-dev`. `--seed-profile` copies projects, workspaces,
settings and SSH targets from the regular install once, while the dev profile is empty.
Terminal sessions, automations and chat history stay in the regular install.

## Features

### Agent presets in the new-tab menu

A plugin can put its own group of agent presets at the top of the `+` new-tab menu, above Claude,
Codex and the other built-in agents. Each row shows the preset's icon, title and shortcut hint.

Choosing a preset:

- the active tab is an empty chat of the same agent: its model and effort switch in place, as if
  picked in the chat's model menu;
- otherwise Orca starts the agent with that model and effort, as a chat or a terminal, whichever
  the agent's row would open.

Plugin API (host API 1.11, desktop only, kept until restart or until the plugin is disabled):

```ts
await orca.host.call('agentPresets.set', {
  group: 'profiles',
  title: 'Agent profiles', // optional when the manifest declares the group
  items: [
    {
      id: 'opus',
      title: 'Opus deep',
      agent: 'claude',
      model: 'opus',
      effort: 'high',
      icon: 'avatars/claude.png',
      keybinding: '⌘⌥1'
    }
  ]
})
```

- `items` replaces the whole group, in menu order; an empty list hides it. At most 32 presets, 4 groups.
- `icon` is a PNG or WebP inside the plugin folder, up to 256 KB; `keybinding` is display text only.
- A preset whose agent this workspace can't start shows disabled.
- `contributes.agentPresets: [{ "id", "title" }]` in the manifest is optional: it keeps the worker
  running from startup and lists the group on the plugin page. Older Orca refuses that manifest key,
  so a plugin that must keep loading there passes `title` instead and checks
  `orca.host.has('agentPresets.set')`.
