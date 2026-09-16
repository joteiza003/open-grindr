import type { SavedLocation } from "$lib/model/messaging/saved-locations";
import {
	deleteSavedLocation,
	loadSavedLocations,
} from "./saved-locations-library";

/** Reactive view-model for the shared-locations map screen. */
export class SavedLocationsState {
	locations = $state<SavedLocation[]>([]);
	loading = $state(true);

	async load(): Promise<void> {
		this.loading = true;
		try {
			this.locations = await loadSavedLocations();
		} catch (error) {
			console.error("[location-map] Failed to load", error);
			this.locations = [];
		} finally {
			this.loading = false;
		}
	}

	async remove(localId: string): Promise<void> {
		await deleteSavedLocation(localId);
		this.locations = this.locations.filter((l) => l.localId !== localId);
	}
}
