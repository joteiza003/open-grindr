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
	if (!parsed.success || parsed.data.phrases.length === 0) {
		return DEFAULT_FREQUENT_PHRASES.map((phrase) => ({ ...phrase }));
	}
	return [...parsed.data.phrases].sort(
		(a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
	);
}
