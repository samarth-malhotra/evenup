module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          alias: {
            '@': './src',
            '@api': './src/api',
            '@assets': './src/assets',
            '@hooks': './src/hooks',
            '@features': './src/features',
            '@theme': './src/theme',
            '@mocks': './src/mocks',
            '@components': './src/components',
            '@stores': './src/stores',
            '@services': './src/services',
          },
        },
      ],
    ],
  };
};
