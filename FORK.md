# Robbo's Orca fork

Branch `robbo` of [zored/orca](https://github.com/zored/orca), based on upstream tag `v1.4.272`.
Features land here first; each gets a section below.

## Run

```sh
npx -y pnpm@12.18.0 install --frozen-lockfile
npx -y pnpm@12.18.0 dev --seed-profile="$HOME/Library/Application Support/orca"
```

The dev instance runs next to the regular Orca with its own data in
`~/Library/Application Support/orca-dev`. `--seed-profile` copies projects, workspaces,
settings and SSH targets from the regular install once, while the dev profile is empty.
Terminal sessions, automations and chat history stay in the regular install.

## Features

None yet.
