import { invoke } from "@tauri-apps/api/core";

import { isAndroidPlatform } from "$lib/platform/os";

/** Stable error codes the Android plugin rejects with. */
export type NativeErrorCode =
	| "unsupported-language"
	| "model-missing"
	| "wifi-required"
	| "english-required"
	| "download-failed"
	| "failed";

const CODES: NativeErrorCode[] = [
	"unsupported-language",
	"model-missing",
	"wifi-required",
	"english-required",
	"download-failed",
];

/** Pull the plugin's error code out of whatever the IPC layer wrapped it in. */
export function nativeErrorCode(error: unknown): NativeErrorCode {
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
	return CODES.find((code) => text.includes(code)) ?? "failed";
}

export type NativeModels = { downloaded: string[]; supported: string[] };

/** Thin typed wrappers over the `translate_*` Tauri commands (Android only). */
export type NativeTranslate = {
	available(): boolean;
	identify(text: string): Promise<string>;
	translate(text: string, source: string, target: string): Promise<string>;
	models(): Promise<NativeModels>;
	download(language: string, wifiOnly: boolean): Promise<void>;
	remove(language: string): Promise<void>;
};

export const native: NativeTranslate = {
	available: () => isAndroidPlatform(),
	identify: async (text) =>
		(await invoke<{ language: string }>("translate_identify", { text }))
			.language,
	translate: async (text, source, target) =>
		(
			await invoke<{ text: string }>("translate_text", {
				text,
				source,
				target,
			})
		).text,
	models: () => invoke<NativeModels>("translate_models"),
	download: (language, wifiOnly) =>
		invoke("translate_download", { language, wifiOnly }),
	remove: (language) => invoke("translate_delete", { language }),
};
