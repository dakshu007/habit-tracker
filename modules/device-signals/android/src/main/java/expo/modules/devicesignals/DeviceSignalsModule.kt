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
import android.provider.AlarmClock
import android.provider.Settings
import android.speech.RecognizerIntent
import com.android.installreferrer.api.InstallReferrerClient
import com.android.installreferrer.api.InstallReferrerStateListener
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

    // Real alarms live in the phone's Clock app: it rings reliably through
    // battery saver and Do Not Disturb, which an ordinary app can't promise.
    Function("canSetAlarm") {
      val ctx = appContext.reactContext ?: return@Function false
      Intent(AlarmClock.ACTION_SET_ALARM).resolveActivity(ctx.packageManager) != null
    }

    // days: 0 = Sunday … 6 = Saturday (empty = one-time). Returns false if no Clock app took it.
    Function("setAlarm") { hour: Int, minute: Int, message: String, days: List<Int>, skipUi: Boolean ->
      val intent = Intent(AlarmClock.ACTION_SET_ALARM)
        .putExtra(AlarmClock.EXTRA_HOUR, hour)
        .putExtra(AlarmClock.EXTRA_MINUTES, minute)
        .putExtra(AlarmClock.EXTRA_MESSAGE, message)
        .putExtra(AlarmClock.EXTRA_SKIP_UI, skipUi)
      if (days.isNotEmpty()) intent.putIntegerArrayListExtra(AlarmClock.EXTRA_DAYS, ArrayList(days.map { it + 1 }))
      launch(intent)
    }

    Function("showAlarms") {
      launch(Intent(AlarmClock.ACTION_SHOW_ALARMS))
    }

    // Stable per-device id for this app (ANDROID_ID, scoped to our signing key).
    // Only used, hashed on the server, so one phone can't count as many invited friends.
    Function("getDeviceId") {
      val ctx = appContext.reactContext ?: return@Function null
      Settings.Secure.getString(ctx.contentResolver, Settings.Secure.ANDROID_ID)
    }

    // The referrer string from the Play Store link this install came from ("" if none).
    AsyncFunction("getInstallReferrer") { promise: Promise ->
      val ctx = appContext.reactContext
      if (ctx == null) {
        promise.resolve("")
        return@AsyncFunction
      }
      val client = InstallReferrerClient.newBuilder(ctx).build()
      try {
        client.startConnection(object : InstallReferrerStateListener {
          override fun onInstallReferrerSetupFinished(code: Int) {
            val value = if (code == InstallReferrerClient.InstallReferrerResponse.OK) {
              try { client.installReferrer.installReferrer ?: "" } catch (e: Exception) { "" }
            } else ""
            try { client.endConnection() } catch (_: Exception) {}
            promise.resolve(value)
          }
          override fun onInstallReferrerServiceDisconnected() {}
        })
      } catch (e: Exception) {
        promise.resolve("")
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

  private fun launch(intent: Intent): Boolean {
    val activity = appContext.currentActivity
    return try {
      if (activity != null) {
        activity.startActivity(intent)
      } else {
        val ctx = appContext.reactContext ?: return false
        ctx.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
      true
    } catch (e: Exception) {
      false
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
