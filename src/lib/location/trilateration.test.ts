import { describe, expect, it } from "vitest";

import { distanceMeters } from "./distance";
import { type Measurement, robustTrilateration } from "./trilateration";

/** Synthetic true position */
const TRUE = { lat: 40.42, lon: -3.7 };

function makeMeasurements(
	observers: { lat: number; lon: number }[],
	noiseM = 0,
): Measurement[] {
	return observers.map((position) => {
		const exact = distanceMeters({ from: position, to: TRUE });
		const distance = exact + (Math.random() * 2 - 1) * noiseM;
		return { position, distance: Math.max(0, distance) };
	});
}

describe("robustTrilateration", () => {
	it("recovers a point with three well-spaced observers (no noise)", () => {
		const observers = [
			{ lat: 40.4168, lon: -3.7038 },
			{ lat: 40.428, lon: -3.715 },
			{ lat: 40.41, lon: -3.69 },
		];
		const measurements = makeMeasurements(observers, 0);
		const result = robustTrilateration(measurements);
		expect(result).not.toBeNull();
		const err = distanceMeters({ from: result!.point, to: TRUE });
		expect(err).toBeLessThan(25);
		expect(result!.error).toBeLessThan(5);
	});

	it("tolerates ~30 m noise", () => {
		const observers = [
			{ lat: 40.4168, lon: -3.7038 },
			{ lat: 40.43, lon: -3.72 },
			{ lat: 40.405, lon: -3.685 },
		];
		// fixed seed-ish noise by using fixed offsets
		const measurements: Measurement[] = observers.map((position, i) => {
			const exact = distanceMeters({ from: position, to: TRUE });
			const noise = [12, -18, 25][i]!;
			return { position, distance: exact + noise };
		});
		const result = robustTrilateration(measurements);
		expect(result).not.toBeNull();
		const err = distanceMeters({ from: result!.point, to: TRUE });
		expect(err).toBeLessThan(80);
	});

	it("returns null with fewer than 3 measurements", () => {
		expect(robustTrilateration([])).toBeNull();
		expect(
			robustTrilateration([
				{ position: { lat: 0, lon: 0 }, distance: 100 },
			]),
		).toBeNull();
	});
});
