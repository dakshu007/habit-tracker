module.exports = function (api) {
  api.cache(true);
  // babel-preset-expo auto-adds the react-native-worklets plugin (Reanimated 4).
  return { presets: ['babel-preset-expo'] };
};
