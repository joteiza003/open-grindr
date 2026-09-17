import { SvelteDate } from "svelte/reactivity";

import {
	type CircleDraft,
	DEFAULT_CIRCLE_COLOR,
	DEFAULT_RADIUS_KM,
	type InteractionMode,
	type MapCircle,
	type MapMarker,
	type MarkerDraft,
} from "$lib/model/map-elements";
import {
	clampRadius,
	normalizeName,
	roundRadius,
	validateColor,
	validateCoordinates,
	validateName,
	validateRadius,
	validateTitle,
} from "./geographic";
import {
	appDataMapElementsBackend,
	type MapElementsBackend,
} from "./map-elements-library";

/** Reactive view-model for persistent map overlays. Independent of geohash. */
export class MapElementsState {
	circles = $state<MapCircle[]>([]);
	markers = $state<MapMarker[]>([]);
	loading = $state(true);
	mode = $state<InteractionMode>("NORMAL");
	circleDraft = $state<CircleDraft | null>(null);
	markerDraft = $state<MarkerDraft | null>(null);
	selectedCircleId = $state<string | null>(null);
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
			this.circles = file.circles;
			this.markers = file.markers;
		} catch (error) {
			console.error("[map-elements] Failed to load", error);
			this.circles = [];
			this.markers = [];
		} finally {
			this.loading = false;
			this.resetInteraction();
		}
	}

	getCircles(): MapCircle[] {
		return this.circles;
	}

	getMarkers(): MapMarker[] {
		return this.markers;
	}

	beginAddCircle(): void {
		this.mode = "ADD_CIRCLE";
		this.circleDraft = null;
		this.markerDraft = null;
		this.selectedCircleId = null;
		this.selectedMarkerId = null;
		this.error = null;
	}

	beginAddMarker(): void {
		this.mode = "ADD_MARKER";
		this.circleDraft = null;
		this.markerDraft = null;
		this.selectedCircleId = null;
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
		if (this.mode === "ADD_CIRCLE") {
			this.circleDraft = {
				latitude,
				longitude,
				radiusKm: DEFAULT_RADIUS_KM,
				color: DEFAULT_CIRCLE_COLOR,
				name: "",
			};
			this.mode = "CIRCLE_CONFIGURATION";
			this.error = null;
			return;
		}
		if (this.mode === "ADD_MARKER") {
			this.markerDraft = { latitude, longitude, title: "" };
			this.mode = "MARKER_CONFIGURATION";
			this.error = null;
			return;
		}
		if (
			this.mode === "CIRCLE_CONFIGURATION" ||
			this.mode === "MARKER_CONFIGURATION"
		) {
			return;
		}
		this.clearSelection();
	}

	updateCircleDraft(patch: Partial<CircleDraft>): void {
		if (!this.circleDraft) return;
		const next = { ...this.circleDraft, ...patch };
		if (patch.radiusKm !== undefined) {
			next.radiusKm = roundRadius(clampRadius(patch.radiusKm));
		}
		this.circleDraft = next;
		this.error = null;
	}

	updateMarkerDraft(patch: Partial<MarkerDraft>): void {
		if (!this.markerDraft) return;
		this.markerDraft = { ...this.markerDraft, ...patch };
		this.error = null;
	}

	async saveCircleDraft(): Promise<
		{ ok: true } | { ok: false; error: string }
	> {
		const draft = this.circleDraft;
		if (!draft) return { ok: false, error: "Pick a center on the map." };
		const coordError = validateCoordinates(draft.latitude, draft.longitude);
		if (coordError) return { ok: false, error: coordError };
		const radiusError = validateRadius(draft.radiusKm);
		if (radiusError) return { ok: false, error: radiusError };
		const colorError = validateColor(draft.color);
		if (colorError) return { ok: false, error: colorError };
		const nameError = validateName(draft.name);
		if (nameError) return { ok: false, error: nameError };

		const name = normalizeName(draft.name);
		if (draft.id) {
			const existing = this.circles.find(
				(circle) => circle.id === draft.id,
			);
			if (!existing) {
				return {
					ok: false,
					error: "That circumference no longer exists.",
				};
			}
			this.circles = this.circles.map((circle) =>
				circle.id === draft.id
					? {
							...circle,
							radiusKm: roundRadius(draft.radiusKm),
							color: draft.color.toLowerCase(),
							name,
						}
					: circle,
			);
			await this.#persist();
			this.selectedCircleId = draft.id;
			this.circleDraft = {
				...draft,
				radiusKm: roundRadius(draft.radiusKm),
				color: draft.color.toLowerCase(),
				name: name ?? "",
			};
			this.error = null;
			return { ok: true };
		}

		const circle: MapCircle = {
			id: `circle-${crypto.randomUUID()}`,
			latitude: draft.latitude,
			longitude: draft.longitude,
			radiusKm: roundRadius(draft.radiusKm),
			color: draft.color.toLowerCase(),
			createdAt: new SvelteDate().toISOString(),
			name,
		};
		this.circles = [...this.circles, circle];
		await this.#persist();
		this.resetInteraction();
		return { ok: true };
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

	selectCircle(id: string): void {
		if (this.mode === "ADD_CIRCLE" || this.mode === "ADD_MARKER") return;
		if (this.mode === "MARKER_CONFIGURATION") return;
		const circle = this.circles.find((item) => item.id === id);
		if (!circle) return;
		this.mode = "CIRCLE_CONFIGURATION";
		this.selectedCircleId = id;
		this.selectedMarkerId = null;
		this.circleDraft = {
			id: circle.id,
			latitude: circle.latitude,
			longitude: circle.longitude,
			radiusKm: circle.radiusKm,
			color: circle.color,
			name: circle.name ?? "",
		};
		this.error = null;
	}

	selectMarker(id: string): void {
		if (this.mode === "ADD_CIRCLE" || this.mode === "ADD_MARKER") return;
		if (
			this.mode === "CIRCLE_CONFIGURATION" ||
			this.mode === "MARKER_CONFIGURATION"
		) {
			return;
		}
		this.mode = "SELECTED_MARKER";
		this.selectedMarkerId = id;
		this.selectedCircleId = null;
	}

	clearSelection(): void {
		this.mode = "NORMAL";
		this.selectedCircleId = null;
		this.selectedMarkerId = null;
	}

	async deleteCircle(id: string): Promise<void> {
		this.circles = this.circles.filter((circle) => circle.id !== id);
		await this.#persist();
		this.clearSelection();
	}

	async deleteMarker(id: string): Promise<void> {
		this.markers = this.markers.filter((marker) => marker.id !== id);
		await this.#persist();
		this.clearSelection();
	}

	resetInteraction(): void {
		this.mode = "NORMAL";
		this.circleDraft = null;
		this.markerDraft = null;
		this.selectedCircleId = null;
		this.selectedMarkerId = null;
		this.error = null;
	}

	async #persist(): Promise<void> {
		await this.#backend.save({
			version: 1,
			circles: this.circles,
			markers: this.markers,
		});
	}
}
