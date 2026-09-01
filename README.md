# dev-tools

Small tooling scripts reused across projects. Not published on npm —
installed directly from Git.

Written in TypeScript (`src/`), compiled to plain JS committed in `bin/`
— that compiled output is what `pnpm add -D github:...` actually
installs and runs. Node refuses to run `.ts` files located under a
`node_modules` directory at all (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`),
which is exactly where these scripts end up once installed as a
dependency, so shipping raw TypeScript source as the `bin` entries is not
an option — only the compiled `bin/*.js` ever runs there. No build step
or particular Node version is required on the consumer side; this is a
plain JS package like any other from that point of view, regardless of
whether the consumer project itself is written in JS or TS.

## Installation

Always pin an exact tag, never the default branch — otherwise a future
push here silently changes what `pnpm install` pulls in for consumers:

```bash
pnpm add -D github:t2ym5u/dev-tools#v1.0.0
```

## `sync-version`

Syncs the version number from `package.json` into other files (docs,
changelog...) at bump time — meant to run as the `version` hook of
`pnpm version` / `npm version`, which runs after the bump but before the
commit/tag created by the command, so the synced files end up in the same
release commit.

1. Create `sync-version.config.mjs` at the root of the consumer project:

   ```js
   export default [
     {
       file: "CLAUDE.md",
       pattern: /(\*\*Current version\s?:\*\*\s?)\d+\.\d+\.\d+/,
     },
     // add one entry per file to sync
   ];
   ```

   Each `pattern` must contain a capturing group `(...)` covering
   everything before the version number — it is reinjected as-is, only the
   version number is replaced.

2. Wire the script into `package.json`:

   ```json
   {
     "scripts": {
       "version": "sync-version"
     }
   }
   ```

3. `pnpm version minor` (or equivalent) now also updates and stages the
   files listed in `sync-version.config.mjs`.

## `switch-config`

Switches environment-specific config files versioned in the consumer
project. For each `xxx__ENV__` file found recursively (excluding
directories `find` ignores), it replaces `xxx` with a copy of
`xxx__ENV__` — the previous `xxx`, if any, is backed up as `xxx.bck`.

The default available environments and their aliases:

```bash
switch-config DEV    # accepted aliases: dev, develop, development
switch-config QLF    # accepted aliases: qlf, qualif, qualification
switch-config PROD   # accepted aliases: prod, production
switch-config --help
```

To declare other environments (or other aliases), create `envs.config.mjs`
at the root of the consumer project — it fully replaces the default list
above, and also acts as the shared source for
[`prepare-env`](#prepare-env) (see below):

```js
export default {
  DEV: ["dev", "develop", "development"],
  STAGING: ["staging"],
  PROD: ["prod", "production"],
};
```

## `switch-package-source`

For a project where some dependencies point to a private git repo
(Bitbucket, GitHub, GitLab...), rewrites those dependencies in
`package.json` between two formats:

- **DEV**: the package manager's git shorthand (e.g.
  `bitbucket:org/pkg`), for authenticated access in development.
- **PROD**: a public `.tar.gz` archive of a specific commit (e.g.
  `https://bitbucket.org/org/pkg/get/<commit>.tar.gz`), so installation
  doesn't require authentication (the whole reason for this script: these
  hosts don't make it easy to share a private package any other way). The
  commit is looked up in the lockfile.

1. Create `switch-package-source.config.mjs` at the root of the consumer
   project:

   ```js
   export default {
     host: "bitbucket", // "bitbucket" | "github" | "gitlab"
     org: "coverfield",
     // lockfile: "pnpm-lock.yaml", // optional, default value
   };
   ```

   `host` can also be a custom object (same shape as the built-in hosts,
   see `builtinHosts` in `src/switch-package-source.ts`) for an
   unsupported host, or to fix commit extraction if the built-in format
   doesn't match the actual lockfile.

   > Only the Bitbucket format has been verified in real conditions; the
   > GitHub and GitLab formats follow their standard URL conventions but
   > commit extraction from the lockfile hasn't been tested on a real
   > project — validate before relying on it.

2. `switch-package-source [DEV|PROD]` switches to the requested
   environment (or to the opposite of the detected environment if the
   argument is omitted).

## `prepare-env`

Generates the `package.json__PROD__` / `pnpm-lock.yaml__PROD__` and
`package.json__DEV__` / `pnpm-lock.yaml__DEV__` variants consumed by
[`switch-config`](#switch-config), building on
[`switch-package-source`](#switch-package-source) (so on the same
`switch-package-source.config.mjs`): for each environment, it switches
the dependencies, runs `pnpm install`, then copies `package.json` and
`pnpm-lock.yaml` to their `__ENV__` variants.

The environments processed are those from
[`envs.config.mjs`](#switch-config) (or the default `DEV`/`QLF`/`PROD`
list in its absence), restricted to `PROD` and `DEV` — the only
environments `switch-package-source` knows how to handle — in that order.
An `envs.config.mjs` that omits `PROD` (e.g. a project with no public
release step) would make `prepare-env` process only `DEV`.

```bash
prepare-env
```

## Publishing a new version

A change here has no effect on consumers until it's tagged — they're
pinned to a specific tag (`#vX.Y.Z`), never to the default branch.

1. Commit the change (new script, fix, `sync-version` tweak...) on
   `master`.

2. Bump the version and create the tag in a single command — `pnpm
   version` updates `package.json`, commits, and creates the `vX.Y.Z` tag:

   ```bash
   pnpm version patch   # backwards-compatible fix
   pnpm version minor   # new script / new option, backwards-compatible
   pnpm version major   # changes an existing script's signature
   ```

3. Push the bump commit *and* the tag at once:

   ```bash
   git push origin master --follow-tags
   ```

4. Create the matching GitHub release (visible changelog, version
   history):

   ```bash
   gh release create vX.Y.Z --title "vX.Y.Z" --notes "What changed…"
   ```

5. In **each consumer project**, update the tag reference and reinstall:

   ```bash
   pnpm add -D github:t2ym5u/dev-tools#vX.Y.Z
   ```

   Keep the list of consumer projects (private, outside this repo)
   up to date so none get missed on a bump.

## Development

Node and pnpm versions are pinned via [Volta](https://volta.sh/) — install
it once, and `cd`-ing into this repo picks up the right versions
automatically.

```bash
pnpm install     # also sets up the git hooks (husky)
pnpm build       # compiles src/*.ts to bin/*.js (tsc -p tsconfig.build.json)
pnpm test        # builds, then unit + e2e tests (node:test)
pnpm test:unit   # unit tests only (import src/*.ts directly, no build needed)
pnpm test:e2e    # builds, then e2e tests only (spawn the compiled bin/*.js,
                 # and test/*.ts sources directly, as subprocesses)
pnpm coverage    # same tests, enforced at 100% lines/branches/functions/statements
pnpm typecheck   # tsc --noEmit over src/ and test/ (Node runs .ts files
                 # directly during tests, unchecked at that point)
pnpm lint        # Biome check (lint + format, no writes) — bin/ (generated) excluded
pnpm lint:fix    # Biome check --write
pnpm format      # Biome format --write only
```

Git hooks (installed by `pnpm install` via `husky`):

- `pre-commit` runs `pnpm lint && pnpm typecheck && pnpm test && git add bin`
  — the last step stages the freshly rebuilt `bin/*.js` automatically, so
  a commit never ships stale compiled output.
- `commit-msg` runs `commitlint` against
  [Conventional Commits](https://www.conventionalcommits.org/) (feat:,
  fix:, docs:, chore:...), configured in `commitlint.config.mjs` — kept as
  plain JS since `@commitlint/load` has no built-in TypeScript config
  loader.

## Adding a new script

- One file per script under `src/`, registered as a `bin` entry in
  `package.json` pointing at the **compiled** `bin/<name>.js`, documented
  here.
- Keep the script itself thin (argv parsing, fs/process side effects) and
  put anything worth unit testing in a sibling `<script-name>.lib.ts` with
  named exports — see `switch-package-source.ts` /
  `switch-package-source.lib.ts` for the pattern. Shared logic (e.g.
  `envs.ts`) lives in its own module the same way, without a `bin` entry.
- Import sibling modules with an explicit `.ts` extension (e.g.
  `from "./envs.ts"`) — this lets tests run the sources directly via
  Node's native TypeScript support, while `pnpm build`
  (`rewriteRelativeImportExtensions` in `tsconfig.build.json`) rewrites
  those to `.js` in the compiled `bin/` output.
- Only erasable TypeScript syntax is safe to use (type annotations,
  interfaces, `as` casts...) — no `enum`, no experimental decorators, no
  parameter properties. Tests run the `.ts` sources via Node's native type
  stripping (not a real transform), so anything needing an actual
  transform would fail there even though `pnpm build` (a real `tsc`
  compile) would happen to handle it.
- A script's own `bin/<name>.js` process, when it needs the path to a
  sibling script (e.g. `prepare-env` spawning `switch-package-source`),
  must derive the sibling's extension from its own
  (`path.extname(fileURLToPath(import.meta.url))`) rather than hardcoding
  `.ts` or `.js` — that path has to resolve correctly both when running
  the source directly (tests) and the compiled output (real usage).
- Add unit tests for the `.lib.ts` exports under `test/unit/` (importing
  `src/*.lib.ts` directly), and an e2e test spawning the real CLI
  (`src/<name>.ts`, run directly) under `test/e2e/` — this is what
  actually exercises the thin script file; coverage is collected across
  subprocesses too. `pnpm coverage` must stay at 100% (measured against
  `src/`, not the generated `bin/`).
