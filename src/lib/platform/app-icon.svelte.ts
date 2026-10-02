import {
	type AppIconErrorCode,
	appIconErrorCode,
	type AppIconId,
	type AppIconNative,
	appIconNative,
} from "./app-icon";

/** Which launcher icon is active, and changing it. */
export class AppIconState {
	current = $state<AppIconId>("default");
	loading = $state(true);
	busy = $state(false);

	#native: AppIconNative;

	constructor(native: AppIconNative = appIconNative) {
		this.#native = native;
	}

	get available(): boolean {
		return this.#native.available();
	}

	async load(): Promise<void> {
		if (!this.available) {
			this.loading = false;
			return;
		}
		this.loading = true;
		try {
			this.current = await this.#native.current();
		} catch (error) {
			console.error("[app-icon] could not read the current icon", error);
		} finally {
			this.loading = false;
		}
	}

	/** Resolves to an error code, or null when the icon changed. */
	async choose(icon: AppIconId): Promise<AppIconErrorCode | null> {
		if (this.busy) return null;
		if (icon === this.current) return null;
		this.busy = true;
		try {
			this.current = await this.#native.set(icon);
			return null;
		} catch (error) {
			return appIconErrorCode(error);
		} finally {
			this.busy = false;
		}
	}
}
