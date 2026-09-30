import { describe, expect, it } from "vitest";

import { applyBound, parseTyped } from "./range-bounds";

const limits = { floor: 18, ceiling: 99 };

describe("applyBound", () => {
	it("sets the minimum and keeps the maximum", () => {
		expect(
			applyBound({ range: [18, 99], limits, which: "min", typed: 30 }),
		).toEqual([30, 99]);
	});

	it("clamps to the limits and rounds", () => {
		expect(
			applyBound({ range: [18, 99], limits, which: "min", typed: 5 }),
		).toEqual([18, 99]);
		expect(
			applyBound({ range: [18, 99], limits, which: "max", typed: 150 }),
		).toEqual([18, 99]);
		expect(
			applyBound({ range: [18, 99], limits, which: "max", typed: 40.6 }),
		).toEqual([18, 41]);
	});

	it("removes a bound when the field is emptied", () => {
		expect(
			applyBound({ range: [30, 40], limits, which: "min", typed: null }),
		).toEqual([18, 40]);
		expect(
			applyBound({ range: [30, 40], limits, which: "max", typed: null }),
		).toEqual([30, 99]);
	});

	it("drags the other bound along when they cross", () => {
		expect(
			applyBound({ range: [30, 40], limits, which: "min", typed: 50 }),
		).toEqual([50, 50]);
		expect(
			applyBound({ range: [30, 40], limits, which: "max", typed: 20 }),
		).toEqual([20, 20]);
	});
});

describe("parseTyped", () => {
	it("parses numbers, decimal commas and blanks", () => {
		expect(parseTyped(" 42 ")).toBe(42);
		expect(parseTyped("1,5")).toBe(1.5);
		expect(parseTyped("")).toBeNull();
		expect(parseTyped("abc")).toBeNull();
	});
});
