import { describe, expect, it } from "vitest";

import { greetingPlan } from "./greet";

describe("greetingPlan", () => {
	it("keeps the configured texts and photos in order", () => {
		expect(
			greetingPlan({
				greetingMessages: [" Buenas ", "", "Qué tal"],
				greetingMediaIds: [7, 3, 7],
			}),
		).toEqual({ texts: ["Buenas", "Qué tal"], mediaIds: [7, 3] });
	});

	it("falls back to the default greeting when nothing is set", () => {
		expect(
			greetingPlan({ greetingMessages: [], greetingMediaIds: [] }).texts,
		).toEqual(["Hola", "¿Qué tal?"]);
	});

	it("allows photos only", () => {
		expect(
			greetingPlan({ greetingMessages: [], greetingMediaIds: [4] }),
		).toEqual({ texts: [], mediaIds: [4] });
	});
});
