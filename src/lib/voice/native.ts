import { invoke } from "@tauri-apps/api/core";

import { isAndroidPlatform } from "$lib/platform/os";

/** Stable error codes the Android recorder rejects with. */
export type VoiceErrorCode =
	| "permission-denied"
	| "busy"
	| "too-short"
	| "unavailable"
	| "failed";

const CODES: VoiceErrorCode[] = [
	"permission-denied",
	"busy",
	"too-short",
	"unavailable",
];

/** Pull the plugin's error code out of whatever the IPC layer wrapped it in. */
export function voiceErrorCode(error: unknown): VoiceErrorCode {
	let text: string;
	try {
		text =
			typeof error === "string"
				? error
				: error instanceof Error
					? error.message
					: JSON.stringify(error);
	} catch {
		text = String(error);
	}
	if (text.includes("voice-unavailable")) return "unavailable";
	return CODES.find((code) => text.includes(code)) ?? "failed";
}

export type VoiceRecording = {
	/** Base64 AAC (ADTS). */
	content: string;
	lengthMs: number;
};

/** Thin typed wrappers over the `voice_*` Tauri commands (Android only). */
export type VoiceNative = {
	available(): boolean;
	ensureMicrophone(): Promise<boolean>;
	start(): Promise<void>;
	level(): Promise<number>;
	stop(): Promise<VoiceRecording>;
	cancel(): Promise<void>;
};

export const voiceNative: VoiceNative = {
	available: () => isAndroidPlatform(),
	ensureMicrophone: async () =>
		(await invoke<{ granted: boolean }>("voice_ensure_microphone")).granted,
	start: () => invoke("voice_start"),
	level: async () => (await invoke<{ level: number }>("voice_level")).level,
	stop: () => invoke<VoiceRecording>("voice_stop"),
	cancel: () => invoke("voice_cancel"),
};
