module.exports = function (api) {
  const isTest = process.env.NODE_ENV === 'test';
  api.cache(!isTest);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: [
      'nativewind/babel',
      ...(isTest ? [] : ['react-native-reanimated/plugin']), // must be last, not needed in tests
    ],
  };
};
