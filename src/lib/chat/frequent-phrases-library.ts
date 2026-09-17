import {
	existsAppDataFile,
	readAppDataFile,
	writeAppDataFileAtomic,
} from "$lib/app-data";
import {
	DEFAULT_FREQUENT_PHRASES,
	type FrequentPhrase,
	parseFrequentPhrasesFile,
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
