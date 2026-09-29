import { SvelteSet } from "svelte/reactivity";

import {
	addPhrase,
	DEFAULT_FREQUENT_PHRASES,
	type FrequentPhrase,
	movePhrase,
	type PhraseProblem,
	phraseProblem,
	removePhrases,
	updatePhrase,
} from "$lib/model/messaging/frequent-phrases";
import {
	appDataFrequentPhrasesBackend,
	type FrequentPhrasesBackend,
	mutateFrequentPhrases,
} from "./frequent-phrases-library";

export type PhraseResult = { ok: true } | { ok: false; problem: PhraseProblem };

/** Reactive view-model for the frequent-phrases editor in settings. */
export class FrequentPhrasesState {
	phrases = $state<FrequentPhrase[]>([]);
	loading = $state(true);
	selecting = $state(false);
	selected = new SvelteSet<string>();

	#backend: FrequentPhrasesBackend;

	constructor(
		backend: FrequentPhrasesBackend = appDataFrequentPhrasesBackend,
	) {
		this.#backend = backend;
	}

	get allSelected(): boolean {
		return (
			this.phrases.length > 0 &&
			this.selected.size === this.phrases.length
		);
	}

	async load(): Promise<void> {
		this.loading = true;
		try {
			this.phrases = await this.#backend.load();
		} catch (error) {
			console.error("[frequent-phrases] Failed to load", error);
			this.phrases = [];
		} finally {
			this.loading = false;
		}
	}

	async add(text: string): Promise<PhraseResult> {
		return this.#run((current) => {
			const problem = phraseProblem(current, text);
			return problem
				? { next: current, result: { ok: false, problem } }
				: { next: addPhrase(current, text), result: { ok: true } };
		});
	}

	async edit(id: string, text: string): Promise<PhraseResult> {
		return this.#run((current) => {
			const problem = phraseProblem(current, text, { ignoreId: id });
			return problem
				? { next: current, result: { ok: false, problem } }
				: {
						next: updatePhrase(current, id, text),
						result: { ok: true },
					};
		});
	}

	async remove(ids: Iterable<string>): Promise<void> {
		const doomed = [...ids];
		await this.#run((current) => ({
			next: removePhrases(current, doomed),
			result: { ok: true },
		}));
		for (const id of doomed) this.selected.delete(id);
		if (this.phrases.length === 0) this.stopSelecting();
	}

	async removeSelected(): Promise<void> {
		await this.remove([...this.selected]);
		this.stopSelecting();
	}

	async move(id: string, delta: number): Promise<void> {
		await this.#run((current) => ({
			next: movePhrase(current, id, delta),
			result: { ok: true },
		}));
	}

	async resetToDefaults(): Promise<void> {
		await this.#run(() => ({
			next: DEFAULT_FREQUENT_PHRASES.map((phrase) => ({ ...phrase })),
			result: { ok: true },
		}));
		this.stopSelecting();
	}

	startSelecting(id?: string): void {
		this.selecting = true;
		if (id !== undefined) this.selected.add(id);
	}

	stopSelecting(): void {
		this.selecting = false;
		this.selected.clear();
	}

	toggle(id: string): void {
		if (this.selected.has(id)) this.selected.delete(id);
		else this.selected.add(id);
	}

	toggleAll(): void {
		if (this.allSelected) {
			this.selected.clear();
			return;
		}
		for (const phrase of this.phrases) this.selected.add(phrase.id);
	}

	async #run(
		update: (current: FrequentPhrase[]) => {
			next: FrequentPhrase[];
			result: PhraseResult;
		},
	): Promise<PhraseResult> {
		const { phrases, result } = await mutateFrequentPhrases(
			update,
			this.#backend,
		);
		this.phrases = phrases;
		return result;
	}
}
