import {
	type VoiceErrorCode,
	voiceErrorCode,
	type VoiceNative,
	voiceNative,
	type VoiceRecording,
} from "./native";

/** Longest voice message. The web side stops here, before the native safety net. */
export const MAX_VOICE_MS = 5 * 60 * 1000;

const TICK_MS = 100;

export type StopResult =
	| { ok: true; recording: VoiceRecording }
	| { ok: false; error: VoiceErrorCode };

/**
 * State machine behind the microphone button: idle -> starting -> recording ->
 * stopping -> idle. Exposes elapsed time and the live input level for the UI.
 */
export class VoiceRecorder {
	status = $state<"idle" | "starting" | "recording" | "stopping">("idle");
	elapsedMs = $state(0);
	level = $state(0);

	#native: VoiceNative;
	#timer: ReturnType<typeof setInterval> | undefined;
	#startedAt = 0;
	#polling = false;

	constructor(native: VoiceNative = voiceNative) {
		this.#native = native;
	}

	get available(): boolean {
		return this.#native.available();
	}

	get recording(): boolean {
		return this.status === "recording";
	}

	/** Resolves to an error code, or null once recording has begun. */
	async start(): Promise<VoiceErrorCode | null> {
		if (this.status !== "idle") return null;
		this.status = "starting";
		try {
			if (!(await this.#native.ensureMicrophone())) {
				this.status = "idle";
				return "permission-denied";
			}
			await this.#native.start();
		} catch (error) {
			this.status = "idle";
			return voiceErrorCode(error);
		}
		this.elapsedMs = 0;
		this.level = 0;
		this.#startedAt = Date.now();
		this.status = "recording";
		this.#timer = setInterval(() => void this.#tick(), TICK_MS);
		return null;
	}

	async stop(): Promise<StopResult> {
		if (this.status !== "recording") return { ok: false, error: "busy" };
		this.status = "stopping";
		this.#clear();
		try {
			const recording = await this.#native.stop();
			return { ok: true, recording };
		} catch (error) {
			return { ok: false, error: voiceErrorCode(error) };
		} finally {
			this.status = "idle";
			this.elapsedMs = 0;
			this.level = 0;
		}
	}

	async cancel(): Promise<void> {
		if (this.status === "idle") return;
		this.status = "stopping";
		this.#clear();
		try {
			await this.#native.cancel();
		} catch (error) {
			console.error("[voice] cancel failed", error);
		} finally {
			this.status = "idle";
			this.elapsedMs = 0;
			this.level = 0;
		}
	}

	async #tick(): Promise<void> {
		this.elapsedMs = Date.now() - this.#startedAt;
		if (this.#polling || this.status !== "recording") return;
		this.#polling = true;
		try {
			const level = await this.#native.level();
			if (this.status === "recording") this.level = level;
		} catch {
			// The meter is cosmetic; a missed reading is fine.
		} finally {
			this.#polling = false;
		}
	}

	#clear(): void {
		clearInterval(this.#timer);
		this.#timer = undefined;
	}
}
