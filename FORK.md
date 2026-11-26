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

## Versions

Tags `v<upstream>-robbo.<n>` mark fork builds that were run somewhere, so a server or desktop
can be traced back to its commit. `package.json` keeps the upstream version, and orcad builds are
named by content hash (`0.1.0+<hash>`), so the tag is the only link between the two.

| Tag                | Commit        | orcad build                              | Where it runs                                    |
| ------------------ | ------------- | ---------------------------------------- | ------------------------------------------------ |
| `v1.4.272-robbo.1` | `c93d142d0ad` | `0.1.0+be1818aabe72` (linux-arm64-glibc) | SSH host `kaleidoscope-ide` (pending activation) |

## Remote orcad from the fork

An SSH host runs its own orcad, deployed by the desktop from `orcad-template`. A dev desktop
has none, so Update fails with `The packaged orcad deployment template is missing`. Plugin
host code (agent presets) runs inside that orcad, so a remote host needs the fork's build too.

Build the template for one target on a Mac:

```sh
pnpm build:mobile-web
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
  config/scripts/orcad-distribution/template/build-orcad-template.mjs --targets linux-arm64-glibc
ln -s /Applications/Orca.app/Contents/Resources/ripgrep out/ripgrep
```

- The node-pty prebuild for a Linux slot can only be built on that platform. The fork changes no
  native code, so `out/orcad-prebuilds/linux-arm64-glibc` is seeded from the released Orca.app
  (`targets/linux-arm64-glibc`: `pty.node`, `journal-file-lock`, `bin/orca-provider-exec` →
  `provider-exec/`) with a hand-written `manifest.json` (schema 2, N-API 8).
- The materializer reads ripgrep from `dirname(out/orcad-template)/ripgrep`, hence the symlink.

Deploy from the running dev desktop:

```sh
orca environment update --environment <host> --force
```

- `--force` is needed because the host was last run by a release with a higher version than
  the fork's `package.json` (`host-newer`).
- `orcad_update_daemon_protocol_unverifiable` means the desktop can't read the host's terminal
  census, usually after `orcad_identity_mismatch` (the host's server was reinstalled after
  pairing). Fix the pairing first: `orca environment forget --environment <host> --yes`, then
  Connect on the SSH host, then update.

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

### Model and effort shortcuts in chats

In a native chat, `⌘⌥.` / `⌘⌥,` switch to the next / previous model and `⌘⌥=` / `⌘⌥-` raise /
lower reasoning effort (Ctrl+Alt on Linux and Windows). They act on the focused chat only, go
through the model picker's own path (pending state, error toasts, Claude's switch confirmation),
stop at the ends of the list and skip effort levels the model doesn't support. Rebind them in
Settings → Shortcuts → Chat.
