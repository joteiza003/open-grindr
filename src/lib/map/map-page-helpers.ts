import { t } from "$lib/i18n";
import type { MapMarker } from "$lib/model/map-elements";
import type { SavedLocation } from "$lib/model/messaging/saved-locations";
import type { SharedPin } from "./map-view";

export function locationLabel(location: SavedLocation): string {
	return (
		location.displayName ??
		(location.senderId !== null
			? `#${location.senderId}`
			: t("chat.sharedLocation"))
	);
}

export function formatReceivedAt(timestamp: number): string {
	return new Date(timestamp).toLocaleString();
}

/** Every point the map should frame when showing everything. */
export function allMapPoints(
	markers: MapMarker[],
	locations: SavedLocation[],
	custom: { lat: number; lon: number } | null,
): [number, number][] {
	const points: [number, number][] = [];
	for (const marker of markers) {
		points.push([marker.latitude, marker.longitude]);
	}
	for (const location of locations) points.push([location.lat, location.lon]);
	if (custom) points.push([custom.lat, custom.lon]);
	return points;
}

export function directionsUrl(
	marker: { latitude: number; longitude: number },
	custom: { lat: number; lon: number } | null,
): string {
	const dest = `${marker.latitude},${marker.longitude}`;
	const origin = custom ? `&origin=${custom.lat},${custom.lon}` : "";
	return `https://www.google.com/maps/dir/?api=1${origin}&destination=${dest}&travelmode=walking`;
}

export type MapTarget = { latitude: number; longitude: number; zoom: number };

/** Where the map opens: own position, else the first shared place, else the first pin. */
export function initialMapTarget(
	custom: { lat: number; lon: number } | null,
	locations: SavedLocation[],
	markers: MapMarker[],
): MapTarget | null {
	if (custom) {
		return { latitude: custom.lat, longitude: custom.lon, zoom: 12 };
	}
	const location = locations[0];
	if (location) {
		return { latitude: location.lat, longitude: location.lon, zoom: 11 };
	}
	const marker = markers[0];
	if (marker) {
		return {
			latitude: marker.latitude,
			longitude: marker.longitude,
			zoom: 12,
		};
	}
	return null;
}

export function sharedPins(locations: SavedLocation[]): SharedPin[] {
	return locations.map((location) => ({
		id: location.localId,
		latitude: location.lat,
		longitude: location.lon,
		title: locationLabel(location),
	}));
}

export function formatCoordinates(latitude: number, longitude: number): string {
	return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}
