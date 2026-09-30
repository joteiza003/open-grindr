import { describe, expect, it } from "vitest";

import {
	destinationPoint,
	distanceMeters,
	validateCoordinates,
	validateTitle,
} from "./geographic";

describe("geographic utilities", () => {
	it("rejects invalid coordinates and accepts the equator", () => {
		expect(validateCoordinates(Number.NaN, 0)).not.toBeNull();
		expect(validateCoordinates(91, 0)).not.toBeNull();
		expect(validateCoordinates(0, 200)).not.toBeNull();
		expect(validateCoordinates(43.22, -2.05)).toBeNull();
		expect(validateCoordinates(0, 0)).toBeNull();
	});

	it("validates titles", () => {
		expect(validateTitle("")).not.toBeNull();
		expect(validateTitle("   ")).not.toBeNull();
		expect(validateTitle("Meeting place")).toBeNull();
		expect(validateTitle("x".repeat(81))).not.toBeNull();
	});
});

describe("geometry", () => {
	const madrid = { latitude: 40.4168, longitude: -3.7038 };

	it("destinationPoint travels the requested distance", () => {
		for (const bearing of [0, 45, 90, 180, 270]) {
			const point = destinationPoint(madrid, bearing, 12_345);
			expect(distanceMeters(madrid, point)).toBeCloseTo(12_345, -1);
		}
		expect(destinationPoint(madrid, 0, 1000).latitude).toBeGreaterThan(
			madrid.latitude,
		);
	});

	it("wraps longitude across the antimeridian", () => {
		const point = destinationPoint(
			{ latitude: 0, longitude: 179.9 },
			90,
			50_000,
		);
		expect(point.longitude).toBeLessThan(-179);
	});
});
