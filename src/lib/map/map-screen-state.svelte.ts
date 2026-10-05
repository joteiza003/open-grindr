import { toast } from "svelte-sonner";
import { SvelteSet } from "svelte/reactivity";

import { SavedLocationsState } from "$lib/chat/saved-locations-state.svelte";
import { t } from "$lib/i18n";
import type { MapMarker } from "$lib/model/map-elements";
import type { SavedLocation } from "$lib/model/messaging/saved-locations";
import { MapElementsState } from "./map-elements-state.svelte";
import { MapFiltersState } from "./map-filters-state.svelte";
import { MapProfilesState } from "./map-profiles.svelte";
import { trace } from "./map-trace";
import type { MapSelection } from "./map-view";
import {
	isProfilePin,
	refreshProfileMarkers,
	type RefreshProgress,
	refreshSingleProfileMarker,
} from "./refresh-profile-markers";

/** What is open over the map. At most one panel at a time. */
export type MapPanel =
	| { kind: "none" }
	| { kind: "list" }
	| { kind: "filters" }
	| { kind: "cluster"; markerIds: string[] }
	| { kind: "pin"; id: string }
	| { kind: "shared"; id: string }
	| { kind: "me" };

export type DeleteTarget =
	| { kind: "pin"; id: string }
	| { kind: "shared"; id: string }
	| { kind: "all-pins" }
	| { kind: "all-shared" };

const NONE: MapPanel = { kind: "none" };

/**
 * Everything the map screen decides, apart from drawing the map itself.
 *
 * It is a small state machine: one panel at a time, plus a delete
 * confirmation that sits over it. Every transition is synchronous. Storage is
 * written afterwards by `pins` and `shared`, so nothing here ever waits for
 * the disk and the screen cannot get stuck behind a slow write.
 */
export class MapScreenState {
	readonly pins: MapElementsState;
	readonly shared: SavedLocationsState;
	/** Who is online and what the filters need to know about the profiles. */
	readonly profiles: MapProfilesState;
	/** The browse filters, applied to the pins and shared locations of profiles. */
	readonly filters: MapFiltersState;

	panel = $state.raw<MapPanel>(NONE);
	confirm = $state.raw<DeleteTarget | null>(null);
	refreshStatus = $state<string | null>(null);

	readonly #notify: (message: string) => void;

	/** The open panel, ignoring references to things that no longer exist. */
	visiblePanel = $derived.by<MapPanel>(() => {
		const panel = this.panel;
		switch (panel.kind) {
			case "pin":
				return this.pins.markerById(panel.id) ? panel : NONE;
			case "shared":
				return this.shared.locationById(panel.id) ? panel : NONE;
			case "cluster": {
				const markerIds = panel.markerIds.filter((id) =>
					this.pins.markerById(id),
				);
				return markerIds.length > 1
					? { kind: "cluster", markerIds }
					: NONE;
			}
			default:
				return panel;
		}
	});

	selectedPin = $derived.by(() => {
		const panel = this.visiblePanel;
		return panel.kind === "pin"
			? this.pins.markerById(panel.id)
			: undefined;
	});

	selectedShared = $derived.by(() => {
		const panel = this.visiblePanel;
		return panel.kind === "shared"
			? this.shared.locationById(panel.id)
			: undefined;
	});

	clusterMembers = $derived.by<MapMarker[]>(() => {
		const panel = this.visiblePanel;
		if (panel.kind !== "cluster") return [];
		return panel.markerIds.flatMap((id) => this.pins.markerById(id) ?? []);
	});

	/** What the map should highlight. */
	selection = $derived.by<MapSelection>(() => {
		const panel = this.visiblePanel;
		if (panel.kind === "pin" || panel.kind === "shared") {
			return { kind: panel.kind, id: panel.id };
		}
		return panel.kind === "me" ? { kind: "me" } : null;
	});

	hasProfilePins = $derived.by(() => this.pins.markers.some(isProfilePin));

	// --- what the filters leave on the map -----------------------------------

	/** True while some filter looks at the profiles behind the pins. */
	filtering = $derived.by(() => this.filters.compiled.active);

