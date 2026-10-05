// @vitest-environment jsdom

import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/svelte";
import { flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	writeText: vi.fn<(text: string) => Promise<void>>(() => Promise.resolve()),
	goto: vi.fn<(...args: unknown[]) => Promise<void>>(() => Promise.resolve()),
	openExternalLink: vi.fn(),
	savedLocations: [] as unknown[],
	markersFile: { version: 1, markers: [] as unknown[] },
	/** When true, writing to storage never answers (a starved Android IPC pool). */
	saveStalls: false,
}));

vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({
	writeText: mocks.writeText,
}));
vi.mock("$app/navigation", () => ({
	goto: mocks.goto,
	afterNavigate: () => {},
}));
vi.mock("$lib/platform/link-opener", () => ({
	openExternalLink: mocks.openExternalLink,
}));
vi.mock("$lib/app-data/preferences.svelte", () => ({
	// Geohash válido (Donostia) para que haya «mi ubicación».
	preferencesSnapshot: () => ({ geohash: "ezzzyk", locale: "en" }),
}));
vi.mock("$lib/chat/saved-locations-library", () => ({
	loadSavedLocations: () => Promise.resolve([...mocks.savedLocations]),
	deleteSavedLocation: (id: string) => {
		if (mocks.saveStalls) return new Promise<void>(() => {});
		mocks.savedLocations = mocks.savedLocations.filter(
			(item) => (item as { localId: string }).localId !== id,
		);
		return Promise.resolve();
	},
	deleteAllSavedLocations: () => {
		mocks.savedLocations = [];
		return Promise.resolve();
	},
}));
vi.mock("$lib/map/map-elements-library", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/map/map-elements-library")>()),
	appDataMapElementsBackend: {
		load: () =>
			Promise.resolve({
				version: 1,
				markers: [...mocks.markersFile.markers],
			}),
		save: (file: { markers: unknown[] }) => {
			if (mocks.saveStalls) return new Promise<void>(() => {});
			mocks.markersFile = { version: 1, markers: file.markers };
			return Promise.resolve();
		},
	},
}));

import { backGestureEventHandlers } from "$lib/platform/back-gesture-event.svelte";
import MapPage from "./+page.svelte";

function pin(id: string, title: string, extra: object = {}) {
	return {
		id,
		latitude: 43.31,
		longitude: -1.98,
		title,
		createdAt: "2026-01-01T00:00:00.000Z",
		...extra,
	};
}

function location(localId: string, displayName: string) {
	return {
		localId,
		conversationId: "c",
		senderId: 7,
		displayName,
		lat: 43.32,
		lon: -1.97,
		receivedAt: 1_700_000_000_000,
	};
}

async function settle() {
	await vi.waitFor(() => {
		expect(document.querySelector(".leaflet-container")).not.toBeNull();
	});
	await new Promise((resolve) => setTimeout(resolve, 30));
}

beforeEach(() => {
	mocks.goto.mockReset();
	mocks.goto.mockImplementation(() => Promise.resolve());
	mocks.openExternalLink.mockReset();
	mocks.saveStalls = false;
	mocks.savedLocations = [location("l1", "Ane"), location("l2", "Mikel")];
	mocks.markersFile = {
		version: 1,
		markers: [pin("p1", "Café"), pin("p2", "Beach", { profileId: 55 })],
	};
});
afterEach(cleanup);

const list = () => within(screen.getByRole("region", { name: "Saved items" }));

async function openList() {
	await fireEvent.click(screen.getByRole("button", { name: "Saved items" }));
	await vi.waitFor(() => list().getByText("Café"));
}

/** Pulsa «Eliminar» dentro del diálogo de confirmación. */
async function confirmDeletion() {
	const dialog = await screen.findByRole("alertdialog");
	await fireEvent.click(
		within(dialog).getByRole("button", { name: "Delete" }),
	);
}

