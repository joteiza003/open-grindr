// @vitest-environment jsdom

import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	goto: vi.fn<(...args: unknown[]) => Promise<void>>(() => Promise.resolve()),
	markers: [] as unknown[],
	failMap: true,
}));

vi.mock("leaflet", async (importOriginal) => {
	const original = await importOriginal<typeof import("leaflet")>();
	return {
		...original,
		map: (...args: Parameters<typeof original.map>) => {
			if (mocks.failMap) throw new Error("WebGL went away");
			return original.map(...args);
		},
	};
});
vi.mock("$app/navigation", () => ({
	goto: mocks.goto,
	afterNavigate: () => {},
}));
vi.mock("$lib/platform/link-opener", () => ({ openExternalLink: vi.fn() }));
vi.mock("$lib/app-data/preferences.svelte", () => ({
	preferencesSnapshot: () => ({ geohash: "ezzzyk", locale: "en" }),
}));
vi.mock("$lib/chat/saved-locations-library", () => ({
	loadSavedLocations: () => Promise.resolve([]),
	deleteSavedLocation: () => Promise.resolve(),
	deleteAllSavedLocations: () => Promise.resolve(),
}));
vi.mock("$lib/map/map-elements-library", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/map/map-elements-library")>()),
	appDataMapElementsBackend: {
		load: () =>
			Promise.resolve({ version: 1, markers: [...mocks.markers] }),
		save: (file: { markers: unknown[] }) => {
			mocks.markers = file.markers;
			return Promise.resolve();
		},
	},
}));

import MapPage from "./+page.svelte";

beforeEach(() => {
	mocks.failMap = true;
	mocks.markers = [
		{
			id: "p1",
			latitude: 43.31,
			longitude: -1.98,
			title: "Café",
			createdAt: "2026-01-01T00:00:00.000Z",
		},
	];
	vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("when the map itself cannot start", () => {
	it("explains it and keeps the rest of the screen usable", async () => {
		render(MapPage);

		expect(
			await screen.findByText("The map ran into a problem"),
		).toBeTruthy();
		expect(screen.getByText("WebGL went away")).toBeTruthy();

		// The saved pins can still be managed without the map.
		await fireEvent.click(
			screen.getByRole("button", { name: "Saved items" }),
		);
		const list = within(
			await screen.findByRole("region", { name: "Saved items" }),
		);
		await fireEvent.click(list.getByRole("button", { name: "Delete" }));
		await fireEvent.click(
			within(await screen.findByRole("alertdialog")).getByRole("button", {
				name: "Delete",
			}),
		);
		await vi.waitFor(() => expect(mocks.markers).toHaveLength(0));
	});

	it("still lets the user leave", async () => {
		const back = vi.spyOn(history, "back").mockImplementation(() => {});
		vi.stubGlobal("navigation", { canGoBack: true });
		render(MapPage);
		await screen.findByText("The map ran into a problem");

		await fireEvent.click(screen.getByRole("button", { name: "Back" }));

		expect(back).toHaveBeenCalledTimes(1);
		vi.unstubAllGlobals();
	});

	it("starts the map when trying again works", async () => {
		render(MapPage);
		await screen.findByText("The map ran into a problem");

		mocks.failMap = false;
		await fireEvent.click(
			screen.getByRole("button", { name: "Try again" }),
		);

		await vi.waitFor(() => {
			expect(document.querySelector(".leaflet-container")).not.toBeNull();
			expect(screen.queryByText("The map ran into a problem")).toBeNull();
		});
		await vi.waitFor(() => {
			expect(
				document.querySelector('.leaflet-marker-icon[title="Café"]'),
			).not.toBeNull();
		});
	});
});