	/**
	 * Whether the filters let a pin through. What belongs to no profile cannot
	 * match one, and a profile that is not known yet stays on the map while
	 * the answer is on its way. What is open stays too: it would vanish under
	 * the finger otherwise.
	 */
	#passes(profileId: number | null | undefined, selected: boolean): boolean {
		if (!this.filtering || selected) return true;
		if (profileId === undefined || profileId === null) return false;
		const verdict = this.filters.compiled.verdict(
			this.profiles.facts.get(profileId),
			this.profiles.now,
		);
		return verdict === "unknown"
			? this.profiles.pending
			: verdict === "match";
	}

	visiblePins = $derived.by<MapMarker[]>(() => {
		if (!this.filtering) return this.pins.markers;
		const selected = this.selectedPin?.id;
		return this.pins.markers.filter((marker) =>
			this.#passes(marker.profileId, marker.id === selected),
		);
	});

	visibleShared = $derived.by<SavedLocation[]>(() => {
		if (!this.filtering) return this.shared.locations;
		const selected = this.selectedShared?.localId;
		return this.shared.locations.filter((location) =>
			this.#passes(location.senderId, location.localId === selected),
		);
	});

	/** Pins and shared locations that exist, and how many of them the filters show. */
	total = $derived.by(
		() => this.pins.markers.length + this.shared.locations.length,
	);
	shown = $derived.by(
		() => this.visiblePins.length + this.visibleShared.length,
	);

	/** The profiles behind pins and shared locations, to look after. */
	profileIds = $derived.by(() => [
		...this.pins.markers.flatMap((marker) => marker.profileId ?? []),
		...this.shared.locations.flatMap((location) => location.senderId ?? []),
	]);

	/** Profiles with a pin that are online right now. */
	onlineProfileIds = $derived.by(
		() =>
			new SvelteSet(
				this.pins.markers.flatMap((marker) =>
					marker.profileId !== undefined &&
					this.profiles.isOnline(marker.profileId)
						? marker.profileId
						: [],
				),
			),
	);

	empty = $derived.by(
		() =>
			!this.pins.loading &&
			!this.shared.loading &&
			!this.pins.refreshing &&
			this.pins.markers.length === 0 &&
			this.shared.locations.length === 0 &&
			this.visiblePanel.kind === "none",
	);

	confirmCopy = $derived.by(() => {
		const target = this.confirm;
		if (target?.kind === "all-shared") {
			return {
				title: t("map.deleteAllTitle"),
				body: t("map.deleteAllLocationsBody", {
					n: this.shared.locations.length,
				}),
			};
		}
		if (target?.kind === "all-pins") {
			return {
				title: t("map.deleteAllTitle"),
				body: t("map.deleteAllMarkersBody", {
					n: this.pins.markers.length,
				}),
			};
		}
		return { title: t("map.deleteTitle"), body: t("map.deleteBody") };
	});

	/**
	 * What the panel area shows, as one word. It is written into the DOM
	 * (`data-map-panel`) so a watchdog can tell when the screen stopped
	 * following this state.
	 */
	panelToken = $derived.by(() =>
		this.confirm !== null ? "confirm" : this.visiblePanel.kind,
	);

	constructor({
		pins = new MapElementsState(),
		shared = new SavedLocationsState(),
		profiles = new MapProfilesState(),
		filters = new MapFiltersState(),
		notify = (message: string) => void toast.error(message),
	}: {
		pins?: MapElementsState;
		shared?: SavedLocationsState;
		profiles?: MapProfilesState;
		filters?: MapFiltersState;
		notify?: (message: string) => void;
	} = {}) {
		this.pins = pins;
		this.shared = shared;
		this.profiles = profiles;
		this.filters = filters;
		this.#notify = notify;
		const saveFailed = () => notify(t("map.saveFailed"));
		pins.onSaveError = saveFailed;
		shared.onSaveError = saveFailed;
		filters.onSaveError = saveFailed;
	}

	async load(): Promise<void> {
		await Promise.all([this.shared.load(), this.pins.load()]);
		await this.pins.dedupeProfileMarkers();
	}

	// --- panels -------------------------------------------------------------

	selectPin(id: string): void {
		if (this.pins.markerById(id)) this.#show({ kind: "pin", id });
	}

	selectShared(id: string): void {
		if (this.shared.locationById(id)) this.#show({ kind: "shared", id });
	}

	selectMe(): void {
		this.#show({ kind: "me" });
	}

	/** Facts about the screen that go with a diagnostics report. */
	traceFacts(): Record<string, string | number> {
		return {
			pins: this.pins.markers.length,
			"profile pins": this.pins.markers.filter(isProfilePin).length,
			"shared locations": this.shared.locations.length,
			"filters on": this.filters.count,
			"shown by filters": this.shown,
			"profile lookup": this.profiles.lookup,
			refreshing: this.pins.refreshing ? "yes" : "no",
			panel: this.visiblePanel.kind,
		};
	}

	openCluster(markerIds: string[]): void {
		this.#show({ kind: "cluster", markerIds });
	}

	toggleList(): void {
		this.#show(this.panel.kind === "list" ? NONE : { kind: "list" });
	}

	toggleFilters(): void {
		this.#show(this.panel.kind === "filters" ? NONE : { kind: "filters" });
	}

	closePanel(): void {
		this.#show(NONE);
	}

	/** Opening anything also drops a pending confirmation: it belonged to what was open. */
	#show(panel: MapPanel): void {
		this.confirm = null;
		this.panel = panel;
		trace(`panel: ${panel.kind}`);
	}

	/** A tap on bare map dismisses whatever is open, unless a confirmation is. */
	mapTapped(): void {
		if (this.confirm === null) this.panel = NONE;
	}

	/**
	 * Closes the innermost thing that is open. Returns false when nothing was
	 * open, so the caller can leave the screen instead.
	 */
	back(): boolean {
		if (this.confirm !== null) {
			this.confirm = null;
			return true;
		}
		if (this.visiblePanel.kind === "none") {
			this.panel = NONE;
			return false;
		}
		this.panel = NONE;
		return true;
	}

	// --- deleting -----------------------------------------------------------

	requestDelete(target: DeleteTarget): void {
		this.confirm = target;
		trace(`delete asked: ${target.kind}`);
	}

	cancelDelete(): void {
		this.confirm = null;
	}

	/**
	 * Deletes what the confirmation asked for. The screen is updated before this
	 * returns its promise; the promise settles once storage has caught up.
	 */
	confirmDelete(): Promise<void> {
		const target = this.confirm;
		this.confirm = null;
		if (target === null) return Promise.resolve();
		trace(`delete confirmed: ${target.kind}`);
		switch (target.kind) {
			case "pin":
				return this.pins.deleteMarker(target.id);
			case "shared":
				return this.shared.remove(target.id);
			case "all-pins":
				return this.pins.deleteAllMarkers();
			case "all-shared":
				return this.shared.removeAll();
		}
	}

	// --- refreshing positions ----------------------------------------------

	async refreshAll(): Promise<void> {
		if (this.pins.refreshing) return;
		const total = this.pins.markers.filter(isProfilePin).length;
		trace(`refresh started: ${total} pins`);
		try {
			const updated = await refreshProfileMarkers(this.pins, (progress) =>
				this.#showProgress(progress),
			);
			trace(`refresh finished: ${updated}/${total}`);
			if (updated < total) {
				this.#notify(t("map.refreshPartial", { done: updated, total }));
			}
		} catch (error) {
			console.error("[map] refresh failed", error);
			this.#notify(t("map.refreshFailed"));
		}
	}

	/** Returns the new position, or null if the pin could not be updated. */
	async refreshOne(
		marker: MapMarker,
	): Promise<{ latitude: number; longitude: number } | null> {
		if (this.pins.refreshing || !isProfilePin(marker)) return null;
		try {
			return await refreshSingleProfileMarker(
				this.pins,
				marker,
				(progress) => this.#showProgress(progress),
			);
		} catch (error) {
			console.error("[map] refresh failed", error);
			this.#notify(t("map.refreshFailed"));
			return null;
		}
	}

	#showProgress(progress: RefreshProgress | null): void {
		if (progress === null) this.refreshStatus = null;
		else if (progress.total > 1) {
			this.refreshStatus = t("map.refreshProgress", {
				n: progress.index,
				total: progress.total,
			});
		} else this.refreshStatus = t("map.refreshing");
	}
}
