import { describe, expect, it } from "vitest";

import { fitToLimit } from "./promote-to-real";

describe("fitToLimit", () => {
	it("keeps the order and cuts at the account limit", () => {
		expect(fitToLimit([5, 3, 9, 1], 3)).toEqual([5, 3, 9]);
	});

	it("drops repeated ids", () => {
		expect(fitToLimit([1, 2, 1, 3], 10)).toEqual([1, 2, 3]);
	});

	it("never goes negative", () => {
		expect(fitToLimit([1, 2], -4)).toEqual([]);
	});
});