describe("the map screen", () => {
	it("leaves the map with the back button", async () => {
		const back = vi.spyOn(history, "back").mockImplementation(() => {});
		vi.stubGlobal("navigation", { canGoBack: true });
		render(MapPage);
		await settle();

		await fireEvent.click(screen.getByRole("button", { name: "Back" }));
		expect(back).toHaveBeenCalledTimes(1);

		back.mockRestore();
		vi.unstubAllGlobals();
	});

	it("goes home with back when there is no history to return to", async () => {
		vi.stubGlobal("navigation", { canGoBack: false });
		render(MapPage);
		await settle();

		await fireEvent.click(screen.getByRole("button", { name: "Back" }));
		expect(mocks.goto).toHaveBeenCalledWith("/", { replaceState: true });

		vi.unstubAllGlobals();
	});

	it("leaves the map with the system back gesture when nothing is open", async () => {
		const back = vi.spyOn(history, "back").mockImplementation(() => {});
		vi.stubGlobal("navigation", { canGoBack: true });
		render(MapPage);
		await settle();

		expect([...backGestureEventHandlers].at(-1)!()).toBe(false);
		expect(back).toHaveBeenCalledTimes(1);

		back.mockRestore();
		vi.unstubAllGlobals();
	});

	it("still deletes when Svelte flushes its effects between the press and the click, as on a real phone", async () => {
		render(MapPage);
		await settle();
		await openList();
		const row = list().getByText("Café").closest("div")!;
		await fireEvent.click(
			row.querySelector<HTMLButtonElement>(
				'button[aria-label="Delete"]',
			)!,
		);
		const dialog = await screen.findByRole("alertdialog");
		const confirm = within(dialog).getByRole("button", { name: "Delete" });
		// En un dedo real, los efectos de Svelte se ejecutan entre la pulsación
		// y el clic delegado; lo reproducimos aquí.
		confirm.addEventListener("click", () => flushSync());

		await fireEvent.click(confirm);

		await vi.waitFor(() => {
			expect(
				(mocks.markersFile.markers as { id: string }[]).map(
					(m) => m.id,
				),
			).toEqual(["p2"]);
		});
	});

	it("lists saved pins and shared locations and closes the list", async () => {
		render(MapPage);
		await settle();
		await openList();

		expect(list().getByText("Beach")).toBeTruthy();
		expect(list().getByText("Ane")).toBeTruthy();
		expect(list().getByText("Mikel")).toBeTruthy();

		await fireEvent.click(screen.getByRole("button", { name: "Close" }));
		expect(
			screen.queryByRole("region", { name: "Saved items" }),
		).toBeNull();
	});

	it("deletes one pin from the list after confirming", async () => {
		render(MapPage);
		await settle();
		await openList();

		const row = list().getByText("Café").closest("div")!;
		await fireEvent.click(
			row.querySelector<HTMLButtonElement>(
				'button[aria-label="Delete"]',
			)!,
		);
		await confirmDeletion();

		await vi.waitFor(() => {
			expect(
				(mocks.markersFile.markers as { id: string }[]).map(
					(m) => m.id,
				),
			).toEqual(["p2"]);
		});
	});

	it("keeps the pin when the confirmation is cancelled", async () => {
		render(MapPage);
		await settle();
		await openList();

		const row = list().getByText("Café").closest("div")!;
		await fireEvent.click(
			row.querySelector<HTMLButtonElement>(
				'button[aria-label="Delete"]',
			)!,
		);
		await fireEvent.click(
			await screen.findByRole("button", { name: "Cancel" }),
		);

		expect(mocks.markersFile.markers).toHaveLength(2);
	});

	it("deletes a shared location after confirming", async () => {
		render(MapPage);
		await settle();
		await openList();

		const row = list().getByText("Ane").closest("div")!;
		await fireEvent.click(
			row.querySelector<HTMLButtonElement>(
				'button[aria-label="Delete"]',
			)!,
		);
		await confirmDeletion();

		await vi.waitFor(() => {
			expect(mocks.savedLocations).toHaveLength(1);
		});
	});

	it("deletes all pins at once after confirming", async () => {
		render(MapPage);
		await settle();
		await openList();

		const buttons = list().getAllByRole("button", { name: "Delete all" });
		await fireEvent.click(buttons[0]!);
		await confirmDeletion();

		await vi.waitFor(() => {
			expect(mocks.markersFile.markers).toHaveLength(0);
		});
		expect(mocks.savedLocations).toHaveLength(2);
	});

	it("opens a pin card with directions, profile and delete", async () => {
		render(MapPage);
		await settle();
		await openList();

		await fireEvent.click(list().getByText("Beach"));
		const directions = await screen.findAllByRole("button", {
			name: "Directions",
		});
		await fireEvent.click(directions[0]!);
		expect(mocks.openExternalLink).toHaveBeenCalledTimes(1);
		expect(String(mocks.openExternalLink.mock.calls[0]?.[0])).toContain(
			"destination=43.31,-1.98",
		);

		await fireEvent.click(
			screen.getByRole("button", { name: /View profile/ }),
		);
		expect(mocks.goto).toHaveBeenCalledWith("/profile/55");

		await fireEvent.click(screen.getByRole("button", { name: "Delete" }));
		await confirmDeletion();
		await vi.waitFor(() => {
			expect(
				(mocks.markersFile.markers as { id: string }[]).map(
					(m) => m.id,
				),
			).toEqual(["p1"]);
		});
	});

	it("closes the pin card with its close button", async () => {
		render(MapPage);
		await settle();
		await openList();
		await fireEvent.click(list().getByText("Café"));

		await fireEvent.click(
			await screen.findByRole("button", { name: "Close" }),
		);
		await vi.waitFor(() => {
			expect(
				screen.queryByRole("button", { name: "Directions" }),
			).toBeNull();
		});
	});

	it("offers the floating controls: show everything and my location", async () => {
		render(MapPage);
		await settle();

		const fit = screen.getByRole("button", { name: "Show everything" });
		const locate = screen.getByRole("button", {
			name: "Go to my location",
		});
		expect((fit as HTMLButtonElement).disabled).toBe(false);
		expect((locate as HTMLButtonElement).disabled).toBe(false);
		await fireEvent.click(fit);
		await fireEvent.click(locate);
	});

	it("lets the system back gesture close the list before leaving", async () => {
		render(MapPage);
		await settle();
		await openList();

		const handlers = [...backGestureEventHandlers];
		expect(handlers.length).toBeGreaterThan(0);
		// Devuelve false cuando ha consumido el gesto (cierra algo).
		expect(handlers.at(-1)!()).toBe(false);
		await vi.waitFor(() => {
			expect(
				screen.queryByRole("region", { name: "Saved items" }),
			).toBeNull();
		});
		// El mapa siempre atiende «atrás»: si no hay nada abierto, sale.
		expect(backGestureEventHandlers.size).toBe(1);
	});

	it("closes the delete confirmation with the back gesture", async () => {
		render(MapPage);
		await settle();
		await openList();
		const row = list().getByText("Café").closest("div")!;
		await fireEvent.click(
			row.querySelector<HTMLButtonElement>(
				'button[aria-label="Delete"]',
			)!,
		);
		await screen.findByRole("alertdialog");

		[...backGestureEventHandlers].at(-1)!();
		await vi.waitFor(() => {
			expect(screen.queryByRole("alertdialog")).toBeNull();
		});
		expect(mocks.markersFile.markers).toHaveLength(2);
	});

	it("selects a pin tapped on the map itself", async () => {
		mocks.markersFile = {
			version: 1,
			markers: [
				pin("p1", "Café"),
				pin("p2", "Beach", { latitude: 40.4, longitude: -3.7 }),
			],
		};
		render(MapPage);
		await settle();
		await vi.waitFor(() => {
			expect(
				document.querySelector('.leaflet-marker-icon[title="Beach"]'),
			).not.toBeNull();
		});

		await fireEvent.click(
			document.querySelector('.leaflet-marker-icon[title="Beach"]')!,
		);

		expect(
			(await screen.findAllByRole("button", { name: "Directions" }))
				.length,
		).toBeGreaterThan(0);
	});

	it("shows the empty-state hint when nothing is saved", async () => {
		mocks.savedLocations = [];
		mocks.markersFile = { version: 1, markers: [] };
		render(MapPage);
		await settle();

		await vi.waitFor(() => {
			expect(screen.getByText(/appear here/)).toBeTruthy();
		});
	});
});

