import { describe, expect, it } from "vitest";

import { parseMapElementsFile } from "$lib/model/map-elements";
import { memoryMapElementsBackend } from "./map-elements-library";
import { MapElementsState } from "./map-elements-state.svelte";

describe("parseMapElementsFile", () => {
	it("returns empty collections when storage is missing or corrupt", () => {
		expect(parseMapElementsFile(null).circles).toEqual([]);
		expect(parseMapElementsFile("nope").markers).toEqual([]);
		expect(parseMapElementsFile({ version: 99 }).circles).toEqual([]);
	});
});

describe("MapElementsState", () => {
	it("creates a circle that stays put when reloaded", async () => {
		const backend = memoryMapElementsBackend();
		const state = new MapElementsState(backend);
		state.beginAddCircle();
		state.handleMapClick(43.22, -2.05);
		state.updateCircleDraft({ radiusKm: 5, color: "#ff0000" });
		const saved = await state.saveCircleDraft();
		expect(saved.ok).toBe(true);

		const circle = state.circles[0];
		expect(circle?.latitude).toBe(43.22);
		expect(circle?.longitude).toBe(-2.05);
		expect(circle?.radiusKm).toBe(5);
		expect(circle?.color).toBe("#ff0000");

		const reloaded = new MapElementsState(backend);
		await reloaded.load();
		expect(reloaded.circles).toHaveLength(1);
		expect(reloaded.circles[0]?.latitude).toBe(43.22);
		expect(reloaded.circles[0]?.id).toBe(circle?.id);
	});

	it("edits radius, color and optional name without moving the center", async () => {
		const backend = memoryMapElementsBackend();
		const state = new MapElementsState(backend);
		state.beginAddCircle();
		state.handleMapClick(43.22, -2.05);
		state.updateCircleDraft({
			radiusKm: 5,
			color: "#ff0000",
			name: "North",
		});
		await state.saveCircleDraft();

		const id = state.circles[0]?.id;
		expect(id).toBeDefined();
		state.selectCircle(id!);
		state.updateCircleDraft({
			radiusKm: 8.5,
			color: "#00ff00",
			name: "Harbour",
		});
		const updated = await state.saveCircleDraft();
		expect(updated.ok).toBe(true);

		const circle = state.circles[0];
		expect(circle?.latitude).toBe(43.22);
		expect(circle?.longitude).toBe(-2.05);
		expect(circle?.radiusKm).toBe(8.5);
		expect(circle?.color).toBe("#00ff00");
		expect(circle?.name).toBe("Harbour");
		expect(state.circles).toHaveLength(1);

		const reloaded = new MapElementsState(backend);
		await reloaded.load();
		expect(reloaded.circles[0]?.name).toBe("Harbour");
		expect(reloaded.circles[0]?.radiusKm).toBe(8.5);
	});

	it("does not persist a cancelled circle", async () => {
		const backend = memoryMapElementsBackend();
		const state = new MapElementsState(backend);
		state.beginAddCircle();
		state.handleMapClick(43.22, -2.05);
		state.cancelCreation();
		expect(state.circles).toHaveLength(0);
		expect((await backend.load()).circles).toHaveLength(0);
	});

	it("rejects an invalid radius and keeps storage empty", async () => {
		const backend = memoryMapElementsBackend();
		const state = new MapElementsState(backend);
		state.beginAddCircle();
		state.handleMapClick(43.22, -2.05);
		state.circleDraft = {
			latitude: 43.22,
			longitude: -2.05,
			radiusKm: 0,
			color: "#00ff00",
			name: "",
		};
		const result = await state.saveCircleDraft();
		expect(result.ok).toBe(false);
		expect(state.circles).toHaveLength(0);
	});

	it("creates, selects and deletes a marker without duplication", async () => {
		const backend = memoryMapElementsBackend();
		const state = new MapElementsState(backend);
		state.beginAddMarker();
		state.handleMapClick(43.22, -2.05);
		state.updateMarkerDraft({ title: "Meeting place" });
		expect((await state.saveMarkerDraft()).ok).toBe(true);
		expect(state.markers).toHaveLength(1);
		expect(state.mode).toBe("SELECTED_MARKER");

		const id = state.markers[0]?.id;
		expect(id).toBeDefined();

		await state.load();
		expect(state.markers).toHaveLength(1);
		expect(state.markers[0]?.title).toBe("Meeting place");

		await state.deleteMarker(id!);
		await state.load();
		expect(state.markers).toHaveLength(0);
	});

	it("keeps several overlays stable across reloads", async () => {
		const backend = memoryMapElementsBackend();
		const state = new MapElementsState(backend);

		state.beginAddCircle();
		state.handleMapClick(43.22, -2.05);
		state.updateCircleDraft({ radiusKm: 5, color: "#ff0000" });
		await state.saveCircleDraft();

		state.beginAddCircle();
		state.handleMapClick(43.3, -1.9);
		state.updateCircleDraft({ radiusKm: 2.5, color: "#00ff00" });
		await state.saveCircleDraft();

		state.beginAddMarker();
		state.handleMapClick(43.25, -2.0);
		state.updateMarkerDraft({ title: "Café" });
		await state.saveMarkerDraft();

		state.beginAddMarker();
		state.handleMapClick(43.28, -2.02);
		state.updateMarkerDraft({ title: "Beach" });
		await state.saveMarkerDraft();

		const reloaded = new MapElementsState(backend);
		await reloaded.load();
		expect(reloaded.getCircles()).toHaveLength(2);
		expect(reloaded.getMarkers()).toHaveLength(2);
		expect(reloaded.circles[0]?.latitude).toBe(43.22);
		expect(reloaded.circles[1]?.radiusKm).toBe(2.5);
		expect(reloaded.markers[0]?.title).toBe("Café");
		expect(reloaded.markers[1]?.title).toBe("Beach");
	});

	it("ignores further map clicks while configuring a circle", () => {
		const state = new MapElementsState(memoryMapElementsBackend());
		state.beginAddCircle();
		state.handleMapClick(43.22, -2.05);
		state.handleMapClick(10, 10);
		expect(state.circleDraft?.latitude).toBe(43.22);
		expect(state.mode).toBe("CIRCLE_CONFIGURATION");
	});
});
