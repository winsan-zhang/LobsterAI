import { app } from 'electron';
import fs from 'fs';
import path from 'path';

const LOCAL_EXTENSIONS_DIR = 'openclaw-extensions';

/**
 * npm plugin packages that need to be symlinked into the OpenClaw extensions directory.
 * Key: npm package name, Value: plugin ID (directory name under extensions/)
 */
const NPM_PLUGIN_PACKAGES: Record<string, string> = {
  '@dingtalk-real-ai/dingtalk-connector': 'dingtalk-connector',
  '@larksuiteoapi/feishu-openclaw-plugin': 'feishu-openclaw-plugin',
  '@sliverp/qqbot': 'qqbot',
  '@wecom/wecom-openclaw-plugin': 'wecom-openclaw-plugin',
};

const findLocalExtensionsSourceDir = (): string | null => {
  if (app.isPackaged) {
    return null;
  }

  const candidates = [
    path.join(app.getAppPath(), LOCAL_EXTENSIONS_DIR),
    path.join(process.cwd(), LOCAL_EXTENSIONS_DIR),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isDirectory()) {
        return candidate;
      }
    } catch {
      // Ignore missing candidates.
    }
  }

  return null;
};

const findBundledExtensionsDir = (): string | null => {
  const candidates = app.isPackaged
    ? [
        path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'openclaw', 'extensions'),
        // Legacy fallback
        path.join(process.resourcesPath, 'cfmind', 'extensions'),
      ]
    : [
        path.join(app.getAppPath(), 'node_modules', 'openclaw', 'extensions'),
        // Legacy fallback
        path.join(app.getAppPath(), 'vendor', 'openclaw-runtime', 'current', 'extensions'),
        path.join(process.cwd(), 'vendor', 'openclaw-runtime', 'current', 'extensions'),
      ];

  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isDirectory()) {
        return candidate;
      }
    } catch {
      // Ignore missing candidates.
    }
  }

  return null;
};

/**
 * Sync npm plugin packages into the OpenClaw runtime extensions directory.
 * Plugins installed as npm dependencies (e.g. @dingtalk-real-ai/dingtalk-connector)
 * need to be available under {runtimeRoot}/extensions/{pluginId}/ for OpenClaw to find them.
 */
export const syncNpmPluginsIntoRuntime = (
  runtimeRoot: string,
): { synced: string[] } => {
  const targetExtensionsDir = path.join(runtimeRoot, 'extensions');
  fs.mkdirSync(targetExtensionsDir, { recursive: true });

  const nodeModulesRoot = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules')
    : path.join(app.getAppPath(), 'node_modules');

  const synced: string[] = [];
  for (const [npmName, pluginId] of Object.entries(NPM_PLUGIN_PACKAGES)) {
    const pluginSrc = path.join(nodeModulesRoot, ...npmName.split('/'));
    const pluginDest = path.join(targetExtensionsDir, pluginId);

    if (!fs.existsSync(pluginSrc)) {
      continue;
    }

    // Skip if already a real directory (previously copied)
    if (fs.existsSync(pluginDest)) {
      try {
        const stat = fs.lstatSync(pluginDest);
        if (stat.isSymbolicLink()) {
          // Remove symlink, replace with copy (some OpenClaw versions don't follow symlinks)
          fs.unlinkSync(pluginDest);
        } else if (stat.isDirectory()) {
          // Already copied, skip
          synced.push(pluginId);
          continue;
        }
      } catch {
        // ignore
      }
    }

    try {
      fs.cpSync(pluginSrc, pluginDest, { recursive: true, force: true });
      synced.push(pluginId);
    } catch (err) {
      console.error(`[OpenClaw] Failed to sync plugin ${pluginId} from ${pluginSrc}:`, err);
    }
  }

  return { synced };
};

export const syncLocalOpenClawExtensionsIntoRuntime = (
  runtimeRoot: string,
): { sourceDir: string | null; copied: string[] } => {
  const sourceDir = findLocalExtensionsSourceDir();
  if (!sourceDir) {
    return { sourceDir: null, copied: [] };
  }

  const targetExtensionsDir = path.join(runtimeRoot, 'extensions');
  try {
    if (!fs.statSync(targetExtensionsDir).isDirectory()) {
      return { sourceDir, copied: [] };
    }
  } catch {
    return { sourceDir, copied: [] };
  }

  const copied: string[] = [];
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    fs.cpSync(
      path.join(sourceDir, entry.name),
      path.join(targetExtensionsDir, entry.name),
      { recursive: true, force: true },
    );
    copied.push(entry.name);
  }

  return { sourceDir, copied };
};

export const listLocalOpenClawExtensionIds = (): string[] => {
  const sourceDir = findLocalExtensionsSourceDir();
  if (!sourceDir) {
    return [];
  }

  try {
    return fs.readdirSync(sourceDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .filter((entry) => fs.existsSync(path.join(sourceDir, entry.name, 'openclaw.plugin.json')))
      .map((entry) => entry.name);
  } catch {
    return [];
  }
};

export const listBundledOpenClawExtensionIds = (): string[] => {
  const extensionsDir = findBundledExtensionsDir();
  if (!extensionsDir) {
    return [];
  }

  try {
    return fs.readdirSync(extensionsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .filter((entry) => fs.existsSync(path.join(extensionsDir, entry.name, 'openclaw.plugin.json')))
      .map((entry) => entry.name);
  } catch {
    return [];
  }
};

export const hasBundledOpenClawExtension = (extensionId: string): boolean => {
  return listBundledOpenClawExtensionIds().includes(extensionId)
    || listLocalOpenClawExtensionIds().includes(extensionId);
};
