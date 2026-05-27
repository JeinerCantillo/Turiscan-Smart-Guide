const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Let Metro watch the entire pnpm workspace and the pnpm store
config.watchFolders = [workspaceRoot];

// Tell Metro to look in workspace node_modules too (pnpm hoisting)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// pnpm creates symlinks — enable symlink resolution
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
