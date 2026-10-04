import { autoTriangulateProfile } from "$lib/location/auto-triangulate-profile";
import type { MapElementsState } from "$lib/map/map-elements-state.svelte";
import type { MapMarker } from "$lib/model/map-elements";

async function triangulateAndApply(
	overlays: MapElementsState,
	marker: MapMarker,
): Promise<void> {
	const profileId = marker.profileId;
	if (typeof profileId !== "number" || profileId <= 0) return;

	const result = await autoTriangulateProfile({
		profileId,
		displayName: marker.displayName ?? null,
	});
	// Drop the temporary pin created by autoTriangulateProfile, keep the saved one.
	await overlays.deleteMarker(result.markerId);
	await overlays.updateMarker(marker.id, {
		latitude: result.point.lat,
		longitude: result.point.lon,
		mediaHash: marker.mediaHash,
		displayName: marker.displayName,
		title: marker.title,
	});
}

/** Re-triangulate every saved profile pin. */
export async function refreshProfileMarkers(
	overlays: MapElementsState,
	onStatus?: (label: string | null) => void,
): Promise<void> {
	const targets = overlays.markers.filter(
		(m) => typeof m.profileId === "number" && m.profileId > 0,
	);
	if (targets.length === 0) return;

	overlays.refreshing = true;
	try {
		for (let i = 0; i < targets.length; i++) {
			const marker = targets[i]!;
			onStatus?.(`Actualizando ${i + 1}/${targets.length}…`);
			try {
				await triangulateAndApply(overlays, marker);
			} catch (error) {
				console.error(
					`[map] Failed to refresh profile ${marker.profileId}`,
					error,
				);
			}
		}
	} finally {
		overlays.refreshing = false;
		onStatus?.(null);
	}
}

/** Re-triangulate a single saved profile pin. */
export async function refreshSingleProfileMarker(
	overlays: MapElementsState,
	marker: MapMarker,
	onStatus?: (label: string | null) => void,
): Promise<void> {
	if (typeof marker.profileId !== "number" || marker.profileId <= 0) return;

	overlays.refreshing = true;
	onStatus?.("Actualizando…");
	try {
		await triangulateAndApply(overlays, marker);
	} catch (error) {
		console.error(
			`[map] Failed to refresh profile ${marker.profileId}`,
			error,
		);
		throw error;
	} finally {
		overlays.refreshing = false;
		onStatus?.(null);
	}
}
