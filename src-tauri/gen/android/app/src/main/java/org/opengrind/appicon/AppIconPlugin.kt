package org.opengrind.appicon

import android.app.Activity
import android.app.ActivityManager
import android.content.ComponentName
import android.content.pm.PackageManager
import android.webkit.WebView
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import org.opengrind.R

@InvokeArg
class SetIconArgs {
    lateinit var icon: String
}

/**
 * Swaps the launcher icon and name by enabling exactly one of the
 * `<activity-alias>` entries declared in AndroidManifest.xml.
 *
 * Errors are stable strings the web side maps to messages: `unknown-icon`,
 * `failed`. The alias names below must match the manifest.
 */
@TauriPlugin
class AppIconPlugin(private val activity: Activity) : Plugin(activity) {

    private data class Icon(val alias: String, val label: Int)

    override fun load(webView: WebView) {
        super.load(webView)
        // The recents screen takes its title from the task, which would still say
        // "Euskal Grindr" while a discreet icon is active.
        applyTaskDescription(currentIcon())
    }

    @Command
    fun current(invoke: Invoke) {
        invoke.resolve(JSObject().apply { put("icon", currentIcon()) })
    }

    @Command
    fun set(invoke: Invoke) {
        val args =
            try {
                invoke.parseArgs(SetIconArgs::class.java)
            } catch (_: Exception) {
                invoke.reject(ERROR_FAILED)
                return
            }
        val target = ICONS[args.icon]
        if (target == null) {
            invoke.reject(ERROR_UNKNOWN)
            return
        }
        try {
            // Enable the new entry first so there is always a launcher icon.
            setEnabled(target.alias, true)
            for ((_, other) in ICONS) {
                if (other.alias != target.alias) setEnabled(other.alias, false)
            }
            applyTaskDescription(args.icon)
            invoke.resolve(JSObject().apply { put("icon", args.icon) })
        } catch (_: Exception) {
            invoke.reject(ERROR_FAILED)
        }
    }

    private fun component(alias: String) =
        ComponentName(activity.packageName, "org.opengrind.$alias")

    private fun setEnabled(alias: String, enabled: Boolean) {
        activity.packageManager.setComponentEnabledSetting(
            component(alias),
            if (enabled) PackageManager.COMPONENT_ENABLED_STATE_ENABLED
            else PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            // Do not kill the app while the user is looking at it.
            PackageManager.DONT_KILL_APP,
        )
    }

    private fun isEnabled(alias: String, enabledByDefault: Boolean): Boolean =
        when (activity.packageManager.getComponentEnabledSetting(component(alias))) {
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED -> true
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED_USER,
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED_UNTIL_USED -> false
            else -> enabledByDefault
        }

    private fun currentIcon(): String {
        for ((key, icon) in ICONS) {
            if (isEnabled(icon.alias, enabledByDefault = key == DEFAULT)) return key
        }
        return DEFAULT
    }

    private fun applyTaskDescription(key: String) {
        val icon = ICONS[key] ?: return
        try {
            activity.setTaskDescription(
                if (key == DEFAULT) ActivityManager.TaskDescription()
                else ActivityManager.TaskDescription(activity.getString(icon.label))
            )
        } catch (_: Exception) {
            // Cosmetic: the launcher icon is what matters.
        }
    }

    private companion object {
        const val DEFAULT = "default"
        const val ERROR_UNKNOWN = "unknown-icon"
        const val ERROR_FAILED = "failed"

        val ICONS =
            linkedMapOf(
                DEFAULT to Icon("LauncherDefault", R.string.app_name),
                "calculator" to Icon("LauncherCalculator", R.string.disguise_calculator),
                "notes" to Icon("LauncherNotes", R.string.disguise_notes),
                "weather" to Icon("LauncherWeather", R.string.disguise_weather),
                "clock" to Icon("LauncherClock", R.string.disguise_clock),
            )
    }
}
