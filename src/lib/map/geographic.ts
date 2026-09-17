import {
	hexColorSchema,
	MAX_RADIUS_KM,
	MAX_TITLE_LENGTH,
	MIN_RADIUS_KM,
} from "$lib/model/map-elements";

const KM_TO_METERS = 1000;

export const CIRCLE_FILL_OPACITY = 0.2;
export const CIRCLE_STROKE_OPACITY = 1;
export const CIRCLE_WEIGHT = 2;
export const CIRCLE_SELECTED_WEIGHT = 3;

export function convertKmToMeters(radiusKm: number): number {
	return radiusKm * KM_TO_METERS;
}

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

export function validateRadius(radiusKm: unknown): string | null {
	if (typeof radiusKm !== "number" || !Number.isFinite(radiusKm)) {
		return "Radius must be a number.";
	}
	if (radiusKm <= 0) return "Radius must be greater than 0.";
	if (radiusKm < MIN_RADIUS_KM) {
		return `Minimum radius is ${MIN_RADIUS_KM} km.`;
	}
	if (radiusKm > MAX_RADIUS_KM) {
		return `Maximum radius is ${MAX_RADIUS_KM} km.`;
	}
	return null;
}

export function validateColor(color: unknown): string | null {
	if (typeof color !== "string") return "Pick a color.";
	return hexColorSchema.safeParse(color).success ? null : "Invalid color.";
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

export function clampRadius(radiusKm: number): number {
	if (!Number.isFinite(radiusKm)) return MIN_RADIUS_KM;
	return Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, radiusKm));
}

export function roundRadius(radiusKm: number): number {
	return Math.round(clampRadius(radiusKm) * 10) / 10;
}

export function validateName(name: unknown): string | null {
	if (name === undefined || name === null) return null;
	if (typeof name !== "string") return "Name must be text.";
	if (name.trim().length > MAX_TITLE_LENGTH) {
		return `Name cannot exceed ${MAX_TITLE_LENGTH} characters.`;
	}
	return null;
}

export function normalizeName(name: string | undefined): string | undefined {
	const trimmed = name?.trim() ?? "";
	return trimmed.length === 0 ? undefined : trimmed;
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