describe("when storage stalls, as with a starved Android IPC pool", () => {
	beforeEach(() => {
		mocks.saveStalls = true;
	});

	it("deletes a pin and leaves the card at once, without waiting for the disk", async () => {
		render(MapPage);
		await settle();
		await openList();
		await fireEvent.click(list().getByText("Café"));

		await fireEvent.click(
			await screen.findByRole("button", { name: "Delete" }),
		);
		await confirmDeletion();

		await vi.waitFor(() => {
			expect(screen.queryByRole("alertdialog")).toBeNull();
			expect(
				screen.queryByRole("button", { name: "Directions" }),
			).toBeNull();
		});
		await fireEvent.click(
			screen.getByRole("button", { name: "Saved items" }),
		);
		await vi.waitFor(() => {
			expect(list().queryByText("Café")).toBeNull();
		});
		expect(list().getByText("Beach")).toBeTruthy();
	});

	it("still closes the card and leaves the map", async () => {
		const back = vi.spyOn(history, "back").mockImplementation(() => {});
		vi.stubGlobal("navigation", { canGoBack: true });
		render(MapPage);
		await settle();
		await openList();
		await fireEvent.click(list().getByText("Beach"));

		await fireEvent.click(
			await screen.findByRole("button", { name: "Close" }),
		);
		await vi.waitFor(() => {
			expect(
				screen.queryByRole("button", { name: "Directions" }),
			).toBeNull();
		});

		await fireEvent.click(screen.getByRole("button", { name: "Back" }));
		expect(back).toHaveBeenCalledTimes(1);

		back.mockRestore();
		vi.unstubAllGlobals();
	});

	it("deletes a shared location from its card", async () => {
		render(MapPage);
		await settle();
		await openList();
		await fireEvent.click(list().getByText("Ane"));

		const card = await screen.findByRole("region", { name: "Ane" });
		await fireEvent.click(
			within(card).getByRole("button", { name: "Delete" }),
		);
		await confirmDeletion();

		await vi.waitFor(() => {
			expect(screen.queryByRole("region", { name: "Ane" })).toBeNull();
		});
	});
});

