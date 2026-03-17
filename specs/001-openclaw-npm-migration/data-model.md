# Data Model: OpenClaw NPM Package Migration

**Date**: 2026-03-17

This migration is primarily a build/packaging change. No database schema changes are required. The data model documents the configuration and dependency structures that change.

## Entity: Package Dependencies

### Before (source-compiled)

```
package.json:
  openclaw.version: "v2026.3.2"          # git tag for source checkout
  openclaw.repo: "https://github.com/openclaw/openclaw.git"
  openclaw.plugins: [                     # plugins installed via custom script
    { id, npm, version }
  ]

vendor/
  openclaw-runtime/
    current -> mac-arm64/                 # symlink to platform build
    mac-arm64/                            # compiled runtime
    win-x64/
  openclaw-plugins/                       # cached plugin installs
    dingtalk-connector/
    feishu-openclaw-plugin/
    ...
```

### After (npm package)

```
package.json:
  dependencies:
    "openclaw": "^2026.3.13"              # npm package with post-install binary download
    "@dingtalk-real-ai/dingtalk-connector": "0.7.9"
    "@larksuiteoapi/feishu-openclaw-plugin": "2026.3.8"
    "@sliverp/qqbot": "1.5.3"
    "@wecom/wecom-openclaw-plugin": "1.0.11"

node_modules/
  openclaw/                               # npm package (JS + platform binaries)
    package.json
    openclaw.mjs                          # gateway entry (or dist/entry.js)
    dist/
    extensions/                           # plugin mount point
```

## Entity: Runtime Path Resolution

### Path Candidates (Before → After)

| Context | Before | After |
|---------|--------|-------|
| Production (packaged) | `process.resourcesPath/cfmind` | `app.asar.unpacked/node_modules/openclaw` |
| Development | `app.getAppPath()/vendor/openclaw-runtime/current` | `require.resolve('openclaw/package.json')` parent dir |
| Fallback (dev) | `process.cwd()/vendor/openclaw-runtime/current` | Same as above (npm resolution handles it) |

## Entity: Electron Builder Configuration

### extraResources Changes

| Platform | Before | After |
|----------|--------|-------|
| macOS | `vendor/openclaw-runtime/current → cfmind` | Removed (in asar/asarUnpack) |
| Windows | `vendor/openclaw-runtime/current → cfmind` | Removed (in asar/asarUnpack) |
| Linux | `vendor/openclaw-runtime/current → cfmind` | Removed (in asar/asarUnpack) |

### asarUnpack Additions

```json
"asarUnpack": [
  "node_modules/@anthropic-ai/claude-agent-sdk/**",
  "node_modules/@img/**",
  "node_modules/sql.js/dist/**",
  "node_modules/node-nim/**",
  "node_modules/npm/**",
  "node_modules/openclaw/**",
  "node_modules/@dingtalk-real-ai/**",
  "node_modules/@larksuiteoapi/**",
  "node_modules/@sliverp/**",
  "node_modules/@wecom/**"
]
```

## Entity: Build Scripts

### Scripts Removed

| Script | Current Purpose | Replacement |
|--------|----------------|-------------|
| `ensure-openclaw-version.cjs` | Git clone/checkout | `npm install` |
| `apply-openclaw-patches.cjs` | Patch gateway entry | Pre-applied in npm package |
| `run-build-openclaw-runtime.cjs` | Platform build | npm post-install binary download |
| `sync-openclaw-runtime-current.cjs` | Symlink management | npm resolution |
| `bundle-openclaw-gateway.cjs` | esbuild bundling | Pre-bundled in npm package |
| `ensure-openclaw-plugins.cjs` | Plugin caching/install | npm dependencies |
| `precompile-openclaw-extensions.cjs` | Extension precompile | Handled by npm package |
| `openclaw-runtime-host.cjs` | Platform detection | npm post-install handles platform |

### Scripts Retained (modified)

| Script | Purpose | Changes |
|--------|---------|---------|
| `sync-local-openclaw-extensions.cjs` | Dev extension sync | Target dir changes to npm package location |

### npm Scripts Removed

All `openclaw:*` scripts in package.json will be removed:
- `openclaw:ensure`, `openclaw:patch`, `openclaw:plugins`, `openclaw:bundle`
- `openclaw:extensions:local`, `openclaw:precompile`
- `openclaw:runtime:*` (all platform-specific build chains)
- `predist:*` scripts that trigger OpenClaw builds

## Entity: Environment Variables (Gateway Process)

| Variable | Before | After |
|----------|--------|-------|
| `OPENCLAW_HOME` | `vendor/openclaw-runtime/current` or `resourcesPath/cfmind` | `node_modules/openclaw` (unpacked) |
| `OPENCLAW_BUNDLED_PLUGINS_DIR` | `{runtimeRoot}/extensions` | `{runtimeRoot}/extensions` (same relative, different root) |
| Others | Unchanged | Unchanged |

## State Transitions

No state machine changes. The gateway lifecycle (stopped → starting → healthy → stopping → stopped) remains identical.
