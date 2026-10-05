import { describe, expect, it, vi } from "vitest";

import { parseMapElementsFile } from "$lib/model/map-elements";
import type { MapMarker } from "$lib/model/map-elements";
import {
	type MapElementsBackend,
	memoryMapElementsBackend,
} from "./map-elements-library";
import { MapElementsState } from "./map-elements-state.svelte";

const marker = (id: string, title: string, extra: object = {}): MapMarker => ({
	id,
	latitude: 43.22,
	longitude: -2.05,
	title,
	createdAt: "2026-01-01T00:00:00.000Z",
	...extra,
});

function seeded(...markers: MapMarker[]) {
	return memoryMapElementsBackend({ version: 1, markers });
}

/** Storage that never answers, like a stalled Android IPC worker pool. */
function stalledBackend(...markers: MapMarker[]): MapElementsBackend {
	return {
		load: () => Promise.resolve({ version: 1, markers }),
		save: () => new Promise<void>(() => {}),
	};
}

describe("parseMapElementsFile", () => {
	it("returns no markers when storage is missing or corrupt", () => {
		expect(parseMapElementsFile(null).markers).toEqual([]);
		expect(parseMapElementsFile("nope").markers).toEqual([]);
		expect(parseMapElementsFile({ version: 99 }).markers).toEqual([]);
	});

	it("drops legacy circles from older files", () => {
		const parsed = parseMapElementsFile({
			version: 1,
			circles: [{ id: "c" }],
			markers: [],
		});
		expect(parsed).toEqual({ version: 1, markers: [] });
	});
});

