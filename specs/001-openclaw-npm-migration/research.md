# Research: OpenClaw NPM Package Migration

**Date**: 2026-03-17

## R1: Runtime Path Resolution Strategy

**Decision**: Replace `vendor/openclaw-runtime/current` and `process.resourcesPath/cfmind` with `node_modules/openclaw` (resolved via `require.resolve` or `import.meta.resolve`).

**Rationale**: The npm package will live in `node_modules/` and be bundled into the asar archive. In production, this means paths resolve from within `app.asar` (JS) or `app.asar.unpacked` (native binaries). Using `require.resolve('openclaw/package.json')` gives us the package root regardless of environment.

**Alternatives considered**:
- Keep `vendor/` with npm postinstall copy: adds complexity, defeats the purpose of npm integration
- Use `extraResources` with npm-sourced files: still has the Windows file-count problem

## R2: Gateway Process Fork with asar

**Decision**: Use `asarUnpack` for the OpenClaw npm package. The gateway entry point must be on the real filesystem for `utilityProcess.fork()` to work correctly, especially on Windows.

**Rationale**: Electron's `utilityProcess.fork()` requires a real filesystem path. Files inside `app.asar` are virtualized and cannot be directly forked as processes. The `asarUnpack` directive automatically extracts specified patterns to `app.asar.unpacked/`, providing real paths while keeping the installer fast (single asar + selective extraction vs thousands of loose files).

**Alternatives considered**:
- Runtime extraction on first launch: adds startup delay, complicates update flow
- Keep everything outside asar: no installer speed improvement

## R3: Plugin Migration from Vendor to NPM

**Decision**: Move plugin packages from `vendor/openclaw-plugins/` to `package.json` dependencies. Plugins are already npm packages (`@dingtalk-real-ai/dingtalk-connector`, `@larksuiteoapi/feishu-openclaw-plugin`, etc.).

**Rationale**: Plugins are already sourced from npm and cached in vendor. Moving them to `package.json` dependencies eliminates the custom caching/syncing logic in `ensure-openclaw-plugins.cjs`. They'll be bundled into asar alongside the OpenClaw runtime.

**Alternatives considered**:
- Keep vendor approach: maintains complexity, no benefit
- Bundle plugins inside OpenClaw package: couples versioning, reduces flexibility

## R4: Build Script Cleanup

**Decision**: Remove or deprecate the following scripts that become unnecessary:
- `scripts/ensure-openclaw-version.cjs` (git clone/checkout)
- `scripts/apply-openclaw-patches.cjs` (patches pre-applied in npm package)
- `scripts/run-build-openclaw-runtime.cjs` (no source compilation)
- `scripts/sync-openclaw-runtime-current.cjs` (no symlink management)
- `scripts/bundle-openclaw-gateway.cjs` (gateway bundled in npm package)
- `scripts/ensure-openclaw-plugins.cjs` (plugins as npm deps)
- `scripts/precompile-openclaw-extensions.cjs` (handled by npm package)
- `scripts/openclaw-runtime-host.cjs` (platform detection for source build)
- `scripts/sync-local-openclaw-extensions.cjs` (may still be needed for dev extensions)
- `scripts/patches/openclaw-gateway-entry.patch` (pre-applied upstream)

**Rationale**: All these scripts exist to manage the source-to-runtime build pipeline. With an npm package, `npm install` replaces this entire chain.

**Alternatives considered**:
- Keep scripts as fallback: adds maintenance burden for a deprecated path

## R5: Windows ESM Workaround

**Decision**: The Windows CJS launcher workaround (`gateway-launcher.cjs`) may still be needed if the npm package entry point is ESM. Evaluate based on the actual npm package format.

**Rationale**: Windows `utilityProcess.fork()` has issues with ESM due to drive letter being misinterpreted as URL scheme. The current `ensureGatewayLauncherCjs()` function generates a CJS wrapper. This logic should be preserved but adapted to resolve the entry point from `node_modules` instead of `vendor`.

**Alternatives considered**:
- Require npm package to ship CJS entry: shifts complexity upstream
- Use `--experimental-vm-modules`: unstable, not suitable for production

## R6: Local Extensions Handling

**Decision**: Preserve `openclaw-extensions/` directory and the sync mechanism for development. In production, local extensions should be synced to the unpacked runtime directory.

**Rationale**: Local extensions like MCP bridge are project-specific and can't be part of the npm package. The sync target changes from `vendor/openclaw-runtime/current/extensions/` to the unpacked npm package location.

**Alternatives considered**:
- Bundle extensions into asar: extensions need filesystem access for plugin loading
- Eliminate local extensions: breaks MCP bridge functionality

## R7: asarUnpack Pattern for OpenClaw

**Decision**: Add `node_modules/openclaw/**` to the `asarUnpack` list in `electron-builder.json`. This ensures the entire OpenClaw runtime is extracted to real filesystem for `utilityProcess.fork()`.

**Rationale**: The OpenClaw runtime needs real filesystem access for:
1. Process forking via `utilityProcess.fork()`
2. Plugin loading from extensions directory
3. Dynamic module resolution at runtime
4. Log file writing

While this means OpenClaw files are on disk (not in asar), they're still installed as part of a single asar-based package, dramatically reducing the Windows installer's file operation count compared to the current `extraResources` approach where files are copied individually during installation.

**Alternatives considered**:
- Selective unpack (only entry + native): plugin loading requires most files accessible
- Full asar with runtime extraction: adds first-launch complexity
