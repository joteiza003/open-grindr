import z from "zod";

export const frequentPhraseSchema = z.object({
	id: z.string().min(1),
	text: z.string().trim().min(1).max(280),
	favorite: z.boolean().optional(),
	sortOrder: z.number().int().optional(),
});

export type FrequentPhrase = z.infer<typeof frequentPhraseSchema>;

export const frequentPhrasesFileSchema = z.object({
	version: z.literal(1),
	phrases: z.array(frequentPhraseSchema),
});

export type FrequentPhrasesFile = z.infer<typeof frequentPhrasesFileSchema>;

export const DEFAULT_FREQUENT_PHRASES: FrequentPhrase[] = [
	{ id: "phrase-01", text: "Hola 😊", sortOrder: 0 },
	{ id: "phrase-02", text: "¿Qué tal?", sortOrder: 1 },
	{ id: "phrase-03", text: "¿Qué haces?", sortOrder: 2 },
	{ id: "phrase-04", text: "¿Dónde estás?", sortOrder: 3 },
	{ id: "phrase-05", text: "¿Te apetece hablar?", sortOrder: 4 },
	{ id: "phrase-06", text: "¿Nos vemos?", sortOrder: 5 },
	{ id: "phrase-07", text: "¿Cuándo te viene bien?", sortOrder: 6 },
	{ id: "phrase-08", text: "Estoy por aquí.", sortOrder: 7 },
	{ id: "phrase-09", text: "Estoy cerca.", sortOrder: 8 },
	{ id: "phrase-10", text: "Ahora mismo puedo.", sortOrder: 9 },
	{ id: "phrase-11", text: "Luego te escribo.", sortOrder: 10 },
	{ id: "phrase-12", text: "Dame un momento.", sortOrder: 11 },
	{ id: "phrase-13", text: "¿Te apetece tomar algo?", sortOrder: 12 },
	{ id: "phrase-14", text: "¿Quieres quedar?", sortOrder: 13 },
	{ id: "phrase-15", text: "¿Te viene bien ahora?", sortOrder: 14 },
	{ id: "phrase-16", text: "Avísame cuando llegues.", sortOrder: 15 },
	{ id: "phrase-17", text: "Ya estoy aquí.", sortOrder: 16 },
	{ id: "phrase-18", text: "¿Todo bien?", sortOrder: 17 },
	{ id: "phrase-19", text: "Me parece bien.", sortOrder: 18 },
	{ id: "phrase-20", text: "Perfecto.", sortOrder: 19 },
];

export function parseFrequentPhrasesFile(raw: unknown): FrequentPhrase[] {
	const parsed = frequentPhrasesFileSchema.safeParse(raw);
	// An intentionally emptied list is valid; only bad data falls back.
	if (!parsed.success) {
		return DEFAULT_FREQUENT_PHRASES.map((phrase) => ({ ...phrase }));
	}
	return [...parsed.data.phrases].sort(
		(a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
	);
}

export const MAX_PHRASE_LENGTH = 280;
export const MAX_PHRASES = 100;

export type PhraseProblem = "empty" | "too-long" | "duplicate" | "limit";

function sameText(a: string, b: string): boolean {
	return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Why `text` can't be stored as a phrase, or null when it can. */
export function phraseProblem(
	phrases: FrequentPhrase[],
	text: string,
	{ ignoreId }: { ignoreId?: string } = {},
): PhraseProblem | null {
	const trimmed = text.trim();
	if (trimmed === "") return "empty";
	if (trimmed.length > MAX_PHRASE_LENGTH) return "too-long";
	if (
		phrases.some(
			(phrase) =>
				phrase.id !== ignoreId && sameText(phrase.text, trimmed),
		)
	) {
		return "duplicate";
	}
	if (ignoreId === undefined && phrases.length >= MAX_PHRASES) return "limit";
	return null;
}

/** Re-number `sortOrder` so it always mirrors list order. */
export function renumberPhrases(phrases: FrequentPhrase[]): FrequentPhrase[] {
	return phrases.map((phrase, index) => ({ ...phrase, sortOrder: index }));
}

export function addPhrase(
	phrases: FrequentPhrase[],
	text: string,
	id: string = `phrase-${crypto.randomUUID()}`,
): FrequentPhrase[] {
	return renumberPhrases([...phrases, { id, text: text.trim() }]);
}

export function updatePhrase(
	phrases: FrequentPhrase[],
	id: string,
	text: string,
): FrequentPhrase[] {
	return phrases.map((phrase) =>
		phrase.id === id ? { ...phrase, text: text.trim() } : phrase,
	);
}

export function removePhrases(
	phrases: FrequentPhrase[],
	ids: Iterable<string>,
): FrequentPhrase[] {
	const doomed = new Set(ids);
	return renumberPhrases(phrases.filter((phrase) => !doomed.has(phrase.id)));
}

/** Move one phrase by `delta` positions (clamped to the list bounds). */
export function movePhrase(
	phrases: FrequentPhrase[],
	id: string,
	delta: number,
): FrequentPhrase[] {
	const from = phrases.findIndex((phrase) => phrase.id === id);
	if (from === -1) return phrases;
	const to = Math.min(phrases.length - 1, Math.max(0, from + delta));
	if (to === from) return phrases;
	const next = [...phrases];
	const [moved] = next.splice(from, 1);
	next.splice(to, 0, moved as FrequentPhrase);
	return renumberPhrases(next);
}

/** Text a message can contribute as a frequent phrase, if it carries any. */
export function phraseSourceText(message: {
	type: string;
	body?: unknown;
}): string | undefined {
	const body = message.body as Record<string, unknown> | undefined;
	if (!body) return undefined;
	const value =
		message.type === "Text"
			? body.text
			: message.type === "ProfilePhotoReply"
				? body.photoContentReply
				: message.type === "AlbumContentReply"
					? body.albumContentReply
					: undefined;
	return typeof value === "string" && value.trim() !== ""
		? value.trim()
		: undefined;
}
