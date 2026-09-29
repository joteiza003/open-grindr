import { describe, expect, it } from "vitest";

import {
	addPhrase,
	DEFAULT_FREQUENT_PHRASES,
	MAX_PHRASE_LENGTH,
	movePhrase,
	parseFrequentPhrasesFile,
	phraseProblem,
	phraseSourceText,
	removePhrases,
	updatePhrase,
} from "./frequent-phrases";

describe("frequent phrases", () => {
	it("ships twenty default phrases", () => {
		expect(DEFAULT_FREQUENT_PHRASES).toHaveLength(20);
		expect(DEFAULT_FREQUENT_PHRASES[0]?.text).toBe("Hola 😊");
		expect(DEFAULT_FREQUENT_PHRASES[19]?.text).toBe("Perfecto.");
	});

	it("falls back to defaults when storage is missing or invalid", () => {
		expect(parseFrequentPhrasesFile(null)).toHaveLength(20);
		expect(parseFrequentPhrasesFile({ version: 2 })).toHaveLength(20);
	});

	it("keeps an intentionally emptied list empty", () => {
		expect(parseFrequentPhrasesFile({ version: 1, phrases: [] })).toEqual(
			[],
		);
	});

	it("keeps a stored custom list", () => {
		const parsed = parseFrequentPhrasesFile({
			version: 1,
			phrases: [{ id: "custom", text: "Hasta luego", sortOrder: 0 }],
		});
		expect(parsed).toEqual([
			{ id: "custom", text: "Hasta luego", sortOrder: 0 },
		]);
	});
});

describe("frequent phrase editing", () => {
	const base = [
		{ id: "a", text: "Hola", sortOrder: 0 },
		{ id: "b", text: "Adiós", sortOrder: 1 },
		{ id: "c", text: "Vale", sortOrder: 2 },
	];

	it("adds at the end with contiguous sortOrder", () => {
		const next = addPhrase(base, "  Nuevo  ", "d");
		expect(next.map((p) => p.id)).toEqual(["a", "b", "c", "d"]);
		expect(next[3]).toEqual({ id: "d", text: "Nuevo", sortOrder: 3 });
	});

	it("updates text without touching order", () => {
		expect(updatePhrase(base, "b", " Chao ")[1]?.text).toBe("Chao");
	});

	it("removes several and renumbers", () => {
		const next = removePhrases(base, ["a", "c"]);
		expect(next).toEqual([{ id: "b", text: "Adiós", sortOrder: 0 }]);
	});

	it("moves within bounds and ignores no-op moves", () => {
		expect(movePhrase(base, "c", -1).map((p) => p.id)).toEqual([
			"a",
			"c",
			"b",
		]);
		expect(movePhrase(base, "a", -5).map((p) => p.id)).toEqual([
			"a",
			"b",
			"c",
		]);
		expect(movePhrase(base, "a", -1)).toBe(base);
		expect(movePhrase(base, "zzz", 1)).toBe(base);
	});

	it("validates empty, long, duplicate (case-insensitive) and the list limit", () => {
		expect(phraseProblem(base, "   ")).toBe("empty");
		expect(phraseProblem(base, "x".repeat(MAX_PHRASE_LENGTH + 1))).toBe(
			"too-long",
		);
		expect(phraseProblem(base, " hola ")).toBe("duplicate");
		expect(phraseProblem(base, "hola", { ignoreId: "a" })).toBeNull();
		expect(phraseProblem(base, "Nuevo")).toBeNull();
		const full = Array.from({ length: 100 }, (_, i) => ({
			id: String(i),
			text: "t" + i,
		}));
		expect(phraseProblem(full, "otra")).toBe("limit");
	});

	it("extracts phrase text from text-bearing messages only", () => {
		expect(phraseSourceText({ type: "Text", body: { text: " hi " } })).toBe(
			"hi",
		);
		expect(
			phraseSourceText({
				type: "ProfilePhotoReply",
				body: { photoContentReply: "nice" },
			}),
		).toBe("nice");
		expect(
			phraseSourceText({
				type: "AlbumContentReply",
				body: { albumContentReply: "wow" },
			}),
		).toBe("wow");
		expect(phraseSourceText({ type: "Image", body: {} })).toBeUndefined();
		expect(
			phraseSourceText({ type: "Text", body: { text: "  " } }),
		).toBeUndefined();
	});
});
