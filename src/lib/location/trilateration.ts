/**
 * Robust multilateration / trilateration for recovering a profile's true
 * coordinates from distanceMeters reported by the cascade API under three
 * different observer positions (one real + two spoofed).
 *
 * Uses a least-squares (gradient) refinement seeded by a closed-form
 * 2-D solution so it tolerates the noise / rounding typical of the API.
 */

import { distanceMeters } from "./distance";
import type { Coordinates } from "./location-request.svelte";

export type Measurement = {
	/** Observer position used when the cascade was fetched */
	position: Coordinates;
	/** distanceMeters reported for the profile from that position */
	distance: number;
};

export type TrilaterationResult = {
	point: Coordinates;
	/** RMS residual in metres (lower is better; < ~60 m is usually solid) */
	error: number;
	/** Per-measurement absolute residuals in metres */
	residuals: number[];
};

const METERS_PER_DEG_LAT = 111_320;

function toRad(deg: number): number {
	return (deg * Math.PI) / 180;
}

function metersPerDegLon(lat: number): number {
	return METERS_PER_DEG_LAT * Math.cos(toRad(lat));
}

/**
 * Local ENU-ish projection relative to an origin (good for city-scale baselines).
 */
function toLocal(
	origin: Coordinates,
	p: Coordinates,
): { x: number; y: number } {
	const y = (p.lat - origin.lat) * METERS_PER_DEG_LAT;
	const x = (p.lon - origin.lon) * metersPerDegLon(origin.lat);
	return { x, y };
}

function fromLocal(
	origin: Coordinates,
	local: { x: number; y: number },
): Coordinates {
	return {
		lat: origin.lat + local.y / METERS_PER_DEG_LAT,
		lon: origin.lon + local.x / metersPerDegLon(origin.lat),
	};
}

/**
 * Closed-form 2-D trilateration (three circles). Returns null when the
 * geometry is degenerate (nearly collinear observers).
 */
function closedFormTrilateration(
	m: [Measurement, Measurement, Measurement],
): Coordinates | null {
	const origin = m[0].position;
	const p1 = { x: 0, y: 0 };
	const p2 = toLocal(origin, m[1].position);
	const p3 = toLocal(origin, m[2].position);
	const r1 = m[0].distance;
	const r2 = m[1].distance;
	const r3 = m[2].distance;

	const A = 2 * p2.x;
	const B = 2 * p2.y;
	const C = r1 ** 2 - r2 ** 2 - p1.x ** 2 + p2.x ** 2 - p1.y ** 2 + p2.y ** 2;
	const D = 2 * p3.x;
	const E = 2 * p3.y;
	const F = r1 ** 2 - r3 ** 2 - p1.x ** 2 + p3.x ** 2 - p1.y ** 2 + p3.y ** 2;

	const denom = A * E - B * D;
	if (Math.abs(denom) < 1e-6) return null;

	const x = (C * E - F * B) / denom;
	const y = (A * F - C * D) / denom;
	return fromLocal(origin, { x, y });
}

/**
 * Centroid of the three observer positions – fallback seed.
 */
function centroidSeed(measurements: Measurement[]): Coordinates {
	const n = measurements.length;
	return {
		lat: measurements.reduce((s, m) => s + m.position.lat, 0) / n,
		lon: measurements.reduce((s, m) => s + m.position.lon, 0) / n,
	};
}

/**
 * Least-squares refinement (simple gradient descent on the sum of squared
 * distance residuals). Works with ≥ 3 measurements; extra measurements
 * improve robustness to noise.
 */
function refineLeastSquares(
	seed: Coordinates,
	measurements: Measurement[],
	maxIterations = 40,
	toleranceM = 0.4,
): Coordinates {
	let estimate = { ...seed };
	const step = 0.45;

	for (let iter = 0; iter < maxIterations; iter++) {
		let gradLat = 0;
		let gradLon = 0;

		for (const m of measurements) {
			const dist = distanceMeters({ from: estimate, to: m.position });
			if (dist < 1e-3) continue;
			const residual = dist - m.distance;

			// Unit vector from observer → estimate in local metres
			const dLatM = (estimate.lat - m.position.lat) * METERS_PER_DEG_LAT;
			const dLonM =
				(estimate.lon - m.position.lon) * metersPerDegLon(estimate.lat);
			const unitLat = dLatM / dist;
			const unitLon = dLonM / dist;

			gradLat += residual * unitLat;
			gradLon += residual * unitLon;
		}

		const newLat = estimate.lat - (gradLat / METERS_PER_DEG_LAT) * step;
		const newLon =
			estimate.lon - (gradLon / metersPerDegLon(estimate.lat)) * step;

		const delta = distanceMeters({
			from: estimate,
			to: { lat: newLat, lon: newLon },
		});
		estimate = { lat: newLat, lon: newLon };
		if (delta < toleranceM) break;
	}

	return estimate;
}

function computeResiduals(
	point: Coordinates,
	measurements: Measurement[],
): number[] {
	return measurements.map((m) =>
		Math.abs(distanceMeters({ from: point, to: m.position }) - m.distance),
	);
}

/**
 * Primary entry point. Accepts 3+ measurements.
 * Returns null only when fewer than 3 measurements are supplied.
 */
export function robustTrilateration(
	measurements: Measurement[],
): TrilaterationResult | null {
	if (measurements.length < 3) return null;

	const firstThree = measurements.slice(0, 3) as [
		Measurement,
		Measurement,
		Measurement,
	];

	const closed = closedFormTrilateration(firstThree);
	const seed = closed ?? centroidSeed(measurements);
	const point = refineLeastSquares(seed, measurements);
	const residuals = computeResiduals(point, measurements);
	const error = Math.sqrt(
		residuals.reduce((s, r) => s + r * r, 0) / residuals.length,
	);

	return { point, error, residuals };
}

/**
 * Convenience: build measurements for one profile across three observer
 * positions that the user already captured.
 */
export function measurementsForProfile({
	positions,
	distances,
}: {
	positions: [Coordinates, Coordinates, Coordinates];
	distances: [number, number, number];
}): Measurement[] {
	return positions.map((position, i) => ({
		position,
		distance: distances[i]!,
	}));
}
