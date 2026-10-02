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

	resetInteraction(): void {
		this.mode = "NORMAL";
		this.selectedMarkerId = null;
		this.error = null;
	}

	async #persist(): Promise<void> {
		await this.#backend.save({ version: 1, markers: this.markers });
	}
}
