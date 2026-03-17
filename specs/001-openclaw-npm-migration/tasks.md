# Tasks: OpenClaw NPM Package Migration

**Input**: Design documents from `/specs/001-openclaw-npm-migration/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: Not requested in the feature specification. Manual verification only.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify prerequisites and prepare for the migration

- [x] T001 Verify OpenClaw npm package `openclaw@2026.3.13` is available via `npm view openclaw@2026.3.13`
- [x] T002 Record baseline measurements: current Windows installer time, current app package size, current gateway startup time

**Checkpoint**: Prerequisites confirmed, baseline metrics recorded

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Update package dependencies and build configuration — MUST be complete before any user story work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Add `"openclaw": "^2026.3.13"` to dependencies in `package.json`
- [x] T004 Move plugin packages from `openclaw.plugins` config to dependencies in `package.json`: `@dingtalk-real-ai/dingtalk-connector@0.7.9`, `@larksuiteoapi/feishu-openclaw-plugin@2026.3.8`, `@sliverp/qqbot@1.5.3`, `@wecom/wecom-openclaw-plugin@1.0.11`
- [x] T005 Remove `openclaw.version`, `openclaw.repo`, `openclaw.plugins` config sections from `package.json`
- [x] T006 Remove all `openclaw:*` and `predist:*` npm scripts from `package.json`
- [x] T007 Run `npm install` and verify all packages install without conflicts
- [x] T008 Remove OpenClaw `extraResources` entries from `mac`, `win`, `linux` sections in `electron-builder.json`
- [x] T009 Add `"node_modules/openclaw/**"`, `"node_modules/@dingtalk-real-ai/**"`, `"node_modules/@larksuiteoapi/**"`, `"node_modules/@sliverp/**"`, `"node_modules/@wecom/**"` to `asarUnpack` in `electron-builder.json`

**Checkpoint**: Foundation ready — `npm install` works, build config updated, user story implementation can begin

---

## Phase 3: User Story 1 — Windows Installer Speed Improvement (Priority: P1) 🎯 MVP

**Goal**: Bundle OpenClaw via npm + asarUnpack instead of extraResources, reducing Windows installer file operations

**Independent Test**: Build Windows installer (`npm run dist:win`), install on Windows, measure installation time vs baseline

### Implementation for User Story 1

- [x] T010 [US1] Update `resolveRuntimeMetadata()` in `src/main/libs/openclawEngineManager.ts`: change production candidate from `process.resourcesPath/cfmind` to `path.join(process.resourcesPath, 'app.asar.unpacked/node_modules/openclaw')`; change dev candidates from `vendor/openclaw-runtime/current` to `require.resolve('openclaw/package.json')` parent dir
- [x] T011 [US1] Update `resolveOpenClawEntry()` in `src/main/libs/openclawEngineManager.ts`: update entry point candidates to match npm package structure (`openclaw.mjs`, `dist/entry.js`, `dist/entry.mjs`)
- [x] T012 [US1] Update `resolveGatewayClientEntry()` in `src/main/libs/openclawEngineManager.ts`: update client entry resolution paths to look inside npm package directory
- [x] T013 [US1] Update `ensureGatewayLauncherCjs()` in `src/main/libs/openclawEngineManager.ts`: preserve Windows ESM workaround, update all path references from vendor/cfmind to npm package location
- [x] T014 [US1] Update `doStartGateway()` in `src/main/libs/openclawEngineManager.ts`: update `OPENCLAW_HOME` and `OPENCLAW_BUNDLED_PLUGINS_DIR` environment variables to point to npm package location
- [ ] T015 [US1] Verify development mode: run `npm run electron:dev`, confirm gateway starts and connects via WebSocket

**Checkpoint**: User Story 1 complete — OpenClaw runs from npm package in dev mode, Windows build uses asarUnpack

---

## Phase 4: User Story 2 — Application Functionality Preserved (Priority: P1)

**Goal**: Ensure all OpenClaw features (sessions, plugins, extensions) work identically after migration

**Independent Test**: Start cowork session, send prompts, verify plugins load, verify MCP bridge extension works

### Implementation for User Story 2

- [x] T016 [US2] Update `readPreinstalledPluginIds()` in `src/main/libs/openclawConfigSync.ts`: scan npm `node_modules` for plugin packages instead of `vendor/openclaw-plugins/`
- [x] T017 [US2] Update extension sync target in `src/main/libs/openclawLocalExtensions.ts`: change target from `vendor/openclaw-runtime/current/extensions/` to npm package's unpacked extensions directory
- [x] T018 [US2] Update `scripts/sync-local-openclaw-extensions.cjs`: change target directory from `vendor/openclaw-runtime/current` to npm package location
- [ ] T019 [US2] Manually verify cowork session: start session with OpenClaw engine, send prompts, verify tool execution works
- [ ] T020 [US2] Manually verify plugins: configure at least one IM plugin (DingTalk/Feishu/WeCom/QQBot), verify it loads in gateway logs
- [ ] T021 [US2] Manually verify local extensions: confirm MCP bridge extension from `openclaw-extensions/` loads and operates

**Checkpoint**: User Story 2 complete — all existing functionality preserved

---

## Phase 5: User Story 3 — Developer Build Experience (Priority: P2)

**Goal**: Simplify developer setup by removing source-compilation build pipeline

**Independent Test**: Fresh clone → `npm install` → `npm run electron:dev` → gateway works, no additional manual steps

### Implementation for User Story 3

- [x] T022 [P] [US3] Delete `scripts/ensure-openclaw-version.cjs`
- [x] T023 [P] [US3] Delete `scripts/apply-openclaw-patches.cjs`
- [x] T024 [P] [US3] Delete `scripts/run-build-openclaw-runtime.cjs`
- [x] T025 [P] [US3] Delete `scripts/sync-openclaw-runtime-current.cjs`
- [x] T026 [P] [US3] Delete `scripts/bundle-openclaw-gateway.cjs`
- [x] T027 [P] [US3] Delete `scripts/ensure-openclaw-plugins.cjs`
- [x] T028 [P] [US3] Delete `scripts/precompile-openclaw-extensions.cjs`
- [x] T029 [P] [US3] Delete `scripts/openclaw-runtime-host.cjs`
- [x] T030 [P] [US3] Delete `scripts/patches/openclaw-gateway-entry.patch`
- [x] T031 [US3] Remove `vendor/openclaw-runtime/` directory
- [x] T032 [US3] Remove `vendor/openclaw-plugins/` directory
- [ ] T033 [US3] Verify clean dev setup: `npm install` then `npm run electron:dev` works without any openclaw:* scripts

**Checkpoint**: User Story 3 complete — developer setup simplified to `npm install`

---

## Phase 6: User Story 4 — Cross-Platform Compatibility (Priority: P2)

**Goal**: Verify migration works correctly on all supported platforms

**Independent Test**: Build and run on macOS (arm64/x64) and Linux (x64), verify gateway operates

### Implementation for User Story 4

- [ ] T034 [US4] Build macOS package via `npm run dist:mac`, install and verify gateway starts, verify `app.asar.unpacked/node_modules/openclaw/` exists
- [ ] T035 [US4] Build Linux package via `npm run dist:linux`, install and verify gateway starts, verify `app.asar.unpacked/node_modules/openclaw/` exists
- [ ] T036 [US4] Build Windows package via `npm run dist:win`, install and verify gateway starts, verify NSIS installer speed improvement

**Checkpoint**: User Story 4 complete — all platforms verified

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and measurement

- [ ] T037 Measure Windows installer time and compare against baseline from T002 (target: 50% faster)
- [ ] T038 Measure app package size and compare against baseline from T002 (target: no more than 10% increase)
- [ ] T039 Measure gateway startup time and compare against baseline from T002 (target: within 10% of current)
- [x] T040 Run `npm run lint` to ensure no linting errors
- [x] T041 Update any references to `vendor/openclaw-runtime` or `cfmind` paths in comments or documentation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2)
- **User Story 2 (Phase 4)**: Depends on User Story 1 (Phase 3) — needs path resolution working before testing plugins/extensions
- **User Story 3 (Phase 5)**: Depends on User Story 2 (Phase 4) — only safe to delete build scripts after confirming everything works
- **User Story 4 (Phase 6)**: Depends on User Story 3 (Phase 5) — cross-platform verification after all changes are in
- **Polish (Phase 7)**: Depends on all user stories being complete

### Within Each User Story

- Core path resolution before peripheral updates
- Implementation before manual verification
- Story complete before moving to next priority

### Parallel Opportunities

- T003, T004, T005, T006 can be done as a single `package.json` edit
- T008, T009 can be done as a single `electron-builder.json` edit
- T022–T030 (script deletions) are all [P] parallelizable
- T034, T035, T036 (platform builds) can run in parallel if multi-platform CI is available

---

## Parallel Example: User Story 3

```bash
# Launch all script deletions in parallel:
Task: "Delete scripts/ensure-openclaw-version.cjs"
Task: "Delete scripts/apply-openclaw-patches.cjs"
Task: "Delete scripts/run-build-openclaw-runtime.cjs"
Task: "Delete scripts/sync-openclaw-runtime-current.cjs"
Task: "Delete scripts/bundle-openclaw-gateway.cjs"
Task: "Delete scripts/ensure-openclaw-plugins.cjs"
Task: "Delete scripts/precompile-openclaw-extensions.cjs"
Task: "Delete scripts/openclaw-runtime-host.cjs"
Task: "Delete scripts/patches/openclaw-gateway-entry.patch"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (verify npm package available)
2. Complete Phase 2: Foundational (update package.json + electron-builder.json)
3. Complete Phase 3: User Story 1 (update path resolution in openclawEngineManager.ts)
4. **STOP and VALIDATE**: Test gateway starts in dev mode
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test gateway in dev mode → MVP!
3. Add User Story 2 → Test plugins/extensions → Functional parity confirmed
4. Add User Story 3 → Delete build scripts → Dev experience simplified
5. Add User Story 4 → Cross-platform builds → Full verification
6. Polish → Measure metrics → Compare against targets

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- This migration is sequential by nature: path resolution must work before testing plugins, scripts should only be deleted after confirming everything works
- Commit after each phase completion for safe rollback points
- Stop at any checkpoint to validate independently