describe("the cards", () => {
	it("shows a shared location with its directions and no profile or refresh actions", async () => {
		render(MapPage);
		await settle();
		await openList();
		await fireEvent.click(list().getByText("Mikel"));

		const card = await screen.findByRole("region", { name: "Mikel" });
		expect(
			within(card).getByRole("button", { name: "Directions" }),
		).toBeTruthy();
		expect(
			within(card).queryByRole("button", { name: /View profile/ }),
		).toBeNull();
		expect(
			within(card).queryByRole("button", { name: "Update" }),
		).toBeNull();

		await fireEvent.click(
			within(card).getByRole("button", { name: "Directions" }),
		);
		expect(String(mocks.openExternalLink.mock.calls[0]?.[0])).toContain(
			"destination=43.32,-1.97",
		);
	});

	it("offers to update only the pins that belong to a profile", async () => {
		render(MapPage);
		await settle();
		await openList();

		await fireEvent.click(list().getByText("Café"));
		await screen.findByRole("region", { name: "Café" });
		expect(screen.queryByRole("button", { name: "Update" })).toBeNull();

		await fireEvent.click(
			screen.getByRole("button", { name: "Saved items" }),
		);
		await fireEvent.click(list().getByText("Beach"));
		expect(
			await screen.findByRole("button", { name: "Update" }),
		).toBeTruthy();
	});

	it("goes to the profile of a profile pin", async () => {
		render(MapPage);
		await settle();
		await openList();
		await fireEvent.click(list().getByText("Beach"));

		await fireEvent.click(
			await screen.findByRole("button", { name: "View profile" }),
		);
		expect(mocks.goto).toHaveBeenCalledWith("/profile/55");
	});

	it("closes the card when the bare map is tapped", async () => {
		render(MapPage);
		await settle();
		await openList();
		await fireEvent.click(list().getByText("Café"));
		await screen.findByRole("region", { name: "Café" });

		await fireEvent.click(document.querySelector(".leaflet-container")!);

		await vi.waitFor(() => {
			expect(screen.queryByRole("region", { name: "Café" })).toBeNull();
		});
	});

	it("disables the refresh button when no pin belongs to a profile", async () => {
		mocks.markersFile = { version: 1, markers: [pin("p1", "Café")] };
		render(MapPage);
		await settle();

		const refresh = screen.getByRole("button", {
			name: "Update positions",
		});
		await vi.waitFor(() => {
			expect((refresh as HTMLButtonElement).disabled).toBe(true);
		});
	});

	it("closes the card with the Escape key", async () => {
		render(MapPage);
		await settle();
		await openList();
		await fireEvent.click(list().getByText("Café"));
		await screen.findByRole("region", { name: "Café" });

		await fireEvent.keyDown(window, { key: "Escape" });

		await vi.waitFor(() => {
			expect(screen.queryByRole("region", { name: "Café" })).toBeNull();
		});
	});
});

