import { decode } from "@msgpack/msgpack";
import { describe, expect, it, vi } from "vitest";

const { readMock, writeMock } = vi.hoisted(() => ({
	readMock: vi.fn(),
	writeMock: vi.fn(),
}));

vi.mock("$lib/app-data", () => ({
	existsAppDataFile: () => Promise.resolve(false),
	readAppDataFile: readMock,
	removeAppDataFile: () => Promise.resolve(),
	writeAppDataFileAtomic: writeMock,
}));

import {
	preferencesSnapshot,
	setPreferences,
} from "$lib/app-data/preferences.svelte";
import { defaultFilters } from "$lib/model/browse/grid/filters";
import { MapFiltersState } from "./map-filters-state.svelte";

/**
 * The real preferences module hands the saved filters over as a reactive
 * object, which is what the map opens with on the phone. Cloning it the usual
 * way throws, and the whole map screen went down with it.
 */
describe("filters saved in the preferences", () => {
	it("are what the map opens with", async () => {
		await setPreferences({
			mapFilters: { ...defaultFilters, isOnline: true, ageEnabled: true },
		});

		const filters = new MapFiltersState();

		expect(filters.value.isOnline).toBe(true);
		expect(filters.count).toBe(2);
		expect(filters.compiled.active).toBe(true);
	});

	it("are saved back into the preferences, and apart from the browse filters", async () => {
		const filters = new MapFiltersState();
		filters.value.isFavorite = true;

		await filters.saveNow();

		const written = writeMock.mock.calls.at(-1)?.[0] as {
			content: Uint8Array;
		};
		const stored = decode(written.content) as {
			mapFilters?: { isFavorite?: boolean; isOnline?: boolean };
			gridSearchFilters?: unknown;
		};
		expect(stored.mapFilters?.isFavorite).toBe(true);
		expect(stored.mapFilters?.isOnline).toBe(true);
		expect(stored.gridSearchFilters).toBeUndefined();
		expect(preferencesSnapshot().mapFilters?.isFavorite).toBe(true);
	});
});
