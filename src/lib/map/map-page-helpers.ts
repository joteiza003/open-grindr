import { t } from "$lib/i18n";
import type { MapMarker } from "$lib/model/map-elements";
import type { SavedLocation } from "$lib/model/messaging/saved-locations";

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
	marker: MapMarker,
	custom: { lat: number; lon: number } | null,
): string {
	const dest = `${marker.latitude},${marker.longitude}`;
	const origin = custom ? `&origin=${custom.lat},${custom.lon}` : "";
	return `https://www.google.com/maps/dir/?api=1${origin}&destination=${dest}&travelmode=walking`;
}
