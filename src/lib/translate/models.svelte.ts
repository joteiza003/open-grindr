import { toast } from "svelte-sonner";
import { SvelteMap, SvelteSet } from "svelte/reactivity";

import { t } from "$lib/i18n";
import {
	type NativeErrorCode,
	nativeErrorCode,
	type NativeTranslate,
	native as realNative,
} from "./native";
import {
	translationSettings,
	updateTranslationSettings,
} from "./translation-state.svelte";

/** Approximate size of one ML Kit language model. */
export const MODEL_SIZE_MB = 30;
/** Every pair not involving English pivots through it, so it is never removable. */
export const REQUIRED_MODEL = "en";
/** Installed automatically on first launch (plus the user's own language). */
export const DEFAULT_MODELS = ["en", "fr"] as const;

/** Offline language packs on this phone (ML Kit), and their download state. */
export class DeviceModels {
	downloaded = new SvelteSet<string>();
	supported = $state<string[]>([]);
	loading = $state(false);
	busy = new SvelteMap<string, "downloading" | "deleting">();

	#native: NativeTranslate;
	#defaults: Promise<void> | null = null;

	constructor(native: NativeTranslate = realNative) {
		this.#native = native;
	}

	get available(): boolean {
		return this.#native.available();
	}

	async refresh(): Promise<void> {
		if (!this.available) return;
		this.loading = true;
		try {
			const models = await this.#native.models();
			this.supported = [...models.supported].sort();
			this.downloaded.clear();
			for (const code of models.downloaded) this.downloaded.add(code);
		} finally {
			this.loading = false;
		}
	}

	/** Resolves to an error code, or null on success. */
	async download(
		code: string,
		{ wifiOnly }: { wifiOnly?: boolean } = {},
	): Promise<NativeErrorCode | null> {
		if (this.busy.has(code)) return null;
		this.busy.set(code, "downloading");
		try {
			await this.#native.download(
				code,
				wifiOnly ?? !translationSettings().downloadOverMobile,
			);
			this.downloaded.add(code);
			return null;
		} catch (error) {
			return nativeErrorCode(error);
		} finally {
			this.busy.delete(code);
		}
	}

	async remove(code: string): Promise<NativeErrorCode | null> {
		if (code === REQUIRED_MODEL) return "english-required";
		if (this.busy.has(code)) return null;
		this.busy.set(code, "deleting");
		try {
			await this.#native.remove(code);
			this.downloaded.delete(code);
			return null;
		} catch (error) {
			return nativeErrorCode(error);
		} finally {
			this.busy.delete(code);
		}
	}

	/**
	 * First launch: fetch English, French and the user's language so translation
	 * works offline out of the box. Wi-Fi only unless the user allowed mobile data;
	 * if it can't finish now it simply tries again next launch.
	 */
	ensureDefaults(): Promise<void> {
		if (!this.available) return Promise.resolve();
		this.#defaults ??= this.#installDefaults().finally(() => {
			this.#defaults = null;
		});
		return this.#defaults;
	}

	async #installDefaults(): Promise<void> {
		if (translationSettings().defaultsInstalled) return;
		try {
			await this.refresh();
		} catch (error) {
			console.error("[translate] models unavailable", error);
			return;
		}
		const mine = translationSettings().myLanguage;
		const wanted: string[] = [
			...DEFAULT_MODELS,
			...(this.supported.includes(mine) ? [mine] : []),
		].filter((code, index, all) => all.indexOf(code) === index);
		const missing = wanted.filter((code) => !this.downloaded.has(code));
		if (missing.length > 0) {
			const toastId = toast.loading(t("translate.downloadingDefaults"));
			for (const code of missing) {
				const error = await this.download(code);
				if (error === null) continue;
				if (error === "wifi-required") toast.dismiss(toastId);
				else
					toast.error(t("translate.downloadFailed"), { id: toastId });
				return;
			}
			toast.success(t("translate.defaultsReady"), { id: toastId });
		}
		await updateTranslationSettings({ defaultsInstalled: true });
	}
}

export const deviceModels = new DeviceModels();
