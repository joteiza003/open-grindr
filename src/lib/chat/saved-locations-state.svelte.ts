import type { SavedLocation } from "$lib/model/messaging/saved-locations";
import {
	deleteAllSavedLocations,
	deleteSavedLocation,
	loadSavedLocations,
} from "./saved-locations-library";

/**
 * Reactive view-model for the shared-locations map screen.
 *
 * Removals update the list at once and reach storage afterwards, so the screen
 * never waits for the disk. If the write fails the removed items come back and
 * `onSaveError` is called, keeping the screen consistent with what is stored.
 */
export class SavedLocationsState {
	locations = $state<SavedLocation[]>([]);
	loading = $state(true);
	onSaveError: ((error: unknown) => void) | undefined;

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

	locationById(localId: string): SavedLocation | undefined {
		return this.locations.find((location) => location.localId === localId);
	}

	removeAll(): Promise<void> {
		const before = this.locations;
		this.locations = [];
		return deleteAllSavedLocations().catch((error: unknown) => {
			this.#restore(before, before, error);
		});
	}

	remove(localId: string): Promise<void> {
		const before = this.locations;
		this.locations = before.filter((l) => l.localId !== localId);
		return deleteSavedLocation(localId).catch((error: unknown) => {
			this.#restore(
				before.filter((l) => l.localId === localId),
				before,
				error,
			);
		});
	}

	/** Puts `removed` back where it was in `before`, leaving other changes alone. */
	#restore(
		removed: SavedLocation[],
		before: SavedLocation[],
		error: unknown,
	): void {
		console.error("[location-map] Failed to save", error);
		const restored = [...this.locations];
		for (const item of removed) {
			if (restored.some((l) => l.localId === item.localId)) continue;
			const index = before.findIndex((l) => l.localId === item.localId);
			restored.splice(Math.min(index, restored.length), 0, item);
		}
		this.locations = restored;
		try {
			this.onSaveError?.(error);
		} catch (callbackError) {
			console.error("[location-map] onSaveError threw", callbackError);
		}
	}
}
