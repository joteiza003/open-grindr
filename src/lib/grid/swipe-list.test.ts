import { describe, expect, it } from "vitest";

import { appendDecision } from "./swipe-list";

describe("appendDecision", () => {
	it("appends new ids and ignores repeats", () => {
		expect(appendDecision([1, 2], 3)).toEqual([1, 2, 3]);
		expect(appendDecision([1, 2], 2)).toEqual([1, 2]);
	});

	it("drops the oldest ids beyond the cap", () => {
		expect(appendDecision([1, 2, 3], 4, 3)).toEqual([2, 3, 4]);
	});
});
