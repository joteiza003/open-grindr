import { SvelteMap } from "svelte/reactivity";

import type { MapMarker } from "$lib/model/map-elements";
import {
	appDataMapElementsBackend,
	type MapElementsBackend,
} from "./map-elements-library";
import { trace } from "./map-trace";

/** A write that takes longer than this is noted in the diagnostics. */
const SLOW_SAVE_MS = 3_000;

/**
 * Reactive list of the pins saved on the map.
 *
 * Every change updates the list in memory first and writes it to storage
 * afterwards. The screen never waits for the disk: on Android storage goes
 * through the same worker pool as media requests, and when that pool is busy a
 * write can stall for seconds. Writes are coalesced, so the file always ends up
 * holding the latest list no matter how many changes happen in a row.
 */
export class MapElementsState {
	markers = $state<MapMarker[]>([]);
	loading = $state(true);
	/** True while re-triangulating saved profile pins. */
	refreshing = $state(false);
	/** Called when the pins could not be written. The list in memory is kept. */
	onSaveError: ((error: unknown) => void) | undefined;

	#backend: MapElementsBackend;
	#dirty = false;
	#writing: Promise<void> | null = null;

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
		}
	}

	markerById(id: string): MapMarker | undefined {
		return this.markers.find((marker) => marker.id === id);
	}

	/** Resolves once the change reached storage; the list is already updated. */
	deleteMarker(id: string): Promise<void> {
		this.markers = this.markers.filter((marker) => marker.id !== id);
		return this.persist();
	}

	deleteAllMarkers(): Promise<void> {
		this.markers = [];
		return this.persist();
	}

	/**
	 * Updates coordinates (and optional display fields) of an existing marker
	 * without changing its id. Used when re-triangulating a saved profile pin.
	 */
	updateMarker(
		id: string,
		patch: Partial<
			Pick<
				MapMarker,
				"latitude" | "longitude" | "title" | "mediaHash" | "displayName"
			>
		>,
	): Promise<void> {
		const index = this.markers.findIndex((marker) => marker.id === id);
		if (index < 0) return Promise.resolve();
		const next: MapMarker = { ...this.markers[index]!, ...patch };
		this.markers = [
			...this.markers.slice(0, index),
			next,
			...this.markers.slice(index + 1),
		];
		return this.persist();
	}

	/**
	 * Removes duplicate pins for the same profileId, keeping the newest by
	 * createdAt (or the later one if dates are equal).
	 */
	dedupeProfileMarkers(): Promise<void> {
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
		if (next.length === this.markers.length) return Promise.resolve();
		this.markers = next;
		return this.persist();
	}

	/** Writes the current list; calls made while a write runs share it. */
	persist(): Promise<void> {
		this.#dirty = true;
		this.#writing ??= this.#drain();
		return this.#writing;
	}

	async #drain(): Promise<void> {
		try {
			while (this.#dirty) {
				this.#dirty = false;
				const began = performance.now();
				const watchdog = setTimeout(
					() =>
						trace(
							`saving pins: no answer after ${SLOW_SAVE_MS} ms`,
						),
					SLOW_SAVE_MS,
				);
				try {
					await this.#backend.save({
						version: 1,
						markers: $state.snapshot(this.markers),
					});
					trace(
						`saved pins in ${Math.round(performance.now() - began)} ms`,
					);
				} catch (error) {
					this.#reportSaveError(error);
				} finally {
					clearTimeout(watchdog);
				}
			}
		} finally {
			// Same step as the last `#dirty` check: a change made right after
			// the loop ended starts a new write instead of joining a finished one.
			this.#writing = null;
		}
	}

	#reportSaveError(error: unknown): void {
		console.error("[map-elements] Failed to save", error);
		trace("saving pins failed");
		try {
			this.onSaveError?.(error);
		} catch (callbackError) {
			console.error("[map-elements] onSaveError threw", callbackError);
		}
	}
}
