// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("$lib/platform/link-opener", () => ({ openExternalLink: vi.fn() }));
vi.mock("$lib/util/media-load-slots", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/util/media-load-slots")>()),
	acquireMediaLoadSlot: () => () => {},
}));

import type { MapMarker } from "$lib/model/map-elements";
import { MapView } from "./map-view";

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

function mount() {
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
	const view = new MapView(
		container,
		{
			onPinTap: vi.fn(),
			onSharedTap: vi.fn(),
			onMeTap: vi.fn(),
			onClusterTap: vi.fn(),
			onMapTap: vi.fn(),
		},
		{ cluster: (count) => `${count} pins`, me: () => "You" },
	);
	view.setView(43.3, -1.98, 16, { animate: false });
	return { container, view };
}

const icon = (container: HTMLElement, title: string) =>
	container.querySelector<HTMLElement>(
		`.leaflet-marker-icon[title="${title}"]`,
	);

let views: MapView[] = [];
function track<T extends { view: MapView }>(mounted: T): T {
	views.push(mounted.view);
	return mounted;
}

afterEach(() => {
	for (const view of views) view.destroy();
	views = [];
	document.body.replaceChildren();
});

describe("online profiles", () => {
	const outlined = (container: HTMLElement, title: string) =>
		icon(container, title)
			?.querySelector(".og-pin--avatar")
			?.classList.contains("is-online");

	const profilePins = [
		pin("a", "Ane", 43.3, -1.98, { profileId: 5, mediaHash: "ha" }),
		pin("b", "Mikel", 43.301, -1.98, { profileId: 6, mediaHash: "hb" }),
		pin("c", "Café", 43.302, -1.98),
	];

	it("outlines in green the pins of the profiles that are online, and only those", () => {
		const { container, view } = track(mount());
		view.setPins(profilePins);

		view.setOnline(new Set([5]));

		expect(outlined(container, "Ane")).toBe(true);
		expect(outlined(container, "Mikel")).toBe(false);
		// A place belongs to no profile: it has no avatar to outline.
		expect(icon(container, "Café")?.querySelector(".is-online")).toBeNull();
	});

	it("follows who comes and goes without rebuilding any pin", () => {
		const { container, view } = track(mount());
		view.setPins(profilePins);
		view.setOnline(new Set([5]));
		const before = icon(container, "Ane");

		view.setOnline(new Set([6]));

		expect(outlined(container, "Ane")).toBe(false);
		expect(outlined(container, "Mikel")).toBe(true);
		expect(icon(container, "Ane")).toBe(before);
	});

	it("outlines a pin that arrives after the news", () => {
		const { container, view } = track(mount());
		view.setOnline(new Set([5]));

		view.setPins(profilePins);

		expect(outlined(container, "Ane")).toBe(true);
	});

	it("keeps the outline when the pins are set again with the same profiles", () => {
		const { container, view } = track(mount());
		view.setPins(profilePins);
		view.setOnline(new Set([5]));

		view.setPins(profilePins.map((item) => ({ ...item })));

		expect(outlined(container, "Ane")).toBe(true);
	});

	it("shows the outline together with the selection", () => {
		const { container, view } = track(mount());
		view.setPins(profilePins);
		view.setOnline(new Set([5]));

		view.setSelection({ kind: "pin", id: "a" });

		const avatar = icon(container, "Ane")?.querySelector(".og-pin--avatar");
		expect(avatar?.classList.contains("is-online")).toBe(true);
		expect(avatar?.classList.contains("is-selected")).toBe(true);
	});

	it("ignores the news once destroyed", () => {
		const { view } = mount();
		view.destroy();

		expect(() => view.setOnline(new Set([5]))).not.toThrow();
	});
});
