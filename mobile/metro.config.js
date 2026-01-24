const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure .cjs files are resolved (needed for some modern packages like date-fns v4 if we were to use it)
config.resolver.sourceExts.push('cjs');

module.exports = config;
