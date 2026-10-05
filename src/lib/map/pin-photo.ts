import { acquireMediaLoadSlot } from "$lib/util/media-load-slots";
import { trace } from "./map-trace";

/** A photo that has not answered by now is given up on, freeing its slot. */
const LOAD_TIMEOUT_MS = 20_000;

type Phase = "idle" | "queued" | "loading" | "done" | "failed";

/**
 * Loads the photo of one map pin through the app's media load queue.
 *
 * On Android every `ogmedia://` request holds one of a few interception
 * workers, the same ones the app's own IPC calls need. The grid and the chat
 * therefore queue their images (see `acquireMediaLoadSlot`). Pins used to set
 * `src` on their own: with a few dozen saved profiles that put dozens of
 * requests in flight at once, starved IPC, and froze everything that waits on
 * it (saving, navigating). Going through the same queue keeps workers free.
 */
export class PinPhoto {
	readonly image: HTMLImageElement;
	readonly url: string;

	#phase: Phase = "idle";
	#release: (() => void) | null = null;
	#timer: ReturnType<typeof setTimeout> | undefined;

	constructor(image: HTMLImageElement, url: string) {
		this.image = image;
		this.url = url;
		image.addEventListener("load", this.#onLoad);
		image.addEventListener("error", this.#onError);
	}

	get phase(): Phase {
		return this.#phase;
	}

	/** Joins the queue once; later calls do nothing. */
	request(): void {
		if (this.#phase !== "idle") return;
		this.#phase = "queued";
		// The grant may run before `acquireMediaLoadSlot` returns.
		const release = acquireMediaLoadSlot(() => this.#start());
		if (this.#phase === "queued" || this.#phase === "loading") {
			this.#release = release;
		} else {
			release();
		}
	}

	/** Leaves the queue or aborts the download; the photo is not used again. */
	cancel(): void {
		const wasLoading = this.#phase === "loading";
		this.#settle();
		this.#phase = "failed";
		this.image.removeEventListener("load", this.#onLoad);
		this.image.removeEventListener("error", this.#onError);
		if (wasLoading) this.image.removeAttribute("src");
	}

	#start(): void {
		if (this.#phase !== "queued") return;
		this.#phase = "loading";
		this.#timer = setTimeout(this.#onTimeout, LOAD_TIMEOUT_MS);
		this.image.src = this.url;
	}

	readonly #onLoad = (): void => {
		if (this.#phase !== "loading") return;
		this.#settle();
		if (this.image.naturalWidth === 0) {
			this.#phase = "failed";
			return;
		}
		this.#phase = "done";
		this.image.classList.add("is-loaded");
	};

	readonly #onError = (): void => {
		if (this.#phase !== "loading") return;
		this.#settle();
		this.#phase = "failed";
		trace("a pin photo failed to load");
	};

	readonly #onTimeout = (): void => {
		if (this.#phase !== "loading") return;
		this.#settle();
		this.#phase = "failed";
		this.image.removeAttribute("src");
		trace(`a pin photo gave no answer for ${LOAD_TIMEOUT_MS} ms`);
	};

	#settle(): void {
		clearTimeout(this.#timer);
		this.#timer = undefined;
		const release = this.#release;
		this.#release = null;
		release?.();
	}
}
