package org.opengrind.voice

import android.Manifest
import android.app.Activity
import android.media.MediaRecorder
import android.os.Build
import android.os.SystemClock
import android.util.Base64
import app.tauri.PermissionState
import app.tauri.annotation.Command
import app.tauri.annotation.Permission
import app.tauri.annotation.PermissionCallback
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.io.File

/**
 * Records voice messages as AAC (ADTS), the format the official apps play.
 *
 * Errors are stable strings the web side maps to messages: `permission-denied`,
 * `busy`, `too-short`, `failed`.
 */
@TauriPlugin(
    permissions =
        [Permission(strings = [Manifest.permission.RECORD_AUDIO], alias = "microphone")]
)
class VoicePlugin(private val activity: Activity) : Plugin(activity) {

    private var recorder: MediaRecorder? = null
    private var recording: File? = null
    private var startedAt = 0L

    @Command
    fun ensureMicrophone(invoke: Invoke) {
        if (getPermissionState(ALIAS_MICROPHONE) == PermissionState.GRANTED) {
            invoke.resolve(JSObject().apply { put("granted", true) })
            return
        }
        requestPermissionForAlias(ALIAS_MICROPHONE, invoke, "microphoneResult")
    }

    @PermissionCallback
    private fun microphoneResult(invoke: Invoke) {
        val granted = getPermissionState(ALIAS_MICROPHONE) == PermissionState.GRANTED
        invoke.resolve(JSObject().apply { put("granted", granted) })
    }

    @Command
    fun start(invoke: Invoke) {
        if (recorder != null) {
            invoke.reject(ERROR_BUSY)
            return
        }
        if (getPermissionState(ALIAS_MICROPHONE) != PermissionState.GRANTED) {
            invoke.reject(ERROR_PERMISSION)
            return
        }
        val directory = File(activity.cacheDir, "voice").apply { mkdirs() }
        val target = File(directory, "recording-${System.currentTimeMillis()}.aac")
        val next = newRecorder()
        try {
            next.setAudioSource(MediaRecorder.AudioSource.MIC)
            next.setOutputFormat(MediaRecorder.OutputFormat.AAC_ADTS)
            next.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            next.setAudioChannels(1)
            next.setAudioSamplingRate(SAMPLE_RATE)
            next.setAudioEncodingBitRate(BIT_RATE)
            // Safety net only: the web side stops the recording before this.
            next.setMaxDuration(MAX_DURATION_MS)
            next.setOutputFile(target.absolutePath)
            next.prepare()
            next.start()
        } catch (_: Exception) {
            release(next)
            target.delete()
            invoke.reject(ERROR_FAILED)
            return
        }
        recorder = next
        recording = target
        startedAt = SystemClock.elapsedRealtime()
        invoke.resolve()
    }

    /** Current input level, 0..1, for the recording meter. */
    @Command
    fun level(invoke: Invoke) {
        val amplitude =
            try {
                recorder?.maxAmplitude ?: 0
            } catch (_: Exception) {
                0
            }
        val level = (amplitude / MAX_AMPLITUDE).coerceIn(0.0, 1.0)
        invoke.resolve(JSObject().apply { put("level", level) })
    }

    @Command
    fun stop(invoke: Invoke) {
        val active = recorder
        val target = recording
        if (active == null || target == null) {
            invoke.reject(ERROR_FAILED)
            return
        }
        val elapsed = SystemClock.elapsedRealtime() - startedAt
        recorder = null
        recording = null
        try {
            active.stop()
        } catch (_: RuntimeException) {
            // MediaRecorder throws when stopped before it captured anything.
            release(active)
            target.delete()
            invoke.reject(ERROR_TOO_SHORT)
            return
        }
        release(active)
        if (elapsed < MIN_DURATION_MS) {
            target.delete()
            invoke.reject(ERROR_TOO_SHORT)
            return
        }
        try {
            val bytes = target.readBytes()
            invoke.resolve(
                JSObject().apply {
                    put("content", Base64.encodeToString(bytes, Base64.NO_WRAP))
                    put("lengthMs", elapsed)
                }
            )
        } catch (_: Exception) {
            invoke.reject(ERROR_FAILED)
        } finally {
            target.delete()
        }
    }

    @Command
    fun cancel(invoke: Invoke) {
        val active = recorder
        val target = recording
        recorder = null
        recording = null
        if (active != null) {
            try {
                active.stop()
            } catch (_: RuntimeException) {
                // Nothing was captured; there is nothing to keep anyway.
            }
            release(active)
        }
        target?.delete()
        invoke.resolve()
    }

    @Suppress("DEPRECATION")
    private fun newRecorder(): MediaRecorder =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) MediaRecorder(activity)
        else MediaRecorder()

    private fun release(active: MediaRecorder) {
        try {
            active.release()
        } catch (_: Exception) {
            // Already released.
        }
    }

    private companion object {
        const val ALIAS_MICROPHONE = "microphone"
        const val SAMPLE_RATE = 44_100
        const val BIT_RATE = 64_000
        const val MAX_DURATION_MS = 6 * 60 * 1000
        const val MIN_DURATION_MS = 800L
        const val MAX_AMPLITUDE = 32_767.0

        const val ERROR_PERMISSION = "permission-denied"
        const val ERROR_BUSY = "busy"
        const val ERROR_TOO_SHORT = "too-short"
        const val ERROR_FAILED = "failed"
    }
}
