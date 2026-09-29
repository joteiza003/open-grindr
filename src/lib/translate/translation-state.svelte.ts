import { SvelteMap } from "svelte/reactivity";

import {
	preferencesSnapshot,
	setPreferences,
} from "$lib/app-data/preferences.svelte";
import { currentLocale } from "$lib/i18n/t";
import { createLingvaProvider, createMyMemoryProvider } from "./providers";
import { TranslateError } from "./providers";
import { isTranslatable } from "./text";
import { Translator } from "./translator";

export function translationSettings() {
	const prefs = preferencesSnapshot().translation;
	return { ...prefs, myLanguage: prefs.myLanguage ?? currentLocale() };
}

export async function updateTranslationSettings(
	patch: Partial<ReturnType<typeof preferencesSnapshot>["translation"]>,
): Promise<void> {
	await setPreferences({
		translation: { ...preferencesSnapshot().translation, ...patch },
	});
}

export const translator = new Translator(() => [
	createMyMemoryProvider({ email: preferencesSnapshot().translation.email }),
	createLingvaProvider(),
]);

export function translationErrorKey(
	error: unknown,
): "translate.quota" | "translate.offline" | "translate.failed" {
	if (error instanceof TranslateError) {
		if (error.code === "quota") return "translate.quota";
		if (error.code === "network") return "translate.offline";
	}
	return "translate.failed";
}

export type MessageTranslation =
	| { status: "loading"; visible: true }
	| {
			status: "done";
			visible: boolean;
			text: string;
			from?: string;
			sameLanguage: boolean;
	  }
	| { status: "error"; visible: true; error: unknown };

/** Per-message translations of received chat messages, shared by every bubble. */
class MessageTranslations {
	#entries = new SvelteMap<string, MessageTranslation>();

	get(messageId: string): MessageTranslation | undefined {
		return this.#entries.get(messageId);
	}

	/** Translate (once) and show the result under the message. */
	async show(messageId: string, text: string): Promise<void> {
		const existing = this.#entries.get(messageId);
		if (existing?.status === "loading") return;
		if (existing?.status === "done") {
			this.#entries.set(messageId, { ...existing, visible: true });
			return;
		}
		if (!isTranslatable(text)) return;
		this.#entries.set(messageId, { status: "loading", visible: true });
		try {
			const result = await translator.translate(text, {
				to: translationSettings().myLanguage,
			});
			this.#entries.set(messageId, {
				status: "done",
				visible: true,
				text: result.text,
				from: result.from,
				sameLanguage: result.sameLanguage,
			});
		} catch (error) {
			console.error("[translate]", error);
			this.#entries.set(messageId, {
				status: "error",
				visible: true,
				error,
			});
		}
	}

	hide(messageId: string): void {
		const existing = this.#entries.get(messageId);
		if (existing?.status === "done") {
			this.#entries.set(messageId, { ...existing, visible: false });
		} else if (existing) {
			this.#entries.delete(messageId);
		}
	}

	/** Forget a failed attempt so the next `show` retries. */
	reset(messageId: string): void {
		this.#entries.delete(messageId);
	}

	clear(): void {
		this.#entries.clear();
	}
}

export const messageTranslations = new MessageTranslations();

const PREVIEW_DELAY_MS = 600;

/** Live "translate what I'm typing" for one conversation's composer. */
export class OutgoingTranslation {
	readonly conversationId: string;
	preview = $state<string | null>(null);
	loading = $state(false);
	error = $state<unknown>(null);

	#timer: ReturnType<typeof setTimeout> | undefined;
	#token = 0;

	constructor(conversationId: string) {
		this.conversationId = conversationId;
	}

	get available(): boolean {
		return translationSettings().enabled;
	}

	get active(): boolean {
		const settings = translationSettings();
		return (
			settings.enabled &&
			(settings.chatOutgoing[this.conversationId] ?? false)
		);
	}

	get language(): string {
		const settings = translationSettings();
		return (
			settings.chatLanguages[this.conversationId] ??
			settings.defaultPartnerLanguage
		);
	}

	async setActive(active: boolean): Promise<void> {
		const settings = translationSettings();
		await updateTranslationSettings({
			chatOutgoing: {
				...settings.chatOutgoing,
				[this.conversationId]: active,
			},
		});
		if (!active) this.reset();
	}

	async setLanguage(language: string): Promise<void> {
		const settings = translationSettings();
		await updateTranslationSettings({
			chatLanguages: {
				...settings.chatLanguages,
				[this.conversationId]: language,
			},
		});
	}

	/** Debounced live preview; call whenever the draft or language changes. */
	update(text: string): void {
		clearTimeout(this.#timer);
		const token = ++this.#token;
		const clean = text.trim();
		if (!this.active || !isTranslatable(clean)) {
			this.preview = null;
			this.loading = false;
			this.error = null;
			return;
		}
		this.loading = true;
		this.#timer = setTimeout(() => {
			void this.#run(clean, token);
		}, PREVIEW_DELAY_MS);
	}

	async #run(text: string, token: number): Promise<void> {
		try {
			const result = await translator.translate(text, {
				to: this.language,
			});
			if (token !== this.#token) return;
			this.preview = result.sameLanguage ? null : result.text;
			this.error = null;
		} catch (error) {
			if (token !== this.#token) return;
			this.preview = null;
			this.error = error;
		} finally {
			if (token === this.#token) this.loading = false;
		}
	}

	/**
	 * The text that should actually be sent. Uses the cache when the preview is
	 * already there and throws (so the caller can keep the draft) on failure.
	 */
	async resolve(text: string): Promise<string> {
		const clean = text.trim();
		if (!this.active || !isTranslatable(clean)) return text;
		clearTimeout(this.#timer);
		this.#token += 1;
		const result = await translator.translate(clean, { to: this.language });
		return result.sameLanguage ? text : result.text;
	}

	reset(): void {
		clearTimeout(this.#timer);
		this.#token += 1;
		this.preview = null;
		this.loading = false;
		this.error = null;
	}
}
