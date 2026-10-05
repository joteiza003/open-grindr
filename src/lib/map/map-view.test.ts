// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TileLayer } from "leaflet";

const mocks = vi.hoisted(() => ({
	openExternalLink: vi.fn(),
	tileLayers: [] as unknown[],
	slots: undefined as undefined | { acquire(grant: () => void): () => void },
}));

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
vi.mock("$lib/platform/link-opener", () => ({
	openExternalLink: mocks.openExternalLink,
}));
vi.mock("$lib/util/media-load-slots", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/util/media-load-slots")>()),
	acquireMediaLoadSlot: (grant: () => void) => mocks.slots!.acquire(grant),
}));

import { LoadSlots } from "$lib/util/media-load-slots";
import type { MapMarker } from "$lib/model/map-elements";
import { MapView, type MapViewHandlers, type MapViewOptions } from "./map-view";

const pin = (
	id: string,
	title: string,
	latitude: number,
	longitude = -1.98,
	extra: object = {},
): MapMarker => ({
	id,
	latitude,
	longitude,
	title,
	createdAt: "2026-01-01T00:00:00.000Z",
	...extra,
});

function mount(options?: MapViewOptions) {
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
	const handlers = {
		onPinTap: vi.fn(),
		onSharedTap: vi.fn(),
		onMeTap: vi.fn(),
		onClusterTap: vi.fn(),
		onMapTap: vi.fn(),
		onTilesChange: vi.fn(),
	} satisfies MapViewHandlers;
	const view = new MapView(
		container,
		handlers,
		{ cluster: (count) => `${count} pins`, me: () => "You" },
		options,
	);
	view.setView(43.3, -1.98, 16, { animate: false });
	return { container, handlers, view };
}

const click = (element: Element | null) => {
	expect(element).not.toBeNull();
	element!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
};

const icon = (container: HTMLElement, title: string) =>
	container.querySelector<HTMLElement>(
		`.leaflet-marker-icon[title="${title}"]`,
	);

/** Where Leaflet put the marker (it uses left/top when 3D transforms are unavailable). */
const position = (element: HTMLElement | null) =>
	`${element?.style.left}|${element?.style.top}|${element?.style.transform}`;

const photos = (container: HTMLElement) => [
	...container.querySelectorAll<HTMLImageElement>(".og-pin__photo"),
];

/** Pretends the browser finished downloading a photo. */
function finishLoad(image: HTMLImageElement) {
	Object.defineProperty(image, "naturalWidth", {
		value: 64,
		configurable: true,
	});
	image.dispatchEvent(new Event("load"));
}

let views: MapView[] = [];
function track<T extends { view: MapView }>(mounted: T): T {
	views.push(mounted.view);
	return mounted;
}

beforeEach(() => {
	mocks.openExternalLink.mockReset();
	mocks.tileLayers.length = 0;
	mocks.slots = new LoadSlots(2);
	views = [];
});
afterEach(() => {
	for (const view of views) view.destroy();
	document.body.replaceChildren();
	vi.restoreAllMocks();
});

