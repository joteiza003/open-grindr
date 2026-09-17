import { describe, expect, it } from "vitest";

import { MAX_RADIUS_KM } from "$lib/model/map-elements";
import {
	CIRCLE_FILL_OPACITY,
	clampRadius,
	convertKmToMeters,
	roundRadius,
	validateColor,
	validateCoordinates,
	validateName,
	validateRadius,
	validateTitle,
} from "./geographic";

describe("geographic utilities", () => {
	it("converts kilometres to metres without compensating for zoom", () => {
		expect(convertKmToMeters(5)).toBe(5000);
		expect(convertKmToMeters(0.1)).toBe(100);
		expect(convertKmToMeters(12.5)).toBe(12500);
	});

	it("rejects zero, negative and oversized radii", () => {
		expect(validateRadius(0)).toMatch(/greater than 0/);
		expect(validateRadius(-3)).toMatch(/greater than 0/);
		expect(validateRadius(MAX_RADIUS_KM + 1)).toMatch(/Maximum/);
		expect(validateRadius(5)).toBeNull();
		expect(validateRadius(0.1)).toBeNull();
	});

	it("rejects invalid coordinates and accepts the equator", () => {
		expect(validateCoordinates(Number.NaN, 0)).not.toBeNull();
		expect(validateCoordinates(91, 0)).not.toBeNull();
		expect(validateCoordinates(0, 200)).not.toBeNull();
		expect(validateCoordinates(43.22, -2.05)).toBeNull();
		expect(validateCoordinates(0, 0)).toBeNull();
	});

	it("allows an optional circumference name", () => {
		expect(validateName("")).toBeNull();
		expect(validateName("North area")).toBeNull();
		expect(validateName("x".repeat(81))).not.toBeNull();
	});

	it("validates hex colors and titles", () => {
		expect(validateColor("#FF0000")).toBeNull();
		expect(validateColor("#fff")).not.toBeNull();
		expect(validateColor("red")).not.toBeNull();
		expect(validateTitle("Meeting place")).toBeNull();
		expect(validateTitle("   ")).not.toBeNull();
		expect(validateTitle("")).not.toBeNull();
		expect(validateTitle("x".repeat(81))).not.toBeNull();
	});

	it("keeps fill opacity at 20%", () => {
		expect(CIRCLE_FILL_OPACITY).toBe(0.2);
	});

	it("rounds and clamps decimal radii", () => {
		expect(roundRadius(5.04)).toBe(5);
		expect(roundRadius(5.06)).toBe(5.1);
		expect(clampRadius(0)).toBe(0.1);
		expect(clampRadius(9999)).toBe(MAX_RADIUS_KM);
	});
});
