# Feature Specification: OpenClaw NPM Package Migration

**Feature Branch**: `001-openclaw-npm-migration`
**Created**: 2026-03-17
**Status**: Draft
**Input**: User description: "将OpenClaw从源码编译改为npm包安装引入，打包到asar文件中以优化Windows安装速度"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Windows Installer Speed Improvement (Priority: P1)

As a Windows user downloading and installing LobsterAI, I want the installation process to complete significantly faster so that I don't have to wait an unreasonably long time for the app to be ready.

**Why this priority**: This is the primary motivation for the entire feature. The current Windows installer is slow because it must extract and copy the full OpenClaw source-compiled runtime (~thousands of files), which is time-consuming on Windows due to filesystem overhead. Bundling OpenClaw as an npm dependency inside the asar archive dramatically reduces file count and extraction time.

**Independent Test**: Install LobsterAI on a Windows machine and measure total installation time. Compare against baseline measurement with current installer.

**Acceptance Scenarios**:

1. **Given** a fresh Windows machine, **When** the user runs the LobsterAI installer, **Then** installation completes in noticeably less time than the current installer (target: at least 50% faster)
2. **Given** a Windows machine with an existing LobsterAI installation, **When** the user upgrades to the new version, **Then** the upgrade process is also faster due to reduced file operations

---

### User Story 2 - Application Functionality Preserved (Priority: P1)

As a user of LobsterAI's Cowork feature, I want all OpenClaw-powered features (agent sessions, IM integrations, plugins, extensions) to work identically after the migration so that my workflow is not disrupted.

**Why this priority**: Equal to P1 because the migration must not break any existing functionality. The OpenClaw gateway must start, accept WebSocket connections, execute agent sessions, and support all plugins/extensions exactly as before.

**Independent Test**: Start a cowork session using the OpenClaw engine, send prompts, verify tool execution, check IM integrations (DingTalk, Feishu, WeCom, QQBot), and verify local extensions (MCP bridge) load correctly.

**Acceptance Scenarios**:

1. **Given** the migrated application is installed, **When** the user starts a cowork session with OpenClaw engine, **Then** the session operates identically to the source-compiled version
2. **Given** plugins are configured, **When** the OpenClaw gateway starts, **Then** all plugins (DingTalk, Feishu, WeCom, QQBot) load and function correctly
3. **Given** local extensions exist, **When** the gateway initializes, **Then** extensions like MCP bridge are available and operational

---

### User Story 3 - Developer Build Experience (Priority: P2)

As a developer working on LobsterAI, I want the development setup to be simpler with OpenClaw as an npm dependency so that I don't need to clone, patch, and compile OpenClaw from source.

**Why this priority**: Improves developer experience but is secondary to end-user impact. Removing the complex source-build pipeline (ensure → patch → build → sync → bundle → plugins → extensions → precompile) simplifies onboarding and CI/CD.

**Independent Test**: Clone the LobsterAI repo, run `npm install`, then `npm run electron:dev`, and verify OpenClaw functions without additional manual steps.

**Acceptance Scenarios**:

1. **Given** a fresh clone of the repository, **When** the developer runs `npm install`, **Then** OpenClaw runtime is automatically available via node_modules
2. **Given** the development environment is set up, **When** the developer runs `npm run electron:dev`, **Then** the OpenClaw gateway starts and functions correctly

---

### User Story 4 - Cross-Platform Compatibility (Priority: P2)

As a user on macOS or Linux, I want the application to continue working correctly after the migration, even though the primary motivation is Windows performance.

**Why this priority**: The migration must not regress other platforms. Since asar packaging affects all platforms, cross-platform compatibility must be verified.

**Independent Test**: Build and run LobsterAI on macOS (arm64 and x64) and Linux (x64), verify OpenClaw gateway starts and operates correctly.

**Acceptance Scenarios**:

1. **Given** the migrated application on macOS, **When** the user launches the app, **Then** OpenClaw gateway starts and operates correctly
2. **Given** the migrated application on Linux, **When** the user launches the app, **Then** OpenClaw gateway starts and operates correctly

---

### Edge Cases

- What happens when the npm package version of OpenClaw is incompatible with existing user data or configuration?
- How does the system handle native binary dependencies within the npm package across different platforms (Windows x64, macOS arm64/x64, Linux x64)?
- What happens if the asar archive becomes too large and impacts application startup time?
- How does the system handle OpenClaw gateway startup when running from within an asar archive (file path resolution differences)?
- What happens to users who have custom local extensions in the `openclaw-extensions/` directory?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST replace the source-compiled OpenClaw integration with an npm package dependency
- **FR-002**: System MUST bundle the OpenClaw runtime into the Electron asar archive instead of using extraResources
- **FR-003**: System MUST support all current OpenClaw functionality: gateway startup, WebSocket communication, agent session execution, plugin loading, and extension support
- **FR-004**: System MUST maintain support for all current platforms: Windows x64, macOS arm64, macOS x64, and Linux x64
- **FR-005**: System MUST handle platform-specific native binaries correctly via a single npm package that downloads the appropriate platform binary during post-install (similar to the esbuild distribution model)
- **FR-006**: System MUST preserve the ability to load and use local extensions (e.g., MCP bridge from `openclaw-extensions/`)
- **FR-007**: System MUST preserve the ability to load vendored plugins (DingTalk, Feishu, WeCom, QQBot)
- **FR-008**: System MUST update the Electron main process to resolve OpenClaw paths from node_modules/asar rather than extraResources
- **FR-009**: System MUST remove or deprecate the source-compilation build scripts that are no longer needed
- **FR-010**: System MUST maintain the OpenClaw version pinning mechanism to ensure reproducible builds

### Key Entities

- **OpenClaw Runtime**: The gateway server that executes agent sessions, currently compiled from source and distributed as extraResources, to be migrated to an npm package bundled in asar
- **OpenClaw Plugins**: Third-party IM connector plugins distributed via npm, must continue to work with the new packaging approach
- **Local Extensions**: User/developer-defined extensions in `openclaw-extensions/` directory that are synced into the runtime
- **Gateway Configuration**: Runtime configuration stored in user data directory (`openclaw.json`, tokens, ports)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Windows installer completes at least 50% faster compared to the current installer
- **SC-002**: Application package size on disk does not increase by more than 10% compared to the current distribution
- **SC-003**: All existing cowork sessions, IM integrations, and plugin functionality work identically after migration
- **SC-004**: Developer setup time (from fresh clone to running dev environment) is reduced by eliminating source compilation steps
- **SC-005**: OpenClaw gateway startup time remains within 10% of current performance
- **SC-006**: Installation and operation work correctly on all supported platforms (Windows x64, macOS arm64/x64, Linux x64)

## Assumptions

- An official or suitable OpenClaw npm package exists or can be published that includes the gateway runtime
- The npm package uses a post-install script to download the correct platform-specific binary (similar to esbuild's distribution model), requiring network access during `npm install`
- The asar archive format can accommodate the OpenClaw runtime without causing file access issues for the gateway process
- Electron's `utilityProcess.fork()` can load modules from within the asar archive, or an appropriate extraction mechanism exists
- The current plugin and extension loading mechanisms are compatible with the new packaging approach, or can be adapted with minimal changes