describe("pins on the map", () => {
	it("draws one marker per pin and reports taps on it", () => {
		const { container, handlers, view } = track(mount());
		view.setPins([pin("a", "Café", 43.3), pin("b", "Beach", 43.31)]);

		expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(
			2,
		);
		click(icon(container, "Beach"));
		expect(handlers.onPinTap).toHaveBeenCalledWith("b");
		expect(handlers.onMapTap).not.toHaveBeenCalled();
	});

	it("reports a tap on the bare map", () => {
		const { container, handlers } = track(mount());
		click(container);
		expect(handlers.onMapTap).toHaveBeenCalledTimes(1);
	});

	it("labels a profile pin with its name and shows an initial until the photo loads", () => {
		const { container, view } = track(mount());
		view.setPins([
			pin("a", "△ Ane", 43.3, -1.98, {
				profileId: 5,
				displayName: "Ane",
				mediaHash: "abc",
			}),
		]);

		expect(icon(container, "Ane")).not.toBeNull();
		expect(container.querySelector(".og-pin__initial")?.textContent).toBe(
			"A",
		);
	});

	it("selecting a pin only flips a class, so nothing is rebuilt or requested again", () => {
		const { container, view } = track(mount());
		view.setPins([pin("a", "Café", 43.3), pin("b", "Beach", 43.31)]);
		const before = icon(container, "Café");

		view.setSelection({ kind: "pin", id: "a" });

		expect(icon(container, "Café")).toBe(before);
		expect(before?.querySelector(".og-pin")?.classList).toContain(
			"is-selected",
		);
		expect(
			icon(container, "Beach")?.querySelector(".og-pin")?.classList,
		).not.toContain("is-selected");

		view.setSelection(null);
		expect(before?.querySelector(".og-pin")?.classList).not.toContain(
			"is-selected",
		);
	});

	it("raises the selected pin above the others", () => {
		const { container, view } = track(mount());
		view.setPins([pin("a", "Café", 43.3), pin("b", "Beach", 43.3001)]);
		const zIndex = (title: string) =>
			Number(icon(container, title)?.style.zIndex);

		view.setSelection({ kind: "pin", id: "a" });
		expect(zIndex("Café")).toBeGreaterThan(zIndex("Beach"));
	});

	it("removes the marker when a pin is deleted and keeps the rest", () => {
		const { container, view } = track(mount());
		view.setPins([pin("a", "Café", 43.3), pin("b", "Beach", 43.31)]);

		view.setPins([pin("b", "Beach", 43.31)]);

		expect(icon(container, "Café")).toBeNull();
		expect(icon(container, "Beach")).not.toBeNull();
	});

	it("keeps the same marker when the list is set again with the same pins", () => {
		const { container, view } = track(mount());
		view.setPins([pin("a", "Café", 43.3)]);
		const before = icon(container, "Café");

		view.setPins([pin("a", "Café", 43.3)]);

		expect(icon(container, "Café")).toBe(before);
	});

	it("moves a pin that was updated", () => {
		const { container, view } = track(mount());
		view.setPins([pin("a", "Café", 43.3)]);
		const before = position(icon(container, "Café"));

		view.setPins([pin("a", "Café", 43.3005)]);

		expect(position(icon(container, "Café"))).not.toBe(before);
	});

	it("renames a pin on its marker", () => {
		const { container, view } = track(mount());
		view.setPins([pin("a", "Café", 43.3)]);
		view.setPins([pin("a", "Bar", 43.3)]);
		expect(icon(container, "Bar")).not.toBeNull();
		expect(icon(container, "Café")).toBeNull();
	});
});

describe("clustering", () => {
	const near = [
		pin("a", "Café", 43.3),
		pin("b", "Beach", 43.3002),
		pin("c", "Far", 43.4),
	];

	it("replaces close pins with a count badge and splits them when zoomed in", () => {
		const { container, view } = track(mount());
		view.setView(43.3, -1.98, 12, { animate: false });
		view.setPins(near);

		expect(container.querySelector(".og-pin--cluster")?.textContent).toBe(
			"2",
		);
		expect(icon(container, "Café")).toBeNull();
		expect(icon(container, "Beach")).toBeNull();
		expect(icon(container, "Far")).not.toBeNull();

		view.setView(43.3, -1.98, 17, { animate: false });

		expect(container.querySelector(".og-pin--cluster")).toBeNull();
		expect(icon(container, "Café")).not.toBeNull();
		expect(icon(container, "Beach")).not.toBeNull();
	});

	it("reports the pins of a badge when it is tapped", () => {
		const { container, handlers, view } = track(mount());
		view.setView(43.3, -1.98, 12, { animate: false });
		view.setPins(near);

		click(
			container.querySelector(
				".leaflet-marker-icon:has(.og-pin--cluster)",
			),
		);

		expect(handlers.onClusterTap).toHaveBeenCalledTimes(1);
		const tapped = handlers.onClusterTap.mock.calls[0]![0] as MapMarker[];
		expect(tapped.map((m) => m.id).toSorted()).toEqual(["a", "b"]);
	});

	it("always draws the selected pin on its own, even inside a group", () => {
		const { container, view } = track(mount());
		view.setView(43.3, -1.98, 12, { animate: false });
		view.setPins(near);

		view.setSelection({ kind: "pin", id: "a" });
		expect(icon(container, "Café")).not.toBeNull();
		expect(container.querySelector(".og-pin--cluster")).toBeNull();

		view.setSelection(null);
		expect(container.querySelector(".og-pin--cluster")).not.toBeNull();
		expect(icon(container, "Café")).toBeNull();
	});

	it("zooms in on a group that can be separated, and refuses when it cannot", () => {
		const { view } = track(mount());
		view.setView(43.3, -1.98, 12, { animate: false });
		const group = [near[0]!, near[1]!];

		expect(view.zoomToMarkers(group)).toBe(true);
		expect(view.zoom).toBeGreaterThan(12);

		view.setView(43.3, -1.98, 17, { animate: false });
		expect(view.zoomToMarkers(group)).toBe(false);
	});
});

