const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Force use of node-watcher to avoid Watchman issues on Windows
config.resolver.useWatchman = false;

module.exports = config;
