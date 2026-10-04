import { SvelteMap } from "svelte/reactivity";

import type { InteractionMode, MapMarker } from "$lib/model/map-elements";
import {
	appDataMapElementsBackend,
	type MapElementsBackend,
} from "./map-elements-library";

/** Reactive view-model for persistent map overlays. Independent of geohash. */
export class MapElementsState {
	markers = $state<MapMarker[]>([]);
	loading = $state(true);
	mode = $state<InteractionMode>("NORMAL");
	selectedMarkerId = $state<string | null>(null);
	error = $state<string | null>(null);
	/** True while re-triangulating saved profile markers on open. */
	refreshing = $state(false);

	#backend: MapElementsBackend;

	constructor(backend: MapElementsBackend = appDataMapElementsBackend) {
		this.#backend = backend;
	}

	async load(): Promise<void> {
		this.loading = true;
		try {
			const file = await this.#backend.load();
			this.markers = file.markers;
		} catch (error) {
			console.error("[map-elements] Failed to load", error);
			this.markers = [];
		} finally {
			this.loading = false;
			this.resetInteraction();
		}
	}

	getMarkers(): MapMarker[] {
		return this.markers;
	}

	cancelCreation(): void {
		this.resetInteraction();
	}

	/** Tocar el mapa vacío quita la selección. */
	handleMapClick(): void {
		this.clearSelection();
	}

	selectMarker(id: string): void {
		this.mode = "SELECTED_MARKER";
		this.selectedMarkerId = id;
	}

	clearSelection(): void {
		this.mode = "NORMAL";
		this.selectedMarkerId = null;
	}

	async deleteMarker(id: string): Promise<void> {
		this.markers = this.markers.filter((marker) => marker.id !== id);
		await this.#persist();
		this.clearSelection();
	}

	async deleteAllMarkers(): Promise<void> {
		this.markers = [];
		await this.#persist();
		this.clearSelection();
	}

	/**
	 * Updates coordinates (and optional display fields) of an existing marker
	 * without changing its id. Used when re-triangulating a saved profile pin.
	 */
	async updateMarker(
		id: string,
		patch: Partial<
			Pick<
				MapMarker,
				"latitude" | "longitude" | "title" | "mediaHash" | "displayName"
			>
		>,
	): Promise<void> {
		const index = this.markers.findIndex((marker) => marker.id === id);
		if (index < 0) return;
		const current = this.markers[index]!;
		const next: MapMarker = { ...current, ...patch };
		this.markers = [
			...this.markers.slice(0, index),
			next,
			...this.markers.slice(index + 1),
		];
		await this.#persist();
	}

	/**
	 * Removes duplicate pins for the same profileId, keeping the newest by
	 * createdAt (or the first if dates are equal).
	 */
	async dedupeProfileMarkers(): Promise<void> {
		const byProfile = new SvelteMap<number, MapMarker>();
		const withoutProfile: MapMarker[] = [];
		for (const marker of this.markers) {
			if (marker.profileId === undefined) {
				withoutProfile.push(marker);
				continue;
			}
			const prev = byProfile.get(marker.profileId);
			if (!prev) {
				byProfile.set(marker.profileId, marker);
				continue;
			}
			const newer =
				Date.parse(marker.createdAt) >= Date.parse(prev.createdAt)
					? marker
					: prev;
			byProfile.set(marker.profileId, newer);
		}
		const next = [...withoutProfile, ...byProfile.values()];
		if (next.length === this.markers.length) return;
		this.markers = next;
		await this.#persist();
	}

	resetInteraction(): void {
		this.mode = "NORMAL";
		this.selectedMarkerId = null;
		this.error = null;
	}

	async #persist(): Promise<void> {
		await this.#backend.save({ version: 1, markers: this.markers });
	}
}
