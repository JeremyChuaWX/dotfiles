# Pi harness

`macos/setup.sh` installs global Pi, stows the runtime resources, and installs
development dependencies in this checkout with `npm ci`.
`~/.pi/agent/node_modules` is not needed: Pi supplies its core packages to
extensions at runtime.

## Dependencies

`package.json` uses `file:` dependencies to link Pi's SDK packages and TypeBox
directly from the global Pi installation under:

```text
~/Library/Application Support/fnm/aliases/default/lib/node_modules/@earendil-works/pi-coding-agent
```

Updating global Pi there updates what the checkout uses—no version bumps or sync
scripts. Only TypeScript and Node typings are separately installed dev dependencies.
The lockfile records links and installation-time metadata, not pinned Pi contents.

This intentionally follows fnm's **default** Node installation on macOS, not an
arbitrary `fnm use` selection. Setup sets the installed Node as the default before
installing Pi. Global Pi must exist before running `npm ci`; this is a live local
development setup, not a reproducible SDK snapshot.

```sh
npm run typecheck
npm test
```
