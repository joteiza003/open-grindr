import { describe, expect, it } from "vitest";

import { appendUsageEvents, parseUsageEventsFile } from "./events";

describe("parseUsageEventsFile", () => {
	it("keeps valid entries and drops corrupt ones", () => {
		const events = parseUsageEventsFile({
			version: 1,
			events: [
				{ t: 1, k: "in", c: "x" },
				{ t: "bad", k: "in" },
				{ t: 2, k: "unknown" },
				{ t: 3, k: "session", d: 5 },
			],
		});
		expect(events).toEqual([
			{ t: 1, k: "in", c: "x" },
			{ t: 3, k: "session", d: 5 },
		]);
	});

	it("returns nothing for an unrecognised file", () => {
		expect(parseUsageEventsFile({ version: 2, events: [] })).toEqual([]);
		expect(parseUsageEventsFile(null)).toEqual([]);
	});
});

describe("appendUsageEvents", () => {
	it("drops the oldest events beyond the cap", () => {
		const base = [
			{ t: 1, k: "in" as const },
			{ t: 2, k: "in" as const },
		];
		expect(appendUsageEvents(base, [{ t: 3, k: "out" }], 2)).toEqual([
			{ t: 2, k: "in" },
			{ t: 3, k: "out" },
		]);
	});
});
