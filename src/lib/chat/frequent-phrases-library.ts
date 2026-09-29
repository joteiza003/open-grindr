import {
	existsAppDataFile,
	readAppDataFile,
	writeAppDataFileAtomic,
} from "$lib/app-data";
import {
	addPhrase,
	DEFAULT_FREQUENT_PHRASES,
	type FrequentPhrase,
	parseFrequentPhrasesFile,
	type PhraseProblem,
	phraseProblem,
} from "$lib/model/messaging/frequent-phrases";

const PHRASES_PATH = "frequent-phrases.json";

export async function loadFrequentPhrases(): Promise<FrequentPhrase[]> {
	if (!(await existsAppDataFile(PHRASES_PATH))) {
		return DEFAULT_FREQUENT_PHRASES.map((phrase) => ({ ...phrase }));
	}
	try {
		const bytes = await readAppDataFile(PHRASES_PATH);
		return parseFrequentPhrasesFile(
			JSON.parse(new TextDecoder().decode(bytes)),
		);
	} catch (error) {
		console.error("[frequent-phrases] Failed to read", error);
		return DEFAULT_FREQUENT_PHRASES.map((phrase) => ({ ...phrase }));
	}
}

export async function saveFrequentPhrases(
	phrases: FrequentPhrase[],
): Promise<void> {
	const content = new TextEncoder().encode(
		JSON.stringify({ version: 1, phrases }),
	);
	await writeAppDataFileAtomic({ path: PHRASES_PATH, content });
}

export type FrequentPhrasesBackend = {
	load(): Promise<FrequentPhrase[]>;
	save(phrases: FrequentPhrase[]): Promise<void>;
};

export const appDataFrequentPhrasesBackend: FrequentPhrasesBackend = {
	load: loadFrequentPhrases,
	save: saveFrequentPhrases,
};

export function memoryFrequentPhrasesBackend(
	seed: FrequentPhrase[] = DEFAULT_FREQUENT_PHRASES,
): FrequentPhrasesBackend {
	let current = seed.map((phrase) => ({ ...phrase }));
	return {
		load: () => Promise.resolve(current.map((phrase) => ({ ...phrase }))),
		save(phrases) {
			current = phrases.map((phrase) => ({ ...phrase }));
			return Promise.resolve();
		},
	};
}

let mutationQueue: Promise<unknown> = Promise.resolve();

/**
 * Serialized read-modify-write so quick consecutive edits (or an "add from
 * message" racing the settings page) can't clobber each other.
 */
export function mutateFrequentPhrases<T>(
	update: (current: FrequentPhrase[]) => {
		next: FrequentPhrase[];
		result: T;
	},
	backend: FrequentPhrasesBackend = appDataFrequentPhrasesBackend,
): Promise<{ phrases: FrequentPhrase[]; result: T }> {
	const run = mutationQueue.then(async () => {
		const { next, result } = update(await backend.load());
		await backend.save(next);
		return { phrases: next, result };
	});
	mutationQueue = run.then(
		() => undefined,
		() => undefined,
	);
	return run;
}

/** Add text (e.g. from a chat message) as a phrase; reports why it was refused. */
export async function addFrequentPhraseFromText(
	text: string,
	backend: FrequentPhrasesBackend = appDataFrequentPhrasesBackend,
): Promise<PhraseProblem | null> {
	const { result } = await mutateFrequentPhrases((current) => {
		const problem = phraseProblem(current, text);
		return {
			next: problem ? current : addPhrase(current, text),
			result: problem,
		};
	}, backend);
	return result;
}
