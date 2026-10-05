import { autoTriangulateProfile } from "$lib/location/auto-triangulate-profile";
import type { MapElementsState } from "$lib/map/map-elements-state.svelte";
import type { MapMarker } from "$lib/model/map-elements";

/** Triangulating a profile means three server round trips; give up after this. */
const REFRESH_TIMEOUT_MS = 90_000;

export type RefreshProgress = { index: number; total: number };

export function isProfilePin(marker: MapMarker): boolean {
	return typeof marker.profileId === "number" && marker.profileId > 0;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(
			() => reject(new Error("Triangulation timed out")),
			ms,
		);
	});
	return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function triangulateAndApply(
	overlays: MapElementsState,
	marker: MapMarker,
	timeoutMs: number,
): Promise<{ latitude: number; longitude: number }> {
	const profileId = marker.profileId;
	if (typeof profileId !== "number" || profileId <= 0) {
		return { latitude: marker.latitude, longitude: marker.longitude };
	}

	const result = await withTimeout(
		autoTriangulateProfile({
			profileId,
			displayName: marker.displayName ?? null,
			// Only measure: the saved pin is moved, no second pin is created.
			saveMarker: false,
		}),
		timeoutMs,
	);
	const point = { latitude: result.point.lat, longitude: result.point.lon };
	// Not awaited: the pin is already updated and storage catches up.
	void overlays.updateMarker(marker.id, point);
	return point;
}

/** Re-triangulate every saved profile pin. Returns how many were updated. */
export async function refreshProfileMarkers(
	overlays: MapElementsState,
	onProgress?: (progress: RefreshProgress | null) => void,
	timeoutMs = REFRESH_TIMEOUT_MS,
): Promise<number> {
	const targets = overlays.markers.filter(isProfilePin);
	if (targets.length === 0) return 0;

	overlays.refreshing = true;
	let updated = 0;
	try {
		for (const [index, marker] of targets.entries()) {
			onProgress?.({ index: index + 1, total: targets.length });
			try {
				await triangulateAndApply(overlays, marker, timeoutMs);
				updated += 1;
			} catch (error) {
				console.error(
					`[map] Failed to refresh profile ${marker.profileId}`,
					error,
				);
			}
		}
	} finally {
		overlays.refreshing = false;
		onProgress?.(null);
	}
	return updated;
}

/** Re-triangulate a single saved profile pin and return its new position. */
export async function refreshSingleProfileMarker(
	overlays: MapElementsState,
	marker: MapMarker,
	onProgress?: (progress: RefreshProgress | null) => void,
	timeoutMs = REFRESH_TIMEOUT_MS,
): Promise<{ latitude: number; longitude: number }> {
	overlays.refreshing = true;
	onProgress?.({ index: 1, total: 1 });
	try {
		return await triangulateAndApply(overlays, marker, timeoutMs);
	} catch (error) {
		console.error(
			`[map] Failed to refresh profile ${marker.profileId}`,
			error,
		);
		throw error;
	} finally {
		overlays.refreshing = false;
		onProgress?.(null);
	}
}
