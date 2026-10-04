import { autoTriangulateProfile } from "$lib/location/auto-triangulate-profile";
import type { MapElementsState } from "$lib/map/map-elements-state.svelte";

/**
 * Re-triangulates every saved profile pin so positions stay current.
 * Does not modify the triangulation algorithm — only calls it and then
 * updates the existing marker (removes the temporary pin it creates).
 */
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
			const profileId = marker.profileId!;
			onStatus?.(`Actualizando ${i + 1}/${targets.length}…`);
			try {
				const result = await autoTriangulateProfile({
					profileId,
					displayName: marker.displayName ?? null,
				});
				// autoTriangulateProfile always persists a *new* marker id;
				// drop that temp pin and write the result onto the saved one.
				await overlays.deleteMarker(result.markerId);
				await overlays.updateMarker(marker.id, {
					latitude: result.point.lat,
					longitude: result.point.lon,
					mediaHash: marker.mediaHash,
					displayName: marker.displayName,
					title: marker.title,
				});
			} catch (error) {
				console.error(
					`[map] Failed to refresh profile ${profileId}`,
					error,
				);
			}
		}
	} finally {
		overlays.refreshing = false;
		onStatus?.(null);
	}
}
