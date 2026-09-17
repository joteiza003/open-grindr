import { describe, expect, it } from "vitest";

import {
	DEFAULT_FREQUENT_PHRASES,
	parseFrequentPhrasesFile,
} from "./frequent-phrases";

describe("frequent phrases", () => {
	it("ships twenty default phrases", () => {
		expect(DEFAULT_FREQUENT_PHRASES).toHaveLength(20);
		expect(DEFAULT_FREQUENT_PHRASES[0]?.text).toBe("Hola 😊");
		expect(DEFAULT_FREQUENT_PHRASES[19]?.text).toBe("Perfecto.");
	});

	it("falls back to defaults when storage is missing or empty", () => {
		expect(parseFrequentPhrasesFile(null)).toHaveLength(20);
		expect(
			parseFrequentPhrasesFile({ version: 1, phrases: [] }),
		).toHaveLength(20);
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
