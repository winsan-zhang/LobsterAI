# Quickstart: OpenClaw NPM Package Migration

**Date**: 2026-03-17

## Prerequisites

- Node.js >=24 <25
- npm (bundled with Node.js)
- Network access (for OpenClaw npm package post-install binary download)

## Development Setup (After Migration)

```bash
# Clone and install - OpenClaw is now an npm dependency
git clone <repo-url> && cd LobsterAI
npm install    # OpenClaw + plugins installed automatically

# Start development
npm run electron:dev
```

**No more**: `openclaw:ensure`, `openclaw:patch`, `openclaw:build`, `openclaw:bundle`, `openclaw:plugins`, `openclaw:precompile`, etc.

## Key Changes from Previous Setup

| Before | After |
|--------|-------|
| Clone OpenClaw source repo | `npm install` handles everything |
| Run platform-specific build scripts | npm post-install downloads correct binary |
| Manage `vendor/openclaw-runtime/` symlinks | `node_modules/openclaw/` resolved automatically |
| Vendor plugins manually | Plugins as npm dependencies in `package.json` |
| `extraResources` copies thousands of files | `asarUnpack` extracts from asar archive |

## Verifying the Migration

1. **Gateway starts**: Run `npm run electron:dev`, check logs for "OpenClaw Gateway started on port XXXXX"
2. **Cowork session**: Create a new cowork session, send a prompt, verify response
3. **Plugins**: Configure an IM integration (e.g., DingTalk), verify plugin loads
4. **Extensions**: Verify MCP bridge extension loads (check gateway logs)
5. **Cross-platform**: Build on target platform (`npm run dist:mac` / `dist:win` / `dist:linux`), install, verify

## Troubleshooting

- **Gateway fails to start**: Check that `node_modules/openclaw/` exists and contains platform-appropriate binaries
- **Plugin not found**: Verify plugin npm packages are in `package.json` dependencies
- **Windows ESM error**: The CJS launcher wrapper should handle this automatically; check `gateway-launcher.cjs` generation
- **Path resolution failure**: In packaged app, verify `app.asar.unpacked/node_modules/openclaw/` exists
