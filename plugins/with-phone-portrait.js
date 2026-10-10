// Expo config plugin: phones stay portrait, tablets and foldables may rotate.
// The manifest has no orientation lock (Android 16 ignores it on large screens
// and Play flags it); the lock is applied at runtime only on small screens.
const { withMainActivity } = require('expo/config-plugins');

const MARKER = '// @generated phone-portrait';
const CALL = `    ${MARKER}\n    if (resources.configuration.smallestScreenWidthDp < 600) requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT\n`;

module.exports = function withPhonePortrait(config) {
  return withMainActivity(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (cfg.modResults.language !== 'kt') throw new Error('with-phone-portrait: expected a Kotlin MainActivity');
    if (!src.includes(MARKER)) {
      // Before super.onCreate so the first frame is already portrait.
      src = src.replace(/(\n)(\s*super\.onCreate\()/, `$1${CALL}$2`);
    }
    if (!src.includes('import android.content.pm.ActivityInfo')) {
      src = src.replace(/(package [^\n]+\n)/, '$1import android.content.pm.ActivityInfo\n');
    }
    if (!src.includes(MARKER)) throw new Error('with-phone-portrait: could not find super.onCreate');
    cfg.modResults.contents = src;
    return cfg;
  });
};
