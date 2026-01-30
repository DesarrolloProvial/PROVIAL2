const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure .cjs files are resolved (needed for some modern packages like date-fns v4 if we were to use it)
config.resolver.sourceExts.push('cjs');

// Resolver para módulos nativos que no soportan web
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    // Módulos nativos que no funcionan en web - retornar mock vacío
    const unsupportedModules = [
      'expo-media-library',
      'expo-camera',
      'expo-av',
      'expo-video-thumbnails',
    ];

    if (unsupportedModules.some(m => moduleName.includes(m))) {
      return {
        filePath: require.resolve('./src/mocks/emptyModule.js'),
        type: 'sourceFile',
      };
    }
  }

  // Usar resolver por defecto para todo lo demás
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
