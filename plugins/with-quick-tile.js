// Expo config plugin: Android Quick Settings tile ("Log habit") that opens the
// app's quick-log sheet (habittracker://quick-log) from the pull-down shade.
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('expo/config-plugins');

const SERVICE = '.QuickLogTileService';

const kotlin = (pkg) => `package ${pkg}

import android.annotation.SuppressLint
import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

/** Quick Settings tile that opens the quick-log sheet. */
class QuickLogTileService : TileService() {
  override fun onStartListening() {
    super.onStartListening()
    qsTile?.let {
      it.state = Tile.STATE_INACTIVE
      it.updateTile()
    }
  }

  @SuppressLint("StartActivityAndCollapseDeprecated")
  override fun onClick() {
    super.onClick()
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("habittracker://quick-log")).apply {
      setPackage(packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    if (Build.VERSION.SDK_INT >= 34) {
      val pending = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
      startActivityAndCollapse(pending)
    } else {
      @Suppress("DEPRECATION")
      startActivityAndCollapse(intent)
    }
  }
}
`;

// Check-in-a-circle, white (the system tints tile icons).
const ICON = `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">
  <path android:fillColor="#00000000" android:strokeColor="#FFFFFFFF" android:strokeWidth="2"
      android:strokeLineCap="round" android:strokeLineJoin="round"
      android:pathData="M12,2.5a9.5,9.5 0,1 0,0 19a9.5,9.5 0,1 0,0 -19z"/>
  <path android:fillColor="#00000000" android:strokeColor="#FFFFFFFF" android:strokeWidth="2.2"
      android:strokeLineCap="round" android:strokeLineJoin="round"
      android:pathData="M7.5,12.5l3,3l6,-6.5"/>
</vector>
`;

function withTileFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const pkg = cfg.android?.package;
      if (!pkg) throw new Error('with-quick-tile: android.package is required');
      const root = cfg.modRequest.platformProjectRoot;
      const javaDir = path.join(root, 'app/src/main/java', ...pkg.split('.'));
      fs.mkdirSync(javaDir, { recursive: true });
      fs.writeFileSync(path.join(javaDir, 'QuickLogTileService.kt'), kotlin(pkg));
      const drawable = path.join(root, 'app/src/main/res/drawable');
      fs.mkdirSync(drawable, { recursive: true });
      fs.writeFileSync(path.join(drawable, 'ic_tile_log.xml'), ICON);
      return cfg;
    },
  ]);
}

function withTileService(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.service = (app.service ?? []).filter((s) => s.$['android:name'] !== SERVICE);
    app.service.push({
      $: {
        'android:name': SERVICE,
        'android:exported': 'true',
        'android:label': 'Log habit',
        'android:icon': '@drawable/ic_tile_log',
        'android:permission': 'android.permission.BIND_QUICK_SETTINGS_TILE',
      },
      'intent-filter': [{ action: [{ $: { 'android:name': 'android.service.quicksettings.action.QS_TILE' } }] }],
    });
    return cfg;
  });
}

module.exports = function withQuickTile(config) {
  return withTileService(withTileFiles(config));
};
