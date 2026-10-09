// Extends app.json. CI passes BUILD_NUMBER so every APK gets a higher
// versionCode and installs over the previous build as an update.
module.exports = ({ config }) => {
  const build = Number(process.env.BUILD_NUMBER);
  if (!build) return config;
  return {
    ...config,
    version: `${config.version.split('.').slice(0, 2).join('.')}.${build}`,
    android: { ...config.android, versionCode: build },
  };
};
