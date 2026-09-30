import { invoke } from "@tauri-apps/api/core";

import { isAndroidPlatform } from "./os";

export const APP_ICON_IDS = [
	"default",
	"calculator",
	"notes",
	"weather",
	"clock",
] as const;

export type AppIconId = (typeof APP_ICON_IDS)[number];

export function isAppIconId(value: unknown): value is AppIconId {
	return APP_ICON_IDS.some((id) => id === value);
}

export type AppIconErrorCode = "unknown-icon" | "unavailable" | "failed";

/** Pull the plugin's error code out of whatever the IPC layer wrapped it in. */
export function appIconErrorCode(error: unknown): AppIconErrorCode {
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
	if (text.includes("app-icon-unavailable")) return "unavailable";
	if (text.includes("unknown-icon")) return "unknown-icon";
	return "failed";
}

/** Thin typed wrappers over the `app_icon_*` Tauri commands (Android only). */
export type AppIconNative = {
	available(): boolean;
	current(): Promise<AppIconId>;
	set(icon: AppIconId): Promise<AppIconId>;
};

async function asIcon(pending: Promise<{ icon: string }>): Promise<AppIconId> {
	const { icon } = await pending;
	return isAppIconId(icon) ? icon : "default";
}

export const appIconNative: AppIconNative = {
	available: () => isAndroidPlatform(),
	current: () => asIcon(invoke("app_icon_current")),
	set: (icon) => asIcon(invoke("app_icon_set", { icon })),
};
