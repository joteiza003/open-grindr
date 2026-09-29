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

import {
	circleAreaKm2,
	circleBounds,
	destinationPoint,
	distanceMeters,
	formatDistanceKm,
	isPointInCircle,
	radiusFromPoint,
	radiusPixels,
	radiusToSlider,
	sliderToRadius,
} from "./geographic";

describe("circle geometry", () => {
	const madrid = { latitude: 40.4168, longitude: -3.7038 };

	it("destinationPoint travels the requested distance", () => {
		for (const bearing of [0, 45, 90, 180, 270]) {
			const point = destinationPoint(madrid, bearing, 12_345);
			expect(distanceMeters(madrid, point)).toBeCloseTo(12_345, -1);
		}
		expect(destinationPoint(madrid, 0, 1000).latitude).toBeGreaterThan(
			madrid.latitude,
		);
		expect(destinationPoint(madrid, 90, 1000).longitude).toBeGreaterThan(
			madrid.longitude,
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

	it("derives the radius from a dragged handle, clamped and rounded", () => {
		const handle = destinationPoint(madrid, 90, 5000);
		expect(radiusFromPoint(madrid, handle)).toBe(5);
		expect(radiusFromPoint(madrid, madrid)).toBe(0.1);
		expect(
			radiusFromPoint(madrid, destinationPoint(madrid, 90, 900_000)),
		).toBe(200);
	});

	it("detects points inside a circle", () => {
		const circle = { ...madrid, radiusKm: 5 };
		expect(
			isPointInCircle(destinationPoint(madrid, 30, 4900), circle),
		).toBe(true);
		expect(
			isPointInCircle(destinationPoint(madrid, 30, 5100), circle),
		).toBe(false);
	});

	it("computes area close to pi r^2 for small radii", () => {
		expect(circleAreaKm2(5)).toBeCloseTo(Math.PI * 25, 1);
	});

	it("bounds enclose the circle", () => {
		const [[south, west], [north, east]] = circleBounds({
			...madrid,
			radiusKm: 10,
		});
		expect(south).toBeLessThan(madrid.latitude);
		expect(north).toBeGreaterThan(madrid.latitude);
		expect(west).toBeLessThan(madrid.longitude);
		expect(east).toBeGreaterThan(madrid.longitude);
	});

	it("formats distances", () => {
		expect(formatDistanceKm(0.35, "en")).toBe("350 m");
		expect(formatDistanceKm(5.24, "en")).toBe("5.2 km");
		expect(formatDistanceKm(120, "en")).toBe("120 km");
	});

	it("logarithmic slider round-trips and is monotonic", () => {
		expect(sliderToRadius(0)).toBe(0.1);
		expect(sliderToRadius(1000)).toBe(200);
		expect(sliderToRadius(500)).toBeLessThan(10);
		for (const km of [0.1, 0.5, 2, 5, 25, 100, 200]) {
			const back = sliderToRadius(radiusToSlider(km));
			expect(Math.abs(back - km) / km).toBeLessThan(0.05);
		}
		expect(radiusToSlider(1)).toBeLessThan(radiusToSlider(2));
	});

	it("shrinks pixel radius as you zoom out", () => {
		expect(radiusPixels(5, 40, 12)).toBeGreaterThan(radiusPixels(5, 40, 8));
	});
});
