package org.opengrind.translate

import android.app.Activity
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSArray
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.nl.languageid.LanguageIdentification
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.TranslateRemoteModel
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.TranslatorOptions

@InvokeArg
class IdentifyArgs {
    lateinit var text: String
}

@InvokeArg
class TranslateArgs {
    lateinit var text: String
    lateinit var source: String
    lateinit var target: String
}

@InvokeArg
class ModelArgs {
    lateinit var language: String
    var wifiOnly: Boolean = false
}

/**
 * On-device translation with ML Kit. Nothing here talks to a server except the
 * model download itself, which ML Kit performs against Google's model host.
 *
 * Errors are stable strings the web side maps to messages:
 * `unsupported-language`, `model-missing:<code>`, `wifi-required`,
 * `english-required`, `download-failed`, `failed`.
 */
@TauriPlugin
class TranslatePlugin(private val activity: Activity) : Plugin(activity) {

    private val modelManager: RemoteModelManager by lazy { RemoteModelManager.getInstance() }
    private val identifier by lazy { LanguageIdentification.getClient() }

    @Command
    fun identifyLanguage(invoke: Invoke) {
        val args =
            try {
                invoke.parseArgs(IdentifyArgs::class.java)
            } catch (_: Exception) {
                invoke.reject(ERROR_FAILED)
                return
            }
        identifier
            .identifyLanguage(args.text)
            .addOnSuccessListener { tag ->
                invoke.resolve(JSObject().apply { put("language", tag) })
            }
            .addOnFailureListener { invoke.reject(ERROR_FAILED) }
    }

    @Command
    fun listModels(invoke: Invoke) {
        modelManager
            .getDownloadedModels(TranslateRemoteModel::class.java)
            .addOnSuccessListener { models ->
                val downloaded = JSArray()
                models.forEach { downloaded.put(it.language) }
                val supported = JSArray()
                TranslateLanguage.getAllLanguages().forEach { supported.put(it) }
                invoke.resolve(
                    JSObject().apply {
                        put("downloaded", downloaded)
                        put("supported", supported)
                    }
                )
            }
            .addOnFailureListener { invoke.reject(ERROR_FAILED) }
    }

    @Command
    fun translate(invoke: Invoke) {
        val args =
            try {
                invoke.parseArgs(TranslateArgs::class.java)
            } catch (_: Exception) {
                invoke.reject(ERROR_FAILED)
                return
            }
        val source = TranslateLanguage.fromLanguageTag(args.source)
        val target = TranslateLanguage.fromLanguageTag(args.target)
        if (source == null || target == null) {
            invoke.reject(ERROR_UNSUPPORTED)
            return
        }
        modelManager
            .getDownloadedModels(TranslateRemoteModel::class.java)
            .addOnSuccessListener { models ->
                // English is the pivot for every pair that does not include it.
                val needed = setOf(source, target, TranslateLanguage.ENGLISH)
                val have = models.map { it.language }.toSet()
                val missing = needed.firstOrNull { it !in have }
                if (missing != null) {
                    invoke.reject("$ERROR_MODEL_MISSING:$missing")
                    return@addOnSuccessListener
                }
                runTranslation(invoke, args.text, source, target)
            }
            .addOnFailureListener { invoke.reject(ERROR_FAILED) }
    }

    private fun runTranslation(invoke: Invoke, text: String, source: String, target: String) {
        val translator =
            Translation.getClient(
                TranslatorOptions.Builder()
                    .setSourceLanguage(source)
                    .setTargetLanguage(target)
                    .build()
            )
        translator
            .translate(text)
            .addOnSuccessListener { translated ->
                invoke.resolve(JSObject().apply { put("text", translated) })
            }
            .addOnFailureListener { invoke.reject(ERROR_FAILED) }
            .addOnCompleteListener { translator.close() }
    }

    @Command
    fun downloadModel(invoke: Invoke) {
        val args =
            try {
                invoke.parseArgs(ModelArgs::class.java)
            } catch (_: Exception) {
                invoke.reject(ERROR_FAILED)
                return
            }
        val language = TranslateLanguage.fromLanguageTag(args.language)
        if (language == null) {
            invoke.reject(ERROR_UNSUPPORTED)
            return
        }
        // ML Kit would wait for Wi-Fi forever instead of failing, so check up front.
        if (args.wifiOnly && !onUnmeteredNetwork()) {
            invoke.reject(ERROR_WIFI_REQUIRED)
            return
        }
        val conditions = DownloadConditions.Builder().build()
        modelManager
            .download(TranslateRemoteModel.Builder(language).build(), conditions)
            .addOnSuccessListener { invoke.resolve() }
            .addOnFailureListener { invoke.reject(ERROR_DOWNLOAD_FAILED) }
    }

    @Command
    fun deleteModel(invoke: Invoke) {
        val args =
            try {
                invoke.parseArgs(ModelArgs::class.java)
            } catch (_: Exception) {
                invoke.reject(ERROR_FAILED)
                return
            }
        val language = TranslateLanguage.fromLanguageTag(args.language)
        if (language == null) {
            invoke.reject(ERROR_UNSUPPORTED)
            return
        }
        if (language == TranslateLanguage.ENGLISH) {
            invoke.reject(ERROR_ENGLISH_REQUIRED)
            return
        }
        modelManager
            .deleteDownloadedModel(TranslateRemoteModel.Builder(language).build())
            .addOnSuccessListener { invoke.resolve() }
            .addOnFailureListener { invoke.reject(ERROR_FAILED) }
    }

    private fun onUnmeteredNetwork(): Boolean {
        val manager =
            activity.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
                ?: return false
        val capabilities = manager.getNetworkCapabilities(manager.activeNetwork) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)
    }

    private companion object {
        const val ERROR_FAILED = "failed"
        const val ERROR_UNSUPPORTED = "unsupported-language"
        const val ERROR_MODEL_MISSING = "model-missing"
        const val ERROR_WIFI_REQUIRED = "wifi-required"
        const val ERROR_ENGLISH_REQUIRED = "english-required"
        const val ERROR_DOWNLOAD_FAILED = "download-failed"
    }
}