describe("pin photos", () => {
	const withPhoto = (id: string, latitude: number) =>
		pin(id, id.toUpperCase(), latitude, -1.98, {
			profileId: 1,
			mediaHash: `hash-${id}`,
		});
	const row = [
		withPhoto("a", 43.298),
		withPhoto("b", 43.3),
		withPhoto("c", 43.302),
		withPhoto("d", 43.304),
	];

	it("loads photos through the media queue, never all at once", () => {
		const { container, view } = track(mount());
		view.setPins(row);

		const loading = photos(container).filter((img) =>
			img.getAttribute("src"),
		);
		expect(loading).toHaveLength(2);
	});

	it("starts the next photo when one finishes, or fails", () => {
		const { container, view } = track(mount());
		view.setPins(row);
		const started = () =>
			photos(container).filter((img) => img.getAttribute("src")).length;
		expect(started()).toBe(2);

		const [first, second] = photos(container).filter((img) =>
			img.getAttribute("src"),
		);
		finishLoad(first!);
		expect(started()).toBe(3);
		expect(first!.classList).toContain("is-loaded");

		second!.dispatchEvent(new Event("error"));
		expect(started()).toBe(4);
		expect(second!.classList).not.toContain("is-loaded");
	});

	it("loads the pins nearest the center first", () => {
		const { container, view } = track(mount());
		view.setView(43.304, -1.98, 16, { animate: false });
		view.setPins(row);

		const withSrc = photos(container)
			.filter((img) => img.getAttribute("src"))
			.map((img) => img.getAttribute("src"));
		expect(withSrc.join(" ")).toContain("hash-d");
		expect(withSrc.join(" ")).toContain("hash-c");
	});

	it("does not request photos of pins far from the screen", () => {
		const { container, view } = track(mount());
		view.setPins([
			pin("far", "Far", 10, 10, { profileId: 2, mediaHash: "hash-far" }),
		]);

		expect(photos(container)[0]?.getAttribute("src")).toBeNull();
	});

	it("does not request photos of pins hidden inside a group", () => {
		const { container, view } = track(mount());
		view.setView(43.3, -1.98, 12, { animate: false });
		view.setPins([
			withPhoto("a", 43.3),
			pin("b", "B", 43.3002, -1.98, {
				profileId: 2,
				mediaHash: "hash-b",
			}),
		]);

		expect(photos(container).every((img) => !img.getAttribute("src"))).toBe(
			true,
		);

		view.setView(43.3, -1.98, 17, { animate: false });
		expect(photos(container).some((img) => img.getAttribute("src"))).toBe(
			true,
		);
	});

	it("frees the queue when a pin with a pending photo is deleted", () => {
		const { container, view } = track(mount());
		view.setPins(row);
		const [first] = photos(container).filter((img) =>
			img.getAttribute("src"),
		);
		const firstTitle = first!
			.closest(".leaflet-marker-icon")!
			.getAttribute("title");

		view.setPins(row.filter((r) => r.title !== firstTitle));

		const started = photos(container).filter((img) =>
			img.getAttribute("src"),
		);
		expect(started).toHaveLength(2);
	});

	it("gives up on a photo that never answers and frees its slot", () => {
		vi.useFakeTimers();
		const { container, view } = track(mount());
		view.setPins(row);
		expect(
			photos(container).filter((img) => img.getAttribute("src")),
		).toHaveLength(2);

		vi.advanceTimersByTime(21_000);

		expect(
			photos(container).filter((img) => img.getAttribute("src")),
		).toHaveLength(2);
		const timedOut = photos(container).filter(
			(img) => !img.getAttribute("src"),
		);
		expect(timedOut.length).toBeGreaterThanOrEqual(2);
		vi.useRealTimers();
	});

	it("does not download the same photo again when selection changes", () => {
		const { container, view } = track(mount());
		view.setPins([withPhoto("a", 43.3)]);
		const image = photos(container)[0]!;
		finishLoad(image);

		view.setSelection({ kind: "pin", id: "a" });
		view.setSelection(null);

		expect(photos(container)[0]).toBe(image);
		expect(image.classList).toContain("is-loaded");
	});
});