describe("the hidden diagnostics", () => {
	async function openDiagnostics() {
		await fireEvent.pointerDown(
			screen.getByRole("heading", { name: "Map" }),
		);
		await new Promise((resolve) => setTimeout(resolve, 900));
		return screen.findByRole("region", { name: "Map diagnostics" });
	}

	it("opens when the title is pressed and held, and shows what happened", async () => {
		render(MapPage);
		await settle();

		const panel = within(await openDiagnostics());

		expect(panel.getByText(/map screen opened/)).toBeTruthy();
		expect(panel.getByText(/body pointer-events/)).toBeTruthy();
	});

	it("does not open on a quick tap of the title", async () => {
		render(MapPage);
		await settle();

		const title = screen.getByRole("heading", { name: "Map" });
		await fireEvent.pointerDown(title);
		await fireEvent.pointerUp(title);
		await new Promise((resolve) => setTimeout(resolve, 900));

		expect(
			screen.queryByRole("region", { name: "Map diagnostics" }),
		).toBeNull();
	});

	it("copies the report and closes", async () => {
		render(MapPage);
		await settle();
		const panel = within(await openDiagnostics());

		await fireEvent.click(
			panel.getByRole("button", { name: "Copy report" }),
		);
		await vi.waitFor(() =>
			expect(mocks.writeText).toHaveBeenCalledTimes(1),
		);
		expect(mocks.writeText.mock.calls[0]![0]).toContain(
			"map screen opened",
		);

		await fireEvent.click(panel.getByRole("button", { name: "Close" }));
		expect(
			screen.queryByRole("region", { name: "Map diagnostics" }),
		).toBeNull();
	});

	it("closes with the system back gesture", async () => {
		render(MapPage);
		await settle();
		await openDiagnostics();

		[...backGestureEventHandlers].at(-1)!();

		await vi.waitFor(() => {
			expect(
				screen.queryByRole("region", { name: "Map diagnostics" }),
			).toBeNull();
		});
	});
});
