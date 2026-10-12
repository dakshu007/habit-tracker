// Extends app.json. The version people see is app.json "version" (1.0).
// CI passes BUILD_NUMBER so every build gets a higher versionCode — Google Play
// and Android need that to install it as an update.
module.exports = ({ config }) => {
  const build = Number(process.env.BUILD_NUMBER);
  if (!build) return config;
  return { ...config, android: { ...config.android, versionCode: build } };
};
