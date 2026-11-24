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

None yet.
