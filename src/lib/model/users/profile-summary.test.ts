import { describe, expect, it } from "vitest";

import { lookingForSummary } from "./profile-summary";

const labels = { 1: "Chat", 2: "Dates", 3: "Friends", 4: "Networking" };

describe("lookingForSummary", () => {
	it("keeps known labels and counts what does not fit", () => {
		expect(lookingForSummary({ ids: [1, 2, 3, 4], labels })).toEqual({
			shown: ["Chat", "Dates", "Friends"],
			more: 1,
		});
	});

	it("ignores unknown ids and repeats", () => {
		expect(lookingForSummary({ ids: [9, 1, 1], labels })).toEqual({
			shown: ["Chat"],
			more: 0,
		});
	});

	it("handles a missing list", () => {
		expect(lookingForSummary({ ids: null, labels })).toEqual({
			shown: [],
			more: 0,
		});
	});
});
