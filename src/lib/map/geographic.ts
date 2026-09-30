import { MAX_TITLE_LENGTH } from "$lib/model/map-elements";

export function validateCoordinates(
	latitude: unknown,
	longitude: unknown,
): string | null {
	if (typeof latitude !== "number" || typeof longitude !== "number") {
		return "Coordinates must be numbers.";
	}
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return "Coordinates are not valid.";
	}
	if (latitude < -90 || latitude > 90) {
		return "Latitude must be between -90 and 90.";
	}
	if (longitude < -180 || longitude > 180) {
		return "Longitude must be between -180 and 180.";
	}
	return null;
}

export function validateTitle(title: unknown): string | null {
	if (typeof title !== "string") return "Title is required.";
	const trimmed = title.trim();
	if (trimmed.length < 1) return "Title cannot be empty.";
	if (trimmed.length > MAX_TITLE_LENGTH) {
		return `Title cannot exceed ${MAX_TITLE_LENGTH} characters.`;
	}
	return null;
}

const EARTH_RADIUS_M = 6371000;

export function distanceMeters(
	a: { latitude: number; longitude: number },
	b: { latitude: number; longitude: number },
): number {
	const φ1 = (a.latitude * Math.PI) / 180;
	const φ2 = (b.latitude * Math.PI) / 180;
	const Δφ = ((b.latitude - a.latitude) * Math.PI) / 180;
	const Δλ = ((b.longitude - a.longitude) * Math.PI) / 180;
	const sinΔφ = Math.sin(Δφ / 2);
	const sinΔλ = Math.sin(Δλ / 2);
	const h = sinΔφ * sinΔφ + Math.cos(φ1) * Math.cos(φ2) * sinΔλ * sinΔλ;
	return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function metersPerPixel(latitude: number, zoom: number): number {
	return (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / 2 ** zoom;
}

type LatLon = { latitude: number; longitude: number };

/** Point reached from `from` travelling `meters` along `bearingDeg` (0 = north). */
export function destinationPoint(
	from: LatLon,
	bearingDeg: number,
	meters: number,
): LatLon {
	const δ = meters / EARTH_RADIUS_M;
	const θ = (bearingDeg * Math.PI) / 180;
	const φ1 = (from.latitude * Math.PI) / 180;
	const λ1 = (from.longitude * Math.PI) / 180;
	const sinφ2 =
		Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ);
	const φ2 = Math.asin(Math.max(-1, Math.min(1, sinφ2)));
	const λ2 =
		λ1 +
		Math.atan2(
			Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
			Math.cos(δ) - Math.sin(φ1) * sinφ2,
		);
	const longitude =
		(((((λ2 * 180) / Math.PI + 540) % 360) + 360) % 360) - 180;
	return { latitude: (φ2 * 180) / Math.PI, longitude };
}
