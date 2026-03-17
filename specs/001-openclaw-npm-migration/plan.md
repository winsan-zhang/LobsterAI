# Implementation Plan: OpenClaw NPM Package Migration

**Branch**: `001-openclaw-npm-migration` | **Date**: 2026-03-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-openclaw-npm-migration/spec.md`

## Summary

Migrate OpenClaw from source-compiled runtime (cloned from git, built per-platform, distributed via `extraResources`) to an npm package dependency bundled into the Electron asar archive with `asarUnpack`. This eliminates the complex build pipeline, dramatically reduces Windows installer time by reducing file operations, and simplifies developer setup to a single `npm install`.

## Technical Context

**Language/Version**: TypeScript (Node.js >=24 <25), Electron 40.2.1
**Primary Dependencies**: OpenClaw (npm package), electron-builder, esbuild
**Storage**: SQLite via sql.js (unchanged)
**Testing**: Manual verification (gateway startup, cowork sessions, plugins, cross-platform)
**Target Platform**: Windows x64, macOS arm64/x64, Linux x64 (Electron desktop app)
**Project Type**: Desktop app (Electron + React)
**Performance Goals**: Windows installer 50% faster, gateway startup within 10% of current
**Constraints**: `utilityProcess.fork()` requires real filesystem paths (not asar-virtual); OpenClaw npm package must exist as prerequisite
**Scale/Scope**: Build/packaging change affecting ~10 files, no UI changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution is a template with no concrete gates defined. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-openclaw-npm-migration/
├── plan.md              # This file
├── research.md          # Phase 0 output - all research decisions
├── data-model.md        # Phase 1 output - configuration/dependency model
├── quickstart.md        # Phase 1 output - developer setup guide
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
# Files to MODIFY:
src/main/libs/openclawEngineManager.ts     # Path resolution, entry point, env vars
src/main/libs/openclawLocalExtensions.ts   # Extension sync target directory
electron-builder.json                       # Remove extraResources, add asarUnpack
package.json                                # Add openclaw + plugin deps, remove build scripts

# Files to REMOVE:
scripts/ensure-openclaw-version.cjs
scripts/apply-openclaw-patches.cjs
scripts/run-build-openclaw-runtime.cjs
scripts/sync-openclaw-runtime-current.cjs
scripts/bundle-openclaw-gateway.cjs
scripts/ensure-openclaw-plugins.cjs
scripts/precompile-openclaw-extensions.cjs
scripts/openclaw-runtime-host.cjs
scripts/patches/openclaw-gateway-entry.patch

# Directories to REMOVE (after migration):
vendor/openclaw-runtime/
vendor/openclaw-plugins/
```

**Structure Decision**: Existing Electron project structure preserved. Changes are confined to build configuration, path resolution in the main process, and removal of build scripts.

## Complexity Tracking

No constitution violations to justify.

## Implementation Phases

### Phase A: Package Dependencies (Foundation)

**Goal**: Replace source-compiled OpenClaw with npm dependencies.

1. **Update `package.json`**:
   - Add `"openclaw": "^2026.3.13"` to dependencies
   - Move plugin packages from `openclaw.plugins` config to dependencies:
     - `"@dingtalk-real-ai/dingtalk-connector": "0.7.9"`
     - `"@larksuiteoapi/feishu-openclaw-plugin": "2026.3.8"`
     - `"@sliverp/qqbot": "1.5.3"`
     - `"@wecom/wecom-openclaw-plugin": "1.0.11"`
   - Remove `openclaw.version`, `openclaw.repo`, `openclaw.plugins` config sections
   - Remove all `openclaw:*` npm scripts
   - Remove `predist:*` scripts that trigger OpenClaw builds

2. **Update `electron-builder.json`**:
   - Remove OpenClaw `extraResources` entries from `mac`, `win`, `linux` sections
   - Add to `asarUnpack`:
     - `"node_modules/openclaw/**"`
     - Plugin package patterns as needed

3. **Run `npm install`** to verify OpenClaw package installs correctly

### Phase B: Runtime Path Resolution (Core Change)

**Goal**: Update the main process to find OpenClaw from `node_modules` instead of `vendor/` or `extraResources`.

1. **Modify `openclawEngineManager.ts`**:
   - `resolveRuntimeMetadata()`: Change candidates from `resourcesPath/cfmind` and `vendor/openclaw-runtime/current` to resolve from `node_modules/openclaw`
     - Production: `path.join(process.resourcesPath, 'app.asar.unpacked/node_modules/openclaw')`
     - Development: Resolve via `require.resolve('openclaw/package.json')` → parent dir
   - `resolveOpenClawEntry()`: Update entry point candidates to match npm package structure
   - `resolveGatewayClientEntry()`: Update client entry resolution
   - `ensureGatewayLauncherCjs()`: Preserve Windows ESM workaround, update paths
   - `doStartGateway()`: Update `OPENCLAW_HOME` and `OPENCLAW_BUNDLED_PLUGINS_DIR` env vars

2. **Modify `openclawLocalExtensions.ts`**:
   - Update extension sync target from `vendor/openclaw-runtime/current/extensions/` to the npm package's unpacked extensions directory

3. **Modify `openclawConfigSync.ts`** (if needed):
   - Update `readPreinstalledPluginIds()` to scan npm `node_modules` instead of `vendor/openclaw-plugins/`

### Phase C: Build Script Cleanup

**Goal**: Remove deprecated source-build infrastructure.

1. **Delete build scripts**:
   - `scripts/ensure-openclaw-version.cjs`
   - `scripts/apply-openclaw-patches.cjs`
   - `scripts/run-build-openclaw-runtime.cjs`
   - `scripts/sync-openclaw-runtime-current.cjs`
   - `scripts/bundle-openclaw-gateway.cjs`
   - `scripts/ensure-openclaw-plugins.cjs`
   - `scripts/precompile-openclaw-extensions.cjs`
   - `scripts/openclaw-runtime-host.cjs`
   - `scripts/patches/openclaw-gateway-entry.patch`

2. **Update `scripts/sync-local-openclaw-extensions.cjs`**:
   - Change target directory from `vendor/openclaw-runtime/current` to npm package location

3. **Clean up `vendor/` directory**:
   - Remove `vendor/openclaw-runtime/`
   - Remove `vendor/openclaw-plugins/`

### Phase D: Verification

**Goal**: Validate all functionality works correctly.

1. **Development mode**: `npm run electron:dev`
   - Gateway starts successfully
   - Cowork session works end-to-end
   - Plugins load (verify in gateway logs)
   - Local extensions sync (MCP bridge)

2. **Production build** (per platform):
   - `npm run dist:mac` / `dist:win` / `dist:linux`
   - Install and verify gateway starts
   - Verify `app.asar.unpacked/node_modules/openclaw/` exists with correct files
   - Measure installer speed (Windows target: 50% faster)

3. **Cross-platform check**:
   - Windows: ESM workaround, NSIS installer speed
   - macOS: arm64 and x64 builds
   - Linux: AppImage and deb

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| OpenClaw npm package not ready | Blocks entire feature | Verify package availability before starting implementation |
| `utilityProcess.fork()` fails from unpacked path | Gateway won't start | Test early in Phase B; fall back to extraResources if needed |
| Plugin npm packages have peer dependency conflicts | Build failure | Test `npm install` with all plugins before removing vendor |
| asar.unpacked size too large | Installer not faster | Measure early; selective unpack if needed |
| Windows CJS launcher breaks with new paths | Windows-only regression | Preserve and adapt existing launcher logic |
