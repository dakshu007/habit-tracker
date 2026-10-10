package expo.modules.devicesignals

import android.app.Activity
import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
import android.speech.RecognizerIntent
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Small phone signals the app needs that no library covers:
 *  - screen on/off history (UsageStatsManager) for phone-based sleep detection
 *  - the system speech recognizer for voice logging (no RECORD_AUDIO needed here)
 */
class DeviceSignalsModule : Module() {
  private var speechPromise: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("DeviceSignals")

    Function("hasUsageAccess") {
      hasUsageAccess()
    }

    Function("openUsageAccessSettings") {
      val ctx = appContext.reactContext ?: return@Function false
      val direct = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
        .setData(Uri.parse("package:${ctx.packageName}"))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      try {
        ctx.startActivity(direct)
      } catch (e: Exception) {
        // Many phones only support the generic list.
        ctx.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
      true
    }

    // Screen turned on / off between two epoch-ms times (Android 9+, needs usage access).
    AsyncFunction("getScreenEvents") { from: Double, to: Double ->
      val ctx = appContext.reactContext
      if (ctx == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.P || !hasUsageAccess()) {
        return@AsyncFunction emptyList<Map<String, Any>>()
      }
      val usm = ctx.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val events = usm.queryEvents(from.toLong(), to.toLong())
      val out = ArrayList<Map<String, Any>>()
      val e = UsageEvents.Event()
      while (events.hasNextEvent()) {
        events.getNextEvent(e)
        when (e.eventType) {
          UsageEvents.Event.SCREEN_INTERACTIVE -> out.add(mapOf("time" to e.timeStamp.toDouble(), "on" to true))
          UsageEvents.Event.SCREEN_NON_INTERACTIVE -> out.add(mapOf("time" to e.timeStamp.toDouble(), "on" to false))
        }
      }
      out
    }

    Function("canRecognizeSpeech") {
      val ctx = appContext.reactContext ?: return@Function false
      Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).resolveActivity(ctx.packageManager) != null
    }

    // Opens the phone's "Speak now" dialog; resolves with the best guesses (empty if cancelled).
    AsyncFunction("recognizeSpeech") { prompt: String, language: String?, promise: Promise ->
      speechPromise?.resolve(emptyList<String>())
      val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
        .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
        .putExtra(RecognizerIntent.EXTRA_PROMPT, prompt)
        .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5)
      if (language != null) intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language)
      try {
        speechPromise = promise
        appContext.throwingActivity.startActivityForResult(intent, SPEECH_REQUEST)
      } catch (e: Exception) {
        speechPromise = null
        promise.reject("ERR_NO_SPEECH", "Speech recognition isn't available on this phone.", e)
      }
    }

    // Launcher icon variants (activity-aliases from plugins/with-alternate-icons).
    Function("getAppIcon") {
      val ctx = appContext.reactContext ?: return@Function DEFAULT_ICON
      val pm = ctx.packageManager
      ICONS.firstOrNull { id ->
        when (pm.getComponentEnabledSetting(iconComponent(ctx, id))) {
          PackageManager.COMPONENT_ENABLED_STATE_ENABLED -> true
          PackageManager.COMPONENT_ENABLED_STATE_DEFAULT -> id == DEFAULT_ICON
          else -> false
        }
      } ?: DEFAULT_ICON
    }

    Function("setAppIcon") { id: String ->
      val ctx = appContext.reactContext ?: return@Function false
      if (id !in ICONS) return@Function false
      val pm = ctx.packageManager
      // Turn the new one on first so there's always a launcher entry.
      pm.setComponentEnabledSetting(iconComponent(ctx, id), PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP)
      for (other in ICONS) {
        if (other == id) continue
        pm.setComponentEnabledSetting(iconComponent(ctx, other), PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP)
      }
      true
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode != SPEECH_REQUEST) return@OnActivityResult
      val p = speechPromise ?: return@OnActivityResult
      speechPromise = null
      val results = if (payload.resultCode == Activity.RESULT_OK) {
        payload.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.toList() ?: emptyList()
      } else {
        emptyList()
      }
      p.resolve(results)
    }
  }

  private fun hasUsageAccess(): Boolean {
    val ctx = appContext.reactContext ?: return false
    val ops = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.packageName)
    } else {
      @Suppress("DEPRECATION")
      ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.packageName)
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  private fun iconComponent(ctx: Context, id: String) =
    ComponentName(ctx.packageName, "${ctx.packageName}.Icon${id.replaceFirstChar { it.uppercase() }}")

  companion object {
    private const val SPEECH_REQUEST = 7311
    private const val DEFAULT_ICON = "sage"
    private val ICONS = listOf("sage", "ink", "midnight", "sand")
  }
}
