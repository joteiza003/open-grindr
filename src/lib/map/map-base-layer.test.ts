// @vitest-environment jsdom

import {
	control,
	map as createMap,
	type Map as LeafletMap,
	type TileLayer,
} from "leaflet";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ tileLayers: [] as unknown[] }));

vi.mock("leaflet", async (importOriginal) => {
	const original = await importOriginal<typeof import("leaflet")>();
	return {
		...original,
		tileLayer: (...args: Parameters<typeof original.tileLayer>) => {
			const layer = original.tileLayer(...args);
			mocks.tileLayers.push(layer);
			return layer;
		},
	};
});

import { MapBaseLayer } from "./map-base-layer";
import { clearTrace, traceReport } from "./map-trace";

const maps: LeafletMap[] = [];

function setup() {
	mocks.tileLayers.length = 0;
	const container = document.createElement("div");
	Object.defineProperty(container, "clientWidth", {
		value: 400,
		configurable: true,
	});
	Object.defineProperty(container, "clientHeight", {
		value: 700,
		configurable: true,
	});
	document.body.append(container);
	const map = createMap(container, {
		center: [43.3, -1.98],
		zoom: 16,
		attributionControl: false,
	});
	maps.push(map);
	control.attribution({ prefix: false }).addTo(map);
	const onTilesChange = vi.fn<(working: boolean) => void>();
	return {
		container,
		map,
		base: new MapBaseLayer(map, onTilesChange),
		onTilesChange,
	};
}

const tiles = (index: number) => mocks.tileLayers[index] as TileLayer;
/** Leaflet keeps the address template in a private field. */
const urlOf = (index: number) =>
	(mocks.tileLayers[index] as { _url: string })._url;
const layers = (container: HTMLElement) =>
	container.querySelectorAll(".leaflet-layer");
const credits = (container: HTMLElement) =>
	container.querySelector(".leaflet-control-attribution")?.textContent ?? "";

afterEach(() => {
	for (const map of maps) map.remove();
	maps.length = 0;
	document.body.replaceChildren();
	clearTrace();
	vi.useRealTimers();
});

describe("showing a layer", () => {
	it("draws nothing until asked, then the layer it is asked for", () => {
		const { base, container } = setup();
		expect(base.kind).toBeNull();
		expect(mocks.tileLayers).toHaveLength(0);

		base.show("standard");

		expect(base.kind).toBe("standard");
		expect(urlOf(0)).toContain("tile.openstreetmap.org");
		expect(layers(container)).toHaveLength(1);
		expect(credits(container)).toContain("OpenStreetMap");
		expect(traceReport()).toContain("base layer: standard");
	});

	it("scales the last satellite zoom level up instead of asking for tiles that may not exist", () => {
		const { base } = setup();

		base.show("satellite");

		expect(urlOf(0)).toContain("arcgisonline.com");
		expect(tiles(0).options.maxNativeZoom).toBe(18);
		expect(tiles(0).options.maxZoom).toBe(19);
	});
});

describe("switching", () => {
	it("draws the new layer above the old one and drops the old one once it loaded", () => {
		const { base, container } = setup();
		base.show("standard");

		base.show("satellite");

		expect(tiles(1).options.zIndex).toBeGreaterThan(
			tiles(0).options.zIndex ?? 0,
		);
		expect(layers(container)).toHaveLength(2);

		tiles(1).fire("load");

		expect(layers(container)).toHaveLength(1);
		expect(credits(container)).toContain("Esri");
		expect(credits(container)).not.toContain("OpenStreetMap");
	});

	it("drops the old layer after a moment even if the new one never finishes loading", () => {
		vi.useFakeTimers();
		const { base, container } = setup();
		base.show("standard");

		base.show("satellite");
		expect(layers(container)).toHaveLength(2);
		vi.advanceTimersByTime(2_600);

		expect(layers(container)).toHaveLength(1);
	});

	it("goes back and forth, each switch above the last, leaving only the right credit", () => {
		const { base, container } = setup();
		base.show("standard");
		base.show("satellite");
		base.show("standard");

		const zIndexes = [0, 1, 2].map(
			(index) => tiles(index).options.zIndex ?? 0,
		);
		expect(zIndexes).toEqual([...zIndexes].sort((a, b) => a - b));
		expect(new Set(zIndexes).size).toBe(3);

		// The middle layer never finished loading, and the first one waited on it:
		// the newest loading is what clears them both.
		tiles(2).fire("load");

		expect(layers(container)).toHaveLength(1);
		expect(credits(container)).toContain("OpenStreetMap");
		expect(credits(container)).not.toContain("Esri");
	});

	it("leaves nothing waiting when disposed in the middle of a switch", () => {
		vi.useFakeTimers();
		const timersLeft = (switching: boolean) => {
			const { base, map } = setup();
			base.show("standard");
			if (switching) base.show("satellite");
			base.dispose();
			map.remove();
			maps.pop();
			const left = vi.getTimerCount();
			vi.clearAllTimers();
			return left;
		};

		// Leaflet leaves a timer or two of its own; a switch must add none.
		expect(timersLeft(true)).toBe(timersLeft(false));
	});
});

describe("telling whether the tiles load", () => {
	it("says when the tiles keep failing and when they come back", () => {
		const { base, onTilesChange } = setup();
		base.show("standard");

		for (let i = 0; i < 3; i += 1) tiles(0).fire("tileerror");
		expect(onTilesChange).not.toHaveBeenCalled();
		tiles(0).fire("tileerror");
		expect(onTilesChange).toHaveBeenCalledWith(false);

		tiles(0).fire("tileload");
		expect(onTilesChange).toHaveBeenLastCalledWith(true);
		expect(onTilesChange).toHaveBeenCalledTimes(2);
	});

	it("counts failures in a row: one tile that loads starts the count again", () => {
		const { base, onTilesChange } = setup();
		base.show("standard");

		for (let i = 0; i < 3; i += 1) tiles(0).fire("tileerror");
		tiles(0).fire("tileload");
		for (let i = 0; i < 3; i += 1) tiles(0).fire("tileerror");

		expect(onTilesChange).not.toHaveBeenCalled();
	});

	it("judges only the layer on show: one on its way out may still fail", () => {
		const { base, onTilesChange } = setup();
		base.show("standard");
		base.show("satellite");

		for (let i = 0; i < 6; i += 1) tiles(0).fire("tileerror");
		expect(onTilesChange).not.toHaveBeenCalled();

		for (let i = 0; i < 4; i += 1) tiles(1).fire("tileerror");
		expect(onTilesChange).toHaveBeenCalledWith(false);
	});

	it("gives the new layer a fresh start after the old one failed", () => {
		const { base, onTilesChange } = setup();
		base.show("standard");
		for (let i = 0; i < 4; i += 1) tiles(0).fire("tileerror");
		expect(onTilesChange).toHaveBeenLastCalledWith(false);

		base.show("satellite");

		expect(onTilesChange).toHaveBeenLastCalledWith(true);
		for (let i = 0; i < 3; i += 1) tiles(1).fire("tileerror");
		expect(onTilesChange).toHaveBeenCalledTimes(2);
	});
});
