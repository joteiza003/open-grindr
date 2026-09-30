import { describe, expect, it } from "vitest";

import { parseMapElementsFile } from "$lib/model/map-elements";
import { memoryMapElementsBackend } from "./map-elements-library";
import { MapElementsState } from "./map-elements-state.svelte";

async function addMarker(
	state: MapElementsState,
	lat: number,
	lon: number,
	title: string,
) {
	state.beginAddMarker();
	state.handleMapClick(lat, lon);
	state.updateMarkerDraft({ title });
	return state.saveMarkerDraft();
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
	it("creates, selects and deletes a marker without duplication", async () => {
		const backend = memoryMapElementsBackend();
		const state = new MapElementsState(backend);
		expect((await addMarker(state, 43.22, -2.05, "Meeting place")).ok).toBe(
			true,
		);
		expect(state.markers).toHaveLength(1);
		expect(state.mode).toBe("SELECTED_MARKER");

		const id = state.markers[0]?.id;
		expect(id).toBeDefined();

		await state.load();
		expect(state.markers).toHaveLength(1);
		expect(state.markers[0]?.title).toBe("Meeting place");

		await state.deleteMarker(id!);
		expect(state.mode).toBe("NORMAL");
		await state.load();
		expect(state.markers).toHaveLength(0);
	});

	it("keeps several markers stable across reloads", async () => {
		const backend = memoryMapElementsBackend();
		const state = new MapElementsState(backend);
		await addMarker(state, 43.25, -2.0, "Café");
		await addMarker(state, 43.28, -2.02, "Beach");

		const reloaded = new MapElementsState(backend);
		await reloaded.load();
		expect(reloaded.getMarkers()).toHaveLength(2);
		expect(reloaded.markers[0]?.title).toBe("Café");
		expect(reloaded.markers[1]?.title).toBe("Beach");
	});

	it("rejects a marker without a title", async () => {
		const state = new MapElementsState(memoryMapElementsBackend());
		state.beginAddMarker();
		state.handleMapClick(43.22, -2.05);
		expect((await state.saveMarkerDraft()).ok).toBe(false);
		expect(state.markers).toHaveLength(0);
	});

	it("ignores further map clicks while configuring a marker", () => {
		const state = new MapElementsState(memoryMapElementsBackend());
		state.beginAddMarker();
		state.handleMapClick(43.22, -2.05);
		state.handleMapClick(10, 10);
		expect(state.markerDraft?.latitude).toBe(43.22);
		expect(state.mode).toBe("MARKER_CONFIGURATION");
	});

	it("cancelling creation discards the draft", () => {
		const state = new MapElementsState(memoryMapElementsBackend());
		state.beginAddMarker();
		state.handleMapClick(43.22, -2.05);
		state.cancelCreation();
		expect(state.markerDraft).toBeNull();
		expect(state.mode).toBe("NORMAL");
	});
});
