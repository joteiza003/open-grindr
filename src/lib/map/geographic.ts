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

/** Radius in km implied by dragging a handle to `point`, clamped and rounded. */
export function radiusFromPoint(center: LatLon, point: LatLon): number {
	return roundRadius(distanceMeters(center, point) / KM_TO_METERS);
}

export function isPointInCircle(
	point: LatLon,
	circle: LatLon & { radiusKm: number },
): boolean {
	return distanceMeters(circle, point) <= circle.radiusKm * KM_TO_METERS;
}

/** Surface area of a spherical cap of the given radius, in km². */
export function circleAreaKm2(radiusKm: number): number {
	const earthKm = EARTH_RADIUS_M / KM_TO_METERS;
	return 2 * Math.PI * earthKm * earthKm * (1 - Math.cos(radiusKm / earthKm));
}

/** [[south, west], [north, east]] box enclosing the circle. */
export function circleBounds(
	circle: LatLon & { radiusKm: number },
): [[number, number], [number, number]] {
	const meters = circle.radiusKm * KM_TO_METERS;
	const north = destinationPoint(circle, 0, meters).latitude;
	const south = destinationPoint(circle, 180, meters).latitude;
	const east = destinationPoint(circle, 90, meters).longitude;
	const west = destinationPoint(circle, 270, meters).longitude;
	return [
		[south, west],
		[north, east],
	];
}

/** "350 m" below one km, "5.2 km" / "120 km" above. */
export function formatDistanceKm(km: number, locale?: string): string {
	if (km < 1) {
		return `${Math.round(km * KM_TO_METERS)} m`;
	}
	const digits = km < 10 ? 1 : 0;
	return `${new Intl.NumberFormat(locale, {
		maximumFractionDigits: digits,
		minimumFractionDigits: 0,
	}).format(km)} km`;
}

export function formatAreaKm2(km2: number, locale?: string): string {
	const digits = km2 < 10 ? 2 : km2 < 1000 ? 1 : 0;
	return `${new Intl.NumberFormat(locale, {
		maximumFractionDigits: digits,
	}).format(km2)} km²`;
}

export const RADIUS_SLIDER_STEPS = 1000;

/** Slider position (0..1000) -> radius: logarithmic, so small radii are precise. */
export function sliderToRadius(position: number): number {
	const t = Math.min(1, Math.max(0, position / RADIUS_SLIDER_STEPS));
	const ratio = MAX_RADIUS_KM / MIN_RADIUS_KM;
	return roundRadius(MIN_RADIUS_KM * ratio ** t);
}

export function radiusToSlider(radiusKm: number): number {
	const ratio = MAX_RADIUS_KM / MIN_RADIUS_KM;
	const t = Math.log(clampRadius(radiusKm) / MIN_RADIUS_KM) / Math.log(ratio);
	return Math.round(t * RADIUS_SLIDER_STEPS);
}

/** Circle radius in screen pixels at a given latitude/zoom. */
export function radiusPixels(
	radiusKm: number,
	latitude: number,
	zoom: number,
): number {
	return (radiusKm * KM_TO_METERS) / metersPerPixel(latitude, zoom);
}
