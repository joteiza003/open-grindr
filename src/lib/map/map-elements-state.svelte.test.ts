import { describe, expect, it } from "vitest";

import { parseMapElementsFile } from "$lib/model/map-elements";
import type { MapMarker } from "$lib/model/map-elements";
import { memoryMapElementsBackend } from "./map-elements-library";
import { MapElementsState } from "./map-elements-state.svelte";

const marker = (id: string, title: string): MapMarker => ({
	id,
	latitude: 43.22,
	longitude: -2.05,
	title,
	createdAt: "2026-01-01T00:00:00.000Z",
});

function seeded(...markers: MapMarker[]) {
	return memoryMapElementsBackend({ version: 1, markers });
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
		expect(state.getMarkers().map((item) => item.title)).toEqual([
			"Café",
			"Beach",
		]);
	});

	it("selects a pin and clears the selection on a map tap", async () => {
		const state = new MapElementsState(seeded(marker("a", "Café")));
		await state.load();

		state.selectMarker("a");
		expect(state.mode).toBe("SELECTED_MARKER");
		expect(state.selectedMarkerId).toBe("a");

		state.handleMapClick();
		expect(state.mode).toBe("NORMAL");
		expect(state.selectedMarkerId).toBeNull();
	});

	it("deletes one pin and keeps it deleted after a reload", async () => {
		const backend = seeded(marker("a", "Café"), marker("b", "Beach"));
		const state = new MapElementsState(backend);
		await state.load();
		state.selectMarker("a");

		await state.deleteMarker("a");
		expect(state.mode).toBe("NORMAL");

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
});
