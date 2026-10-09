// Expo config plugin: long-press the app icon → Voice log / Quick log / Start a run.
// Each shortcut opens a deep link handled by the app's navigation (App.tsx linking).
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('expo/config-plugins');

const SHORTCUTS = [
  { id: 'voice', url: 'habittracker://voice', icon: 'shortcut_voice', label: { en: 'Voice log', hi: 'बोलकर लॉग करें' }, color: '#4C8DF6',
    glyph: 'M12,3.5a3,3 0,0 0,-3 3v5.5a3,3 0,0 0,6 0V6.5a3,3 0,0 0,-3 -3z M6.5,11.5a5.5,5.5 0,0 0,11 0 M12,17v3.5' },
  { id: 'quicklog', url: 'habittracker://quick-log', icon: 'shortcut_log', label: { en: 'Quick log', hi: 'जल्दी लॉग' }, color: '#34C759',
    glyph: 'M12,2.5a9.5,9.5 0,1 0,0 19a9.5,9.5 0,1 0,0 -19z M7.5,12.5l3,3l6,-6.5' },
  { id: 'run', url: 'habittracker://run', icon: 'shortcut_run', label: { en: 'Start a run', hi: 'दौड़ शुरू करें' }, color: '#FF8A3D',
    glyph: 'M13.5,4.5a1.5,1.5 0,1 0,3 0a1.5,1.5 0,1 0,-3 0z M7,21l3,-5l3,2.5v-6l2.5,2.5l3,-1.5 M10,12.5l1.5,-4.5l-3.5,1.5l-1.5,3' },
];

const icon = ({ color, glyph }) => `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="48dp" android:height="48dp" android:viewportWidth="48" android:viewportHeight="48">
  <path android:fillColor="${color}" android:pathData="M24,0a24,24 0,1 0,0 48a24,24 0,1 0,0 -48z"/>
  <group android:translateX="12" android:translateY="12">
    <path android:fillColor="#00000000" android:strokeColor="#FFFFFFFF" android:strokeWidth="2"
        android:strokeLineCap="round" android:strokeLineJoin="round" android:pathData="${glyph}"/>
  </group>
</vector>
`;

const shortcutsXml = (pkg) => `<?xml version="1.0" encoding="utf-8"?>
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
${SHORTCUTS.map(
  (s) => `  <shortcut android:shortcutId="${s.id}" android:enabled="true" android:icon="@drawable/${s.icon}"
      android:shortcutShortLabel="@string/shortcut_${s.id}">
    <intent android:action="android.intent.action.VIEW" android:data="${s.url}"
        android:targetPackage="${pkg}" android:targetClass="${pkg}.MainActivity" />
  </shortcut>`,
).join('\n')}
</shortcuts>
`;

const strings = (lang) => `<?xml version="1.0" encoding="utf-8"?>
<resources>
${SHORTCUTS.map((s) => `  <string name="shortcut_${s.id}">${s.label[lang]}</string>`).join('\n')}
</resources>
`;

function withShortcutFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const pkg = cfg.android?.package;
      if (!pkg) throw new Error('with-app-shortcuts: android.package is required');
      const res = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res');
      for (const dir of ['xml', 'drawable', 'values', 'values-hi']) fs.mkdirSync(path.join(res, dir), { recursive: true });
      fs.writeFileSync(path.join(res, 'xml/shortcuts.xml'), shortcutsXml(pkg));
      for (const s of SHORTCUTS) fs.writeFileSync(path.join(res, `drawable/${s.icon}.xml`), icon(s));
      fs.writeFileSync(path.join(res, 'values/shortcut_strings.xml'), strings('en'));
      fs.writeFileSync(path.join(res, 'values-hi/shortcut_strings.xml'), strings('hi'));
      return cfg;
    },
  ]);
}

function withShortcutMeta(config) {
  return withAndroidManifest(config, (cfg) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(cfg.modResults);
    activity['meta-data'] = (activity['meta-data'] ?? []).filter((m) => m.$['android:name'] !== 'android.app.shortcuts');
    activity['meta-data'].push({ $: { 'android:name': 'android.app.shortcuts', 'android:resource': '@xml/shortcuts' } });
    return cfg;
  });
}

module.exports = (config) => withShortcutMeta(withShortcutFiles(config));
