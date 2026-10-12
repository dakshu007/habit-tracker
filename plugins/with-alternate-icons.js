// Expo config plugin: 4 selectable launcher icons (Sage is the default).
// Each icon is an <activity-alias> of MainActivity with its own adaptive icon;
// the app switches between them at runtime (modules/device-signals setAppIcon).
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('expo/config-plugins');

const ICONS = ['sage', 'ink', 'midnight', 'sand'];
const DEFAULT = 'sage';
const alias = (pkg, id) => `${pkg}.Icon${id[0].toUpperCase()}${id.slice(1)}`;

const adaptive = (id) => `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@drawable/ic_alt_${id}_bg"/>
  <foreground android:drawable="@drawable/ic_alt_${id}_fg"/>
  <monochrome android:drawable="@drawable/ic_alt_mono"/>
</adaptive-icon>
`;

function withIconFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const src = path.join(cfg.modRequest.projectRoot, 'assets/app-icons');
      const res = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res');
      const nodpi = path.join(res, 'drawable-nodpi');
      const anydpi = path.join(res, 'mipmap-anydpi-v26');
      fs.mkdirSync(nodpi, { recursive: true });
      fs.mkdirSync(anydpi, { recursive: true });
      for (const id of ICONS) {
        fs.copyFileSync(path.join(src, `${id}-foreground.png`), path.join(nodpi, `ic_alt_${id}_fg.png`));
        fs.copyFileSync(path.join(src, `${id}-background.png`), path.join(nodpi, `ic_alt_${id}_bg.png`));
        fs.writeFileSync(path.join(anydpi, `ic_alt_${id}.xml`), adaptive(id));
      }
      fs.copyFileSync(path.join(src, 'monochrome.png'), path.join(nodpi, 'ic_alt_mono.png'));
      return cfg;
    },
  ]);
}

function withIconAliases(config) {
  return withAndroidManifest(config, (cfg) => {
    const pkg = cfg.android?.package;
    if (!pkg) throw new Error('with-alternate-icons: android.package is required');
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    const main = AndroidConfig.Manifest.getMainActivityOrThrow(cfg.modResults);

    // The launcher entry moves from MainActivity to the aliases.
    const isLauncher = (f) =>
      (f.action ?? []).some((a) => a.$['android:name'] === 'android.intent.action.MAIN') &&
      (f.category ?? []).some((c) => c.$['android:name'] === 'android.intent.category.LAUNCHER');
    main['intent-filter'] = (main['intent-filter'] ?? []).filter((f) => !isLauncher(f));

    const names = ICONS.map((id) => alias(pkg, id));
    app['activity-alias'] = (app['activity-alias'] ?? []).filter((a) => !names.includes(a.$['android:name']));
    for (const id of ICONS) {
      app['activity-alias'].push({
        $: {
          'android:name': alias(pkg, id),
          'android:targetActivity': '.MainActivity',
          'android:enabled': id === DEFAULT ? 'true' : 'false',
          'android:exported': 'true',
          'android:icon': `@mipmap/ic_alt_${id}`,
          'android:roundIcon': `@mipmap/ic_alt_${id}`,
          'android:label': '@string/app_name',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
            category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
          },
        ],
        // Long-press shortcuts belong to whichever launcher entry is active.
        'meta-data': [{ $: { 'android:name': 'android.app.shortcuts', 'android:resource': '@xml/shortcuts' } }],
      });
    }
    return cfg;
  });
}

module.exports = (config) => withIconAliases(withIconFiles(config));
