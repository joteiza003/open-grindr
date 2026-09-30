import { SvelteDate } from "svelte/reactivity";

import {
	type InteractionMode,
	type MapMarker,
	type MarkerDraft,
} from "$lib/model/map-elements";
import { validateCoordinates, validateTitle } from "./geographic";
import {
	appDataMapElementsBackend,
	type MapElementsBackend,
} from "./map-elements-library";

/** Reactive view-model for persistent map overlays. Independent of geohash. */
export class MapElementsState {
	markers = $state<MapMarker[]>([]);
	loading = $state(true);
	mode = $state<InteractionMode>("NORMAL");
	markerDraft = $state<MarkerDraft | null>(null);
	selectedMarkerId = $state<string | null>(null);
	error = $state<string | null>(null);

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

	beginAddMarker(): void {
		this.mode = "ADD_MARKER";
		this.markerDraft = null;
		this.selectedMarkerId = null;
		this.error = null;
	}

	cancelCreation(): void {
		this.resetInteraction();
	}

	handleMapClick(latitude: number, longitude: number): void {
		const coordError = validateCoordinates(latitude, longitude);
		if (coordError) {
			this.error = coordError;
			return;
		}
		if (this.mode === "ADD_MARKER") {
			this.markerDraft = { latitude, longitude, title: "" };
			this.mode = "MARKER_CONFIGURATION";
			this.error = null;
			return;
		}
		if (this.mode === "MARKER_CONFIGURATION") return;
		this.clearSelection();
	}

	updateMarkerDraft(patch: Partial<MarkerDraft>): void {
		if (!this.markerDraft) return;
		this.markerDraft = { ...this.markerDraft, ...patch };
		this.error = null;
	}

	async saveMarkerDraft(): Promise<
		{ ok: true } | { ok: false; error: string }
	> {
		const draft = this.markerDraft;
		if (!draft) return { ok: false, error: "Pick a position on the map." };
		const coordError = validateCoordinates(draft.latitude, draft.longitude);
		if (coordError) return { ok: false, error: coordError };
		const titleError = validateTitle(draft.title);
		if (titleError) return { ok: false, error: titleError };

		const marker: MapMarker = {
			id: `place-${crypto.randomUUID()}`,
			latitude: draft.latitude,
			longitude: draft.longitude,
			title: draft.title.trim(),
			createdAt: new SvelteDate().toISOString(),
		};
		this.markers = [...this.markers, marker];
		await this.#persist();
		this.markerDraft = null;
		this.mode = "SELECTED_MARKER";
		this.selectedMarkerId = marker.id;
		this.error = null;
		return { ok: true };
	}

	selectMarker(id: string): void {
		if (this.mode === "ADD_MARKER" || this.mode === "MARKER_CONFIGURATION") {
			return;
		}
		this.mode = "SELECTED_MARKER";
		this.selectedMarkerId = id;
	}

	clearSelection(): void {
		this.mode = "NORMAL";
		this.markerDraft = null;
		this.selectedMarkerId = null;
	}

	async deleteMarker(id: string): Promise<void> {
		this.markers = this.markers.filter((marker) => marker.id !== id);
		await this.#persist();
		this.clearSelection();
	}

	resetInteraction(): void {
		this.mode = "NORMAL";
		this.markerDraft = null;
		this.selectedMarkerId = null;
		this.error = null;
	}

	async #persist(): Promise<void> {
		await this.#backend.save({
			version: 1,
			markers: this.markers,
		});
	}
}