describe("MapElementsState", () => {
	it("loads the saved pins", async () => {
		const state = new MapElementsState(
			seeded(marker("a", "Café"), marker("b", "Beach")),
		);
		await state.load();
		expect(state.markers.map((item) => item.title)).toEqual([
			"Café",
			"Beach",
		]);
		expect(state.loading).toBe(false);
	});

	it("starts empty when storage fails to load", async () => {
		const state = new MapElementsState({
			load: () => Promise.reject(new Error("disk")),
			save: () => Promise.resolve(),
		});
		vi.spyOn(console, "error").mockImplementation(() => {});
		await state.load();
		expect(state.markers).toEqual([]);
		expect(state.loading).toBe(false);
	});

	it("finds a pin by id", async () => {
		const state = new MapElementsState(seeded(marker("a", "Café")));
		await state.load();
		expect(state.markerById("a")?.title).toBe("Café");
		expect(state.markerById("zzz")).toBeUndefined();
	});

	it("deletes one pin and keeps it deleted after a reload", async () => {
		const backend = seeded(marker("a", "Café"), marker("b", "Beach"));
		const state = new MapElementsState(backend);
		await state.load();

		await state.deleteMarker("a");

		const reloaded = new MapElementsState(backend);
		await reloaded.load();
		expect(reloaded.markers.map((item) => item.id)).toEqual(["b"]);
	});

	it("deletes every pin at once", async () => {
		const backend = seeded(marker("a", "Café"), marker("b", "Beach"));
		const state = new MapElementsState(backend);
		await state.load();

		await state.deleteAllMarkers();

		const reloaded = new MapElementsState(backend);
		await reloaded.load();
		expect(reloaded.markers).toEqual([]);
	});

	it("updates the list before storage answers, so the screen never waits for the disk", async () => {
		const state = new MapElementsState(
			stalledBackend(marker("a", "Café"), marker("b", "Beach")),
		);
		await state.load();

		void state.deleteMarker("a");
		expect(state.markers.map((item) => item.id)).toEqual(["b"]);

		void state.deleteAllMarkers();
		expect(state.markers).toEqual([]);
	});

	it("writes the latest list once when changes come in a row", async () => {
		const saved: string[][] = [];
		let release: (() => void) | undefined;
		const backend: MapElementsBackend = {
			load: () =>
				Promise.resolve({
					version: 1,
					markers: [
						marker("a", "A"),
						marker("b", "B"),
						marker("c", "C"),
					],
				}),
			save: (file) =>
				new Promise<void>((resolve) => {
					saved.push(file.markers.map((item) => item.id));
					release = resolve;
				}),
		};
		const state = new MapElementsState(backend);
		await state.load();

		const first = state.deleteMarker("a");
		const second = state.deleteMarker("b");
		const third = state.deleteMarker("c");
		expect(saved).toEqual([["b", "c"]]);

		release?.();
		await vi.waitFor(() => expect(saved).toHaveLength(2));
		expect(saved[1]).toEqual([]);
		release?.();
		await Promise.all([first, second, third]);
	});

	it("starts a new write for a change made right after the last one finished", async () => {
		const saved: number[] = [];
		const backend: MapElementsBackend = {
			load: () =>
				Promise.resolve({
					version: 1,
					markers: [marker("a", "A"), marker("b", "B")],
				}),
			save: (file) => {
				saved.push(file.markers.length);
				return Promise.resolve();
			},
		};
		const state = new MapElementsState(backend);
		await state.load();

		await state.deleteMarker("a");
		await state.deleteMarker("b");

		expect(saved).toEqual([1, 0]);
	});

	it("reports a failed write, keeps the pins in memory and recovers on the next change", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		let fail = true;
		const writes: number[] = [];
		const state = new MapElementsState({
			load: () =>
				Promise.resolve({
					version: 1,
					markers: [marker("a", "A"), marker("b", "B")],
				}),
			save: (file) => {
				if (fail) return Promise.reject(new Error("disk full"));
				writes.push(file.markers.length);
				return Promise.resolve();
			},
		});
		const onSaveError = vi.fn();
		state.onSaveError = onSaveError;
		await state.load();

		await state.deleteMarker("a");
		expect(onSaveError).toHaveBeenCalledTimes(1);
		expect(state.markers.map((item) => item.id)).toEqual(["b"]);

		fail = false;
		await state.deleteMarker("b");
		expect(writes).toEqual([0]);
	});

	it("survives an error handler that throws", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const state = new MapElementsState({
			load: () =>
				Promise.resolve({ version: 1, markers: [marker("a", "A")] }),
			save: () => Promise.reject(new Error("disk")),
		});
		state.onSaveError = () => {
			throw new Error("handler");
		};
		await state.load();

		await expect(state.deleteMarker("a")).resolves.toBeUndefined();
	});

	it("moves a pin without changing its id", async () => {
		const backend = seeded(marker("a", "Café"));
		const state = new MapElementsState(backend);
		await state.load();

		await state.updateMarker("a", { latitude: 10, longitude: 20 });

		expect(state.markerById("a")).toMatchObject({
			id: "a",
			latitude: 10,
			longitude: 20,
			title: "Café",
		});
		const reloaded = new MapElementsState(backend);
		await reloaded.load();
		expect(reloaded.markerById("a")?.latitude).toBe(10);
	});

	it("ignores an update for a pin that no longer exists", async () => {
		const state = new MapElementsState(seeded(marker("a", "Café")));
		await state.load();
		await state.updateMarker("gone", { latitude: 1 });
		expect(state.markers).toHaveLength(1);
	});

	it("keeps only the newest pin of each profile", async () => {
		const backend = seeded(
			marker("old", "Ane", {
				profileId: 7,
				createdAt: "2026-01-01T00:00:00.000Z",
			}),
			marker("new", "Ane", {
				profileId: 7,
				createdAt: "2026-02-01T00:00:00.000Z",
			}),
			marker("place", "Café"),
		);
		const state = new MapElementsState(backend);
		await state.load();

		await state.dedupeProfileMarkers();

		expect(state.markers.map((item) => item.id).toSorted()).toEqual([
			"new",
			"place",
		]);
	});
});