describe("shared locations and the user's own position", () => {
	it("draws shared locations and reports taps", () => {
		const { container, handlers, view } = track(mount());
		view.setShared([
			{ id: "l1", latitude: 43.3, longitude: -1.97, title: "Ane" },
		]);

		click(icon(container, "Ane"));
		expect(handlers.onSharedTap).toHaveBeenCalledWith("l1");

		view.setShared([]);
		expect(icon(container, "Ane")).toBeNull();
	});

	it("draws the user's position, moves it and removes it", () => {
		const { container, handlers, view } = track(mount());
		view.setMe({ latitude: 43.3, longitude: -1.98 });
		click(icon(container, "You"));
		expect(handlers.onMeTap).toHaveBeenCalledTimes(1);

		const before = position(icon(container, "You"));
		view.setMe({ latitude: 43.301, longitude: -1.98 });
		expect(position(icon(container, "You"))).not.toBe(before);

		view.setMe(null);
		expect(icon(container, "You")).toBeNull();
	});

	it("keeps the user's position below pins so it never steals their taps", () => {
		const { container, handlers, view } = track(mount());
		view.setMe({ latitude: 43.3, longitude: -1.98 });
		view.setPins([pin("a", "Café", 43.3, -1.98)]);

		const zIndex = (title: string) =>
			Number(icon(container, title)?.style.zIndex);
		expect(zIndex("Café")).toBeGreaterThan(zIndex("You"));
		expect(handlers.onMeTap).not.toHaveBeenCalled();
	});

	it("highlights the selected shared location", () => {
		const { container, view } = track(mount());
		view.setShared([
			{ id: "l1", latitude: 43.3, longitude: -1.97, title: "Ane" },
		]);
		view.setSelection({ kind: "shared", id: "l1" });
		expect(
			icon(container, "Ane")?.querySelector(".og-pin")?.classList,
		).toContain("is-selected");
	});
});

