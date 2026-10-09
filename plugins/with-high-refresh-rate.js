// Expo config plugin: ask Android for the display's fastest mode (90/120/144 Hz)
// at the current resolution. Many devices otherwise pin apps to 60 Hz.
const { withMainActivity } = require('expo/config-plugins');

const CALL_MARKER = '// @generated high-refresh-rate call';
const FN_MARKER = '// @generated high-refresh-rate fn';

const CALL = `    ${CALL_MARKER}\n    requestHighestRefreshRate()\n`;

const FN = `
  ${FN_MARKER}
  /** Prefer the fastest display mode at the current resolution (smooth 90/120 Hz). */
  private fun requestHighestRefreshRate() {
    val disp = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) display else @Suppress("DEPRECATION") windowManager.defaultDisplay
    if (disp == null) return
    val current = disp.mode
    val best = disp.supportedModes
      .filter { it.physicalWidth == current.physicalWidth && it.physicalHeight == current.physicalHeight }
      .maxByOrNull { it.refreshRate } ?: return
    if (best.modeId == current.modeId && best.refreshRate <= 60f) return
    window.attributes = window.attributes.also { it.preferredDisplayModeId = best.modeId }
  }
`;

module.exports = function withHighRefreshRate(config) {
  return withMainActivity(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (cfg.modResults.language !== 'kt') {
      throw new Error('with-high-refresh-rate: expected a Kotlin MainActivity');
    }
    if (!src.includes(CALL_MARKER)) {
      src = src.replace(/(\n\s*super\.onCreate\([^)]*\)\n)/, `$1${CALL}`);
    }
    if (!src.includes(FN_MARKER)) {
      // Insert the helper just before the class's final closing brace.
      const end = src.lastIndexOf('}');
      src = `${src.slice(0, end)}${FN}}\n`;
    }
    if (!src.includes('import android.os.Build')) {
      src = src.replace(/(package [^\n]+\n)/, '$1import android.os.Build\n');
    }
    if (!src.includes(CALL_MARKER)) throw new Error('with-high-refresh-rate: could not find super.onCreate');
    cfg.modResults.contents = src;
    return cfg;
  });
};
