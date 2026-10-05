import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	savedLocations: [] as unknown[],
	deleteSaved: vi.fn<(id: string) => Promise<void>>(() => Promise.resolve()),
	deleteAllSaved: vi.fn(() => Promise.resolve()),
	triangulate: vi.fn(),
}));

vi.mock("$lib/app-data/preferences.svelte", () => ({
	preferencesSnapshot: () => ({ locale: "en" }),
}));
vi.mock("$lib/chat/saved-locations-library", () => ({
	loadSavedLocations: () => Promise.resolve([...mocks.savedLocations]),
	deleteSavedLocation: mocks.deleteSaved,
	deleteAllSavedLocations: mocks.deleteAllSaved,
}));
vi.mock("$lib/location/auto-triangulate-profile", () => ({
	autoTriangulateProfile: mocks.triangulate,
}));

import { SavedLocationsState } from "$lib/chat/saved-locations-state.svelte";
import type { MapMarker } from "$lib/model/map-elements";
import {
	type MapElementsBackend,
	memoryMapElementsBackend,
} from "./map-elements-library";
import { MapElementsState } from "./map-elements-state.svelte";
import { MapScreenState } from "./map-screen-state.svelte";

const marker = (id: string, title: string, extra: object = {}): MapMarker => ({
	id,
	latitude: 43.3,
	longitude: -1.98,
	title,
	createdAt: "2026-01-01T00:00:00.000Z",
	...extra,
});

const location = (localId: string, displayName: string) => ({
	localId,
	conversationId: "c",
	senderId: 7,
	displayName,
	lat: 43.32,
	lon: -1.97,
	receivedAt: 1_700_000_000_000,
});

async function openScreen({
	markers = [marker("p1", "Café"), marker("p2", "Beach", { profileId: 55 })],
	locations = [location("l1", "Ane"), location("l2", "Mikel")],
	backend,
}: {
	markers?: MapMarker[];
	locations?: ReturnType<typeof location>[];
	backend?: MapElementsBackend;
} = {}) {
	mocks.savedLocations = locations;
	const notify = vi.fn();
	const screen = new MapScreenState({
		pins: new MapElementsState(
			backend ?? memoryMapElementsBackend({ version: 1, markers }),
		),
		shared: new SavedLocationsState(),
		notify,
	});
	await screen.load();
	return { screen, notify };
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.deleteSaved.mockImplementation(() => Promise.resolve());
	mocks.deleteAllSaved.mockImplementation(() => Promise.resolve());
});

describe("panels", () => {
	it("starts with nothing open", async () => {
		const { screen } = await openScreen();
		expect(screen.visiblePanel.kind).toBe("none");
		expect(screen.selection).toBeNull();
	});

	it("selects a pin, a shared location and the user's own position", async () => {
		const { screen } = await openScreen();

		screen.selectPin("p2");
		expect(screen.selectedPin?.title).toBe("Beach");
		expect(screen.selection).toEqual({ kind: "pin", id: "p2" });

		screen.selectShared("l1");
		expect(screen.selectedPin).toBeUndefined();
		expect(screen.selectedShared?.displayName).toBe("Ane");
		expect(screen.selection).toEqual({ kind: "shared", id: "l1" });

		screen.selectMe();
		expect(screen.selection).toEqual({ kind: "me" });
	});

	it("ignores a selection of something that does not exist", async () => {
		const { screen } = await openScreen();
		screen.selectPin("nope");
		screen.selectShared("nope");
		expect(screen.visiblePanel.kind).toBe("none");
	});

	it("opens and toggles the list", async () => {
		const { screen } = await openScreen();
		screen.toggleList();
		expect(screen.visiblePanel.kind).toBe("list");
		screen.toggleList();
		expect(screen.visiblePanel.kind).toBe("none");
	});

	it("replaces one panel with the next instead of stacking them", async () => {
		const { screen } = await openScreen();
		screen.toggleList();
		screen.selectPin("p1");
		expect(screen.visiblePanel.kind).toBe("pin");
		screen.openCluster(["p1", "p2"]);
		expect(screen.visiblePanel.kind).toBe("cluster");
		expect(screen.clusterMembers.map((m) => m.id)).toEqual(["p1", "p2"]);
	});

	it("closes whatever is open when the bare map is tapped", async () => {
		const { screen } = await openScreen();
		screen.selectPin("p1");
		screen.mapTapped();
		expect(screen.visiblePanel.kind).toBe("none");
	});

	it("drops a pending confirmation when something else is opened", async () => {
		const { screen } = await openScreen();
		screen.selectPin("p1");
		screen.requestDelete({ kind: "pin", id: "p1" });

		screen.toggleList();

		expect(screen.confirm).toBeNull();
		expect(screen.visiblePanel.kind).toBe("list");
	});

	it("keeps the confirmation open when the map is tapped", async () => {
		const { screen } = await openScreen();
		screen.requestDelete({ kind: "pin", id: "p1" });
		screen.mapTapped();
		expect(screen.confirm).not.toBeNull();
	});

	it("closes the innermost thing first when going back", async () => {
		const { screen } = await openScreen();
		screen.selectPin("p1");
		screen.requestDelete({ kind: "pin", id: "p1" });

		expect(screen.back()).toBe(true);
		expect(screen.confirm).toBeNull();
		expect(screen.visiblePanel.kind).toBe("pin");

		expect(screen.back()).toBe(true);
		expect(screen.visiblePanel.kind).toBe("none");

		// Nothing left to close: the caller should leave the screen.
		expect(screen.back()).toBe(false);
	});

	it("does not treat a vanished pin as an open panel", async () => {
		const { screen } = await openScreen();
		screen.selectPin("p1");
		await screen.pins.deleteMarker("p1");

		expect(screen.visiblePanel.kind).toBe("none");
		expect(screen.selectedPin).toBeUndefined();
		expect(screen.back()).toBe(false);
	});

	it("drops a group that has fewer than two pins left", async () => {
		const { screen } = await openScreen();
		screen.openCluster(["p1", "p2"]);
		await screen.pins.deleteMarker("p1");
		expect(screen.visiblePanel.kind).toBe("none");
	});

	it("describes what the panel area shows as one word, and facts about the screen", async () => {
		const { screen } = await openScreen();
		expect(screen.panelToken).toBe("none");

		screen.selectPin("p1");
		expect(screen.panelToken).toBe("pin");

		screen.toggleList();
		expect(screen.panelToken).toBe("list");

		screen.requestDelete({ kind: "pin", id: "p1" });
		expect(screen.panelToken).toBe("confirm");

		screen.cancelDelete();
		expect(screen.panelToken).toBe("list");

		expect(screen.traceFacts()).toMatchObject({
			pins: 2,
			"profile pins": 1,
			"shared locations": 2,
			refreshing: "no",
			panel: "list",
		});
	});

	it("knows when there is nothing to show", async () => {
		const { screen } = await openScreen({ markers: [], locations: [] });
		expect(screen.empty).toBe(true);
		const withPins = await openScreen();
		expect(withPins.screen.empty).toBe(false);
	});

	it("knows whether any pin belongs to a profile", async () => {
		const { screen } = await openScreen();
		expect(screen.hasProfilePins).toBe(true);
		const plain = await openScreen({ markers: [marker("p1", "Café")] });
		expect(plain.screen.hasProfilePins).toBe(false);
	});
});

