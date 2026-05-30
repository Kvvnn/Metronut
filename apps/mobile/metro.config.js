const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const sharedRoot = path.resolve(projectRoot, '../../shared');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders ?? []), sharedRoot, workspaceRoot];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  '@shared': sharedRoot,
};
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