describe("robustness", () => {
	it("keeps working after a handler throws", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const { container, handlers, view } = track(mount());
		handlers.onPinTap.mockImplementationOnce(() => {
			throw new Error("boom");
		});
		view.setPins([pin("a", "Café", 43.3)]);

		expect(() => click(icon(container, "Café"))).not.toThrow();
		click(icon(container, "Café"));
		expect(handlers.onPinTap).toHaveBeenCalledTimes(2);
	});

	it("can be destroyed twice and ignores calls afterwards", () => {
		const { container, view } = mount();
		view.setPins([pin("a", "Café", 43.3)]);

		view.destroy();
		expect(() => {
			view.destroy();
			view.setPins([pin("b", "Beach", 43.3)]);
			view.setSelection(null);
			view.setShared([]);
			view.setMe(null);
		}).not.toThrow();
		expect(container.querySelector(".leaflet-marker-icon")).toBeNull();
	});

	it("releases queued photos when destroyed", () => {
		const { container, view } = mount();
		const slots = mocks.slots!;
		view.setPins([
			pin("a", "A", 43.298, -1.98, { profileId: 1, mediaHash: "ha" }),
			pin("b", "B", 43.3, -1.98, { profileId: 2, mediaHash: "hb" }),
			pin("c", "C", 43.302, -1.98, { profileId: 3, mediaHash: "hc" }),
		]);
		expect(
			photos(container).filter((i) => i.getAttribute("src")),
		).toHaveLength(2);

		view.destroy();

		let granted = false;
		slots.acquire(() => (granted = true));
		slots.acquire(() => (granted = true));
		expect(granted).toBe(true);
	});

	it("opens attribution links outside the app", () => {
		const { container } = track(mount());
		const link = container.querySelector<HTMLAnchorElement>(
			".leaflet-control-attribution a",
		);
		expect(link).not.toBeNull();

		const event = new MouseEvent("click", {
			bubbles: true,
			cancelable: true,
		});
		link!.dispatchEvent(event);

		expect(event.defaultPrevented).toBe(true);
		expect(mocks.openExternalLink).toHaveBeenCalledWith(
			expect.stringContaining("openstreetmap.org"),
		);
	});

	it("leaves the zoom buttons alone: they are links to # and must not be opened as addresses", () => {
		const errors = vi.spyOn(console, "error").mockImplementation(() => {});
		const { container, view } = track(mount());
		const before = view.zoom;

		click(container.querySelector(".leaflet-control-zoom-in"));

		expect(mocks.openExternalLink).not.toHaveBeenCalled();
		expect(errors).not.toHaveBeenCalled();
		expect(view.zoom).toBeGreaterThan(before);
	});

	it("says when the map tiles keep failing and when they come back", () => {
		const { handlers } = track(mount());
		const tiles = mocks.tileLayers[0] as TileLayer;

		for (let i = 0; i < 3; i += 1) tiles.fire("tileerror");
		expect(handlers.onTilesChange).not.toHaveBeenCalled();
		tiles.fire("tileerror");
		expect(handlers.onTilesChange).toHaveBeenCalledWith(false);

		tiles.fire("tileload");
		expect(handlers.onTilesChange).toHaveBeenLastCalledWith(true);
		expect(handlers.onTilesChange).toHaveBeenCalledTimes(2);
	});
});

describe("base layer", () => {
	const urls = () =>
		mocks.tileLayers.map((layer) => (layer as { _url: string })._url);

	it("starts on the street map, or on the layer it is given", () => {
		track(mount());
		track(mount({ baseLayer: "satellite" }));

		expect(urls()[0]).toContain("tile.openstreetmap.org");
		expect(urls()[1]).toContain("arcgisonline.com");
	});

	it("switches when asked and ignores a request for the layer already shown", () => {
		const { container, view } = track(mount());

		view.setBaseLayer("standard");
		expect(mocks.tileLayers).toHaveLength(1);
		view.setBaseLayer("satellite");
		view.setBaseLayer("satellite");

		expect(urls()).toHaveLength(2);
		expect(urls()[1]).toContain("arcgisonline.com");
		(mocks.tileLayers[1] as TileLayer).fire("load");
		expect(
			container.querySelector(".leaflet-control-attribution")
				?.textContent,
		).toContain("Esri");
	});

	it("passes on the news that the tiles of the layer on show keep failing", () => {
		const { handlers, view } = track(mount());
		view.setBaseLayer("satellite");

		for (let i = 0; i < 4; i += 1) {
			(mocks.tileLayers[1] as TileLayer).fire("tileerror");
		}

		expect(handlers.onTilesChange).toHaveBeenCalledWith(false);
	});

	it("ignores a request once destroyed", () => {
		const { view } = mount();
		view.destroy();

		expect(() => view.setBaseLayer("satellite")).not.toThrow();
		expect(mocks.tileLayers).toHaveLength(1);
	});
});

describe("camera", () => {
	it("frames several points, and just centers on one", () => {
		const { view } = track(mount());
		view.fitPoints([
			[43.3, -1.98],
			[43.5, -1.5],
		]);
		expect(view.zoom).toBeLessThan(16);

		view.setView(43.3, -1.98, 5, { animate: false });
		view.fitPoints([[43.31, -1.98]]);
		expect(view.zoom).toBe(14);
	});

	it("focuses without zooming out", () => {
		const { view } = track(mount());
		view.focus(43.3, -1.98, 13);
		expect(view.zoom).toBe(16);
		view.setView(43.3, -1.98, 4, { animate: false });
		view.focus(43.3, -1.98, 13);
		expect(view.zoom).toBe(13);
	});
});