describe("deleting", () => {
	it("asks before deleting and keeps everything when cancelled", async () => {
		const { screen } = await openScreen();
		screen.requestDelete({ kind: "pin", id: "p1" });
		expect(screen.confirmCopy.title).toBe("Delete this item?");

		screen.cancelDelete();
		await screen.confirmDelete();

		expect(screen.pins.markers).toHaveLength(2);
	});

	it("deletes the pin once confirmed", async () => {
		const { screen } = await openScreen();
		screen.requestDelete({ kind: "pin", id: "p1" });
		await screen.confirmDelete();

		expect(screen.pins.markers.map((m) => m.id)).toEqual(["p2"]);
		expect(screen.confirm).toBeNull();
	});

	it("deletes a shared location once confirmed", async () => {
		const { screen } = await openScreen();
		screen.requestDelete({ kind: "shared", id: "l1" });
		await screen.confirmDelete();

		expect(screen.shared.locations.map((l) => l.localId)).toEqual(["l2"]);
		expect(mocks.deleteSaved).toHaveBeenCalledWith("l1");
	});

	it("deletes all pins, or all shared locations, with a count in the question", async () => {
		const { screen } = await openScreen();
		screen.requestDelete({ kind: "all-pins" });
		expect(screen.confirmCopy.title).toBe("Delete all of them?");
		expect(screen.confirmCopy.body).toContain("2");
		await screen.confirmDelete();
		expect(screen.pins.markers).toEqual([]);
		expect(screen.shared.locations).toHaveLength(2);

		screen.requestDelete({ kind: "all-shared" });
		await screen.confirmDelete();
		expect(screen.shared.locations).toEqual([]);
		expect(mocks.deleteAllSaved).toHaveBeenCalledTimes(1);
	});

	it("closes the confirmation and the card at once, even if storage never answers", async () => {
		const backend: MapElementsBackend = {
			load: () =>
				Promise.resolve({
					version: 1,
					markers: [marker("p1", "Café"), marker("p2", "Beach")],
				}),
			save: () => new Promise<void>(() => {}),
		};
		mocks.deleteSaved.mockImplementation(() => new Promise<void>(() => {}));
		const { screen } = await openScreen({ backend });

		screen.selectPin("p1");
		screen.requestDelete({ kind: "pin", id: "p1" });
		void screen.confirmDelete();

		expect(screen.confirm).toBeNull();
		expect(screen.visiblePanel.kind).toBe("none");
		expect(screen.pins.markers.map((m) => m.id)).toEqual(["p2"]);

		screen.requestDelete({ kind: "shared", id: "l1" });
		void screen.confirmDelete();
		expect(screen.shared.locations.map((l) => l.localId)).toEqual(["l2"]);
	});

	it("brings a shared location back and says so when it could not be saved", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		mocks.deleteSaved.mockImplementation(() =>
			Promise.reject(new Error("disk")),
		);
		const { screen, notify } = await openScreen();

		screen.requestDelete({ kind: "shared", id: "l1" });
		await screen.confirmDelete();

		expect(screen.shared.locations.map((l) => l.localId)).toEqual([
			"l1",
			"l2",
		]);
		expect(notify).toHaveBeenCalledWith(
			"Couldn't save the change on this device",
		);
	});

	it("tells the user when a pin change could not be saved", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const backend: MapElementsBackend = {
			load: () =>
				Promise.resolve({
					version: 1,
					markers: [marker("p1", "Café")],
				}),
			save: () => Promise.reject(new Error("disk")),
		};
		const { screen, notify } = await openScreen({ backend });

		screen.requestDelete({ kind: "pin", id: "p1" });
		await screen.confirmDelete();

		expect(notify).toHaveBeenCalledWith(
			"Couldn't save the change on this device",
		);
		expect(screen.pins.markers).toEqual([]);
	});
});

