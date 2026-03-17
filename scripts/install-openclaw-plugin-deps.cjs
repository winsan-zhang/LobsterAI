'use strict';

/**
 * Install production dependencies for OpenClaw plugin packages.
 *
 * OpenClaw loads plugins via jiti (runtime TS) from {runtimeRoot}/extensions/{id}/.
 * When plugins are installed as npm dependencies of LobsterAI, their own dependencies
 * get hoisted to the top-level node_modules, but OpenClaw resolves them relative to
 * the plugin directory. This script runs `npm install --omit=dev` inside each plugin
 * package so its dependencies are available locally.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PLUGINS = [
  { npm: '@dingtalk-real-ai/dingtalk-connector', id: 'dingtalk-connector' },
  { npm: '@larksuiteoapi/feishu-openclaw-plugin', id: 'feishu-openclaw-plugin' },
  { npm: '@sliverp/qqbot', id: 'qqbot' },
  { npm: '@wecom/wecom-openclaw-plugin', id: 'wecom-openclaw-plugin' },
];

function main() {
  const rootDir = path.resolve(__dirname, '..');
  let installed = 0;
  let skipped = 0;

  for (const plugin of PLUGINS) {
    const pluginDir = path.join(rootDir, 'node_modules', ...plugin.npm.split('/'));

    if (!fs.existsSync(pluginDir)) {
      console.log(`[install-plugin-deps] ${plugin.id}: package not found, skipping`);
      skipped++;
      continue;
    }

    const pluginPkg = path.join(pluginDir, 'package.json');
    if (!fs.existsSync(pluginPkg)) {
      skipped++;
      continue;
    }

    const pkg = JSON.parse(fs.readFileSync(pluginPkg, 'utf8'));
    const deps = pkg.dependencies || {};
    if (Object.keys(deps).length === 0) {
      console.log(`[install-plugin-deps] ${plugin.id}: no dependencies, skipping`);
      skipped++;
      continue;
    }

    // Check if node_modules already exists and has some expected packages
    const pluginNodeModules = path.join(pluginDir, 'node_modules');
    if (fs.existsSync(pluginNodeModules)) {
      const firstDep = Object.keys(deps)[0];
      const firstDepParts = firstDep.startsWith('@') ? firstDep.split('/') : [firstDep];
      if (fs.existsSync(path.join(pluginNodeModules, ...firstDepParts))) {
        console.log(`[install-plugin-deps] ${plugin.id}: dependencies already installed, skipping`);
        skipped++;
        continue;
      }
    }

    console.log(`[install-plugin-deps] ${plugin.id}: installing dependencies...`);
    try {
      execSync('npm install --omit=dev --ignore-scripts', {
        cwd: pluginDir,
        stdio: 'pipe',
        timeout: 120000,
        shell: process.platform === 'win32',
      });
      console.log(`[install-plugin-deps] ${plugin.id}: done`);
      installed++;
    } catch (err) {
      console.error(`[install-plugin-deps] ${plugin.id}: FAILED - ${err.message}`);
    }
  }

  console.log(`[install-plugin-deps] ${installed} installed, ${skipped} skipped`);
}

main();
