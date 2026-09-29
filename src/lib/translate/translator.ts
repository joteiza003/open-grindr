import { baseLanguage } from "./languages";
import {
	type Provider,
	TranslateError,
	type TranslateRequest,
} from "./providers";
import { isTranslatable } from "./text";

export type Translation = {
	text: string;
	/** Detected (or given) source language, when known. */
	from?: string;
	provider: string;
	/** The text was already in the target language; `text` is the original. */
	sameLanguage: boolean;
};

const MAX_CACHE_ENTRIES = 500;

/**
 * Translates with a chain of providers: results are cached (LRU), identical
 * in-flight requests are shared, and a provider that is rate limited or
 * unreachable hands over to the next one.
 */
export class Translator {
	#providers: () => Provider[];
	#cache = new Map<string, Translation>();
	#inflight = new Map<string, Promise<Translation>>();

	constructor(providers: () => Provider[]) {
		this.#providers = providers;
	}

	clearCache(): void {
		this.#cache.clear();
	}

	get cacheSize(): number {
		return this.#cache.size;
	}

	async translate(
		text: string,
		{
			from = "auto",
			to,
			signal,
		}: { from?: string; to: string; signal?: AbortSignal },
	): Promise<Translation> {
		const clean = text.trim();
		if (!isTranslatable(clean) || from === to) {
			return { text: clean, provider: "none", sameLanguage: true };
		}
		const key = `${from}|${to}|${clean}`;
		const cached = this.#cache.get(key);
		if (cached) {
			this.#cache.delete(key);
			this.#cache.set(key, cached);
			return cached;
		}
		const pending = this.#inflight.get(key);
		if (pending) return pending;

		const run = this.#run({ text: clean, from, to }, signal)
			.then((result) => {
				this.#remember(key, result);
				return result;
			})
			.finally(() => this.#inflight.delete(key));
		this.#inflight.set(key, run);
		return run;
	}

	async #run(
		request: TranslateRequest,
		signal?: AbortSignal,
	): Promise<Translation> {
		let quotaError: TranslateError | null = null;
		let lastError: unknown = null;
		for (const provider of this.#providers()) {
			try {
				const result = await provider.translate(request, { signal });
				const detected = baseLanguage(result.detected);
				const sameLanguage = detected === baseLanguage(request.to);
				return {
					text: sameLanguage ? request.text : result.text,
					from: request.from === "auto" ? detected : request.from,
					provider: provider.id,
					sameLanguage,
				};
			} catch (error) {
				if (
					error instanceof TranslateError &&
					error.code === "aborted"
				) {
					throw error;
				}
				if (error instanceof TranslateError && error.code === "quota") {
					quotaError = error;
				}
				lastError = error;
			}
		}
		throw (
			quotaError ??
			(lastError instanceof Error
				? lastError
				: new TranslateError("network", "No translation provider"))
		);
	}

	#remember(key: string, value: Translation): void {
		this.#cache.set(key, value);
		if (this.#cache.size > MAX_CACHE_ENTRIES) {
			const oldest = this.#cache.keys().next().value;
			if (oldest !== undefined) this.#cache.delete(oldest);
		}
	}
}