describe("refreshing positions", () => {
	const point = { lat: 43.4, lon: -1.9 };

	beforeEach(() => {
		mocks.triangulate.mockResolvedValue({
			point,
			error: 1,
			residuals: [],
			markerId: "temp",
			measurements: [],
		});
	});

	it("moves a profile pin, keeping its id, and reports the new position", async () => {
		const { screen } = await openScreen();
		const next = await screen.refreshOne(screen.pins.markerById("p2")!);

		expect(next).toEqual({ latitude: 43.4, longitude: -1.9 });
		expect(screen.pins.markerById("p2")).toMatchObject({
			latitude: 43.4,
			longitude: -1.9,
		});
		// Only measures: no second pin is saved for the profile.
		expect(mocks.triangulate).toHaveBeenCalledWith(
			expect.objectContaining({ profileId: 55, saveMarker: false }),
		);
		expect(screen.pins.refreshing).toBe(false);
		expect(screen.refreshStatus).toBeNull();
	});

	it("does not refresh a pin that has no profile", async () => {
		const { screen } = await openScreen();
		expect(
			await screen.refreshOne(screen.pins.markerById("p1")!),
		).toBeNull();
		expect(mocks.triangulate).not.toHaveBeenCalled();
	});

	it("shows progress while refreshing and clears it afterwards", async () => {
		const { screen } = await openScreen();
		let finish: (() => void) | undefined;
		mocks.triangulate.mockImplementation(
			() =>
				new Promise((resolve) => {
					finish = () =>
						resolve({
							point,
							error: 1,
							residuals: [],
							markerId: "t",
							measurements: [],
						});
				}),
		);

		const pending = screen.refreshOne(screen.pins.markerById("p2")!);
		expect(screen.pins.refreshing).toBe(true);
		expect(screen.refreshStatus).toBe("Updating…");

		finish?.();
		await pending;
		expect(screen.pins.refreshing).toBe(false);
		expect(screen.refreshStatus).toBeNull();
	});

	it("reports a failure and frees the buttons again", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		mocks.triangulate.mockRejectedValue(new Error("hidden profile"));
		const { screen, notify } = await openScreen();

		const next = await screen.refreshOne(screen.pins.markerById("p2")!);

		expect(next).toBeNull();
		expect(notify).toHaveBeenCalledWith("Couldn't update the position");
		expect(screen.pins.refreshing).toBe(false);
	});

	it("gives up on a measurement that never finishes", async () => {
		vi.useFakeTimers();
		vi.spyOn(console, "error").mockImplementation(() => {});
		mocks.triangulate.mockImplementation(() => new Promise(() => {}));
		const { screen, notify } = await openScreen();

		const pending = screen.refreshOne(screen.pins.markerById("p2")!);
		await vi.advanceTimersByTimeAsync(91_000);
		await pending;

		expect(notify).toHaveBeenCalledWith("Couldn't update the position");
		expect(screen.pins.refreshing).toBe(false);
		vi.useRealTimers();
	});

	it("refreshes every profile pin and says how many worked", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const { screen, notify } = await openScreen({
			markers: [
				marker("a", "Ane", { profileId: 1 }),
				marker("b", "Mikel", { profileId: 2 }),
				marker("c", "Café"),
			],
		});
		mocks.triangulate
			.mockResolvedValueOnce({
				point,
				error: 1,
				residuals: [],
				markerId: "t",
				measurements: [],
			})
			.mockRejectedValueOnce(new Error("out of range"));

		await screen.refreshAll();

		expect(screen.pins.markerById("a")?.latitude).toBe(43.4);
		expect(screen.pins.markerById("b")?.latitude).toBe(43.3);
		expect(notify).toHaveBeenCalledWith("Updated 1 of 2 positions");
		expect(screen.pins.refreshing).toBe(false);
	});
});
